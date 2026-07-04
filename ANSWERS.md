# ANSWERS.md — Wedding Site Q&A Log

> Project: **wedding-site** (Node/Express backend + Vue 3 / PrimeVue frontend, live in production).
> Source of truth for design decisions and clarifications specific to this project. Agents:
> check here FIRST before asking the user. Keep entries brief — question ≤ 1 sentence,
> answer ≤ 5 sentences.
>
> **Standing project constraints** (apply to every decision below unless stated otherwise):
> no database schema changes or migrations; use the design tokens in `apps/frontend/uno.config.js`
> and existing PrimeVue components/icons; maintain-or-improve, never degrade functionality;
> code changes go through dispatched agents and are verified before commit. See the wedding-site
> project memory for the full working rules.

## Overview

| # | Slug | Topic | Date |
|---|------|-------|------|
| 1 | var-insert-scope | Click-to-insert variables is Templates-editor only, not compose | 2026-07-04 |
| 2 | var-insert-point | Clicked variable inserts at caret, appends if editor unfocused | 2026-07-04 |
| 3 | var-insert-which-chips | All cheat-sheet chips clickable, including conditional-example snippets | 2026-07-04 |
| 4 | var-insert-feedback | No toast on insert; chips get clickable affordance + tooltip | 2026-07-04 |

---

## Entries

### 1. var-insert-scope

**Q:** Should click-to-insert merge variables apply to the Templates editor only, or also Message compose?
**A:** Templates editor only (`apps/frontend/src/views/admin/templates/TemplateForm.vue`). Message compose (`components/messaging/MessageComposer.vue`) has no variables cheat-sheet today and is left unchanged — adding one there is out of scope for this feature.
**Source:** Jeff, 2026-07-04 (via /interview)
**Date:** 2026-07-04

---

### 2. var-insert-point

**Q:** Where should a clicked variable token land in the editor?
**A:** At the caret position of the active-language editor. If that editor has no known cursor (never focused), append the token at the end instead. After insertion, emit the updated modelValue so it persists. Templates uses `v-if` per language so only the active-language `RichTextEditor` is mounted, making "the active editor" unambiguous.
**Source:** Jeff, 2026-07-04 (via /interview)
**Date:** 2026-07-04

---

### 3. var-insert-which-chips

**Q:** Should all cheat-sheet chip groups be clickable, or only the simple-token ones?
**A:** All chips are clickable. Guest / conditional-flag / system property chips insert their `{{token}}` (`formatVariableName`), and the "Conditional Examples" chips insert their full multi-line snippet (the example string is the chip's key). Each chip inserts exactly the text it displays.
**Source:** Jeff, 2026-07-04 (via /interview)
**Date:** 2026-07-04

---

### 4. var-insert-feedback

**Q:** Should inserting a variable show explicit feedback (toast) and how should the chips signal they're clickable?
**A:** No toast — the token visibly appearing in the editor is the confirmation. Chips become clickable buttons with `cursor-pointer`, a hover state, and a `v-tooltip` "Click to insert". The interactive chips use uno.config.js design tokens (not the panel's current raw `bg-gray-50`/`text-gray-*`); the rest of the cheat-sheet panel's existing grays are left as-is unless a broader restyle is requested. Proposed default pending final confirmation.
**Source:** Jeff, 2026-07-04 (via /interview) — feedback/styling proposed as default
**Date:** 2026-07-04

---
