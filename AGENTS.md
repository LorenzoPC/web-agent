<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Writing rules

These apply to everything written in this repo: UI copy, docs, code comments and commit messages.

- No em-dashes (—). Use a comma, a colon, parentheses, or split the sentence in two. Don't swap in an en-dash (–) or a double hyphen (--) instead. En-dashes in number ranges, like 10–30, are fine.

# Git rules

- Always start a new branch when you start working on something, even a small change. Name it `feature/<short-name>`, branched from `origin/main`. Never build on `main`, and never commit onto another task's branch.
- Several sessions share the main checkout, so don't switch branches there. Create your branch in its own worktree. From the main checkout:

  ```sh
  git fetch origin
  git worktree add ../web-agent-<short-name> -b feature/<short-name> origin/main
  ln -s "$PWD/node_modules" ../web-agent-<short-name>/node_modules
  ln -s "$PWD/.env.local" ../web-agent-<short-name>/.env.local
  ```

- Run a worktree's dev server with `npx next dev --webpack -p <port>`. Turbopack rejects the symlinked `node_modules`.
