# Contributing

## Development Setup
1. Copy env file:
```powershell
Copy-Item .env.example .env
```
2. Start stack:
```powershell
docker compose up -d --build
```
3. Open app:
- `http://localhost:8080/`

## Standards
1. Keep frontend mobile-first.
2. Do not commit secrets or local data.
3. Run checks before PR:
```powershell
cd backend
npm run check
```

## Pull Requests
1. Describe user-visible behavior changes.
2. Include testing notes (mobile browser and API behavior).
3. Keep changes scoped and reversible.
