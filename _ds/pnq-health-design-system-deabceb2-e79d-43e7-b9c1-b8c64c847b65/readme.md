# PNQ Health Design System

The design system for PNQ Health's tinnitus treatment product. It formalizes what the current patient-app prototype established — colors, typography, buttons, controls and the core interface patterns — so iterations stay consistent and developers have something firmer than screenshots to build against.

This is a compact style guide, not an exhaustive component library. Everything in it was extracted from the prototype; nothing was invented for completeness.

## Product context

PNQ Health delivers prescribed, personalized sound therapy for tinnitus. There are two sides to the product:

**Patient app (iOS/Android, 390×844 design canvas).** A patient is given a Prescription ID by their clinician, acknowledges the Notice of Privacy Practices, confirms their record, and lands on a dashboard. From there a treatment session is four steps: select ear(s) → device setup (headphones connected, volume at 100%) → **match your tinnitus** → receive treatment. Matching is the heart of the product: the patient reproduces the sound they hear in their head, choosing a sound type and then adjusting pitch, loudness and character until it matches. Treatment then plays that matched sound for a timed session.

**Clinician / administrator web side.** Referenced in the brief but **no source material was provided**, so this system contains no clinician components, screens or tokens. Nothing about it has been guessed. See Caveats.

There is also an older shipped app whose interface is dated and inconsistent. It is not the reference. The prototype is.

### Sources this system was extracted from

Five Design Component prototype files, provided in this project under `uploads/`:

- `uploads/Patient App - Full Flow.dc.html` — all nine screens with working flow state; the primary source
- `uploads/Match Your Tinnitus V2.dc.html` — the matching screen, iterated
- `uploads/Receive Treatment V2.dc.html` — the treatment screen, iterated
- `uploads/Patient Dashboard.dc.html` — the dashboard with notification states
- `uploads/Onboarding.dc.html` — welcome, privacy, prescription ID, confirm identity

No Figma file, repository, or font binaries were supplied. Per the brief, the prototype was built low-fidelity and deliberately neutral, then lightly skinned around version 14 using the PNQ Health website, screen grabs of the shipped app, and the real logo. The values in `tokens/` are read directly from those five files — exact numbers, not rounded to a grid.

## Content fundamentals

**Voice.** Calm, direct, second person. The app addresses the patient as "you" and speaks as "we" only when describing what the product is doing for them: "We'll guide you through every step." "We found your record." Never "I".

**Sentence case everywhere except interface labels.** Headings and body copy are sentence case ("Let's get set up", "Which ear(s) would you like to treat?"). Uppercase is reserved for structural labels — `MATCHING PRECISION`, `TONE QUALITY`, `STEP 3 OF 4`, `TIME REMAINING`, `NAME` / `EMAIL` / `PHONE`, `LOWEST` / `HIGHEST`. Title Case appears only on button-like row labels and action titles carried over from the prototype ("Start Your First Session", "Both Ears", "Session History").

**Say what will happen, then why it matters.** "Please turn your device volume all the way up before continuing. This helps ensure your treatment is delivered accurately." Instruction first, reason second, one sentence each.

**Empty states explain rather than apologize.** "No messages yet." "Complete after your first session." "Your sessions will appear here." No exclamation, no encouragement, no illustration.

**Guidance is embedded in labels, not hidden in help.** "Start with Coarse, then move to Medium and Fine as your match gets closer." "Select the range from the lowest part of your hiss to the highest." A control that needs explaining carries its explanation directly beneath its label.

**Contractions are used** — "Let's", "You'll", "We'll", "isn't", "you're". They keep the tone human without becoming chatty.

**Language rules — enforce these in every artifact.**

- Say **interface**, never "surface".
- Say **component**, never "band". **Band** is reserved strictly for frequency ranges, which is a real and different concept in this product.
- **Never expose sound-synthesis terminology to patients.** Saw, square, triangle and sine stay in the backend. Patient-facing language is descriptive: cicadas, whistle, buzzing, pulsating, ringing, harsh ringing — with modifiers like scratchiness, roughness and gravel. The prototype's `TONE QUALITY` control is the model: four waveforms presented as Smooth / Soft / Bright / Harsh.
- **American English spelling** throughout.
- No emoji, anywhere.

**Two typefaces, split by function.** Poppins carries interface language — anything the patient acts on or reads as a label. The platform sans carries prose the patient reads rather than acts on. This split is consistent enough to be a rule: if you are unsure, ask whether the patient taps it.

## Visual foundations

**Overall character.** Clean, modern, restrained, medical-grade. Color is purposeful: statuses, states and wayfinding, never decoration. Two backgrounds carry the whole app — a near-white app gray (`#f6f7f9`) and brand navy (`#16263f`). There is no third theme. Explicitly avoided: sketchy or hand-drawn styling, novelty typefaces, illustration, texture, and anything that reads as an "AI wireframe". An unpolished medical product undermines patient confidence.

