#!/usr/bin/env python3
"""
FastMCP Server for Sandbox Operations
This provides MCP tools that interact with the sandbox environment.
Updated for CONCURRENT request handling using AsyncIO.
"""
import os
import resource
import mimetypes
import shlex
import asyncio
from pathlib import Path
from fastmcp import FastMCP
from typing import Optional, Dict, Any, Union

# Configuration
WORKDIR = Path(os.environ.get("SANDBOX_WORKDIR", "/home/sandbox/workspace"))
PERSISTENT_DIR = Path("/home/sandbox/persistent")  # Persistent workspace (human-managed)
TIMEOUT_SECONDS = int(os.environ.get("SANDBOX_CMD_TIMEOUT", "30"))
RLIMIT_AS_BYTES = int(os.environ.get("SANDBOX_RLIMIT_AS", str(1024 * 1024 * 1024)))  # default 1GB
RLIMIT_CPU_SECONDS = int(os.environ.get("SANDBOX_RLIMIT_CPU", "10"))

# Ensure workspaces exist
WORKDIR.mkdir(parents=True, exist_ok=True)
PERSISTENT_DIR.mkdir(parents=True, exist_ok=True)

# Create FastMCP server
mcp = FastMCP("sandbox-server")

def _preexec_limits():
    """Set resource limits for subprocess execution"""
    try:
        resource.setrlimit(resource.RLIMIT_AS, (RLIMIT_AS_BYTES, RLIMIT_AS_BYTES))
        resource.setrlimit(resource.RLIMIT_CPU, (RLIMIT_CPU_SECONDS, RLIMIT_CPU_SECONDS))
        resource.setrlimit(resource.RLIMIT_NOFILE, (1024, 1024))
    except Exception:
        # Ignore errors if we can't set limits (e.g. inside certain containers)
        pass

@mcp.tool
async def execute_command(command: str, timeout: Optional[int] = None, workspace: str = "temporary") -> dict:
    """
    Execute a shell command in the sandbox environment with resource limits.
    Handles concurrent requests via asyncio.
    
    Args:
        command: The shell command to execute
        timeout: Optional timeout in seconds (defaults to 30)
        workspace: Workspace type - "temporary" (default) or "persistent"
    
    Returns:
        Dictionary with stdout, stderr, and exit_code
    """
    if not command or len(command) > 32_000:
        return {"error": "Invalid command"}
    
    timeout_val = timeout or TIMEOUT_SECONDS
    
    # Determine working directory based on workspace type
    if workspace == "persistent":
        workdir = PERSISTENT_DIR
    else:
        workdir = WORKDIR
    
    # Check for shell operators to decide execution mode
    shell_operators = ['|', '>', '<', '&', ';', '$', '`', '(', ')', '\\']
    use_shell = any(op in command for op in shell_operators)
    
    proc = None
    try:
        # Create asynchronous subprocess
        if use_shell:
            # Use shell execution for complex commands
            # Note: /bin/bash -lc allows reading .bashrc if needed, but creates overhead.
            # We stick to direct shell execution for simpler async handling.
            proc = await asyncio.create_subprocess_shell(
                f"/bin/bash -lc {shlex.quote(command)}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=_preexec_limits,
                cwd=workdir
            )
        else:
            # Use direct execution for simple commands (safer)
            args = shlex.split(command)
            if not args:
                 return {"error": "Empty command"}
            
            program = args[0]
            arguments = args[1:]
            
            proc = await asyncio.create_subprocess_exec(
                program,
                *arguments,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=_preexec_limits,
                cwd=workdir
            )

        # Wait for output with timeout
        try:
            stdout_data, stderr_data = await asyncio.wait_for(
                proc.communicate(), 
                timeout=timeout_val
            )
        except asyncio.TimeoutError:
            if proc:
                try:
                    proc.kill()
                    await proc.wait()  # Ensure process is reaped
                except ProcessLookupError:
                    pass
            return {
                "stdout": "",
                "stderr": "Command timed out\n[timeout]",
                "exit_code": 124
            }

        return {
            "stdout": stdout_data.decode('utf-8', errors='replace'),
            "stderr": stderr_data.decode('utf-8', errors='replace'),
            "exit_code": proc.returncode
        }
        
    except Exception as e:
        return {"error": str(e)}

def _sync_read_file(path: str, workspace: str) -> Dict[str, Any]:
    """
    Synchronous helper for reading files, to be run in a separate thread.
    This prevents file I/O from blocking the main event loop.
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
async def read_file(path: str, workspace: str = "temporary") -> Dict[str, Any]:
    """
    Read the contents of a file within the workspace. Returns appropriate data structure based on file type.
    
    Args:
        path: Relative path to the file to read
        workspace: Workspace type - "temporary" (default) or "persistent"
    
    Returns:
        Dictionary with file content, metadata, or error
    """
    # Run the synchronous file I/O in a separate thread to avoid blocking the async event loop
    return await asyncio.to_thread(_sync_read_file, path, workspace)

@mcp.tool
async def execute_code(code: str, language: str, timeout: Optional[int] = None) -> dict:
    """
    Execute code in the sandbox environment with resource limits.
    Handles concurrent requests via asyncio.
    
    Args:
        code: The code to execute
        language: The programming language - either "python" or "js"
        timeout: Optional timeout in seconds (defaults to 30)
    
    Returns:
        Dictionary with stdout, stderr, and exit_code
    """
    if not code or len(code) > 32_000:
        return {"error": f"Invalid {language} code"}
    
    if language not in ["python", "js"]:
        return {"error": "Language must be either 'python' or 'js'"}
    
    timeout_val = timeout or TIMEOUT_SECONDS
    proc = None
    
    try:
        if language == "python":
            proc = await asyncio.create_subprocess_exec(
                "/usr/bin/python3", "-c", code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=_preexec_limits,
                cwd=WORKDIR
            )
        else:  # language == "js"
            proc = await asyncio.create_subprocess_exec(
                "/usr/local/bin/node", "-e", code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=_preexec_limits,
                cwd=WORKDIR
            )
        
        try:
            stdout_data, stderr_data = await asyncio.wait_for(
                proc.communicate(), 
                timeout=timeout_val
            )
        except asyncio.TimeoutError:
            if proc:
                try:
                    proc.kill()
                    await proc.wait()
                except ProcessLookupError:
                    pass
            return {
                "stdout": "",
                "stderr": "Code execution timed out\n[timeout]",
                "exit_code": 124
            }
        
        return {
            "stdout": stdout_data.decode('utf-8', errors='replace'),
            "stderr": stderr_data.decode('utf-8', errors='replace'),
            "exit_code": proc.returncode
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Run the MCP server with streamable HTTP transport
    # FastMCP automatically handles async functions
    mcp.run(
        transport="streamable-http",
        host="0.0.0.0",
        port=9000,
        path="/mcp"
    )