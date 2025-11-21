#!/usr/bin/env python3
"""
FastMCP Server for Sandbox Operations
This provides MCP tools that interact with the sandbox environment
"""
import os
import subprocess
import resource
import mimetypes
import base64
from pathlib import Path
from fastmcp import FastMCP
from typing import Optional, Dict, Any, Union

# Configuration
WORKDIR = Path(os.environ.get("SANDBOX_WORKDIR", "/home/sandbox/workspace"))
PERSISTENT_DIR = Path("/home/sandbox/persistent")  # Persistent workspace (human-managed)
TIMEOUT_SECONDS = int(os.environ.get("SANDBOX_CMD_TIMEOUT", "30"))
RLIMIT_AS_BYTES = int(os.environ.get("SANDBOX_RLIMIT_AS", str(512 * 1024 * 1024)))  # default 512MB
RLIMIT_CPU_SECONDS = int(os.environ.get("SANDBOX_RLIMIT_CPU", "10"))

# Ensure workspaces exist
WORKDIR.mkdir(parents=True, exist_ok=True)
PERSISTENT_DIR.mkdir(parents=True, exist_ok=True)

# Create FastMCP server
mcp = FastMCP("sandbox-server")

def _preexec_limits():
    """Set resource limits for subprocess execution"""
    resource.setrlimit(resource.RLIMIT_AS, (RLIMIT_AS_BYTES, RLIMIT_AS_BYTES))
    resource.setrlimit(resource.RLIMIT_CPU, (RLIMIT_CPU_SECONDS, RLIMIT_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))

