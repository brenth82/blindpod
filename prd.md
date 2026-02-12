# PRD SCAFFOLD FOR BLINDPOD

## EXECUTIVE SUMMARY
**Key Objectives:**
- Create the first truly accessible podcast management platform optimized for screen reader users
- Enable blind users to independently discover, subscribe, download, and manage podcast content
- Build a sustainable user base of 10,000+ active users within 12 months

**Success Metrics:**
- WCAG 2.1 AAA compliance score
- Average session duration >15 minutes
- User retention rate >60% at 3 months
- Screen reader navigation efficiency (tasks completed <50% faster than competitors)

## PROBLEM STATEMENT
**Pain Points:**
- Existing podcast apps have poor screen reader compatibility (excessive tab stops, unlabeled elements, confusing navigation)
- Blind users face 3-5x longer navigation times to perform basic tasks
- No podcast platforms designed with accessibility as the primary feature, not an afterthought
- Episode management is cluttered—users want clean views of unlistened content

**Opportunity:**
- 7+ million blind/visually impaired people in US alone
- Growing podcast consumption (464 million listeners worldwide)
- Underserved accessibility-first market segment
- Potential for advocacy partnerships and community-driven growth

## SOLUTION OVERVIEW
**Core Concept:**
- Web-first podcast manager with keyboard-first navigation and semantic HTML structure
- Clean interface showing only relevant, unlistened episodes by default
- Automatic feed syncing with intelligent archival of old episodes
- Persistent user accounts to maintain subscriptions and listening history

**Differentiators:**
- Built accessibility-first (not retrofitted)
- Optimized for JAWS, NVDA, and other major screen readers
- Smart episode filtering (hide listened, auto-archive old episodes)
- Minimal UI complexity—every element has clear purpose

## USER PERSONAS
**Persona 1: Sarah - Daily Commuter**
- Blind from birth, expert JAWS user
- Listens to 5-10 podcasts during commute
- Needs: Fast navigation, reliable downloads, clear episode status

**Persona 2: Marcus - Retired Professional**
- Lost vision at 50, moderate screen reader proficiency
- Enjoys news and storytelling podcasts
- Needs: Simple interface, forgiving navigation, email notifications

**Persona 3: Tech-Savvy Early Adopter**
- Congenitally blind, power user, provides feedback
- Manages 30+ podcast subscriptions
- Needs: Keyboard shortcuts, bulk operations, advanced filtering

## TECHNICAL ARCHITECTURE
**Core Stack:**
- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Backend/Database:** Convex (real-time, serverless)
- **Authentication:** Better Auth + Convex integration
- **Email:** Mailslerp for transactional emails
- **Hosting:** Vercel (frontend), Convex (backend)

**Key Components:**
- RSS feed parser and polling service
- Episode download manager (streaming/progressive download)
- User subscription and listening history tracking
- Automated episode archival worker
- Email notification system

**Integrations:**
- Podcast RSS feeds (standard format)
- Better Auth identity providers
- Mailslerp SMTP/API

## FUNCTIONAL REQUIREMENTS
**Core Features (MVP):**
- User registration and authentication (email + password)
- Add podcast by RSS feed URL or search
- View subscribed podcasts list
- View unlistened episodes (main feed)
- Mark episode as listened (hides from main view)
- Access archive of all episodes
- Download episodes for offline listening
- Automatic feed refresh (polling)
- Email verification and optional new episode notifications
- Automated cleanup of archived episodes no longer in RSS feed

**User Stories:**
- US-1: As a blind user, I can register with email/password and verify via email
- US-2: As a user, I can add a podcast by pasting an RSS feed URL
- US-3: As a user, I see only unlistened episodes on my main page
- US-4: As a user, I can mark an episode as listened to remove it from main view
- US-5: As a user, I can access an archive to see all episodes from my subscriptions
- US-6: As a user, I receive email notifications when new episodes are available (optional setting)
- US-7: As a user, my podcasts and listening history persist across sessions
- US-8: As a system, I clean up archived episodes that are no longer in the RSS feed

