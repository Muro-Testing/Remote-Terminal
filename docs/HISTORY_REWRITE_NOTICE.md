# History Rewrite Notice (Maintainers)

This repository may be force-pushed when sensitive values are removed from Git history.

## Why
Older commits can contain infrastructure-specific values (domains, tunnel names, local identifiers).

## After force-push
Everyone with an existing clone should re-sync.

Preferred:
```bash
git fetch --all --prune
git checkout main
git reset --hard origin/main
```

Or safest:
- Re-clone the repository from scratch.

## Before force-push
- Confirm no open PRs depend on old commit SHAs.
- Notify collaborators in advance.

## Validation after rewrite
- Search repository for sensitive tokens.
- Confirm deployment docs still work with placeholders.
- Confirm install instructions are unchanged.
