This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Contributing

### Git Workflow

**Branch naming**

| Prefix | Purpose |
|--------|---------|
| `main` | Production-ready code — protected, no direct pushes |
| `dev` | Integration branch for completed work before promoting to `main` |
| `feat/[branch-name]` | New features and functionalities |
| `fix/[branch-name]` | Bug fixes |
| `docs/[branch-name]` | Documentation changes |

**Rules**

- At least **1 approving review** is required before any pull request can be merged (enforced via branch ruleset).
- Keep commits small and focused; write a commit message that explains *why*, not just what.
- Rebase onto the latest `dev` before requesting a review to keep history linear.
- **`main` is protected** — never push directly to it. Merging into `main` requires notifying the team and assigning a reviewer; the PR must be approved before it is merged.
- Always sync with the latest `main` before starting new work — it is far easier to resolve conflicts in your own branch than in `main`.
- Make smaller, frequent commits rather than one large commit at the end.

### Spec-Driven Development

Before writing any code, write a spec that describes the intended behavior, inputs, outputs, and edge cases. The project spec lives in [SPEC.md](SPEC.md) — add to it or create a new `SPEC-[feature].md` alongside it for larger features.

[SPEC.md](SPEC.md) is the single source of truth for what this project is supposed to do. It defines the intended behavior, data flow, and constraints that all implementation must align with.

### AI Agent Instructions

This repo includes two files that instruct AI coding assistants (Claude Code, Cursor, Copilot, etc.):

- [CLAUDE.md](CLAUDE.md) — the entry point read by Claude Code; currently delegates to `AGENTS.md`.
- [AGENTS.md](AGENTS.md) — contains project-specific rules for AI agents, such as flagging that this Next.js version has breaking changes and agents must read the bundled docs before writing code.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

