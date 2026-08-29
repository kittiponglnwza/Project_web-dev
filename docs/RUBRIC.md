# Rubric Evidence (Web Development Project 040613411)

## 1. Wireframe & System Architecture
- **Status:** ✅ Complete
- **Evidence:** 
  - Wireframes: `docs/wireframe/home.png`, `docs/wireframe/login.png`, `docs/wireframe/register.png`, `docs/wireframe/tenant-dashboard.png`, `docs/wireframe/admin-dashboard.png`
  - System Architecture: `docs/system-architecture.png`
  - *(Note: Please update the placeholder images in the repository with the actual exported images from Figma/Canva before submitting.)*

## 2. CSS Selectors
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** `css/style.css`
  - Universal (`*`): Line 23
  - Type (`body`): Line 24
  - Class (`.room-box`): Multiple occurrences
  - ID (`#loginForm`): Bottom of file
  - Pseudo-class (`:hover`): Multiple occurrences (e.g. `.action-btn:hover`)
  - Pseudo-element (`::placeholder`, `::before`): Bottom of file
  - Attribute (`input[type="text"]`): Bottom of file
  - Descendant (`.nav-menu ul`): Bottom of file
  - Child (`.nav-menu > ul > li`): Bottom of file
  - Adjacent sibling (`.lux-input:focus + i`): Bottom of file
  - Specificity Weight (`#registerForm .lux-input:focus`): Bottom of file

## 3. Front-End Validation
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** 
  - HTML Built-in (`required`, `type="email"`): `login.html`, `register.html`
  - Regex via Pattern (`pattern="[0-9]{10}"`): `register.html`
  - JS Validation (Password match, Phone length): `js/auth.js` (`handleRegister`)

## 4. Semantic Layout
- **Status:** ✅ Complete
- **Evidence:** `admin/*.html`, `tenant/*.html`, `index.html`
  - Replaced `<div>` with proper `<nav>`, `<main>`, `<header>`, and `<section>` across all 15 pages in the project. Covers > 50% of the website.

## 5. Mobile First / Responsive
- **Status:** ✅ Complete
- **Evidence:** `css/style.css` (Bottom of file)
  - Desktop: 1440px (Default)
  - Tablet: 992px (`@media (max-width: 992px)`)
  - Mobile: 576px (`@media (max-width: 576px)`)
  - `display: none` applied to `.sidebar` on mobile, making the main content full width.

## 6. DOM Manipulation
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** 
  - `document.getElementById`: Used throughout `js/script.js` and `js/auth.js`
  - `window.addEventListener('load')`: Used in `js/script.js`
  - Form Data UI changes: Show/Hide error messages (`phoneError.style.display = "block"`) in `js/auth.js`

## 7. JSON
- **Status:** ✅ Complete
- **Evidence:** `data/rooms.json` and `js/script.js`
  - JSON file is fetched using `fetch()` in the `catch` block of `fetchRooms()`.
  - Processed and rendered to UI via `renderRooms()` as a fallback when Supabase fails.

## 8. Database + CRUD
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** 
  - Create: `admin/create_bill.html`
  - Read: `tenant/dashboard.html`, `index.html`
  - Update: `admin/users.html` (Updating room numbers)
  - Delete: `admin/users.html` (Deleting users)
  - Pagination (Big Bonus): Custom JS pagination implemented in `admin/users.html` (5 items per page)

## 9. Cookies + Session
- **Status:** ✅ Complete
- **Evidence:** `js/auth.js` (Login function & DOMContentLoaded)
  - Features the full lifecycle: Initialize -> Store -> Get -> Retrieve ID -> Remove.
  - Used in the "Remember Me" checkbox. 
  - Stores `rememberMe=true` in `document.cookie` and `savedEmail` + `sessionID` in `sessionStorage`. Clears them when unchecked.

## 10. Ajax
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** `js/script.js`
  - `fetch('data/rooms.json')` API used to fetch local JSON.
  - Properly chained with `.then(res => res.json())` and used to update DOM.

## 11. Statistical Report
- **Status:** ✅ Complete (Basic + Bonus + Big Bonus)
- **Evidence:** `admin/dashboard.html`
  - Table: Displays billing statistics.
  - Chart: Area Chart using Chart.js based on revenue data.
  - Filter: Dropdown filter for Year that automatically updates the chart data dynamically.
