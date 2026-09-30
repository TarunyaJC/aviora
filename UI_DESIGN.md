# AVIORA — UI Design System

A luxury aviation interface: obsidian surfaces, midnight navy depth, silver information text,
and champagne gold reserved for value and action. Dark, cinematic, and quiet.

## Palette (Tailwind 4 tokens)

| Token | Hex | Use |
|---|---|---|
| `obsidian` | `#05070d` | Page background |
| `midnight` | `#0a0f1c` | Raised surfaces, menus |
| `graphite` | `#121a2b` | Cards, dropdown options |
| `mist` | `#1b2743` | Hover surfaces, aircraft body |
| `silver` | `#96a0b5` | Secondary text, metadata |
| `frost` | `#e9edf5` | Primary text |
| `champagne` | `#d4b06a` | **Primary actions, price, accents** |
| `champagne-soft` | `#ecd9a8` | Hover state of primary actions |

Rule: champagne means *interact or pay attention here*. If everything is gold, nothing is.

## Typography

- **Display:** Space Grotesk — headings, prices, times, seat rows, references. Tracked uppercase (`tracking-[0.2em]`+) for eyebrow labels.
- **Body:** Inter — paragraphs, form labels, tables.
- Scale: hero `text-5xl→7xl`, page title `text-3xl→4xl`, section `text-xl→2xl`, body `text-sm/base`, metadata `text-[11px]` uppercase tracked.

## Surfaces

- **Glass** utility: `rgba(18,26,43,0.55)` + 18px blur + saturation + 1px `silver/14` border — the core card language.
- Ambient radial glows (champagne at 8–10% alpha) provide depth without gradients-on-everything.
- Radius: `rounded-2xl` cards, `rounded-3xl` feature panels, `rounded-full` actions.
- Page background: fixed obsidian with a top-center navy glow.

## Components

- **Button** — champagne pill (primary), outline (secondary), ghost (tertiary); loading spinner swaps content; `asChild` renders router links.
- **FlightCard** — airline chip (brand color), status pill, route timeline with plane glyph, duration/stops, price in champagne, motion on entry/hover.
- **SeatMap** — zone-tinted seats (Business gold, Premium Economy sky, Economy neutral), exit-row rings, selected seats glow champagne, occupied seats struck through and disabled; aisle gaps at D and G groups.
- **BookingProgress** — numbered circles with checkmarks; champagne for done/active.
- **Ticket** — dashed-split boarding pass: data grid + QR stub on obsidian, passenger block, "DEMO — not valid for travel" disclosure.
- **EmptyState** — icon in champagne tile, tracked uppercase title, one-sentence guidance, optional CTA.

## Motion (Framer Motion / CSS)

- Easing: `--ease-lux cubic-bezier(0.22,1,0.36,1)`; durations 150–350 ms.
- Cards: 16px rise + stagger (≤ 50 ms/card, capped); hover lift 2px.
- Page transitions via route-level fade; button/icon micro-interactions.
- Reduced motion disables the 3D scene, custom cursor, and parallax entirely.

## Custom cursor

Champagne dot + lagging ring, ring scales and fills over interactive elements. Enabled only for `pointer: fine` and no reduced-motion preference; never hides the native pointer and never intercepts events.

## Accessibility

- Semantic landmarks (`header/nav/main/footer`), skip-to-content link, `aria-label`s on icon buttons and inputs, `aria-pressed` on seats/extras, `role=tablist` on segmented controls, `aria-live` on result counts.
- Champagne on obsidian passes contrast for large text and is paired with frost for body copy; focus-visible rings are champagne.
- No functionality depends on hover alone; all controls are keyboard reachable.
- Seat selection, filters and forms are fully operable without the 3D scene.

## Local storage policy

- `sessionStorage`: access token; lookup email for guest booking retrieval.
- `localStorage`: refresh token; `aviora.booking-draft` (passengers, seats, extras, recent searches).
- Never stored: passwords, card data, JWT secrets.
