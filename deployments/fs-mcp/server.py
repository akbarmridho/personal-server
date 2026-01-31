"""Bash & Python MCP Server

A Model-Context-Protocol (MCP) server that provides:
- Bash command execution with persistent working directory
- Python REPL with persistent state for data analysis
"""

import subprocess
import os
import io
import traceback
import tempfile
import psutil
from datetime import datetime, timedelta
from contextlib import redirect_stdout, redirect_stderr
from code import InteractiveInterpreter

from mcp.server.fastmcp import FastMCP

# Create a Model-Context-Protocol (MCP) server
mcp = FastMCP("Bash & Python REPL")

# Global variable for working directory
GLOBAL_CWD = "/data"  # Default to mounted data directory

# Python interpreter state management
_python_interpreter = InteractiveInterpreter()
_last_execution_time = None
_session_timeout_minutes = 30  # Auto-reset after 30 minutes of inactivity


def _check_and_reset_if_idle():
    """Check if session has been idle too long and reset if needed."""
    global _python_interpreter, _last_execution_time

    if _last_execution_time is None:
        return False

    idle_time = datetime.now() - _last_execution_time
    if idle_time > timedelta(minutes=_session_timeout_minutes):
        _python_interpreter = InteractiveInterpreter()
        _last_execution_time = None
        return True
    return False


@mcp.tool()
async def set_cwd(path: str) -> str:
    """
    Set the global working directory for bash commands.

    Use this to change where bash commands execute by default.

    Available directories:
    - /data - Persistent storage (mounted from host, survives container restarts)
    - /tmp - Temporary storage (cleared on container restart)
    - Any temp dir created with get_temp_dir()

    Args:
        path: The absolute path to use as the new working directory.

    Returns:
        A confirmation message.

    Example:
        set_cwd("/tmp")  # Switch to temp directory for scratch work
        set_cwd("/data") # Switch back to persistent storage
    """
    global GLOBAL_CWD

    if not os.path.isdir(path):
        raise ValueError(f"Invalid directory: {path}")

    GLOBAL_CWD = path
    return f"Working directory set to: {GLOBAL_CWD}"


@mcp.tool()
async def get_temp_dir() -> str:
    """
    Create and return a unique temporary directory path.

    Use this for:
    - Scratch work and intermediate files
    - Downloading test data
    - Generating temporary outputs
    - Testing scripts before saving to /data
    - Any work that doesn't need to persist

    The directory is created immediately and persists until container restart.
    Files in temporary directories are NOT saved to the host system.

    Returns:
        str: Absolute path to a new temporary directory (e.g., "/tmp/mcp_abc123")

    Example workflow:
        1. temp = get_temp_dir()
        2. execute_bash(f"cd {temp} && wget https://example.com/data.csv")
        3. execute_python(f"import pandas as pd; df = pd.read_csv('{temp}/data.csv')")
        4. # When done, no cleanup needed - cleared on container restart
    """
    temp_dir = tempfile.mkdtemp(prefix="mcp_")
    return temp_dir


@mcp.tool()
async def execute_bash(cmd: str) -> dict:
    """
    Execute a bash command in the current working directory.

    Use this for:
    - System commands (ls, cat, grep, find, etc.)
    - File operations via command line
    - Running scripts or binaries
    - Any shell-based operations

    Working directory:
    - Default: /data (persistent storage, mounted from host)
    - Change with set_cwd() or use absolute paths
    - Use /tmp or get_temp_dir() for temporary files

    Storage locations:
    - /data - Persistent (survives container restarts, backed by host)
    - /tmp - Temporary (cleared on container restart)
    - get_temp_dir() - Unique temp directory for isolation

    Args:
        cmd: The shell command to execute (e.g., "ls -la", "grep pattern file.txt")

    Returns:
        dict: {
            "stdout": str,      # Standard output from the command
            "stderr": str,      # Standard error from the command
            "exit_code": int    # Exit code (0 = success, non-zero = error)
        }

    Example:
        execute_bash("ls -la /data")                    # List persistent files
        execute_bash("cd /tmp && wget https://...")     # Download to temp
        temp = get_temp_dir(); execute_bash(f"cd {temp} && python script.py")
    """
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=True,
        cwd=GLOBAL_CWD,
    )
    stdout, stderr = process.communicate()
    return {
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": process.returncode,
    }


