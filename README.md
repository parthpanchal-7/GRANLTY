# GRANTLY — Unified Scholarship Discovery & Management Platform

<div align="center">

**Real-Time Scholarship Discovery · One-Time Registration (OTR) · AISHE Institute Verification · PFMS Direct Benefit Transfer**

[![Angular 21](https://img.shields.io/badge/Angular-21.0+-DD0031?style=flat-square&logo=angular)](https://angular.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.1+-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Three.js WebGL](https://img.shields.io/badge/Three.js-WebGL_Daylight_Stage-000000?style=flat-square&logo=threedotjs)](https://threejs.org)
[![Firebase Cloud Firestore](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)

</div>

---

## Overview

**GRANTLY** is a unified scholarship discovery, verification, and Direct Benefit Transfer (DBT) management platform designed with a high-key **Daylight Porcelain WebGL & SVG Scroll Architecture** (inspired by Lusion.co) and modeled functionally after the **National Scholarship Portal (NSP 2.0)** and **Unstop**.

It connects **Students**, **AISHE / UDISE+ Institute Nodal Officers (INOs)**, and **Central / State Ministry PFMS Authorities** inside a single reactive application backed by **Firebase Authentication** and **Cloud Firestore (`asia-south1`)**.

---

## Core Architecture & Features

### 1. Daylight WebGL Stage & Dynamic Scroll-Movable SVG Spine
- **Sequential `G-R-A-N-T-L-Y` Pre-Loader & Live Cycle HUD**: Staggered vertical character reveal (`140ms` per letter) accompanied by a live scholarship cycle countdown (`14D : 08H : 32M : 45S`) that docks to the bottom-right viewport upon unlock, followed by a synchronized hero typewriter reveal.
- **Three.js Daylight Porcelain Stage**: Interactive studio-lit matte porcelain and cobalt refractive geometry (`#F4F6FA` canvas, `#2B44FF` electric cobalt accents) responding smoothly to cursor movement and scroll velocity.
- **Lusion-Style Scroll-Movable Cubic-Bezier Spine**: A central vector path (`#2B44FF` → `#6366F1`) that both draws itself progressively and undulates horizontally in response to scroll velocity, branching into **4 interactive spine flashcards** and terminating in **3 harmonic pendulum role portals**.

### 2. Four Interactive Spine Flashcards
1. **01. Benefits & Financial Aid Slabs**: Interactive Annual Family Income slider (`₹1,00,000` – `₹8,00,000`), Course Level selector (`B.Tech/STEM`, `B.A./B.Com`, `M.Tech/MBA`, `Ph.D.`), and Hosteller/Day-Scholar toggle computing real-time Tuition Waivers, Hostel Stipends, and Book Grants.
2. **02. Who Can Apply? — Live Eligibility Matrix**: Multi-category quota toggles (`General-EWS`, `OBC`, `SC/ST`, `Minority`, `PwD`, `Single Girl Child`) + minimum qualifying marks slider showing live matching schemes.
3. **03. How to Apply — 4-Step OTR & PFMS Pipeline**: Interactive architectural stepper covering **UIDAI Face e-KYC OTR**, **Smart Dossier OCR**, **AISHE L1 Split-Screen Audit**, and **NPCI/PFMS Direct Bank Transfer**.
4. **04. National OTR Catalog & Global/External Scholarship Directory**: Filter between gazetted national schemes and **Global / External Non-Registered Portal Links** (e.g., Rhodes, Gates Cambridge, JN Tata Endowment), with a working form for students or officers to index new external scholarship URLs.

### 3. Unified Profile, OTR Registration & Role Access Control
- **Public Exploration vs. Authenticated Application**: Guests can browse all scholarships and test eligibility sliders, but clicking **Apply** enforces **Student Sign-In / OTR Registration**.
- **Strict Role-Guarded Pendulum Leaves**:
  - **Leaf 01 (Student Workspace)**: Open for browsing; requires Student OTR sign-in to submit applications.
  - **Leaf 02 (AISHE Institute Nodal Officer Desk)**: Restricted to verified AISHE / UDISE+ / NCVT Institute Nodal Officers (or Super Admin).
  - **Leaf 03 (Scheme & Ministry Authority Portal)**: Restricted to verified Ministry & PFMS Nodal Officers (or Super Admin).
- **Firebase Google Authentication & Cloud Firestore Sync**: Supports 1-click Google Sign-In alongside role-specific KYC registration and a universal evaluation bypass (`admin@gmail.com` / `admin123`).

### 4. End-to-End Synchronized Portal Workspaces
- **Student Workspace**: Live OTR Profile Editor, Unstop-style multi-filter Scholarship Browser with `"Why am I eligible?"` checklists, 1-click simulated Smart Dossier OCR scanner, Multi-step Application Wizard with Printable Acknowledgment Slip, and a 5-stage **Kanban Tracker** with 1-click **Defect Resolution**.
- **AISHE Institute Nodal Officer (INO) Desk**: College verification queue with a Split-Screen Document & Certificate Auditor to **Verify & Forward**, **Mark Defective** (with custom remarks that reflect immediately on the student's Kanban board), or **Reject**.
- **Scheme & Ministry Authority Portal**: Gazette new scholarship schemes directly into the student catalog, run the **Automated Composite Merit List Ranker**, and trigger **PFMS / NPCI Direct Benefit Transfers** with UTR batch tracking.

---

## Quick Evaluation Credentials

For instant testing and evaluation across all three portals (Student OTR, Leaf 02 AISHE Institute Desk, and Leaf 03 Ministry PFMS Portal):

| Portal Role | Email / ID | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Universal Admin Bypass** | `admin@gmail.com` | `admin123` | Unlocks **All 3 Portals** (`SUPER_ADMIN`) |
| **Student (OTR Profile)** | `aarav.sharma@iitb.ac.in` | `scholar2026` | Student OTR & Application Submission |
| **Institute Nodal Officer (Leaf 02)** | `ino.scholarship@iitb.ac.in` | `ino2026` | AISHE L1 Document Verification Desk |
| **Ministry & PFMS Nodal (Leaf 03)** | `nodal.dbt@education.gov.in` | `ministry2026` | Scheme Gazette, Merit List & PFMS DBT |

---

## Local Development & Testing

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10+`

### Installation & Dev Server
```bash
# 1. Install dependencies
npm install

# 2. Start the development server on http://localhost:3000
npm run dev
```

### Verification Commands
```bash
# Run pure business logic unit tests (OTR, RBAC, Aid Slabs, Merit List, PFMS DBT)
npx tsx --test src/app/core/scholarship-rules.test.ts

# Lint TypeScript, Angular templates, and Firestore Security Rules
npm run lint
npx eslint firestore.rules

# Production build (outputs static bundle to dist/app/browser)
npm run build
```

---

## Syncing to GitHub

To push this repository to your GitHub account cleanly (all build artifacts, cache folders, and platform metadata are already excluded via `.gitignore`):

```bash
# 1. Initialize Git (if not already initialized)
git init

# 2. Stage all project files
git add .

# 3. Create your production commit
git commit -m "feat: complete GRANTLY unified scholarship platform with Firebase & Lusion daylight UI"

# 4. Link your GitHub repository and push
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Deployment & Custom Domain Guide

GRANTLY includes pre-configured deployment manifests (`vercel.json`, `render.yaml`, and `firebase.json`) so you can deploy to any major cloud provider in minutes.

### Option 1: Deploy on Vercel (Recommended for Instant Global CDN)

1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
3. Vercel automatically detects `vercel.json` with the following settings:
   - **Framework Preset**: `Angular`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/app/browser`
4. Click **Deploy**.
5. **Connect Custom Domain on Vercel**:
   - Open your project in the Vercel Dashboard → **Settings** → **Domains**.
   - Enter your custom domain (e.g., `grantly.in` or `scholarships.yourdomain.com`).
   - Add the provided **A Record** (`76.76.21.21`) for the apex domain or **CNAME Record** (`cname.vercel-dns.com`) at your domain registrar (Namecheap, Cloudflare, GoDaddy, Google Domains).
   - Once your custom domain is live, add it to **Firebase Console → Authentication → Settings → Authorized domains** so Google Sign-In popups work on your custom domain.

---

### Option 2: Deploy on Firebase Hosting (Native Integration with Firestore)

Because your project is already linked to Firebase Project `gen-lang-client-0740133777` (`asia-south1`), deploying to Firebase Hosting keeps your frontend, Auth, and Firestore on the same Google Cloud edge network.

```bash
# 1. Install Firebase CLI globally (if not installed)
npm install -g firebase-tools

# 2. Authenticate with your Google account
firebase login

# 3. Build the production Angular bundle
npm run build

# 4. Deploy both Firestore Security Rules and Hosting to your Firebase project
firebase deploy --project gen-lang-client-0740133777
```

**Connect Custom Domain on Firebase Hosting**:
1. Open the [Firebase Console](https://console.firebase.google.com/) → select project `gen-lang-client-0740133777` → **Hosting**.
2. Click **Add custom domain** and enter your domain name.
3. Copy the **TXT verification record** and **A records** into your DNS provider's dashboard. Firebase automatically provisions a free SSL/TLS certificate.

---

### Option 3: Deploy on Render

1. Push your repository to GitHub.
2. Log in to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Static Site** (or **Blueprint** to auto-read `render.yaml`).
3. Verify the settings:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist/app/browser`
   - **Redirects / Rewrites**: Source `/*` → Destination `/index.html` (Action: `Rewrite`)
4. Click **Create Static Site**.
5. **Connect Custom Domain on Render**:
   - Go to your Static Site → **Settings** → **Custom Domains** → **Add Custom Domain**.
   - Point your domain's DNS `CNAME` record to `<your-app>.onrender.com`.
   - Remember to add your custom domain under **Firebase Console → Authentication → Settings → Authorized domains**.

---

## Support & Contact

For OTR registration inquiries, AISHE / UDISE+ Nodal Officer onboarding, external scholarship link indexing, or PFMS integration support:

- **Official Support Desk**: [parthpanchal1932@gmail.com](mailto:parthpanchal1932@gmail.com)
