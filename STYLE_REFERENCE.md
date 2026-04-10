# onAudience Hub — Style Reference & UX Change Guide
# Last updated: 2026-04-10 (session d1–d13)
# Purpose: canonical record of design decisions + impact guide for future changes

---

## 1. Design Language

**Typography:** IBM Plex Mono (data/labels/buttons), IBM Plex Sans (prose/notes), IBM Plex Serif (email output only)  
**Corner radius:** 4px modals · 2px everything else · never pills  
**Borders:** 1px solid var(--rule) — never 0.5px, never box-shadow as structure  
**Backgrounds:** always CSS variables — never #fff, never #000  
**Theme:** [data-theme=light/dark] + localStorage('oaTheme') — never prefers-color-scheme

---

## 2. CSS Token Reference

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #F4F2EC | #0C0C0A | Page background |
| `--surf` | #FFFFFF | #141412 | Cards, panels |
| `--surf2` | #F8F6F0 | #1C1C1A | Section headers, inputs |
| `--surf3` | #EFEDE6 | #242421 | Hover states, tag bg |
| `--surf4` | #E8E6DE | #2E2E2B | Deep nested bg |
| `--rule` | rgba(0,0,0,.09) | rgba(255,255,255,.08) | Primary borders |
| `--rule2` | rgba(0,0,0,.05) | rgba(255,255,255,.05) | Secondary borders |
| `--rule3` | rgba(0,0,0,.03) | rgba(255,255,255,.03) | Subtle dividers |
| `--t1` | #0C0C0A | #F0EFE8 | Primary text |
| `--t2` | #5C5C56 | #8A8A82 | Secondary text |
| `--t3` | #9A9990 | #555550 | Labels, placeholders |
| `--t4` | #C8C6BC | #38382E | Ghost text, timestamps |
| `--g` | #178066 | #1FA882 | Green accent (primary CTA) |
| `--gd` | #0F6E56 | #178066 | Green dark (hover) |
| `--gb` | rgba(23,128,102,.08) | rgba(31,168,130,.1) | Green bg tint |
| `--gr` | rgba(23,128,102,.28) | rgba(31,168,130,.3) | Green border |
| `--cc/cb/cr` | green | green | Client status |
| `--pc/pb/pr` | blue | blue | Partner status |
| `--prc/prb/prr` | amber | amber | Prospect status |
| `--nc/nb/nr` | gray | gray | No-outreach status |
| `--poc/pob/por` | purple | purple | POC status |

---

## 3. Component Specs (as of d13)

### Nav bar
- Height: **40px**, padding: 0 16px, gap: 8px
- Logo: IBM Plex Mono 600 12px, green bg, 26×26px, 2px radius
- Background: var(--surf), border-bottom: 1px solid var(--rule)

### Stats bar
- Height: **40px**, background: var(--surf2)
- Numbers: IBM Plex Mono **12px/700**, color var(--t1)
- Labels: IBM Plex Mono 7px/500 uppercase +.06em, color var(--t3)
- Active column: background var(--gb)

### List rows (.c-row)
- Padding: **9px 12px**, gap: 10px, border-bottom: 1px solid var(--rule3)
- Avatar: 28×28px, 2px radius
- Company name (.c-name): **12.5px/500**, -0.01em tracking, t1
- Note (.c-note): 10px, t3, **italic**, margin-top 2px
- Detail row (.c-detail): flex, gap:0, margin-top 4px
  - Items: IBM Plex Mono 9.5px, t3
  - Separator: CSS ::before content:'·' (not DOM elements)
  - City: t1 bold · Headcount: t2 · Category: t4 9px · Time: t4 8.5px

### Tags (.tag)
- IBM Plex Mono 8px/500 uppercase +.06em, 2px radius, 1px border
- .tc (client/green) · .tp (partner/blue) · .tpr (prospect/amber) · .tn (nogo/gray) · .tpo (poc/purple)

### Buttons (.btn)
- Height 26px, padding 0 10px, IBM Plex Mono 9px/500 uppercase +.06em, 2px radius
- .btn.p: green primary · .btn.sm: 22px height · .btn.on: green active

### Company detail panel header (.ib-head)
- Padding: **18px 20px**, gap: 16px, margin-bottom: 1px
- Avatar: 48×48px, gradient green, 2px radius
- Name (.ib-name): **19px/600**, -0.02em tracking, t1
- Note (.ib-note): 11px, t3, **italic**, margin-top 5px, line-height 1.55
- Row2: gap 8px, margin-top 6px (holds type tag + ICP stars)

### Facts table (.ib-facts)
- font-size: **11.5px**, td padding: 5px 0
- Label col: IBM Plex Mono 8px/600 +.06em t4, width 72px
- Value col: t1, vertical-align: middle

### CTA bar (.ib-cta)
- Padding: 10px 16px, gap: 6px
- Buttons: height **28px**, 8px/600 uppercase
- Primary button: height **30px**, 16px padding (deliberately taller)

### Sections (.ib-sec)
- Background: var(--surf), 1px border, 2px radius, margin-bottom 6px
- Header (.ib-sh): padding **8px 18px**, bg surf2, border-bottom: 1px solid var(--rule)
- Label (.ib-sh-lbl): IBM Plex Mono **7.5px/700** +.09em, t3