**Color.** One accent family (blue) plus green and red for status. Navy is the ground for chrome, dark screens and headings. Blue does three jobs and only three: the primary action, the active control, and the selected state. Green means ready or acknowledged. Red means blocked or waiting for you. Magenta (`#d24b9f`) appears in exactly one place — audio-hardware glyphs on the dark setup screen — and should not be extended. Never more than two background colors on one screen.

**Gradients — four, fixed.** `--gradient-navy` (welcome, dashboard header, 165°), `--gradient-treatment` (treatment screen, 180°), `--gradient-action` (primary button, session card, 155°), `--gradient-orb` (the session orb). All are close-value tonal shifts inside one hue — they read as depth, not as color. No new gradients, no purple, no multi-hue blends.

**Backgrounds.** Flat fills and the four gradients. No photography, no illustration, no pattern, no grain. The only background embellishment in the whole app is two soft radial glows on the welcome screen and two faint white circles inside the session card — both low-contrast, both behind content.

**Type.** Poppins 500–800 for interface; platform sans 400–600 for prose. Headings run 24–30px at 1.08–1.16 leading with −0.01em to −0.02em tracking. Body is 15px/1.45; legal prose is 14.5px/1.62. Uppercase labels track wide: 0.08em at 12px, 0.16em at 10.5px. The session countdown is 44px Poppins 700 with tabular numerals. Nothing interactive is set below 12px.

**Spacing.** Screen gutters are 22px by default, 18px on the matching screen (where cards do the framing) and 26px on onboarding prose screens. Cards pad 18/16, list rows 17/18. The scale is not a 4/8 grid — 7, 11, 13, 15, 17 are all real values from the prototype and should be reproduced exactly.

**Corners.** 8px on the smallest controls, 12–16px on cards and buttons, 20px on list cards, 24px on the session card. 36px and 48px belong to the device frame only. Nothing is fully rounded except circles (icon status dots, slider thumbs, the orb) and 20px pills.

**Borders.** Three widths. 1px hairline for card borders and dividers (`#eef0f3` light, `rgba(255,255,255,.1)` on navy). 1.5px for inputs, nudge buttons and select rows. 2px for a selected card or the play control. Dividers inside a list card are inset 18px so they stop short of the edge.

**Cards.** Two treatments. A *section card* is white with a 1px border, 16px radius and a soft `0 2px 12px rgba(20,30,55,.05)` shadow — it groups controls. A *list card* is white with no border, 20px radius and `0 4px 16px rgba(22,38,63,.06)` — it groups rows and clips them. Never both a heavy border and a heavy shadow; never a card inside a card.

**Two shadow systems.** Neutral navy-tinted shadows lift white cards off the app background at 5–7% opacity. Blue-tinted shadows (34–50% opacity) sit only under blue elements and read as the element glowing rather than casting — a primary button, the session card, the segmented pill, the orb. Never put a blue shadow under a neutral element. One inner shadow exists, on the dark volume track.

**Transparency and blur.** Only on dark interfaces and on the gradient session card: `rgba(255,255,255,.05)` panel fills, `.1` borders, `.16–.28` for the eyebrow capsule, `.20` for the play tile with a 2px backdrop blur. On light interfaces everything is opaque.

**Selected state is always three signals at once** — border color, background tint, and a filled tick or icon tile. This survives low-contrast display settings and color vision deficiency.

**Motion.** Functional only. One curve, `cubic-bezier(.4,0,.2,1)`, for anything that changes position: the segmented pill sliding (380ms), slider window and ticks (420ms), section collapse and reveal (500–550ms). Plain `ease` at 180–300ms for color, opacity and border. No bounce, no overshoot, no spring, no page transitions. There are four looping animations and all four mean "sound is playing": the pulsing ring behind the first-session play tile, the two expanding rings on the treatment orb, and the orb's 4s breathe. They stop the instant sound pauses.

**Press and hover.** Buttons compress to `scale(.99)`; cards to `scale(.985)`. There is no hover lift, no color darkening on hover, and no focus glow on touch controls — this is a touch product first. Text fields do get a focus treatment: border to `#2e9fe0` plus a 4px `rgba(46,159,224,.14)` ring.

