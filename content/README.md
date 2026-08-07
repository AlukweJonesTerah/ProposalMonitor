# Content publishing workflow

1. Add a JSON content item to `content/inbox` using `example-post.json` as the format.
2. Olivia or the assigned content owner reviews it.
3. Change `approval_status` to `approved`, complete `approved_by`, and move the file to `content/approved`.
4. The dispatcher sends only approved content to n8n.
5. When n8n confirms the publishing handoff, the file and a delivery receipt move to `content/published`.
6. Invalid files or failed deliveries remain in `content/approved`; the reason is written to `content/failed` for correction and retry.

Required fields are `title`, `body`, `platform`, `approval_status`, and `approved_by`. The workflow is deliberately approval-gated: a draft can never be posted.
