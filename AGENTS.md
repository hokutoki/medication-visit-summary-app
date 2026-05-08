# AGENTS.md

## Project Goal

This project is an iPhone-friendly PWA for medication tracking and doctor-visit summaries.
It helps the user summarize medication adherence, daily condition, activity/motivation score, memos, and next visit date over a 4-week visit cycle.

## Important Medical Safety Rule

This app must never claim to diagnose, treat, or determine medical decisions.
Always present summaries as reference information for doctor visits.
Display clear disclaimers in the UI.

## Sensor Data Rule

This is a web app.
Do not add automatic sensor integrations to the PWA.
Do not add sensor-derived tracking unless the user explicitly asks for those fields again.
Keep the daily record focused so the input burden stays low.

## UX Rules

- iPhone-first design
- Large touch targets
- Bottom tab navigation
- White-based, bright, high-visibility theme for doctor-visit viewing
- Card-based layout
- Do not increase daily input burden
- Keep daily input under 1 minute

## Data Rules

- Missing values must be null
- Never treat missing scores or records as 0
- Averages must ignore null values
- Export/import data as JSON
- Keep data local by default

## Coding Rules

- TypeScript strictness preferred
- Keep aggregation logic in separate utility functions
- Keep UI components small and readable
- Add comments only where helpful
- Do not add unnecessary dependencies

## Verification

Before finishing a task, run:

- npm run build
- npm run lint if available

Report what was tested and any known limitations.
