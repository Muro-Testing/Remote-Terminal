# AGENTS Instructions

## Purpose
Keep execution structured, track all changes, and preserve context quality across long projects.

---

## Phase 1: Discovery - Ask Questions First

**Before ANY planning or coding, you MUST understand the data!**

A project built without understanding data is like building a house without knowing what's going inside. Ask these questions:

### Data Discovery Questions

Ask the user (in natural conversation):
1. **What data will you work with?** (inputs)
   - Where does data come from? (API, files, user input, database, external services?)
   - What format is it in? (JSON, CSV, databases, real-time streams?)

2. **What should the output be?** (results)
   - What does the end result look like?
   - Who is the end user?

3. **Processing needs**
   - What needs to happen to the data? (transform, analyze, aggregate?)
   - Any specific rules or business logic?

4. **Constraints**
   - Any limits? (real-time? offline? specific tech requirements?)

---

## Phase 2: Skill Loader - Find Relevant Skills

**Always search for relevant skills first!**

Before beginning any task, feature, or project work, you must check if there's a relevant skill in the Antigravity Awesome Skills catalog that can help improve quality and efficiency.

### How to Find Skills

1. **Activate the skill-loader skill** - Say: "I need to use the skill-loader skill"
2. **Describe what you're working on** - Tell the skill what kind of task you're doing in plain language
3. **Review the suggestions** - Look at matching skills and their descriptions
4. **Install relevant skills** - Install the skills that match your needs
5. **Activate and use** - Use the installed skill to guide your work

---

## Required Workflow

### 1. Task Execution
- When asked to make changes, especially multiple changes at once, create a file with time/date
- Write down the plan as a checklist
- **Only do ONE task at a time**
- After finishing a task, ask the user should you continue with the next task
- This avoids context window issues

### 2. Before Pushing
- Summarize changes in plain English
- Confirm which files are included/excluded from the push

### 3. After Pushing
- Append to `docs/CHANGELOG_CUSTOM.md` with:
  - Date (YYYY-MM-DD)
  - Bullet list of changes
  - Files touched
  - **Do not push this file**

### 4. Log Format Example
```markdown
## 2026-02-20
- Added user authentication flow
- Fixed login validation bug

Files touched
- App.tsx
- components/Auth.tsx
```

### 5. Error Fixes
- Remember what and how errors were fixed
- If confirmed fixed, add to project context to prevent future issues

---

## New Project Bootstrap (Mandatory)

- If `PROJECT_CONTEXT.md` does not exist, create it before implementation.
- Ask kickoff questions first, then write `PROJECT_CONTEXT.md` from answers.
- Do not start coding before context is confirmed.

### Kickoff questions (required)
- Project goal and success criteria
- Users/roles and access boundaries
- In-scope vs out-of-scope
- Core modules/screens for V1
- Tech stack and deployment preference
- Integrations (APIs, automations, external services)
- Timeline expectations
- Budget/pricing style
- Approval process for future changes

### Kickoff style rule
- Do not use rigid copy-paste questionnaire.
- Adapt questions to project/client context.
- Ask only what is needed to lock execution decisions.

---

## Minimum files/folders for every new project

- `AGENTS.md`
- `skill-loader/SKILL.md`
- `PROJECT_CONTEXT.md`
- `docs/`
- `docs/CHANGELOG_CUSTOM.md`
- First plan: `docs/plan-YYYY-MM-DD-HHMM-<task>.md`

---

## Session start rules

- Read `PROJECT_CONTEXT.md` first.
- Review existing `docs/plan-*.md`.
- Check latest context in `docs/CHANGELOG_CUSTOM.md`.

---

## Project Closing Pack Workflow

- Trigger: `closing project`, `finish project`, `project handover`.

### Required closing documents
1) Delivery Acceptance
2) Final Invoice
3) Scope Freeze + Change Policy
4) Support Terms
5) Handover Pack (guides, links, credentials checklist if applicable)

### Closure email package
- Send all closing docs in one email.
- Request explicit acceptance and payment confirmation.
- State that new modules/features require written pre-approval of scope, price, and timeline.

---

## Notes
- Keep changelog entries concise and factual
- Use English only in log entries
- If no push happened, do not update the changelog
- **Always check for skills before starting any new work!**