@mcp.tool()
async def execute_python(code: str) -> dict:
    """
    Execute Python code in a persistent interpreter session.

    This provides a Jupyter/IPython-like experience where:
    - Variables, imports, and state persist between calls
    - You can build up analysis incrementally
    - Perfect for data analysis workflows with pandas, scipy, numpy, etc.
    - Auto-resets after 30 minutes of inactivity to free memory

    Available libraries (pre-installed):
    - pandas: Data manipulation and analysis
    - numpy: Numerical computing
    - scipy: Scientific computing
    - mplfinance: Financial chart plotting
    - lightweight-charts: Interactive financial charts

    Use this for:
    - Loading and analyzing data with pandas
    - Statistical computations with scipy/numpy
    - Creating visualizations (save to /data for persistence, /tmp for temporary)
    - Iterative data exploration and transformation
    - Any Python computation that benefits from persistent state

    File paths in Python:
    - /data - Persistent files (use for final outputs)
    - /tmp or get_temp_dir() - Temporary files (use for scratch work)

    Args:
        code: Python code to execute. Can be:
            - Single line: "import pandas as pd"
            - Multiple lines: "df = pd.read_csv('data.csv')\\nprint(df.head())"
            - Expression to evaluate: "2 + 2" returns "4"

    Returns:
        dict: {
            "stdout": str,           # Printed output from the code
            "stderr": str,           # Error messages and warnings
            "result": str | None,    # String representation of the last expression result
            "error": str | None,     # Full error traceback if execution failed
            "session_reset": bool    # True if session was auto-reset due to inactivity
        }

    Example workflow:
        1. execute_python("import pandas as pd")
        2. execute_python("df = pd.read_csv('/data/stocks.csv')")
        3. execute_python("df.describe()")  # df still exists from step 2
        4. execute_python("df['price'].mean()")

    Memory management:
    - Session auto-resets after 30 minutes of inactivity
    - Use reset_python() to manually clear state
    - Use get_python_session_info() to check memory usage and session age
    """
    global _python_interpreter, _last_execution_time

    # Check if session should be reset due to inactivity
    was_reset = _check_and_reset_if_idle()

    # Update last execution time
    _last_execution_time = datetime.now()

    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    result = None
    error = None

    try:
        # Redirect stdout/stderr
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            # Try to evaluate as expression first (for interactive results)
            try:
                result = eval(code, _python_interpreter.locals)
            except SyntaxError:
                # Not an expression, execute as statement
                exec(code, _python_interpreter.locals)
    except Exception:
        error = traceback.format_exc()

    response = {
        "stdout": stdout_capture.getvalue(),
        "stderr": stderr_capture.getvalue(),
        "result": repr(result) if result is not None else None,
        "error": error,
        "session_reset": was_reset,
    }

    # Add warning if session was reset
    if was_reset:
        response["stdout"] = (
            f"⚠️  Session was idle for >{_session_timeout_minutes} minutes and was auto-reset.\n"
            + "All previous variables and imports have been cleared.\n\n"
            + response["stdout"]
        )

    return response


@mcp.tool()
async def reset_python() -> str:
    """
    Manually reset the Python interpreter to a clean state.

    This clears all variables, imports, and state from the persistent Python session.
    Use this when you want to start fresh or free up memory.

    When to use:
    - After loading large datasets to free memory
    - When starting a new analysis task
    - If you encounter unexpected state from previous executions

    Returns:
        str: Confirmation message with session info

    Example:
        After running extensive analysis, call reset_python() to clear memory
        and start a new analysis session.
    """
    global _python_interpreter, _last_execution_time

    # Get memory info before reset
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    _python_interpreter = InteractiveInterpreter()
    _last_execution_time = None

    return f"✓ Python interpreter reset. All variables and imports cleared.\n📊 Memory before reset: {memory_mb:.1f} MB"


@mcp.tool()
async def get_python_session_info() -> dict:
    """
    Get information about the current Python interpreter session.

    Returns session status, memory usage, and idle time to help monitor
    resource usage and decide when to reset the interpreter.

    Returns:
        dict: {
            "session_active": bool,           # Whether a session has been started
            "variables_count": int,           # Number of user-defined variables
            "memory_usage_mb": float,         # Current memory usage in MB
            "idle_minutes": float | None,     # Minutes since last execution (None if never used)
            "auto_reset_in_minutes": float | None,  # Minutes until auto-reset (None if never used)
            "timeout_setting_minutes": int    # Configured timeout duration
        }

    Example:
        Use this to check if you should manually reset before the auto-reset,
        or to monitor memory usage during long-running analysis.
    """
    global _last_execution_time, _session_timeout_minutes

    # Get memory usage
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    # Count user-defined variables (exclude built-ins and internals)
    user_vars = [k for k in _python_interpreter.locals.keys()
                 if not k.startswith('_') and k not in ['__builtins__', '__name__', '__doc__']]

    # Calculate idle time
    idle_minutes = None
    auto_reset_in = None
    if _last_execution_time is not None:
        idle_time = datetime.now() - _last_execution_time
        idle_minutes = idle_time.total_seconds() / 60
        auto_reset_in = max(0, _session_timeout_minutes - idle_minutes)

    return {
        "session_active": _last_execution_time is not None,
        "variables_count": len(user_vars),
        "memory_usage_mb": round(memory_mb, 1),
        "idle_minutes": round(idle_minutes, 1) if idle_minutes is not None else None,
        "auto_reset_in_minutes": round(auto_reset_in, 1) if auto_reset_in is not None else None,
        "timeout_setting_minutes": _session_timeout_minutes,
    }
