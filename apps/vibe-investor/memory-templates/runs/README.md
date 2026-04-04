# Run Logs

The run-log plugin writes one file per successful top-level workflow run.

Path pattern:

- `runs/YYYY-MM-DD/HHMMSS_workflow.json`

Fields used by every workflow:

- `workflow`
- `completed_at`
- `window_from`
- `window_to`
- `symbols`
- `artifacts`

Run logs are plugin-managed.
