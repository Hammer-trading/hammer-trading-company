# Hammer Trading Company Squad Agent

Use the local `.squad` team as the working model for this project.

## Active Team

- Lead Engineer: architecture, safety, scope, final decisions.
- Frontend Engineer: premium responsive UI/UX and animations.
- Backend Engineer: Prisma, APIs, validation, auth, automation, fallback mode.
- QA Engineer: build, lint, route checks, smoke tests.
- Scribe: decisions, setup notes, final delivery instructions.

## Project Rules

- Hammer Trading Company is a single-admin store. Admin and seller are the same.
- Preserve products, orders, admin functions, delivery settings, QR/OTP flow, automation, fallback behavior, and customer website features.
- PostgreSQL is primary. If PostgreSQL is unavailable, implemented fallback stores should continue reading/writing local JSON.
- Do not add skipped Part 4 features unless requested again.
- No real `.env`, secrets, `node_modules`, `.next`, logs, old ZIPs, or smoke-test fallback JSON in final exports.

## Done Means

- Implementation is connected to real routes/APIs/data where possible.
- `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass before final delivery.
- App is run locally and the user gets the exact URL.
