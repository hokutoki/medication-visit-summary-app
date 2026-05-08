# AGENTS.md

## Project Goal

This project is an iPhone-friendly PWA for medication tracking and doctor-visit summaries.
It helps the user summarize medication adherence, daily condition, activity/motivation score, sleep, heart rate, steps, and next visit date over a 4-week visit cycle.

## Important Medical Safety Rule

This app must never claim to diagnose, treat, or determine medical decisions.
Always present summaries as reference information for doctor visits.
Display clear disclaimers in the UI.

## Measurement Data Rule

This is a web app.
Do not add automatic sensor integrations to the PWA.
Sleep, heart rate, and step data are manual-entry fields in this app.
Keep related UI simple and avoid implying automatic data retrieval.

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
- Never treat missing health data as 0
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