### ICP display
- In facts table: N/10 badge (color-coded) + ★★★★☆ stars + segment label
- Color tiers: green ≥8, amber ≥6, gray <6
- In list rows: IBM Plex Mono 9px/700 badge with bg tint
- In panel header: stars + numeric score (e.g. ★★★★★ 8)

### Audience list panel (LEFT column, .aud-)
- Toolbar: flex, padding 8px 12px, border-bottom 1px rule
- Count: IBM Plex Mono 9px/600 uppercase, t3
- Row: padding 10px 12px, border-bottom 1px rule3, cursor pointer
- Row name: 12px/500 t1
- Row count: IBM Plex Mono 8px t3
- Row desc: 10px t3 italic, truncated
- Row time: IBM Plex Mono 8px t4
- Actions: flex gap 4px, shown on hover
- Active row: border-left 2px solid var(--g), bg var(--gb)
- System section label: IBM Plex Mono 7px/700 uppercase +.08em t4, padding 8px 12px 4px

---

## 4. UX Change Impact Guide

This section explains what to expect when changing specific components.

### Changing font sizes
| Component | Current | If you increase | If you decrease |
|---|---|---|---|
| c-name | 12.5px | More dominant in list, may crowd detail row | Company names harder to scan |
| ib-name | 19px | More editorial, risks wrapping | Less prominent, loses h1 weight |
| ib-facts label | 8px t4 | More readable, takes more visual space | Harder to read, saves horizontal space |
| sb-num (stats) | 12px/700 | Very prominent, good for scanability | Numbers blend with labels |
| tag | 8px | Tags take more space, easier to read | Tags become invisible at 6px |

### Changing padding
| Component | Current | If you increase | If you decrease |
|---|---|---|---|
| c-row | 9px 12px | More breathing, fewer rows visible | More dense list, more companies visible |
| ib-head | 18px 20px | Airier header, pushes content down | Header feels cramped |
| ib-body | 16px 18px | More white space in panel | Facts table hits panel edges |
| center-scroll | 20px 24px | Panel floats more | Panel touches viewport edge |

### Changing layout structure
| Change | UX Impact | Risk |
|---|---|---|
| Left column width (360px) | More space = better list items | Breaks at narrow viewports |
| Removing italic from c-note | Note competes with name visually | Users can't distinguish name vs note |
| Removing ICP badge color | All companies look equal | Loses ability to scan by priority |
| Changing tag .tc/.tp colors | Breaks status recognition system | Users can't identify clients vs partners |
| Moving console from bottom | Console competes with content | Fixed positioning works at all heights |
| Changing stats bar height | 40px is minimum for touch targets | Below 36px labels become too small |

### Auth/demo changes
| Change | UX Impact |
|---|---|
| Demo shown without explicit user action | Real users see fake data on load (fixed in d13) |
| Sign-out without clearing demo flag | Next page load enters demo (fixed in d13) |
| Console open by default | Distracting for non-devs; users think it's an error |

---

## 5. What Was Broken and When

### Session today (2026-04-10)

| Version | What broke | Root cause |
|---|---|---|
| d1 | Meeseeks company search missing | Never built — added in d6 |
| d7 | ib-name CSS corrupted: `overflow;letter` | str_replace partial match on minified CSS |
| d7 | ib-name fixed inline | Caught and corrected in same session |
| d12 | Tutorial mini pill only in tutorial.js | CSS not copied to style.css — added in d12 |
| d12 | All audience list CSS missing | aud-row/aud-list/aud-toolbar never in style.css |
| d13 | Demo auto-entered on page load | isDemoMode() checked before getSession() |

### How to prevent

1. **Run `node validate.js` before every push** — catches JS errors + CSS structural issues
2. **Run `python3 scripts/audit_css.py`** — checks required selectors exist
3. **Add new component CSS to style.css immediately** — never leave it only in JS inline styles
4. **Use python3 str_replace for CSS** with exact strings — check "MISS" count in output
5. **Never change the `[data-theme]` variable names** — everything inherits from them
6. **Screenshots after every push** — CSS corruption passes JS validation

---

## 6. File Responsibilities

| File | What to edit | Never edit here |
|---|---|---|
| `config.js` | SB creds, TAG_RULES, MODEL names | Layout, rendering |
| `state.js` | New S.* fields | Logic, rendering |
| `utils.js` | Pure functions: esc, _slug, classify, etc. | API calls, DOM |
| `api.js` | Supabase calls, anthropicFetch, geocode | UI rendering |
| `hub.js` | Company detail, panel, AI bar, sort | Audiences, contacts tab |
| `list.js` | List rendering, filters, tags | Company detail |
| `audiences.js` | Audience CRUD, list panel, detail | Company list |
| `meeseeks.js` | Email composer, persona grid | Hub layout |
| `auth.js` | Login screen, session, signOut | Data loading |
| `demo.js` | Demo data, Doom, tutorial init | Real data |
| `tutorial.js` | Tutorial steps, Konami, XP | Auth |
| `style.css` | ALL CSS — every component | Inline styles in JS |
| `app.js` | Imports, window.* exports, boot sequence | Business logic |

