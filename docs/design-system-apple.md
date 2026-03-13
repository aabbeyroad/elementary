# Elementary Apple-Inspired Design System

## Design goals

- Clarity: content-first hierarchy with one dominant header per screen
- Restraint: fewer borders, softer surfaces, less icon noise
- Spaciousness: larger padding and consistent rhythm across cards and forms
- Premium calm: neutral surfaces, blue accent, subtle depth, rounded geometry

## Inconsistencies found before redesign

- Layout: each screen used different header density and padding rules
- Spacing: cards, forms, and lists mixed `p-3`, `p-4`, `p-6` without a shared system
- Typography: titles, subtitles, badges, and helper text used unrelated sizes and weights
- Color: default Tailwind palette mixed with inline colors and temporary warning fills
- Component style: cards, buttons, badges, forms, and navigation had different radii and elevation
- Navigation: top bars and bottom nav used unrelated shapes and emphasis patterns
- Form UI: native select, inputs, and buttons did not share height, radius, or focus treatment
- Modal: sheets and confirmation dialogs used different surfaces and spacing
- Interaction states: hover/focus/active depth cues were inconsistent

## Tokens

### Color

- `--background`: soft grouped canvas
- `--card`: translucent white elevated surface
- `--primary`: Apple-like blue accent
- `--secondary`: quiet neutral fill
- `--accent`: pale blue selection and active surface
- `--muted-foreground`: low-emphasis supporting text
- `--destructive`: strong but controlled delete state

### Typography

- Font stack: Apple system stack with Korean fallback
- Hero title: large, tight tracking for page identity
- Section title: medium size with subtle negative tracking
- Body: compact but relaxed line-height for scannability
- Labels/badges: high-contrast compact microcopy

### Spacing

- Page shell: `px-4/6`, generous vertical gap stack
- Header surface: `p-5/6`
- Cards: `p-6/7`
- Control groups: `gap-2/3`

### Radius

- Small controls: 18px
- Buttons and segmented items: full pill
- Cards: 26px
- Header hero surfaces: 28px

### Shadow

- `--shadow-subtle`: small elevation for controls
- `--shadow-surface`: default card elevation
- `--shadow-floating`: navigation and floating overlays

### Motion

- 200ms ease-out for buttons and navigation
- subtle active scale on press
- no exaggerated transforms

### Focus

- soft 4px blue ring
- consistent across buttons, inputs, select, segmented items

## Standardized components

- Button: filled, outline, secondary, tonal, destructive, ghost
- Input: shared height, radius, translucency, shadow, focus ring
- Select: native select wrapped with shared surface and chevron
- Card: unified elevated translucent container
- PageHeader: shared hero header for screen identity
- SegmentedControl: Apple-style content mode switcher
- Notice: info, success, warning, destructive alert surface
- ConfirmDialog: shared destructive decision UI
- Table: premium data surface for future administrative views
- Tooltip: small floating helper for compact icon actions
- BottomNav: floating glass navigation capsule

## Rollout scope in this pass

- Global tokens and surfaces
- Bottom navigation and shell
- Login
- Dashboard / weekly / monthly schedule views
- Settings
- Children
- Supplies
