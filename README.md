# Suraksha — Campus Emergency Blood Network

**One Campus. One Community. Saving Lives Together.**

Suraksha is a campus-only emergency blood donation platform built for KL University. It connects students, faculty, and staff so that a compatible, available donor can be found and notified within minutes of an emergency request — instead of relying on WhatsApp groups and chat spam.

## Features

- **Emergency request dispatch** — trigger a blood request with patient, hospital, and urgency details; compatible available donors are notified instantly.
- **Smart donor matching** — a scored matching engine ranks donors by blood-group compatibility, availability, 90-day donation eligibility, department, and donation history.
- **Donor directory** — search and filter the verified campus donor roster, with contact details revealed only on request.
- **Real-time notifications** — a live floating alert lets a matched donor accept or decline a request as it happens.
- **Donor dashboard** — profile management, availability toggle, donation history, achievements/badges, and reward points.
- **Admin console** — verify member accounts, manage active requests, publish campus-wide announcements, and view safety analytics.
- **3-step registration wizard** — account, profile, and health/eligibility details, with live progress and validation.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for tooling/dev server
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/) (Firestore + Auth)
- [React Router](https://reactrouter.com/)
- [Motion](https://motion.dev/) for animation
- [Lucide](https://lucide.dev/) for icons

## Getting Started

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Firebase — the app's Firebase project config lives in [`src/firebase.ts`](src/firebase.ts). Point this at your own Firebase project (Firestore enabled) if you're not using the bundled sandbox project.
3. Run the app:
   ```bash
   npm run dev
   ```
   The app is served at `http://localhost:3000`. On first load it seeds the database with sample campus users, requests, donations, and announcements if it's empty.

### Other scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check-free production build (`vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check the project (`tsc --noEmit`) |

### Trying it out

The login screen includes **instant demo session launchers** for three roles — admin, student donor, and staff donor — so you can explore the app without registering a new account.

## Project Structure

```
src/
  components/
    LandingPage.tsx        Public marketing homepage
    AuthModal.tsx           Login / 3-step registration wizard
    Dashboard.tsx            Donor dashboard shell (profile, requests, directory, notifications, settings)
    RequestPortal.tsx        Emergency blood request form
    DonorDirectory.tsx       Searchable donor roster
    SmartMatchingPanel.tsx   Scored donor-matching engine UI
    RealTimeNotifications.tsx  Live floating match alert
    AdminPanel.tsx           Admin console
  utils/seeder.ts           First-run sample data seeding
  firebase.ts               Firebase app/Firestore/Auth initialization
  types.ts                  Shared TypeScript types
```

## ⚠️ Sandbox mode — not production-hardened

This project currently runs in a **demo/sandbox authentication mode**, not real Firebase Auth:

- Login/registration compares a plaintext `_sandboxPassword` field stored on the Firestore user document — passwords are not hashed.
- `firestore.rules` currently allows unrestricted read/write (`allow read, write: if true`) to make the demo frictionless.

Before deploying this for real campus use, replace the sandbox auth flow with Firebase Authentication and lock down `firestore.rules` to per-user access rules.

## License

No license specified yet.
