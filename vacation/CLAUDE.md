# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

A fun, interactive family vacation planning website for a Florida trip (June 6–19, 2026). No framework — plain HTML/CSS/JS, deployable as static files and hostable from the parent GitHub Pages repo.

## Trip Details

### Part 1 — Indian Rocks Beach (June 6–13)
- **Address:** 2302 Beach Trail, Indian Rocks Beach, FL
- **Vibe:** Low-key coastal, direct Gulf beach access, local seafood, sunset walks

### Part 2 — Key West (June 13–19)
- **Hotel:** La Concha Key West, Autograph Collection (Booking.com #6289260624)
- **Location:** Duval Street, downtown Key West
- **Vibe:** Upscale historic hotel, outdoor pool, nightlife, two bars

### Travel Between
- ~432 miles via I-75 S → US-1 S (Overseas Highway)
- ~7.5 hours drive on June 13

## Development

No build step. Serve files directly:

```bash
# From the vacation/ directory
npx http-server .
# or
python3 -m http.server 8080
```

The site lives at `/vacation/` relative to the parent GitHub Pages root (`weolopez.github.io`).

## Architecture Intent

- Single-page or multi-section HTML with smooth scroll/tab navigation
- Interactive elements: countdown timer, itinerary timeline, activity checklists, packing lists, map embed
- Mobile-friendly (family will use phones on the trip)
- No external JS framework — vanilla Web Components or plain DOM are preferred, consistent with the parent repo's style
- Pull in shared styles from `../` if available, otherwise self-contained

## Parent Repo Conventions

This directory lives inside `weolopez.github.io`. Follow parent repo patterns where useful:
- ES modules (`import`/`export`)
- Web Components with Shadow DOM for encapsulated widgets
- No npm/build pipeline unless genuinely needed
