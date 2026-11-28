<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit and push cadence

Commit completed, verified work in focused commits. After each commit, count the
commits on the current branch that have yet to reach its upstream with
`git rev-list --count @{upstream}..HEAD`. Carry that count across tasks and
sessions. At three or more, push the branch to its upstream as part of the
same task and verify the push succeeded. This is standing authorization for a
normal fast-forward push, including on `main`, where it triggers deployment.

For a new branch without an upstream, count from its remote base branch and
set the upstream on the first push. An explicit request to push sooner or to
hold a push takes precedence over the default cadence.
