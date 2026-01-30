Sync Progress Component Design

Location
- UI: `src/pages/Research.tsx` (Sync Progress block inside the Research page)

Purpose
- Provide a premium “liquid glass” status surface for Sync All.
- Show batch activity at a glance without implying a single source represents the batch.

Visual Language
- Container: soft glass card with blur and a multi-color gradient wash.
- Typography: shimmering gradient text for the word “Syncing/Stopping.”
- Motion: slow shimmer overlay on the bar, gentle entry animation.
- Accents: minimal chrome; no visible border.

Layout Anatomy
1) Header row
   - Left: gradient text label “Syncing” or “Stopping.”
   - Right: progress fraction “current / total.”
2) Batch logo strip
   - Horizontal wrap of small source logos (max 8) + overflow count.
   - Each logo sits in a soft white capsule to lift off the glass.
3) Progress bar
   - Thin pill (h-2) with a primary gradient fill and a shimmer overlay.

Key Classes / Styling Decisions
- Card
  - `rounded-2xl`
  - `bg-gradient-to-r from-amber-200/30 via-fuchsia-200/25 to-sky-200/30`
  - `backdrop-blur-xl`
  - `shadow-[0_16px_40px_-30px_rgba(15,23,42,0.55)]`
  - `p-3`
  - `animate-in fade-in slide-in-from-top-2 duration-300`
- Label
  - `bg-gradient-to-r from-foreground via-primary to-foreground/70`
  - `bg-[length:200%_100%] bg-clip-text text-transparent`
  - `animate-text-shimmer`
- Logos
  - Wrapper: `rounded-full bg-white/70 p-1 shadow-sm`
  - Use `SourceLogo` with `size="xs"`
  - Overflow count: `text-[10px] text-muted-foreground`
- Progress bar
  - Track: `h-2 bg-white/45 rounded-full`
  - Fill: `bg-gradient-to-r from-primary via-primary/90 to-primary/70`
  - Shimmer overlay: `animate-shimmer-slow` with `rgba(255,255,255,0.35)`

Behavior
- Displayed when `syncProgress` is set.
- “Stop” button replaces “Sync All” while syncing; stop action halts remaining batch work.
- The logo strip reflects `syncingSourceIds` (current batch and active in-flight sources).

Usage Notes
- Keep label generic (no single-source name) to avoid implying ownership of the batch.
- Logo strip should cap at 8 to avoid visual noise.
- Adjust gradients in the card if the overall theme shifts (keep a warm + cool mix).
