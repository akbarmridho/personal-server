# Run Logs

Store one file per successful top-level workflow run.

Path pattern:

- `runs/YYYY-MM-DD/HHMMSS_workflow.json`

Fields used by every workflow:

- `workflow`
- `completed_at`
- `window_from`
- `window_to`
- `symbols`
- `artifacts`

Additional field for workflows that write `memory/sessions/{DATE}.md`:

- `session_path`

Only write a run log after the full workflow succeeds.
