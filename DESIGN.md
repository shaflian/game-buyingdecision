# Worth It? — Design Notes

## Visual direction
Dark-first gaming tool with an editorial edge. Not a Steam clone — closer to how a design portfolio would build a game calculator. Dark, precise, data-forward.

References: benroachdesign.com (typography confidence, no decoration), xiangyidesign.com (clean containers, restrained color).

## Fonts
| Role | Font | Why |
|---|---|---|
| Everything UI — headings, labels, buttons, body | IBM Plex Sans | IBM's editorial-technical grotesque. Distinct without being stock. Italic weights add contrast. |
| Data values — scores, prices, playtime, meter ticks | IBM Plex Mono | Pairs directly with Plex Sans. Monospaced data reads as deliberate, not decorative. |

Single family system: Plex Sans + Plex Mono. No mixing three families.

Previous fonts (Rajdhani + Bebas Neue + Inter, then Space Grotesk + DM Mono) — converged here because Plex is coherent as a system and has stronger editorial character.

## Typography rules
- Large headings: `letter-spacing: -0.02em` — negative tracking is the editorial signal
- Labels/buttons: `letter-spacing` max `0.06em` — wide spacing + uppercase together reads as template
- DM Mono elements: `letter-spacing: 0` or `-0.01em` — monospace already has inherent spacing
- No `::before` decorative lines on section labels — structure should come from hierarchy, not ornament

## Color
Dark palette sourced from Steam's color language but pulled back from direct imitation:

```
Background stack: #0e1216 → #16202d → #1b2838
Text:             #e8f0f5 (bright) · #c6d4df (body) · #8f98a0 (muted) · #4b6474 (dim)
Accent:           #66c0f4 (blue) — used sparingly, not everywhere
Grade colors:     gold / blue / green / orange / red per tier S→E
```

Color is used as information (grade tiers, primary actions) not decoration.

## Background
Fixed dark gradient with a soft radial top-glow. No grid texture — CSS grid patterns are a strong AI dark-UI tell.

## Containers
- Borders: `1px solid var(--border)` — subtle, not loud
- Padding: generous (16–24px inner, 64px frame)
- No border-radius — sharp edges suit the data-tool aesthetic
- Deal grid uses `gap: 1px; background: var(--border)` for hairline separators

## What to avoid
- Wide letter-spacing (`0.1em+`) everywhere
- ALL CAPS on every element
- Glowing text-shadow on anything except the grade letter
- `::before` / `::after` decorative lines
- Grid/noise background textures
