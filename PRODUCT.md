# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Yomi is primarily for its owner: a personal manga reader used to discover and
read MangaWorld content on a phone, tablet, or desktop.

## Product Purpose

Yomi provides a focused, installable web reader for Italian manga content. It
helps the user find manga, follow a personal library, read chapters comfortably,
and preserve reading progress across devices. Success means opening the app and
getting to the next chapter quickly, with little friction or distraction.

## Positioning

Yomi is a personal, single-origin PWA built around a clean reading flow rather
than a general-purpose content site: the backend handles MangaWorld scraping,
image proxying, and optional state backup so the browser experience stays
simple and fast.

## Operating Context

- The primary use case is personal reading, often on a phone after installing
  the PWA from Safari or another mobile browser.
- The user can also read on desktop through the same web origin.
- Typical workflows are browsing popular or recently updated manga, searching,
  opening a title, choosing a chapter, reading vertically or horizontally, and
  returning to the library.
- Reading a chapter marks it read and cascades to earlier chapters; new chapter
  badges help the user notice updates.
- Browser state is backed up to the server and can be exported/imported as JSON.

## Capabilities and Constraints

- The frontend is a framework-free PWA served by the Python backend in `web/`.
- MangaWorld is scraped as HTML; it is not treated as a stable API.
- The backend serves JSON endpoints, proxies MangaWorld images with the needed
  referrer, hosts static PWA files, and stores optional user-state backup.
- Core surfaces are Home, Search, Manga Detail, Chapters, Reader, Library, and
  Backup/Sync settings.
- The reader supports continuous vertical mode and page-by-page horizontal
  mode, including tap-to-toggle reading chrome.
- Manga and chapter identifiers are encoded MangaWorld URLs.
- The app should feel modern, professional, cooler, and faster. These are
  confirmed product goals; the visual treatment remains open for later design
  work.
- The current backup endpoint is intentionally open and shared across devices;
  it is suitable for personal use and must not be presented as private,
  multi-user account storage without additional product work.
- The app must remain usable as an installable mobile web app and as a desktop
  browser experience.

## Brand Commitments

The product name is Yomi (読み). Existing Italian interface terminology and the
Yomi name should be preserved unless a later product decision changes them.

## Evidence on Hand

- Product overview and deployment guidance: `README.md`.
- Existing PWA shell and metadata: `web/index.html` and
  `web/manifest.webmanifest`.
- Frontend behavior and views: `web/app.js`, `web/store.js`, and `web/sync.js`.
- Backend scraper, API, image proxy, and static hosting:
  `web/server.py` and `web/mangaworld.py`.
- Existing icons: `web/icons/`.
- No testimonials, customer research, commercial claims, or analytics evidence
  are available; future work must not invent them.

## Product Principles

- Get the reader to the next chapter with minimal friction.
- Make personal reading state reliable across sessions and devices.
- Keep the reading surface focused and free of ads and tracking.
- Favor responsive performance and clear interaction over ornamental complexity.
- Preserve a coherent experience across installed PWA and desktop web use.