@mcp.tool
def execute_command(command: str, timeout: Optional[int] = None) -> dict:
    """
    Execute a shell command in the sandbox environment with resource limits.
    
    Available tools in the sandbox:
    
    Search Tools:
    - ripgrep (rg): Fast text search. Usage: rg "pattern" [path] [options]
      Examples: rg "TODO" --hidden -n, rg "function" src/ -A 5 -B 5
    - ast-grep (sg): AST-based code search and transformation. Usage: sg -p "pattern" [files]
      Examples: sg -p "console.log($$)" --lang js, sg -p "def $$($$):" --lang py
    - tree-sitter: Parser generator tool. Usage: tree-sitter [command] [options]
      Examples: tree-sitter init, tree-sitter generate, tree-sitter parse file.js
    - fd (fd-find): User-friendly file finder. Usage: fd [pattern] [path] [options]
      Examples: fd "*.py", fd "test" src/, fd -e js -e ts
    
    Parsing/Transform Tools:
    - jq: JSON processor. Usage: jq [filter] [file]
      Examples: jq '.key', jq '.items[] | .name', jq -r '.text'
    - yq: YAML processor (similar to jq). Usage: yq [expression] [file]
      Examples: yq '.key', yq '.items[] | .name', yq eval file.yaml
    - python3: Python interpreter. Usage: python3 [script.py] or python3 -c "command"
    - node: Node.js runtime (v24). Usage: node [script.js] or node -e "command"
    
    Other Utilities:
    - sed: Stream editor. Usage: sed [options] 'command' [file]
      Examples: sed 's/old/new/g' file.txt, sed -i 's/foo/bar/' *.txt
    - awk: Pattern scanning and processing. Usage: awk [options] 'pattern {action}' [file]
      Examples: awk '{print $1}' file.txt, awk -F, '{sum+=$3} END {print sum}' file.csv
    - find: File searching. Usage: find [path] [expression]
      Examples: find . -name "*.py", find /src -type f -mtime -7
    - diff: File comparison. Usage: diff [options] file1 file2
      Examples: diff -u file1 file2, diff -r dir1 dir2
    - patch: Apply patches. Usage: patch [options] [originalfile] [patchfile]
      Examples: patch -p1 < changes.patch, patch -i changes.patch
    
    Workspace Information:
    - Temporary workspace (/home/sandbox/workspace): For sandbox operations, can be reset safely
    - Persistent workspace (/home/sandbox/persistent): Human-managed files, datasets, protected from reset
    
    Args:
        command: The shell command to execute
        timeout: Optional timeout in seconds (defaults to 30)
    
    Returns:
        Dictionary with stdout, stderr, and exit_code
    """
    if not command or len(command) > 32_000:
        return {"error": "Invalid command"}
    
    # Basic security checks
    forbidden = ['reboot', 'shutdown', 'rm -rf /', 'chroot', 'mount', 'umount', 'dd if=']
    for pattern in forbidden:
        if pattern in command:
            return {"error": f"Forbidden command fragment: {pattern}"}
    
    timeout_val = timeout or TIMEOUT_SECONDS
    
    try:
        proc = subprocess.run(
            ["/bin/bash", "-lc", command],
            capture_output=True,
            text=True,
            timeout=timeout_val,
            preexec_fn=_preexec_limits,
            cwd=WORKDIR
        )
        return {
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode
        }
    except subprocess.TimeoutExpired as e:
        return {
            "stdout": e.stdout or "",
            "stderr": (e.stderr or "") + "\n[timeout]",
            "exit_code": 124
        }
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def read_file(path: str, workspace: str = "temporary") -> Dict[str, Any]:
    """
    Read the contents of a file within the workspace. Returns appropriate data structure based on file type.
    
    For text files: Returns the text content directly
    For images: Returns metadata (dimensions, size, format) and description
    For PDFs: Returns metadata (page count, size, title) and summary if text is extractable
    For other binary files: Returns metadata and file type information
    
    Args:
        path: Relative path to the file to read
        workspace: Workspace type - "temporary" (default) or "persistent"
                  - "temporary": Files in /home/sandbox/workspace (for sandbox operations)
                  - "persistent": Files in /home/sandbox/persistent (human-managed, protected)
    
    Returns:
        Dictionary with file content, metadata, or error
    """
    try:
        # Determine base directory based on workspace type
        if workspace == "persistent":
            base_dir = PERSISTENT_DIR
        else:
            base_dir = WORKDIR
        
        # Ensure path is within the correct workspace
        file_path = base_dir / path
        file_path = file_path.resolve()
        
        if not str(file_path).startswith(str(base_dir.resolve())):
            return {"error": f"Access denied: path outside {workspace} workspace"}
        
        if not file_path.exists():
            return {"error": f"File not found: {path}"}
        
        if file_path.is_dir():
            return {"error": f"Path is a directory: {path}"}
        
        # Get file info
        stat = file_path.stat()
        mime_type, _ = mimetypes.guess_type(str(file_path))
        file_size = stat.st_size
        
        result = {
            "path": path,
            "size": file_size,
            "mime_type": mime_type,
            "type": "unknown"
        }
        
        # Handle different file types
        if mime_type and mime_type.startswith('text/'):
            # Text files - return content directly
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                result.update({
                    "type": "text",
                    "content": content
                })
            except UnicodeDecodeError:
                # Try with different encoding
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        content = f.read()
                    result.update({
                        "type": "text",
                        "content": content,
                        "encoding": "latin-1"
                    })
                except Exception:
                    result.update({
                        "type": "binary_text",
                        "error": "Could not decode text file"
                    })
        
        elif mime_type and mime_type.startswith('image/'):
            # Image files - return metadata
            try:
                from PIL import Image
                with Image.open(file_path) as img:
                    width, height = img.size
                    format_name = img.format
                    
                result.update({
                    "type": "image",
                    "format": format_name,
                    "width": width,
                    "height": height,
                    "description": f"Image file ({format_name}) with dimensions {width}x{height}, size {file_size} bytes"
                })
            except ImportError:
                result.update({
                    "type": "image",
                    "description": f"Image file, size {file_size} bytes"
                })
            except Exception as e:
                result.update({
                    "type": "image",
                    "description": f"Image file, size {file_size} bytes (could not extract metadata: {str(e)})"
                })
        
        elif mime_type == 'application/pdf':
            # PDF files - return metadata
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    page_count = len(pdf_reader.pages)
                    
                result.update({
                    "type": "pdf",
                    "page_count": page_count,
                    "description": f"PDF document with {page_count} pages, size {file_size} bytes"
                })
                
                # Try to extract some text
                try:
                    if page_count > 0:
                        first_page = pdf_reader.pages[0]
                        text = first_page.extract_text()[:500]  # First 500 chars
                        if text.strip():
                            result["preview"] = text
                except Exception:
                    pass  # Preview is optional
                    
            except ImportError:
                result.update({
                    "type": "pdf",
                    "description": f"PDF document, size {file_size} bytes"
                })
            except Exception as e:
                result.update({
                    "type": "pdf",
                    "description": f"PDF document, size {file_size} bytes (could not extract metadata: {str(e)})"
                })
        
        else:
            # Binary or other files
            result.update({
                "type": "binary",
                "description": f"Binary file of type {mime_type or 'unknown'}, size {file_size} bytes"
            })
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def write_file(path: str, content: str, workspace: str = "temporary") -> dict:
    """
    Write content to a file within the workspace.
    
    Args:
        path: Relative path to the file to write
        content: Content to write to the file
        workspace: Workspace type - "temporary" (default) or "persistent"
                  - "temporary": Files in /home/sandbox/workspace (for sandbox operations)
                  - "persistent": Files in /home/sandbox/persistent (human-managed, protected)
    
    Returns:
        Dictionary with success status or error
    """
    try:
        # Determine base directory based on workspace type
        if workspace == "persistent":
            base_dir = PERSISTENT_DIR
        else:
            base_dir = WORKDIR
        
        # Ensure path is within the correct workspace
        file_path = base_dir / path
        file_path = file_path.resolve()
        
        if not str(file_path).startswith(str(base_dir.resolve())):
            return {"error": f"Access denied: path outside {workspace} workspace"}
        
        # Create parent directories if needed
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return {"success": True, "message": f"File written: {path}"}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def list_directory(path: str = ".") -> dict:
    """
    List files and directories in the given path within workspace.
    
    Args:
        path: Relative path to list (defaults to workspace root)
    
    Returns:
        Dictionary with directory contents or error
    """
    try:
        # Ensure path is within workspace
        dir_path = WORKDIR / path
        dir_path = dir_path.resolve()
        
        if not str(dir_path).startswith(str(WORKDIR.resolve())):
            return {"error": "Access denied: path outside workspace"}
        
        if not dir_path.exists():
            return {"error": f"Path not found: {path}"}
        
        if not dir_path.is_dir():
            return {"error": f"Path is not a directory: {path}"}
        
        items = []
        for item in dir_path.iterdir():
            items.append({
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else None
            })
        
        return {"items": items}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def reset_workspace(workspace: str = "temporary") -> dict:
    """
    Reset the workspace by removing all files and directories.
    
    Args:
        workspace: Workspace type - "temporary" (default) or "persistent"
                  - "temporary": Resets /home/sandbox/workspace (safe to reset)
                  - "persistent": Protected - requires confirmation, resets /home/sandbox/persistent
    
    Returns:
        Dictionary with success status or error
    """
    try:
        # Determine base directory based on workspace type
        if workspace == "persistent":
            base_dir = PERSISTENT_DIR
            # Additional safety check for persistent workspace
            return {
                "error": "Cannot reset persistent workspace automatically. This contains human-managed files and datasets. Use reset_persistent_workspace() with explicit confirmation if needed."
            }
        else:
            base_dir = WORKDIR
        
        for item in base_dir.iterdir():
            try:
                if item.is_dir():
                    import shutil
                    shutil.rmtree(item)
                else:
                    item.unlink()
            except Exception:
                pass
        return {"success": True, "message": f"{workspace.capitalize()} workspace reset successfully"}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def reset_persistent_workspace(confirmation: str) -> dict:
    """
    Reset the persistent workspace (human-managed files) - REQUIRES EXPLICIT CONFIRMATION.
    
    Args:
        confirmation: Must be exactly "RESET_PERSISTENT_WORKSPACE" to proceed
    
    Returns:
        Dictionary with success status or error
    """
    if confirmation != "RESET_PERSISTENT_WORKSPACE":
        return {"error": "Invalid confirmation. Must be exactly 'RESET_PERSISTENT_WORKSPACE' to proceed."}
    
    try:
        base_dir = PERSISTENT_DIR
        for item in base_dir.iterdir():
            try:
                if item.is_dir():
                    import shutil
                    shutil.rmtree(item)
                else:
                    item.unlink()
            except Exception:
                pass
        return {"success": True, "message": "Persistent workspace reset successfully"}
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def execute_python(code: str, timeout: Optional[int] = None) -> dict:
    """
    Execute Python code in the sandbox environment with resource limits.
    
    Args:
        code: The Python code to execute
        timeout: Optional timeout in seconds (defaults to 30)
    
    Returns:
        Dictionary with stdout, stderr, and exit_code
    """
    if not code or len(code) > 32_000:
        return {"error": "Invalid Python code"}
    
    timeout_val = timeout or TIMEOUT_SECONDS
    
    try:
        proc = subprocess.run(
            ["/usr/bin/python3", "-c", code],
            capture_output=True,
            text=True,
            timeout=timeout_val,
            preexec_fn=_preexec_limits,
            cwd=WORKDIR
        )
        return {
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode
        }
    except subprocess.TimeoutExpired as e:
        return {
            "stdout": e.stdout or "",
            "stderr": (e.stderr or "") + "\n[timeout]",
            "exit_code": 124
        }
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def execute_nodejs(code: str, timeout: Optional[int] = None) -> dict:
    """
    Execute Node.js code in the sandbox environment with resource limits.
    
    Args:
        code: The Node.js code to execute
        timeout: Optional timeout in seconds (defaults to 30)
    
    Returns:
        Dictionary with stdout, stderr, and exit_code
    """
    if not code or len(code) > 32_000:
        return {"error": "Invalid Node.js code"}
    
    timeout_val = timeout or TIMEOUT_SECONDS
    
    try:
        proc = subprocess.run(
            ["/usr/local/bin/node", "-e", code],
            capture_output=True,
            text=True,
            timeout=timeout_val,
            preexec_fn=_preexec_limits,
            cwd=WORKDIR
        )
        return {
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode
        }
    except subprocess.TimeoutExpired as e:
        return {
            "stdout": e.stdout or "",
            "stderr": (e.stderr or "") + "\n[timeout]",
            "exit_code": 124
        }
    except Exception as e:
        return {"error": str(e)}

@mcp.tool
def get_workspace_info(workspace: str = "temporary") -> dict:
    """
    Get information about the workspace.
    
    Args:
        workspace: Workspace type - "temporary" (default) or "persistent"
                  - "temporary": /home/sandbox/workspace (for sandbox operations)
                  - "persistent": /home/sandbox/persistent (human-managed, protected)
    
    Returns:
        Dictionary with workspace information
    """
    try:
        # Determine base directory based on workspace type
        if workspace == "persistent":
            base_dir = PERSISTENT_DIR
        else:
            base_dir = WORKDIR
        
        stat = base_dir.stat() if base_dir.exists() else None
        return {
            "workspace_type": workspace,
            "workspace_path": str(base_dir),
            "exists": base_dir.exists(),
            "is_directory": base_dir.is_dir(),
            "size": stat.st_size if stat else None,
            "description": f"{workspace.capitalize()} workspace - {'human-managed, protected from reset' if workspace == 'persistent' else 'for sandbox operations, can be reset'}"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Run the MCP server with streamable HTTP transport
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=9000,
        path="/mcp"
    )