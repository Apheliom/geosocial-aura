# Technical Findings: GeoSocial Aura Project

## Project Overview
GeoSocial Aura is a dark-neon cyberpunk-themed social network and municipal telemetry monitor designed to operate dynamically in real-time.

## Key Technologies & Dependencies
*   **Runtime:** Node.js
*   **Web Framework:** Express.js (`server.cjs` serving static assets and API)
*   **Real-time Communication:** `ws` WebSocket Engine
*   **Database:** SQLite3 (`database.sqlite`)
*   **Styling:** Tailwind CSS
*   **Map Interface:** Leaflet.js
*   **Client Audio:** Web Audio API (autonomous client-side synthesizer)
*   **Client Visuals:** HTML5 Canvas (dynamic real-time oscilloscope renderer)

## Core Technical Structures & Formulas

### Database Schema
*   **Table `users` (User accounts):**
    *   `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    *   `username` (TEXT UNIQUE)
    *   `password` (TEXT)
    *   `name` (TEXT)
    *   `avatar` (TEXT)
    *   `bio` (TEXT)
    *   `location` (TEXT)
    *   `interests` (TEXT)
    *   `latitude` (REAL), `longitude` (REAL), `last_seen` (TEXT), `is_ghost` (INTEGER DEFAULT 0)

### User Profile Modal Layout
*   `#profile-modal` structure in `index.html` and `nodes.html`:
    *   `#profile-avatar` (Image tag for avatar)
    *   `#profile-name` (Public name)
    *   `#profile-username` (Username handle, e.g. `@username`)
    *   `#profile-online-badge` (Online/offline indicator)
    *   `#profile-sector` (Location/Sector info)
    *   `#profile-bio` (Biography text)
    *   `#profile-badge-explorer`, `#profile-badge-hacker`, `#profile-badge-operator` (Earned badge icons)
    *   `#profile-posts-grid` (Grid/Feed displaying user-specific posts)

### JavaScript Logic Locations
*   **Settings Modal Handling & Upload:** `public/app.js` lines 730 to 850 handles loading the settings form, parsing fields, profile image selection, input validation, and submission to `/api/users/:id/update`.
*   **Current User Display:** `public/app.js` line 562 (`document.querySelector('.current-user-name')`) and line 666 (`document.querySelectorAll('.current-user-name')`).
*   **Radar Users Rendering & Click:** `public/app.js` lines 2254-2313. Click event on each sidebar item triggers `openUserProfile(u.id)`.
*   **Nodes List rendering & Avatar click:** `public/app.js` lines 2991-3096. Click on `.btn-view-profile-avatar` triggers `openUserProfile(userId)`.
*   **Feed Event Attachment & Click:** `public/app.js` lines 1366, 1526-1535. Click on `.btn-view-profile` triggers `openUserProfile(userId)`.
*   **openUserProfile(userId) function:** `public/app.js` lines 3354-3498. Fetches and populates the details, badges, and user-specific posts grid.
*   **Navbar trigger binding:** `public/app.js` lines 3511-3517 triggers `openUserProfile(user.id)`.
*   **Close button trigger binding:** `public/app.js` lines 3502-3509 hides `#profile-modal`.

## State of Progress
- All profile changes (backend schema, settings layout, Instagram-style profile modal, event triggers) are fully implemented.
- Next: Package the project folder into a `.zip` archive for deployment.
