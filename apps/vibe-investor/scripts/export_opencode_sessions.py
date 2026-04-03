#!/usr/bin/env python3
import argparse
import base64
import binascii
import json
import re
import shutil
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote


def iso_from_ms(value):
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def safe_name(value):
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", (value or "").strip())
    return cleaned.strip("-") or "untitled"


def load_json(raw_text, context):
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {context}: {exc}") from exc


def fenced_block(text, info=""):
    text = "" if text is None else str(text)
    longest_ticks = max((len(match.group(0)) for match in re.finditer(r"`+", text)), default=0)
    fence = "`" * max(3, longest_ticks + 1)
    suffix = info if info else ""
    return f"{fence}{suffix}\n{text}\n{fence}\n"


def markdown_link(label, relative_target):
    return f"[{label}]({relative_target})"


def format_json_block(value):
    return fenced_block(json.dumps(value, ensure_ascii=False, indent=2), "json")


def maybe_decode_data_url(part_payload, attachments_dir, part_id):
    url = part_payload.get("url")
    filename = part_payload.get("filename") or part_id
    if not isinstance(url, str) or not url.startswith("data:"):
        return None

    match = re.match(r"^data:([^;,]+)?(;base64)?,(.*)$", url, re.DOTALL)
    if not match:
        raise ValueError(f"Invalid data URL in part {part_id}")

    is_base64 = bool(match.group(2))
    payload = match.group(3)
    output_path = attachments_dir / f"{part_id}__{safe_name(filename)}"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if is_base64:
        try:
            output_path.write_bytes(base64.b64decode(payload, validate=True))
        except binascii.Error as exc:
            raise ValueError(f"Invalid base64 attachment in part {part_id}: {exc}") from exc
    else:
        output_path.write_text(unquote(payload), encoding="utf-8")

    return output_path


def render_non_empty_metadata(metadata):
    return {key: value for key, value in metadata.items() if value not in (None, "", [], {})}


def short_ref(value):
    if not isinstance(value, str):
        return ""

    value = value.strip()
    if not value:
        return ""

    first_line = value.splitlines()[0].strip()

    if first_line.startswith("/"):
        parts = [part for part in Path(first_line).parts if part not in {"/"}]
        if len(parts) > 5:
            first_line = ".../" + "/".join(parts[-5:])

    if len(first_line) > 180:
        return f"{first_line[:177]}..."
    if value != first_line:
        return f"{first_line} ..."
    return first_line


def render_compact_message_label(message_row, message_payload):
    role = message_payload.get("role", "unknown")
    created_at = iso_from_ms(message_row["time_created"])
    model_id = message_payload.get("modelID")
    model = message_payload.get("model")
    if not model_id and isinstance(model, dict):
        model_id = model.get("modelID")
    finish = message_payload.get("finish")

    suffix = " | ".join(item for item in [model_id, finish] if item)
    if suffix:
        return f"### {created_at} | {role} | {suffix}\n\n"
    return f"### {created_at} | {role}\n\n"


