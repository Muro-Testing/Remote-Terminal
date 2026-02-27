# Plan: Mobile Native Terminal Text Selection

Date: 2026-02-25 14:38

## Goal
Enable native long-press text selection on phone terminal output without extra copy button.

## Checklist
- [x] Remove `Copy Output` button from terminal controls.
- [x] Force selectable terminal renderer on mobile/touch layouts.
- [x] Enable native `user-select: text` in fallback terminal output.
- [x] Strip ANSI escape codes in fallback for cleaner selectable text.
- [ ] User verify long-press selection/copy on phone.
