# AGENTS.md — Workflow for Polyrhythm Mixer

## Branching & Tagging

### Features
- Create from `main`: `git checkout -b feature/<name> main`
- Work, test thoroughly, commit
- Merge to `main`: `git checkout main && git merge feature/<name> && git push`
- Tag: `git tag v<MAJOR>.<MINOR>.0 && git push origin v<MAJOR>.<MINOR>.0`

### Bug Fixes
- Create from `main`: `git checkout -b bugfix/<name> main`
- Fix, verify, commit
- Merge to `main`: `git checkout main && git merge bugfix/<name> && git push`
- Tag: `git tag v<MAJOR>.<MINOR>.<PATCH> && git push origin v<MAJOR>.<MINOR>.<PATCH>`

### Versioning
Semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR** — breaking changes (incompatible API, data format, behavior)
- **MINOR** — new features, backward-compatible
- **PATCH** — bug fixes, backward-compatible

### After Tagging
- Update `CHANGELOG.md` with the version entry
- Commit changelog, merge to main, move the tag forward
- Switch back to current feature branch

## Conventions
- Keep changes focused — one feature or bug per branch
- Test visually in a browser before merging
- Never commit secrets or credentials
- `main` is the production branch; always deployable
- Run `git diff --stat` before committing to review scope
