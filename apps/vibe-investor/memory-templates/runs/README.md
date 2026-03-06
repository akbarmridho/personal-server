# Run Logs

Store one file per successful top-level workflow run.

Path pattern:

- `runs/YYYY-MM-DD/HHMMSS_workflow.json`

Strict fields:

- `workflow`
- `completed_at`
- `window_from`
- `window_to`
- `symbols`
- `session_path`
- `artifacts`

Only write a run log after the full workflow succeeds.
