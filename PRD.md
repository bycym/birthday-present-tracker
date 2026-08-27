# Product Requirements Document (PRD)

## Project Name

Birthday Gift Tracker

## Vision

Build a privacy-first web application that helps users track birthdays from their Google Calendar and remember who has already received a birthday gift during the current year.

The application should require no backend and run entirely as a static website hosted on GitHub Pages.

---

# Goals

The application should allow users to:

* Authenticate with Google.
* Read birthdays from one or more Google Calendars.
* Display upcoming birthdays within a configurable date range.
* Track whether a gift has already been purchased or given.
* Store all user data locally.
* Work across browser refreshes without losing state.
* Require no server infrastructure.

---

# Non-Goals

Version 1 will NOT include:

* User accounts
* Backend
* Cloud synchronization
* Sharing with other users
* Email notifications
* AI gift recommendations

These may be added in future versions.

---

# Technology Stack

Frontend

* React 19
* TypeScript
* Vite

UI

* Tailwind CSS
* shadcn/ui

State

* TanStack Query
* React Context (or Zustand if state grows)

Local Database

* IndexedDB
* Dexie.js

Authentication

* Google Identity Services (OAuth 2.0 PKCE)

Hosting

* GitHub Pages

CI/CD

* GitHub Actions

---

# Functional Requirements

## Authentication

User can:

* Sign in with Google
* Sign out
* Re-authenticate when required

Application should:

* Never store Google credentials
* Never expose secrets
* Store only local application data

---

## Calendar Discovery

Application should:

Retrieve all accessible calendars.

Examples:

* Birthdays
* Personal
* Family
* Work

User can select one or multiple calendars.

Selection should be persisted locally.

---

## Birthday Sources

Version 1 should support multiple birthday strategies.

Examples:

### Strategy 1

Google Birthdays calendar

### Strategy 2

Dedicated birthday calendar

Example:

Birthday Calendar

### Strategy 3

Normal calendar events

Example

Birthday - John

or

🎂 Anna

Each strategy should implement a common interface.

Example

BirthdayProvider

getBirthdays(range)

This allows adding future providers without changing the UI.

---

## Birthday Model

Canonical model

* id
* name
* date
* calendarId
* calendarName
* source
* recurring
* originalEventId

The UI should never depend on Google-specific objects.

---

## Gift Tracking

Each birthday can have:

* Gift purchased
* Gift delivered
* Notes
* Gift description
* Budget
* Actual cost

Gift status is tracked per year.

Example

2026

John

Purchased

Delivered

Gift

LEGO

Budget

25000

Cost

22000

Notes

Already wrapped

---

## Search

User can choose

* Next 30 days
* Next 60 days
* Next 90 days
* Custom date range

Results should update immediately.

---

## Dashboard

Show

Upcoming birthdays

Name

Birthday

Days remaining

Gift status

Delivered status

Search

Calendar filter

---

## Birthday Details

Clicking a birthday opens

Name

Birthday

Calendar source

Gift information

Notes

History

---

## Gift History

Track previous years.

Example

2024

Book

2025

Wine

2026

Board Game

---

## Local Storage

Persist:

Selected calendars

Search preferences

Gift history

Application settings

Notes

Everything except Google access tokens.

---

# Data Model

Birthday

* id
* name
* date
* calendarId
* source

GiftRecord

* birthdayId
* year
* purchased
* delivered
* budget
* actualCost
* description
* notes

Settings

* selectedCalendars
* defaultSearchRange
* theme

---

# Architecture

Google Calendar API

↓

Birthday Providers

↓

Canonical Birthday Model

↓

Business Services

↓

IndexedDB

↓

React UI

---

# UI Pages

Login

Dashboard

Birthday Details

Settings

About

---

# Future Features

CSV import

ICS import

Export backup

Import backup

PWA support

Offline mode

Recurring reminders

Gift ideas

AI gift suggestions

Shared family mode

Multi-device synchronization

Cloud backup

Dark mode

Push notifications

---

# Quality Requirements

Fast initial load

Responsive UI

Works on desktop and mobile

Offline-capable after first load

No backend dependency

Strong typing with TypeScript

Minimal bundle size

Modular architecture

Easy to extend with new birthday providers

---

# Security

Use OAuth PKCE

Never store Google credentials

Never require API secrets in the repository

Store only local application data

Use least-privilege Google Calendar permissions

---

# Success Criteria

A user can:

1. Open the application.
2. Sign in with Google.
3. Select calendars.
4. Search birthdays.
5. See upcoming birthdays.
6. Mark gifts as purchased or delivered.
7. Close the browser.
8. Return later and continue without losing local data.

No backend is required.

---

# Suggested Folder Structure

```text
src/
  api/
  auth/
  components/
  db/
  hooks/
  pages/
  providers/
    BirthdayProvider.ts
    GoogleBirthdayProvider.ts
    CalendarBirthdayProvider.ts
    EventBirthdayProvider.ts
  services/
  models/
  types/
  utils/
  contexts/
```

# Development Principles

* SOLID principles
* Composition over inheritance
* Provider pattern for birthday sources
* Repository pattern for IndexedDB
* Strict TypeScript
* Small reusable React components
* No business logic inside UI components
* Clean separation between API, domain, persistence and presentation layers

