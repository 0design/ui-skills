---
name: component-canvas
description: Build or review a pan-and-zoom canvas of existing live UI components, in titled, non-draggable groups with dashed outlines. Use when the user asks for a "component canvas", "design-system workspace", or "variant comparison" of live components. Not for galleries, dashboards, or drawing canvases.
---

# Component canvas

The canvas wraps components. It never changes them.

## Rules

- Never edit component source, exports, styles, hooks, or behaviour. Components must not import canvas code.
- Never patch libraries, browser APIs, component DOM, or portal roots.
- Ask before adding components, dependencies, or a public route. Otherwise choose defaults and report them.
- Keep existing access controls. Leave unrelated work alone.
- Follow the repo's command, browser, and edit restrictions. If a check is forbidden, report it as not run and ask once how to proceed. Never skip it silently.
- Do not commit unless the user asks.

## Scope

- "All" means every component file in the named folder. Each file is shown, or listed as omitted with a reason. Do not guess a folder: ask if it is unclear.
- Put the canvas in one dev-only route in an existing app. Never in a published package. Gate it with the dev flag.
- Build in order: one group with one component, then the other groups, then variants, then gestures and persistence. Pause after each step only if the user asked for that.
- Add a coverage test: every component file is covered or omitted with a reason. It fails when a new file appears.

## Samples

- Each sample is one variant or state. Hold everything else constant: same label, sample data, theme, and spacing.
- Compare one prop at a time. Style comparisons vary `variant`. All other comparisons use the default style.
- Use fixed demo data only. No services, no real writes, no production data or credentials.
- Components that need a store or context: give them a stub provider with fixed data, or omit them with a reason. Never fake the component.
- Keep each component's own disabled, checked, and focus styling. Test hover, focus and pressed states through real input.
- Do not invent variants or generate every prop combination. List what was omitted and why.

## Layout

- Plain background, with a theme the user can switch if the repo has a theme API. Default to the user's system theme.
- Groups: a plain title above, then one dashed frame. Same border, padding and radius for every group.
- Groups cannot be dragged. Measure real bounds, ignoring empty placeholders. Lay groups out so they never overlap.

## Interaction

- Background drag pans and must not select text. Component previews keep native text selection.
- A pan starts only on non-interactive space. Clicks, typing, focus, and nested scrolling inside previews stay native.
- Floating menus and tooltips use `position: fixed`, which breaks under the canvas transform. Show them non-floating, or render them in a screen-space layer outside the transform. Otherwise list them as not covered.
- Canvas keys (arrows, plus, minus) apply only when the viewport itself has focus.
- Links to canvas groups move the camera. Links that leave the canvas open as normal.
- No undo, redo, editing shortcuts, or history.

## Touch

- Default: the background pans with one finger and does not pinch. Previews keep native touch. Report that pinch is not supported.
- Use `touch-action: none` on the background only if the user asks for pinch. Never apply it to interactive content.

## Camera

- Mouse and trackpad: pan, and zoom about the cursor. Touch: pan, per the Touch default.
- Clamp zoom and offsets. Apply transforms at most once per frame.
- Handle pointer count changes, cancel, lost capture, window blur, and hidden tabs. Release captures and remove listeners, observers, timers and frames on teardown.
- Fit once after layout and fonts settle. Fit never moves groups. Resizing does not move the camera.
- Focus outside the view moves the camera to reveal it. Page scroll never moves the canvas.
- Fit-all and reset are icon buttons with accessible names, outside the transform, always reachable.

## Persistence

- Save the camera only, versioned, under a key per workspace.
- Reject malformed, oversized, or unknown-version data and fall back to defaults. Catch storage errors on every read and write.
- Automatic first fit is not saved. Only the user's own moves are.
- Reset restores the camera only. It keeps preview state and drafts.

## Tests

- Put tests where the repo runs them. If the app has no runner, run through the package's runner. Do not add a dependency without asking.
- Test pure camera maths, storage failure paths, and the coverage rule.

## Checks

Report each check as passed, failed, or not run. Browser checks: console clean, samples render, focus and keyboard work, nested scroll and portals work at several zooms, pan survives cancel, groups do not overlap, camera persists across reload, text selection behaves as in Interaction.

## Report

End with these headings:

- **Changed:** files, and what changed in each. Note any component change (there should be none).
- **Checks run:** each check and its result.
- **Not working or not tested:** gaps, omitted items and why, anything unverified.
- **Decisions made:** defaults chosen without asking.

Do not call the canvas verified or ready unless every check passed.

## Repo notes

Applies to this repo only. Other repos: replace these with their own equivalents.

- Theme: the `data-theme` value on the mesurer root, `system`, `light` or `dark`. Default is `system`, not black or white.
- Text selection: the viewport has `user-select: none`. Previews have `user-select: text`.
- Pinch: not supported by default (see Touch).