**Layout rules.** Every screen is a three-band flex column: chrome (status bar, back bar or step progress), one scrolling region, and a fixed action area at the bottom. The primary action never scrolls out of reach. Disabled primary actions stay in place and go gray rather than disappearing. Blocking alerts appear directly above the button they block, and only after the patient has tried to continue. Exits (Cancel treatment, End session, This isn't me) are always the ghost button below the primary.

**Accessibility.** Patients span a wide age range and use the app unaided. Nothing interactive is below 44px; slider thumbs are 28px with a 40px hit strip; the back affordance says the word "Back" as well as showing a chevron; status is never carried by color alone.

## Iconography

One stroke set, 24×24, round caps and joins, no fills except a single solid play triangle. Stroke weight varies by optical size and role: 1.6–1.9 for illustrative glyphs (ear, headphones, user), 2.0–2.6 for navigational ones (chevrons, arrow), 3.2–3.6 for ticks and crosses inside small circles.

The prototype has no icon font, sprite, or icon package — every glyph is hand-inlined SVG. Their geometry matches **Lucide** (24×24, 2px round-cap grid), so Lucide is the correct place to source any new glyph. The exact path data from the prototype is collected in `components/core/Icon.jsx` and specimened in `guidelines/icons.card.html`; use `<Icon name="…" />` rather than pasting new SVG into a screen.

Glyphs inherit their color from the tile they sit in, and tile tone carries meaning: a blue tile with a blue glyph means the row has something in it, a gray tile with a gray glyph means it is empty or not yet available.

**No emoji, ever.** No unicode characters used as icons, with two exceptions carried over from the prototype: the `−` / `+` nudge buttons (U+2212 and `+`) and the `!` in the blocking alert badge.

**Brand mark.** `assets/waveform-mark.svg` (blue, for navy backgrounds) and `assets/waveform-mark-navy.svg` (navy, for light) are copied verbatim from the prototype's welcome screen. **These are the prototype's mark, not a supplied brand file** — the real PNQ Health logo was not provided in this project. The wordmark is set in type: `pnq` in Poppins 700 with `health` in Poppins 500 at `--brand-blue-light` on navy or `--brand-blue-deep` on light. Nothing here was drawn or reconstructed from memory. Please supply the real logo files.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The one file consumers link. `@import`s everything below. |
| `tokens/colors.css` | Base ramps and semantic aliases |
| `tokens/typography.css` | Both families, size scale, weights, leading, tracking |
| `tokens/spacing.css` | Spacing scale, gutters, control heights, hit minimum |
| `tokens/radius.css` | Corner radii and border widths |
| `tokens/elevation.css` | Neutral and blue-tinted shadow systems |
| `tokens/motion.css` | Easing, durations, and the four sound-is-playing keyframes |
| `tokens/fonts.css` | Poppins via Google Fonts |
| `tokens/base.css` | Resets, link colors, focus ring |
| `guidelines/*.card.html` | 21 foundation specimen cards (Colors, Type, Spacing, Depth, Motion, Brand) |
| `assets/` | Waveform mark, navy and blue |
| `ui_kits/patient_app/` | Nine-screen click-through recreation of the patient app |
| `templates/patient-screen/` | Starting template: blank patient screen with the three-band structure |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent Skills entry point |

### Components

**`components/core/`** — Button, TextField, Checkbox, Badge, StatusPill, IconTile, Card (+ CardDivider), SectionLabel, Icon

**`components/controls/`** — SegmentedControl, TuningSlider, RangeSlider, LevelSlider, PlayToggle

**`components/chrome/`** — PhoneFrame, StatusBar (+ HomeIndicator), NavBar, StepProgress

**`components/patterns/`** — ListRow, SelectRow, ChoiceCard, HeroActionCard, InlineAlert, SessionOrb (+ SessionTimer)

Each directory has one `@dsCard` HTML showing its states, and each component has a `.d.ts` props contract and a `.prompt.md` with usage rules.

### Intentional additions

Two components have no single counterpart in the prototype and were added deliberately:

- **`Icon`** — a wrapper around the glyph set. The prototype inlines every SVG by hand; collecting the paths in one place is what stops new screens from re-drawing them.
- **`Card` / `CardDivider`** — the prototype repeats two card treatments inline on every screen. Naming them makes the section-vs-list distinction enforceable.

Everything else maps one-to-one onto something the prototype defines.

## Caveats

- **No clinician or administrator material was provided.** That side of the product is absent from this system rather than guessed at.
- **Poppins is loaded from Google Fonts.** No font binaries were supplied. If PNQ licenses a self-hosted copy, drop the woff2 files into `assets/fonts/` and swap the `@import` in `tokens/fonts.css` for local `@font-face` rules.
- **The real logo files are missing.** See Iconography.
- **The preset-grid matching redesign is not in this system.** The brief describes it — a photo-filter style grid of named sound presets, one to three contextual sliders per preset with plain-language labels, layerable presets, global volume, optional AI assist alongside authoritative manual control. That design does not exist in the prototype, and a design system records what exists. The tokens, components and language rules here are what it should be built from; density is the problem to solve, so optimize the landing state for comprehension at first glance rather than for exposing every capability at once.
