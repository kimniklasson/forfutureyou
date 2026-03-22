# Design Tokens

Mapped to Tailwind CSS custom theme in `src/index.css`.

## Colors

| Token | Light | Dark | Tailwind | Usage |
|-------|-------|------|----------|-------|
| Background | `#FFFFFF` | `#111111` | `bg-white` / body | Page background |
| Card | `#F5F5F5` | `#1C1C1E` | `bg-card` | Exercise cards, category items |
| Accent | `#FFD900` | `#FFD900` | `bg-accent` | Active timer bar, active exercise border, PB sets |
| Accent (70%) | `rgba(255,217,0,0.7)` | — | `bg-accent-70` | Timer bar with backdrop blur |
| Text | `#000000` | `#FFFFFF` | `text-black` / `dark:text-white` | Primary text |
| Backdrop | `rgba(0,0,0,0.15)` | — | `bg-backdrop` | Modal overlay |
| Modal BG | `#FFFFFF` | `#1C1C1E` | — | Bottom sheet modals |

## Typography

| Role | Font | Weight | Size | Tailwind |
|------|------|--------|------|----------|
| Body | Google Sans | 400 | 15px | `text-[15px]` |
| Bold | Google Sans | 700 | 15px | `font-bold text-[15px]` |
| Heading | Google Sans | 700 | 20px | `font-bold text-[20px]` |
| Label | Google Sans | 700 | 12px | `font-bold text-[12px] uppercase tracking-wider` |
| Exercise name | Geist Mono | 400 | 15px | `font-mono font-normal text-[15px] uppercase` |
| Timer | Google Sans | 400 | 31px | `text-[31px]` |
| Rep/Weight value | Google Sans | 700 | 15px | `font-bold text-[15px]` |

## Border Radius

| Token | Value | Tailwind |
|-------|-------|----------|
| Button | 4px | `rounded-button` |
| Card / Input | 8px | `rounded-card` |
| Modal | 16px | `rounded-modal` |
| Icon button | 56px | `rounded-icon` |
| Circle | 9999px | `rounded-full` |

## Layout

| Token | Value | Usage |
|-------|-------|-------|
| Max width | 600px | App container (`max-w-[600px]`) |
| Page padding | 32px (horizontal) | `px-8` |
| Card padding | 16px | `p-4` |
| Header height | ~88px | Fixed top with gradient fade (`--header-bg`) |
| Timer bar | ~96px | Fixed bottom with backdrop blur |
| Bottom nav | ~96px | Fixed bottom with gradient fade (`--footer-bg`) |
| Rep/Weight adjuster height | 40px | `h-10` |

## Spacing

| Gap | Value | Usage |
|-----|-------|-------|
| Card gap | 8px | Between exercise cards |
| Section gap | 40px | Between header and content |
| Inner card gap | 12px | Inside exercise cards |
| Category list gap | 8px | Between category items |

## Gradients & Effects

| Effect | Light | Dark |
|--------|-------|------|
| Header fade | `linear-gradient(to bottom, white 50%, transparent)` | `linear-gradient(to bottom, #111111 50%, transparent)` |
| Footer fade | `linear-gradient(to top, white 60%, transparent)` | `linear-gradient(to top, #111111 60%, transparent)` |
| Modal header fade | `linear-gradient(to bottom, white 50%, transparent)` | `linear-gradient(to bottom, #1c1c1e 50%, transparent)` |
| Modal footer fade | `linear-gradient(to top, white 50%, transparent)` | `linear-gradient(to top, #1c1c1e 50%, transparent)` |
| Timer bar blur | `backdrop-filter: blur(20px)` | Same |
