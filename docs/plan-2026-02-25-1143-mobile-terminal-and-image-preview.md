# Plan: Mobile Terminal UX + Image Open Behavior

Date: 2026-02-25 11:43

## Goal
Improve terminal usability on mobile and desktop with explicit input controls and ensure image files open in new tab instead of being rendered as text.

## Checklist
- [x] Open image previews in a new browser tab.
- [x] Add explicit terminal command input and send button.
- [x] Add mobile terminal key controls (arrows, enter, tab, esc, backspace, ctrl+c).
- [x] Add terminal focus button.
- [x] Apply mobile-first Apple/ChatGPT-inspired visual restyle.
- [x] Keep file create folder/create file/upload features available.
- [x] Validate backend build checks and runtime socket startup.

## Validation Notes
- `npm run check` passed.
- `npm run build` passed.
- Local runtime check:
  - `/` returned 200 and included `sendCommandButton`.
  - `/ws/terminal` responded with `started` status after `start` message.
