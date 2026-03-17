# GitHub + Jira MCP Sprint Planning Playbook

This document defines the simplest setup to run sprint planning through GitHub and Jira using MCP from Copilot.

## 1) Prerequisites

- A GitHub Personal Access Token (PAT)
- A Jira API token (Atlassian API token)
- Repository admin access (for project automation and branch protection)
- Node.js available in development environments (for `npx` MCP server execution)

### Required PAT scopes (classic token)

- `repo`
- `read:org` (if working in org-level projects)
- `project` (for classic projects)

If you use fine-grained tokens, grant equivalent repository/project read-write permissions.

## 2) Local MCP Setup

MCP server configuration is committed at `.vscode/mcp.json`.

Set token in your shell before opening VS Code (or before starting Copilot MCP session):

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
export GITHUB_TOKEN=your_github_token_here

export JIRA_URL=https://your-domain.atlassian.net
export JIRA_API_MAIL=your.email@example.com
export JIRA_API_KEY=your_jira_api_token_here
```

Then reload VS Code window.

### Jira MCP notes

- Jira server uses `@mcp-devtools/jira`
- `JIRA_URL` must be your Atlassian cloud base URL
- `JIRA_API_KEY` is an Atlassian API token from your Atlassian account security settings

## 3) GitHub Sprint Structure

Use one GitHub Project for delivery tracking with these fields:

- `Status`: Backlog, Ready, In Progress, In Review, Done, Blocked
- `Iteration`: 2-week sprint cycles
- `Priority`: P0, P1, P2, P3
- `Area`: web, landing, ui, core, e2e
- `Estimate`: story points

## 4) Workflow Rules

- Every PR must link to at least one issue.
- Every issue entering sprint must have acceptance criteria.
- `Done` means merged + checks passed + acceptance criteria validated.
- Avoid scope creep: move extra work to new issues.

## 5) Planning Cadence

- Backlog Refinement: 1x weekly
- Sprint Planning: every iteration start
- Mid-sprint Review: once per week
- Sprint Review/Retro: iteration end

## 6) Copilot Prompt Pattern (for planning)

Use this prompt style with MCP enabled:

```text
Use GitHub MCP and prepare Sprint <N> planning.
- Pull open issues with labels type:feature,type:bug,type:chore
- Group by area:web,area:landing,area:ui,area:core,area:e2e
- Propose sprint scope based on priority and estimate
- Flag blocked items and missing acceptance criteria
- Output: sprint goal, selected issues, risk list, carry-over list
```

## 7) Suggested Labels

- `type:feature`, `type:bug`, `type:chore`, `type:tech-debt`
- `prio:P0`, `prio:P1`, `prio:P2`, `prio:P3`
- `area:web`, `area:landing`, `area:ui`, `area:core`, `area:e2e`
- `status:blocked`

## 8) Definition of Ready / Done

### Definition of Ready
- Problem statement is clear
- Acceptance criteria are testable
- Area + priority labels are set
- Dependencies are identified

### Definition of Done
- Code merged to default branch
- CI checks pass
- Linked issue is closed
- Any user-facing behavior change is documented