## IMPLEMENTATION PLAN
**Phase 1 - Foundation (Weeks 1-3):**
- Set up Next.js + Convex + Better Auth
- Implement user registration, login, email verification
- Design accessible component library
- Set up Mailslerp integration

**Phase 2 - Core Features (Weeks 4-7):**
- RSS feed parsing and storage
- Podcast subscription management
- Episode listing (unlistened view)
- Mark as listened functionality
- Basic archive view

**Phase 3 - Enhancement (Weeks 8-10):**
- Episode download functionality
- Automatic feed refresh (cron job)
- Email notifications for new episodes
- Automated archive cleanup
- Screen reader optimization pass

**Phase 4 - Polish & Launch (Weeks 11-12):**
- Accessibility audit with blind testers
- Performance optimization
- Documentation and onboarding
- Beta launch to accessibility community

## SUCCESS METRICS
**KPIs:**
- Accessibility compliance: WCAG 2.1 AAA (target: 100%)
- User acquisition: 500 users in first 3 months
- Engagement: 60%+ weekly active users
- Task completion time: 50% faster than mainstream apps (measured with screen reader users)
- User satisfaction: 4.5+ rating from accessibility community
- Technical: 99.5% uptime, <2s page load times

---

# COMPLETE CLAUDE PROMPT

You are an expert product manager and technical architect. Transform this PRD scaffold into a comprehensive, production-ready Product Requirements Document.

PROJECT SCAFFOLD:

# BLINDPOD - ACCESSIBLE PODCAST WEB APPLICATION

## EXECUTIVE SUMMARY
**Key Objectives:**
- Create the first truly accessible podcast management platform optimized for screen reader users
- Enable blind users to independently discover, subscribe, download, and manage podcast content
- Build a sustainable user base of 10,000+ active users within 12 months

**Success Metrics:**
- WCAG 2.1 AAA compliance score
- Average session duration >15 minutes
- User retention rate >60% at 3 months
- Screen reader navigation efficiency (tasks completed <50% faster than competitors)

## PROBLEM STATEMENT
**Pain Points:**
- Existing podcast apps have poor screen reader compatibility (excessive tab stops, unlabeled elements, confusing navigation)
- Blind users face 3-5x longer navigation times to perform basic tasks
- No podcast platforms designed with accessibility as the primary feature, not an afterthought
- Episode management is cluttered—users want clean views of unlistened content

**Opportunity:**
- 7+ million blind/visually impaired people in US alone
- Growing podcast consumption (464 million listeners worldwide)
- Underserved accessibility-first market segment
- Potential for advocacy partnerships and community-driven growth

## SOLUTION OVERVIEW
**Core Concept:**
- Web-first podcast manager with keyboard-first navigation and semantic HTML structure
- Clean interface showing only relevant, unlistened episodes by default
- Automatic feed syncing with intelligent archival of old episodes
- Persistent user accounts to maintain subscriptions and listening history

**Differentiators:**
- Built accessibility-first (not retrofitted)
- Optimized for JAWS, NVDA, and other major screen readers
- Smart episode filtering (hide listened, auto-archive old episodes)
- Minimal UI complexity—every element has clear purpose

## USER PERSONAS
**Persona 1: Sarah - Daily Commuter**
- Blind from birth, expert JAWS user
- Listens to 5-10 podcasts during commute
- Needs: Fast navigation, reliable downloads, clear episode status

**Persona 2: Marcus - Retired Professional**
- Lost vision at 50, moderate screen reader proficiency
- Enjoys news and storytelling podcasts
- Needs: Simple interface, forgiving navigation, email notifications

**Persona 3: Tech-Savvy Early Adopter**
- Congenitally blind, power user, provides feedback
- Manages 30+ podcast subscriptions
- Needs: Keyboard shortcuts, bulk operations, advanced filtering

## TECHNICAL ARCHITECTURE
**Core Stack:**
- **Frontend:** Next.js 14+ (App Router), React, TypeScript
- **Backend/Database:** Convex (real-time, serverless)
- **Authentication:** Better Auth + Convex integration
- **Email:** Mailslerp for transactional emails
- **Hosting:** Vercel (frontend), Convex (backend)

