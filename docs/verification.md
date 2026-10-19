# Verification — three-experience portfolio

## Automated checks

Run with Node 22 or later:

```sh
node check.mjs
node --test tests/*.test.mjs
```

Passed: 58 markup links, 16 original images, all 19 canonical project records, unique IDs, category/status metadata, local CSS assets and font paths, and deferred experience scripts. JavaScript syntax was checked for each application script and the glass renderer.

All four Minesweeper regression tests passed. They cover all 81 first-click positions, exact mine counts, independently computed adjacency values, flood reveal, flags and the ten-flag cap, winning, losing, frozen completed games, and reset.

## Browser checks

Tested in the Codex in-app browser using desktop, 768px tablet, 360px phone, and 740×360 landscape viewports:

- Chooser links and typed selection; direct experience URLs; Back/Forward; legacy `#about` navigation.
- Project category filtering, search, no-results feedback, reset, and the experiment cards.
- Terminal project/category commands, project details and links, Tab completion, history recall, amber theme, and escaped invalid input.
- Desktop project folders/details, dragging, keyboard resizing, maximize/restore, minimize/taskbar restore, close/reopen, and Start-menu switching.
- Notepad local persistence, storage-denied session fallback, and a downloaded text file whose contents matched the editor.
- Minesweeper first move, flag mode, counter updates, and restart, in addition to the complete rule tests above.
- Static full-portfolio fallback with scripts removed; WebGL-unavailable fallback; reduced-motion behavior using a test fixture; only the core script present on the fresh chooser.
- 200% root text size at desktop width with no horizontal overflow. This is a text-scaling check, not a claim of native browser zoom certification.
- Terminal prompt remains visible in the 360px phone and short landscape layouts. Desktop windows fill the phone workspace.
- The terminal-style 404 page and its recovery links.

The QRcodeforeveryone, htmltopng, and BlackLabSpotsShop destinations were opened successfully and their expected page content was visible. This checks availability, not every feature of those separate applications.

No application errors or warnings appeared during the completed browser checks. Browser screenshots are included alongside the documentation.

## Cursors and extras (2026-10-16)

Checked with Playwright Chromium at 1280×800, 360×740 (touch), with reduced motion, and with storage blocked:

- Each cursor applies to the page, links and buttons in all three views. Text fields keep the text cursor, desktop title bars keep `move`, and the resize handle keeps `nwse-resize`. The choice survives a reload. With storage blocked it still applies for the visit.
- `/` and Ctrl+K open the jump dialog; typing filters it, Enter scrolls to and focuses the card, Esc closes it. `/` typed into the search box stays in the box.
- At the bottom of the page every card is fully visible; with reduced motion no card animates. The back-to-top link is hidden at the top and shows after scrolling.
- Terminal: `ls`, `cd players`, `cat ipod`, `pwd`, `cd ..`, `cd nope`, `neofetch`, `theme crt`, `theme hyper`, `cursor spot`, `sudo …`, and Tab completion of `cd pl`.
- The desktop Mouse window and its Start menu entry.
- No horizontal overflow at 360px; the cursor picker and back-to-top link are hidden on touch screens.

Screenshots do not show the real mouse pointer, so the cursors were checked by their computed CSS and by rendering the SVG files, not by seeing them on screen. Firefox and Safari were not tested. Browsers without CSS scroll timelines (Firefox at the time of writing) show the cards without the rise-in effect.

## Limits

The browser was using a dark appearance. Automatic light-mode CSS and high-contrast overrides were inspected, but were not tested by changing the operating system settings. Reduced motion, denied storage, and missing WebGL were exercised with temporary local test fixtures, which are not part of the delivered site.

The application is a portfolio simulation, not an operating system. Window positions and terminal history persist only while the document stays open. No commit, push, or deployment was performed.

## Docs and nine new projects (2026-10-18)

`node check.mjs` and `node --test tests/*.test.mjs` passed: 28 project cards with a Docs link each, 8 fork credits, 4 public projects, a docs page and sidebar link for every project, section ids prefixed with their page, no duplicate ids, no outside requests from the docs. 12 tests, among them hash resolution (including `#constructor`, which once matched an inherited property) and search ranking.

Checked with Playwright Chromium over `http://127.0.0.1` and from `file://`:

- The website lists 28 projects. A card's Docs link opens its docs page, and the terminal's `open videoina` shows the Docs link.
- Docs deep links open the right page (`#tabshell`) and section (`#tabshell-limits`). The "On this page" list and previous and next links follow the page. Search with `/` and Ctrl+K: typing, Enter and Esc. The colour mode switch cycles through system, light and dark.
- Link colour against the page background is at least 4.5:1 on all 29 pages, in light and in dark.
- Banner text (title, tagline, tags) was measured against the lightest pixel behind it, with the text hidden, on all 29 pages at 1280 and 360 px. Every tagline and tag reaches 4.5:1 and every title 3:1.
- At 360 px wide there is no horizontal scroll, and the page menu folds into "All pages". No console errors.
- Keyboard only: skip link, brand, search, Portfolio, GitHub, colour mode, then the sidebar. Enter on a sidebar link opens the page and moves focus to it.
- Playwright WebKit and Firefox: a deep link and search both work, with no errors. That is not the same as testing real Safari.

Not checked: a real phone and screen readers.

## Fact-check, 18 October 2026

Every card and docs page was compared with its project's source, LICENSE file, git history, the public GitHub repositories and the live demos. Fixed: Realistic Vinyl Player (described and pictured the Vite build; now the single-file build), Paint97 (Clippy is MiniCPM-V 4.7 1B, 1573 MB, CPU fallback), Spot's Biscuit Snake (AI plays with Laya, and its outside requests), PhotoCraft (build path, upstream is MIT OR Apache-2.0), audiocheck, 8-Bit Vinyl Player, QRcodeforeveryone, htmltopng, Qrer, LiquidFrame, OpenFinder and web2app (GPL-3.0-or-later). Added new facts to many pages and three projects: Retrofind, container (fork) and Vinyl Player.

`node check.mjs` and `node --test tests/*.test.mjs` pass: 31 cards, 9 fork credits, 5 public projects, 32 docs pages. Playwright Chromium over http and `file://`: 31 cards, the tools filter, the jump dialog, `open retrofind` and `open container` in the terminal, the new docs pages, no page errors. Body text and links (not banners) on the 10 docs pages measured, among them the three new ones, are 7:1 or better in light and dark.

## Sharper images, 19 October 2026

The 25 card images are now WebP, 1440 px wide where the source allows: audiocheck and OpenFinder come from 1280 px screenshots, Spot's Biscuit Snake is 1272 px and the container dashboard 1100 px, because that is what their sources hold. They are made from each project's own screenshots, or captured again at 2× in Playwright (TabShell headed, because headless Chromium draws xterm's WebGL glyphs at double size at 2×; LiquidFrame on a throwaway library). The largest is 226 kB. `node check.mjs` and the tests pass, every image loads over http and `file://`, and nothing returns an error.
