# Plan: Tool Installer Panel + Runtime Defaults

Date: 2026-02-25 12:31

## Goal
Let users install common CLI tools without manual terminal setup by preconfiguring npm tool paths and providing prepared install commands in UI.

## Checklist
- [x] Preconfigure `NPM_CONFIG_PREFIX` for persistent global npm tool installs (`/workspace/.tools/npm`).
- [x] Ensure terminal `PATH` includes `/workspace/.tools/npm/bin`.
- [x] Add Tool Installer panel with prepared commands.
- [x] Add `Copy Command` and `Run in Terminal` actions.
- [x] Update docs with new behavior.
- [x] Validate backend check/build.
- [x] Verify Tool Installer panel appears in served UI.

## Validation Notes
- `npm run check` passed.
- `npm run build` passed.
- Runtime page check confirms `Tool Installer` and `toolInstallerList` present.