**Key Components:**
- RSS feed parser and polling service
- Episode download manager (streaming/progressive download)
- User subscription and listening history tracking
- Automated episode archival worker
- Email notification system

**Integrations:**
- Podcast RSS feeds (standard format)
- Better Auth identity providers
- Mailslerp SMTP/API

## FUNCTIONAL REQUIREMENTS
**Core Features (MVP):**
- User registration and authentication (email + password)
- Add podcast by RSS feed URL or search
- View subscribed podcasts list
- View unlistened episodes (main feed)
- Mark episode as listened (hides from main view)
- Access archive of all episodes
- Download episodes for offline listening
- Automatic feed refresh (polling)
- Email verification and optional new episode notifications
- Automated cleanup of archived episodes no longer in RSS feed

**User Stories:**
- US-1: As a blind user, I can register with email/password and verify via email
- US-2: As a user, I can add a podcast by pasting an RSS feed URL
- US-3: As a user, I see only unlistened episodes on my main page
- US-4: As a user, I can mark an episode as listened to remove it from main view
- US-5: As a user, I can access an archive to see all episodes from my subscriptions
- US-6: As a user, I receive email notifications when new episodes are available (optional setting)
- US-7: As a user, my podcasts and listening history persist across sessions
- US-8: As a system, I clean up archived episodes that are no longer in the RSS feed

## IMPLEMENTATION PLAN
**Phase 1 - Foundation (Weeks 1-3):**
- Set up Next.js + Convex + Better Auth
- Implement user registration, login, email verification
- Design accessible component library
- Set up Mailslerp integration

**Phase 2 - Core Features (Weeks 4-7):**
- RSS feed parsing and storage
- Podcast subscription management
- Episode listing (unlistened view)
- Mark as listened functionality
- Basic archive view

**Phase 3 - Enhancement (Weeks 8-10):**
- Episode download functionality
- Automatic feed refresh (cron job)
- Email notifications for new episodes
- Automated archive cleanup
- Screen reader optimization pass

**Phase 4 - Polish & Launch (Weeks 11-12):**
- Accessibility audit with blind testers
- Performance optimization
- Documentation and onboarding
- Beta launch to accessibility community

## SUCCESS METRICS
**KPIs:**
- Accessibility compliance: WCAG 2.1 AAA (target: 100%)
- User acquisition: 500 users in first 3 months
- Engagement: 60%+ weekly active users
- Task completion time: 50% faster than mainstream apps (measured with screen reader users)
- User satisfaction: 4.5+ rating from accessibility community
- Technical: 99.5% uptime, <2s page load times

---

Expand this scaffold into a detailed PRD with these requirements:

1. **EXECUTIVE SUMMARY**
   - Vision and value proposition (2-3 compelling paragraphs)
   - Key objectives with specific metrics
   - Expected impact and success criteria

2. **PROBLEM STATEMENT**
   - Current market situation with data
   - User pain points with real scenarios
   - Opportunity size and cost of inaction

3. **SOLUTION OVERVIEW**
   - How the solution works (detailed explanation)
   - Technical approach and key decisions
   - Core differentiators

4. **USER PERSONAS**
   - 3 detailed personas with names, roles, workflows
   - Specific pain points and quotes
   - Technical proficiency levels

5. **TECHNICAL ARCHITECTURE**
   - Complete system components and technology stack
   - Data flow and integration specifications
   - Scalability and security considerations

6. **FUNCTIONAL REQUIREMENTS**
   - 10-15 detailed user stories with acceptance criteria
   - Feature priority levels (P0, P1, P2)
   - User flow descriptions

7. **API SPECIFICATIONS**
   - Key endpoints with methods and examples
   - Authentication and rate limiting
   - Error handling

8. **DATA MODELS**
   - Database schema with relationships
   - Data validation rules
   - Storage requirements

9. **IMPLEMENTATION PLAN**
   - Sprint breakdown with effort estimates
   - Development phases and dependencies
   - Team composition needs

10. **SUCCESS METRICS**
    - Specific KPIs with targets
    - Measurement methods and review intervals

Make it comprehensive enough for a development team to start building immediately. Use clear markdown formatting with tables where helpful.