def compact_tool_input(tool_name, tool_input):
    if not isinstance(tool_input, dict):
        return ""

    if tool_name == "read":
        return short_ref(tool_input.get("filePath") or "")
    if tool_name == "glob":
        return short_ref(tool_input.get("pattern") or "")
    if tool_name == "list":
        return short_ref(tool_input.get("path") or "")
    if tool_name in {"bash", "shell"}:
        return short_ref(tool_input.get("command") or tool_input.get("cmd") or "")
    if tool_name == "apply_patch":
        patch_text = tool_input.get("patchText")
        if isinstance(patch_text, str):
            files = []
            for line in patch_text.splitlines():
                if line.startswith("*** Add File: "):
                    files.append(line.removeprefix("*** Add File: "))
                elif line.startswith("*** Update File: "):
                    files.append(line.removeprefix("*** Update File: "))
                elif line.startswith("*** Delete File: "):
                    files.append(line.removeprefix("*** Delete File: "))
            compact_files = [short_ref(file_path) for file_path in files[:4]]
            suffix = f", +{len(files) - 4} more" if len(files) > 4 else ""
            return ", ".join(compact_files) + suffix

    parts = []
    for key in ("filePath", "path", "pattern", "url", "query", "command", "cmd"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            parts.append(short_ref(value))
    return " | ".join(parts[:3])


def render_part_markdown(part_row, part_payload, session_dir):
    part_type = part_payload.get("type") or "unknown"

    if part_type == "text":
        text = part_payload.get("text")
        return f"{text.strip()}\n\n" if isinstance(text, str) and text.strip() else ""

    if part_type == "reasoning":
        return ""

    if part_type == "tool":
        tool_state = part_payload.get("state")
        tool_name = part_payload.get("tool") or "tool"
        status = tool_state.get("status") if isinstance(tool_state, dict) else None
        title = tool_state.get("title") if isinstance(tool_state, dict) else None
        compact_input = compact_tool_input(tool_name, tool_state.get("input") if isinstance(tool_state, dict) else None)

        line = f"- tool:{tool_name}"
        if status:
            line += f" {status}"
        if compact_input:
            line += f" | {compact_input}"
        elif title:
            line += f" | {title}"

        if isinstance(tool_state, dict) and status and status != "completed" and tool_state.get("output"):
            line += f"\n{fenced_block(tool_state['output'], 'text').rstrip()}"

        return f"{line}\n"

    if part_type == "file":
        attachments_dir = session_dir / "attachments"
        extracted_path = maybe_decode_data_url(part_payload, attachments_dir, part_row["id"])
        filename = part_payload.get("filename") or part_row["id"]
        source = part_payload.get("source")
        source_path = source.get("path") if isinstance(source, dict) else None
        ref = source_path or filename

        if extracted_path:
            ref = str(extracted_path.relative_to(session_dir))

        if extracted_path and str(part_payload.get("mime") or "").startswith("image/"):
            return f"- file:{ref}\n![{filename}]({ref})\n"
        return f"- file:{ref}\n"

    if part_type == "patch":
        files = part_payload.get("files")
        if isinstance(files, list) and files:
            compact_files = [short_ref(str(file_path)) for file_path in files[:4]]
            suffix = f", +{len(files) - 4} more" if len(files) > 4 else ""
            return f"- patch:{len(files)} files | {', '.join(compact_files)}{suffix}\n"
        return ""

    if part_type in {"step-start", "step-finish", "compaction"}:
        return ""

    compact = render_non_empty_metadata({
        key: value
        for key, value in part_payload.items()
        if key not in {"type", "time"}
    })
    if not compact:
        return ""
    return format_json_block({"type": part_type, **compact})


def render_message_parts(part_rows, session_dir):
    lines = []
    tool_counter = Counter()
    tool_refs = []

    for part_row in part_rows:
        part_payload = load_json(part_row["data"], f"part.data {part_row['id']}")
        part_type = part_payload.get("type") or "unknown"

        if part_type == "tool":
            tool_state = part_payload.get("state")
            tool_name = part_payload.get("tool") or "tool"
            status = tool_state.get("status") if isinstance(tool_state, dict) else None
            tool_counter[f"{tool_name}:{status}" if status else tool_name] += 1

            compact_input = compact_tool_input(tool_name, tool_state.get("input") if isinstance(tool_state, dict) else None)
            if compact_input and len(tool_refs) < 5 and compact_input not in tool_refs:
                tool_refs.append(compact_input)

            if isinstance(tool_state, dict) and status and status != "completed" and tool_state.get("output"):
                lines.append(f"- tool:{tool_name} {status}\n")
                lines.append(fenced_block(tool_state["output"], "text"))
            continue

        rendered = render_part_markdown(part_row, part_payload, session_dir)
        if rendered:
            lines.append(rendered)

    if tool_counter:
        tools_line = ", ".join(f"{name}x{count}" for name, count in sorted(tool_counter.items()))
        if tool_refs:
            tools_line += f" | refs: {'; '.join(tool_refs)}"
        lines.insert(0, f"_tools:_ {tools_line}\n\n")

    return "".join(lines)


def build_session_dir_name(session_row):
    created = iso_from_ms(session_row["time_created"]).replace("-", "").replace(":", "")
    return f"{created}__{safe_name(session_row['slug'])}__{session_row['id']}"


def load_database(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        projects = {row["id"]: row for row in conn.execute("select * from project")}
        workspaces = {row["id"]: row for row in conn.execute("select * from workspace")}
        sessions = {row["id"]: row for row in conn.execute("select * from session order by time_created, id")}

        messages_by_session = defaultdict(list)
        messages = {}
        for row in conn.execute("select * from message order by time_created, id"):
            messages[row["id"]] = row
            messages_by_session[row["session_id"]].append(row)

        parts_by_message = defaultdict(list)
        for row in conn.execute("select * from part order by time_created, id"):
            parts_by_message[row["message_id"]].append(row)

        children_by_parent = defaultdict(list)
        root_sessions = []
        for session_id, session_row in sessions.items():
            parent_id = session_row["parent_id"]
            project_id = session_row["project_id"]
            workspace_id = session_row["workspace_id"]

            if project_id not in projects:
                raise ValueError(f"Session {session_id} references missing project {project_id}")
            if parent_id:
                if parent_id not in sessions:
                    raise ValueError(f"Session {session_id} references missing parent session {parent_id}")
                children_by_parent[parent_id].append(session_row)
            else:
                root_sessions.append(session_row)
            if workspace_id and workspace_id not in workspaces:
                raise ValueError(f"Session {session_id} references missing workspace {workspace_id}")

        for child_rows in children_by_parent.values():
            child_rows.sort(key=lambda row: (row["time_created"], row["id"]))
        root_sessions.sort(key=lambda row: (row["time_created"], row["id"]))

        for message_id, message_row in messages.items():
            session_id = message_row["session_id"]
            if session_id not in sessions:
                raise ValueError(f"Message {message_id} references missing session {session_id}")

        for message_id, part_rows in parts_by_message.items():
            if message_id not in messages:
                raise ValueError(f"Part list references missing message {message_id}")
            message_session_id = messages[message_id]["session_id"]
            for part_row in part_rows:
                if part_row["session_id"] not in sessions:
                    raise ValueError(f"Part {part_row['id']} references missing session {part_row['session_id']}")
                if part_row["session_id"] != message_session_id:
                    raise ValueError(
                        f"Part {part_row['id']} session mismatch: {part_row['session_id']} != {message_session_id}"
                    )

        return {
            "projects": projects,
            "workspaces": workspaces,
            "sessions": sessions,
            "root_sessions": root_sessions,
            "children_by_parent": children_by_parent,
            "messages_by_session": messages_by_session,
            "parts_by_message": parts_by_message,
        }
    finally:
        conn.close()


def render_session_metadata(session_row, project_row, workspace_row, parent_row, child_rows):
    metadata = {
        "id": session_row["id"],
        "slug": session_row["slug"],
        "title": session_row["title"],
        "project_name": project_row["name"],
        "project_worktree": project_row["worktree"],
        "workspace_branch": workspace_row["branch"] if workspace_row else None,
        "workspace_type": workspace_row["type"] if workspace_row else None,
        "workspace_name": workspace_row["name"] if workspace_row else None,
        "workspace_directory": workspace_row["directory"] if workspace_row else None,
        "parent_id": session_row["parent_id"],
        "parent_title": parent_row["title"] if parent_row else None,
        "directory": session_row["directory"],
        "share_url": session_row["share_url"],
        "created_at": iso_from_ms(session_row["time_created"]),
        "updated_at": iso_from_ms(session_row["time_updated"]),
        "archived_at": iso_from_ms(session_row["time_archived"]),
        "child_sessions": [
            {
                "id": child_row["id"],
                "title": child_row["title"],
                "created_at": iso_from_ms(child_row["time_created"]),
            }
            for child_row in child_rows
        ],
    }

    return render_non_empty_metadata(metadata)


def write_session_markdown(
    output_dir,
    session_row,
    db_data,
):
    sessions = db_data["sessions"]
    projects = db_data["projects"]
    workspaces = db_data["workspaces"]
    messages_by_session = db_data["messages_by_session"]
    parts_by_message = db_data["parts_by_message"]
    children_by_parent = db_data["children_by_parent"]

    session_dir = output_dir / build_session_dir_name(session_row)
    session_dir.mkdir(parents=True, exist_ok=False)

    project_row = projects[session_row["project_id"]]
    workspace_row = workspaces.get(session_row["workspace_id"]) if session_row["workspace_id"] else None
    parent_row = sessions.get(session_row["parent_id"]) if session_row["parent_id"] else None
    child_rows = children_by_parent.get(session_row["id"], [])

    lines = [
        f"# {session_row['title']}\n\n",
        "## Session\n\n",
        format_json_block(render_session_metadata(session_row, project_row, workspace_row, parent_row, child_rows)),
    ]

    if parent_row:
        lines.append("## Parent Session\n\n")
        lines.append(
            f"- {iso_from_ms(parent_row['time_created'])} | "
            f"{markdown_link(parent_row['title'], '../session.md')} | `{parent_row['id']}`\n"
        )

    if child_rows:
        lines.append("## Child Sessions\n\n")
        for child_row in child_rows:
            child_dir = build_session_dir_name(child_row)
            lines.append(
                f"- {iso_from_ms(child_row['time_created'])} | "
                f"{markdown_link(child_row['title'], f'./{child_dir}/session.md')} | `{child_row['id']}`\n"
            )
        lines.append("\n")

    lines.append("## Transcript\n\n")
    message_rows = messages_by_session.get(session_row["id"], [])

    for message_row in message_rows:
        message_payload = load_json(message_row["data"], f"message.data {message_row['id']}")
        lines.append(render_compact_message_label(message_row, message_payload))
        part_rows = parts_by_message.get(message_row["id"], [])
        rendered_parts = render_message_parts(part_rows, session_dir)
        if rendered_parts:
            lines.append(rendered_parts)
        if not lines[-1].endswith("\n\n"):
            lines.append("\n")

    (session_dir / "session.md").write_text("".join(lines), encoding="utf-8")

    for child_row in child_rows:
        write_session_markdown(session_dir, child_row, db_data)


def write_index(output_dir, db_path, db_data):
    lines = [
        "# Opencode Sessions\n\n",
        f"source_db: {Path(db_path).resolve()}\n",
        f"generated_at: {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}\n",
        f"root_sessions: {len(db_data['root_sessions'])}\n",
        f"total_sessions: {len(db_data['sessions'])}\n\n",
        "## Root Sessions\n\n",
    ]

    for session_row in db_data["root_sessions"]:
        session_dir = build_session_dir_name(session_row)
        lines.append(
            f"- {iso_from_ms(session_row['time_created'])} | "
            f"{markdown_link(session_row['title'], f'./{session_dir}/session.md')} | "
            f"`{session_row['slug']}` | `{session_row['id']}`\n"
        )

    (output_dir / "index.md").write_text("".join(lines), encoding="utf-8")


def export_sessions(db_path, output_dir, overwrite):
    db_data = load_database(db_path)

    output_dir = Path(output_dir)
    if output_dir.exists():
        if not overwrite:
            raise FileExistsError(f"Output directory already exists: {output_dir}")
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    write_index(output_dir, db_path, db_data)
    for session_row in db_data["root_sessions"]:
        write_session_markdown(output_dir, session_row, db_data)

    print(f"Exported {len(db_data['sessions'])} sessions to {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Export opencode SQLite sessions into nested Markdown folders.")
    parser.add_argument("--db", required=True, help="Path to opencode SQLite database")
    parser.add_argument("--out", required=True, help="Output directory for exported sessions")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite output directory if it exists")
    args = parser.parse_args()

    export_sessions(args.db, args.out, args.overwrite)


if __name__ == "__main__":
    main()
