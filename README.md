<div align="center">

# 🩸 Suraksha
### Campus Emergency Blood Network

**One Campus. One Community. Saving Lives Together.**

A campus-only emergency blood donation platform that matches and notifies a compatible, available donor within minutes — no more WhatsApp groups, no more chat spam.

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Unspecified-lightgrey)](#-license)

<img src="docs/screenshots/hero.png" alt="Suraksha landing page hero" width="100%" />

</div>

<br />

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Try It Out](#-try-it-out)
- [Screenshots](#-screenshots)
- [Project Structure](#-project-structure)
- [Sandbox Mode — Read Before Deploying](#️-sandbox-mode--not-production-hardened)
- [License](#-license)

<br />

## ✨ Features

| | |
|---|---|
| 🚨 **Emergency Request Dispatch** | Post a blood request with patient, hospital, and urgency details — every compatible, available donor is notified the instant you submit. |
| 🧠 **Smart Donor Matching** | A scored matching engine ranks donors by blood-group compatibility, availability, 90-day donation eligibility, department, and donation history. |
| 📇 **Donor Directory** | Search and filter the verified campus donor roster; contact details are only revealed on request, protecting donor privacy. |
| 🔔 **Real-Time Notifications** | A live floating alert lets a matched donor accept or decline a request the moment it arrives. |
| 📊 **Donor Dashboard** | Profile management, an availability toggle, donation history, prestige levels, badges, and reward points. |
| 🛡️ **Admin Console** | Verify member accounts, manage active requests, publish campus-wide announcements, and track safety analytics. |
| 📝 **3-Step Registration Wizard** | Account → Profile → Health, with a live progress indicator and inline validation. |
| 🛰️ **Live Donor Tracking** | Uber-style live map: once a donor accepts and taps "Start Journey", the requester watches them move toward the hospital in real time (route + ETA), with strict privacy — location is shared only during an active journey. |

<br />

## 🛠 Tech Stack

<table>
<tr>
<td valign="top" width="50%">

**Frontend**
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — dev server & build
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [React Router](https://reactrouter.com/) — routing
- [Motion](https://motion.dev/) — animation
- [Lucide](https://lucide.dev/) — icons

</td>
<td valign="top" width="50%">

**Backend**
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — real-time database
- [Firebase Auth](https://firebase.google.com/docs/auth) — imported, not yet wired in (see [Sandbox Mode](#️-sandbox-mode--not-production-hardened))

</td>
</tr>
</table>

<br />

## 🚀 Getting Started

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase — point src/firebase.ts at your own
#    Firebase project (Firestore enabled), or use the bundled sandbox project

# 3. Run the dev server
npm run dev
```

The app runs at **http://localhost:3000**. On first load it seeds the database with sample campus users, requests, donations, and announcements if it's empty.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (`vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check the project (`tsc --noEmit`) |

<br />

## 🎮 Try It Out

No need to register — the login screen has **instant demo session launchers** for three roles:

| Role | Name | Blood Group |
|---|---|---|
| 🛡️ Admin / Faculty | Prof. Rajesh Sharma | O+ |
| 🎓 Student Donor | Aarav Mehta | A+ |
| 👷 Security Staff | Vikram Rathore | B+ |

<br />

## 📸 Screenshots

<table>
<tr>
<td width="50%">
<p align="center"><b>3-Step Registration Wizard</b></p>
<img src="docs/screenshots/registration.png" alt="Registration wizard" width="100%" />
</td>
<td width="50%">
<p align="center"><b>Emergency Request — Live Donor Match</b></p>
<img src="docs/screenshots/request-portal.png" alt="Emergency request portal" width="100%" />
</td>
</tr>
<tr>
<td width="50%">
<p align="center"><b>Donor Directory</b></p>
<img src="docs/screenshots/donor-directory.png" alt="Donor directory" width="100%" />
</td>
<td width="50%">
<p align="center"><b>Donation Tips & Eligibility</b></p>
<img src="docs/screenshots/donation-tips.png" alt="Donation tips section" width="100%" />
</td>
</tr>
</table>

<br />

## 📁 Project Structure

```
src/
├── components/
│   ├── LandingPage.tsx           Public marketing homepage
│   ├── AuthModal.tsx             Login / 3-step registration wizard
│   ├── Dashboard.tsx             Donor dashboard shell
│   ├── RequestPortal.tsx         Emergency blood request form
│   ├── DonorDirectory.tsx        Searchable donor roster
│   ├── SmartMatchingPanel.tsx    Scored donor-matching engine UI
│   ├── RealTimeNotifications.tsx Live floating match alert
│   └── AdminPanel.tsx            Admin console
├── utils/seeder.ts               First-run sample data seeding
├── firebase.ts                   Firebase app/Firestore/Auth init
└── types.ts                      Shared TypeScript types
```

<br />

## 🛰️ Live Donor Tracking

An Uber/Ola-style live tracking experience for emergency blood donation, built on Firestore's real-time listeners (no extra backend).

**Flow:** request created → donor matched & accepts → donor taps **Start Journey** → GPS is shared → requester taps **Track Donor** and watches them move live on a map → donor reaches the hospital → tracking stops.

**Privacy first:** a donor's location is **never** exposed passively. Sharing starts only after they accept a request *and* explicitly start the journey, and stops on arrival, completion, cancellation, manual stop, or session expiry. Only the requester, the accepted donor, and admins can ever read those coordinates. No historical GPS trail is stored — only the latest position.

**How it works**
- The donor's browser watches GPS via `navigator.geolocation.watchPosition()`. Writes are throttled — ~4s while moving (by speed *or* distance), ~15s while stationary — so we never write every second.
- The latest position is stored at **`requests/{requestId}/tracking/current`**. The requester subscribes with Firestore `onSnapshot`, so the map updates with no page refresh.
- Distance/ETA and the route line come from **OSRM** (public demo server, no key) with an instant straight-line fallback; hospital coordinates are geocoded via **OpenStreetMap Nominatim** and cached on the request.
- Staleness is surfaced honestly: after 60s "hasn't updated recently"; after 3 min "live location unavailable" — an old fix is never shown as current.

**New packages:** `leaflet`, `react-leaflet`, `@types/leaflet`.

**Environment variables (all optional — defaults need no config):** `VITE_OSRM_URL`, `VITE_ORS_API_KEY` — see [`.env.example`](.env.example).

**Firestore rules:** `firestore.rules` now locks down the tracking subcollection (donor writes only their own location while the request is active; requester/donor/admin read only their own request's tracking) while keeping the other collections open for the demo. **Publish `firestore.rules` in the Firebase console** to enforce this.

**Local testing (two browsers):** open the app in two sessions — a **donor** (who accepts a request and taps Start Journey) and the **requester** (who taps Track Donor). No physical GPS? In Chrome DevTools → **⋮ → More tools → Sensors → Location**, set a custom lat/lng (e.g. `16.5062, 80.6480`), then change it (e.g. `16.5070, 80.6490`) and watch the requester's marker move.

**Limitations:** browser GPS accuracy varies (especially on desktops, which often report no `speed`); the public OSRM/Nominatim servers are rate-limited (swap in your own/ORS key for production); timestamps use device clocks, so large clock skew can affect the "last updated" readout.

<br />

## ⚠️ Sandbox Mode — Not Production-Hardened

> This project currently runs in a **demo/sandbox authentication mode**, not real Firebase Auth. Before deploying for real campus use:

- 🔓 Login/registration compares a plaintext `_sandboxPassword` field stored on the Firestore user document — passwords are **not hashed**.
- 🔓 `firestore.rules` currently allows unrestricted read/write (`allow read, write: if true`) to keep the demo frictionless.

Replace the sandbox auth flow with real Firebase Authentication and lock down `firestore.rules` to per-user access rules before going live.


<div align="center">

Built for the KL University campus community 🩸

</div>
