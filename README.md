# ♻️ EcoCycle — Smart Waste, Clean Cities

A **smart waste-management ecosystem** connecting **citizens, waste collectors and city
administrators** on one platform. Installable **Progressive Web App** + a **real Node/SQLite backend**.

> Aligned with **UN SDG 11** (Sustainable Cities), **SDG 12** (Responsible Consumption) and
> **SDG 13** (Climate Action). Demo context: **Kampala, Uganda** 🇺🇬

This is **not a mockup** — it has a real database, real accounts, real JWT auth, real file uploads,
real on-device AI, and real (or sandbox-ready) SMS, email, payments and Google login.
See **COMPETITIVE.md** for how it out-competes Yo-Waste, Homeklin and T-Bin.

> ### 🌐 Live demo: **https://ecocycle-gsx4.onrender.com**
> Hosted on Render. The first visit may take ~30s to wake (free tier), then it's fast.
> Sign in with any demo account below. 📄 A full project report and pitch deck are in [`docs/`](docs/).

---

## 🚀 Run it

### 1. Start the backend (serves the app **and** the API on one port)
```bash
cd /opt/lampp/htdocs/ecocycle/server
npm install      # first time only
node server.js
```
You'll see: `♻️ EcoCycle server running → http://localhost:4000`

### 2. Open the app
```
http://localhost:4000/
```

### Install on a phone 📲
Open the **live URL** above (or `http://<your-PC-IP>:4000/` on the same Wi-Fi) in Chrome →
**menu → Install app**. It installs to the home screen, runs full-screen, and works offline
(including the AI model).

### Android app (.apk) 🤖
EcoCycle ships as a real Android package built from the PWA (Trusted Web Activity):
1. Go to **https://www.pwabuilder.com** and enter the live URL above.
2. **Package For Stores → Android** → keep package id `ug.ecocycle.app` → **Download**.
3. Install the generated `.apk` on any Android phone.

The site already serves `/.well-known/assetlinks.json`, so once you paste the package's
SHA-256 fingerprint into that file the app runs **full-screen with no browser bar**.

---

## 👤 Accounts

**Demo logins** (pre-filled on the sign-in screen — tap a role then **Sign In**):

| Role | Email | Password |
|------|-------|----------|
| Citizen | `amina.n@gmail.com` | `ecocycle` |
| Collector | `j.okello@ecocycle.ug` | `ecocycle` |
| Admin | `s.mbabazi@ecocycle.ug` | `ecocycle` |

You can also **Create an account** (real registration), verify with **OTP**, or use **Switch role**
in Profile. Everything you do (reports, recycling, points, bookings) is saved in the real database
and shared across devices.

---

## 🔑 Going fully live (optional — already works in sandbox)

The app runs today in **sandbox mode** for SMS / email / payments / Google. To make each one
**fully live**, paste the keys into `server/.env` and restart — no code changes needed:

| Feature | Keys in `server/.env` | Where to get them |
|---------|----------------------|-------------------|
| **SMS OTP** | `AT_USERNAME`, `AT_API_KEY` (Africa's Talking) *or* `TWILIO_*` | africastalking.com / twilio.com |
| **Email** | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Gmail app password, etc. |
| **Payments** | `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY` (Flutterwave) | flutterwave.com (you've used it before) |
| **Google login** | `GOOGLE_CLIENT_ID` | Google Cloud → OAuth web client |

Until then: OTP codes show **on-screen**, payments show a **sandbox confirmation**, Google shows a
"ready when key added" note. The logic is real either way.

### 💾 Persistent accounts in production (Turso — free)

Locally, all data is saved in a SQLite file that persists on disk. On a **free cloud host
(e.g. Render) the disk is wiped on every restart/redeploy**, so accounts created online would
vanish. To keep them forever, point the app at a free **Turso** cloud database — no code changes,
just two environment variables:

```bash
# one-time, on your computer:
curl -sSfL https://get.tur.so/install.sh | bash   # install the turso CLI
turso auth signup                                  # free account (GitHub login)
turso db create ecocycle
turso db show ecocycle --url        # -> copy as TURSO_DATABASE_URL  (libsql://...)
turso db tokens create ecocycle     # -> copy as TURSO_AUTH_TOKEN
```

Then in **Render → your service → Environment**, add:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | the `libsql://…` URL from above |
| `TURSO_AUTH_TOKEN`   | the token from above |

Save → Render redeploys → accounts now survive every restart and are shared across the website
and the Android app. With both vars **blank**, it transparently falls back to the local file (dev).

---

## 🎬 3-minute demo walkthrough

1. **Sign in** as Citizen (show SDG badges, OTP, Google, Create-account).
2. **Home** → real points, level, streak, next-collection countdown.
3. **＋ Report** → pick *Illegal dumping*, **take a photo** (it really uploads), set urgency → Submit → +40 pts, status timeline.
4. **AI Scan** → take a photo of any bottle/can/phone → **real on-device AI** names it + confidence + how to dispose + nearest centre.
5. **Map** → real bins (colour = fill), centres, trucks, dumping hotspots.
6. **Track** → live truck + ETA. **Schedule** → book a pickup (saved to DB).
7. **Rewards** → log recycling → points rise → redeem airtime / plant a tree; leaderboard.
8. **Impact** → tonnes diverted, CO₂ saved, **circular-economy** value, **SDG 11/12/13** progress.
9. **Switch role → Collector** → today's jobs, optimized route, **Proof & complete** (photo + signature).
10. **Switch role → Admin** → KPIs, charts, manage fleet/bins/users, **emergency alerts**, complaints.

---

## 🛠️ Architecture

```
ecocycle/
├── index.html, manifest.webmanifest, sw.js   ← installable offline PWA shell
├── css/styles.css                            ← design system (light/dark)
├── js/
│   ├── app.js          ← hash router + app shell
│   ├── api.js          ← talks to the backend (JWT)
│   ├── store.js        ← state cache hydrated from the API
│   ├── ai.js           ← real TensorFlow.js + MobileNet waste recognition
│   ├── maps.js charts.js ui.js
│   └── views-core.js views-more.js  ← all screens (3 roles)
├── vendor/             ← Leaflet, Chart.js, TF.js + MobileNet model (all local → offline)
├── assets/samples/     ← sample photos for the AI demo
└── server/             ← REAL backend
    ├── server.js       ← Express API + serves the PWA
    ├── db.js           ← SQLite schema + seed (the database)
    ├── auth.js         ← JWT + bcrypt
    ├── integrations.js ← SMS / email / payments / Google (live or sandbox)
    ├── .env            ← config + keys (gitignored)
    └── ecocycle.db     ← SQLite database file (auto-created & seeded)
```

**Stack:** Node + Express + **SQLite** · **JWT + bcrypt** auth · **multer** uploads ·
**Leaflet/OpenStreetMap** (no key) · **Chart.js** · **TensorFlow.js + MobileNet** (on-device AI) ·
**Flutterwave** payments · **Africa's Talking / Twilio** SMS · **nodemailer** email ·
**Google OAuth**. Frontend is a buildless installable **PWA**.

### Reset the demo database
```bash
rm server/ecocycle.db*    # then restart — it reseeds clean demo data
```

---

*EcoCycle — turning waste into a resource, one scan at a time.* 🌍
