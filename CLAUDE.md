# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Blindpod** is an accessibility-first podcast web application built for blind and visually impaired users. The core design principle is that accessibility is primary, not retrofitted — WCAG 2.1 AAA compliance, keyboard-first navigation, and screen reader optimization (JAWS, NVDA) are requirements, not enhancements.

## Planned Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Backend/Database:** Convex (real-time, serverless)
- **Authentication:** Better Auth + Convex integration
- **Email:** Mailslerp (transactional emails)
- **Hosting:** Vercel (frontend), Convex (backend)

## Development Commands

Once the project is scaffolded, expected commands will be:

```bash
npm run dev        # Start Next.js dev server
npm run build      # Production build
npm run lint       # ESLint
npx convex dev     # Start Convex dev backend (runs alongside Next.js)
npx convex deploy  # Deploy Convex functions to production
```

## Architecture

The app uses a **Next.js App Router + Convex** architecture:

- **Next.js App Router** handles routing and React Server Components
- **Convex** serves as both the database and serverless backend — all data mutations and queries go through Convex functions (not Next.js API routes)
- **Better Auth** handles authentication, integrated with Convex for session persistence
- RSS feed polling runs as a **Convex scheduled function (cron)**, not a separate service

### Key Data Flows

1. **Feed subscription:** User submits RSS URL → Convex mutation parses and stores feed metadata + episodes
2. **Episode state:** Per-user listened/unlistened status stored in Convex, not in the RSS source
3. **Main feed view:** Queries only unlistened episodes; archive view shows all episodes
4. **Feed refresh:** Convex cron job polls RSS feeds periodically; new episodes inserted, episodes missing from feed get archived

### Accessibility Requirements

Every UI component must:
- Use semantic HTML (landmarks, headings hierarchy, lists for episode collections)
- Have proper ARIA labels on all interactive elements
- Be fully operable by keyboard alone
- Announce state changes to screen readers (e.g., "Episode marked as listened")
- Minimize tab stop count — no decorative or redundant focusable elements

### .gitignore Notes

The `.gitignore` currently references Agda build artifacts (`*.agdai`, `MAlonzo/`), which are unrelated to this project and should be updated when the project is initialized.
