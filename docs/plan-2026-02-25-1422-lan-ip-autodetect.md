# Plan: Network Access LAN IP Auto-Detect

Date: 2026-02-25 14:22

## Goal
Show LAN IPv4-based URLs in the Network Access panel instead of localhost when app is opened from host browser.

## Checklist
- [x] Add browser-side LAN IPv4 detection via WebRTC ICE candidate parsing.
- [x] Use detected IP for app/static URL generation.
- [x] Keep localhost fallback when browser blocks local IP discovery.
- [x] Add user-facing fallback hint in terminal system messages.
- [ ] User verify panel URLs from host and phone.
