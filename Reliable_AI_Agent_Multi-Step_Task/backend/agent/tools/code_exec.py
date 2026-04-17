"""Sandboxed Python code execution utility for agent tool calls."""

from __future__ import annotations

import subprocess


def execute_python_code(code: str, timeout_seconds: int = 10) -> dict[str, object]:
    """Run Python code in a subprocess with timeout and captured output."""
    try:
        completed = subprocess.run(
            ["python", "-c", code],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
        return {
            "success": completed.returncode == 0,
            "data": {"stdout": completed.stdout, "stderr": completed.stderr, "return_code": completed.returncode},
            "error_message": "" if completed.returncode == 0 else completed.stderr.strip(),
            "tool_name": "code_exec",
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "data": {},
            "error_message": f"Execution timed out after {timeout_seconds} seconds",
            "tool_name": "code_exec",
        }


# TODO: Harden sandboxing with process/resource limits and restricted execution policies.
