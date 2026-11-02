---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Every issue carries the shape in "What every issue carries" below. Ask the human only for
   anything this plan needs on top of it.
5. Create the `plan:<plan>` label if it is missing, then each issue in dependency order, so
   blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --label "plan:<plan>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

## What every issue carries

Agreed with the human on the morning-digest plan (2026-11-02). `<plan>` is the `plan:` value in
`plan.md`'s frontmatter; `<n>` is the plan section, sub-sections included (`2a`).

- Label `plan:<plan>`. Reviewers sort by it.
- Body, in this order:

  ```md
  Source: plan.md § <n>

  ## Scope

  What to build, and the decisions it must follow (ADRs, styleguide).

  ## Done when

  The plan's done condition, checkable.

  ## Blocked by

  `#<n>` with real numbers, or `—`. Say when only part of an issue is needed
  (e.g. "#1, only its first commit").

  ## Worker

  Suggested model: the strongest for logic, a cheaper one for views and tests.
  ```

- `Source:` is the body's first line, exactly as above.
- A step that waits on someone outside the repo (a reviewer, a human) stays open until they
  confirm, even if its done line says "sent". The issue that depends on it is blocked by it.

## Closing

With the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

A commit with `closes #n` closes the issue on push without that comment. Add it afterwards with
`gh issue comment <n> -b "<closing comment>"`.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
