# Docs Consolidation & Token-Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the token footprint of the always-loaded doc set (`.claude/CLAUDE.md` + everything in `.claude/rules/`) by ~35-40% with zero information loss, by removing true duplication and relocating pure-history content out of the auto-loaded files.

**Architecture:** Two structural moves, not a rewrite: (1) extract `ARCHITECTURE.md`'s historical changelog into a new on-demand file — this is the single biggest lever; (2) de-duplicate `CLAUDE.md` bullets that restate facts `ARCHITECTURE.md` already covers in full, replacing them with one-line pointers. Everything genuinely unique stays exactly where it is.

**Tech Stack:** N/A — markdown documentation only, no code changes.

## Global Constraints

- **Zero information loss.** Every fact currently in the docs must still be retrievable afterward — either unchanged in place, or moved verbatim to a new file, or merged into an existing section that didn't have it yet. Paraphrasing/summarizing historical entries is NOT allowed for Task 1 (verbatim move only) to avoid silently dropping nuance.
- **Don't touch STANDARDS.md.** It's already correctly scoped (portable/generic, not auto-loaded, cross-referenced from STYLE_GUIDE.md's header) — confirmed during analysis, no action needed.
- **Preserve the "doc sync is mandatory" discipline** — this plan changes _where_ things get logged, never removes the requirement to log them.
- **Verification is grep/wc-based**, not test-based (no code changes). Every task ends with a word-count comparison and a check that no dangling reference was left behind.
- **One task = one commit**, `docs:` scope, Conventional Commits (per `STYLE_GUIDE.md → Commit Format`).

---

## Confirmed baseline (measured 2026-07-03)

Every session, the harness auto-loads `.claude/CLAUDE.md` **and everything under `.claude/rules/`** as "checked into codebase project instructions" — confirmed empirically: this very session's system reminder dumped `CLAUDE.md`, `AGENTS.md`, `rules/ARCHITECTURE.md`, and `rules/STYLE_GUIDE.md` in full before any task was given. `docs/`, `.claude/docs/plan.md`, `.claude/docs/AUDIT-2026-07-03.md`, and `STANDARDS.md` were **not** auto-dumped — those are already correctly on-demand (referenced, read only via a tool call when relevant).

| File                            |      Words | Auto-loaded?                                                               | Notes                                                                        |
| ------------------------------- | ---------: | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `.claude/CLAUDE.md`             |      3,350 | Yes                                                                        | ~1,566w is the "Architecture" block, ~1,062w is "Mandatory product features" |
| `.claude/rules/ARCHITECTURE.md` |     19,299 | Yes                                                                        | **9,297w (48%) is the "Update log"** — a dated changelog                     |
| `.claude/rules/STYLE_GUIDE.md`  |      4,652 | Yes                                                                        | Reviewed — already lean, no action needed                                    |
| `AGENTS.md`                     |         15 | Yes                                                                        | Trivial, no action needed                                                    |
| **Auto-loaded total**           | **27,316** |                                                                            | ≈ 35-40k tokens spent before any task begins, every session                  |
| `STANDARDS.md`                  |      2,047 | No (correct)                                                               | Portable/generic reference, correctly on-demand                              |
| `docs/API.md`                   |      3,113 | No (correct)                                                               | Backend contract, correctly on-demand                                        |
| `docs/REALTIME_SOCKET.md`       |      2,903 | No (correct)                                                               | Backend contract, correctly on-demand                                        |
| `.claude/docs/plan.md`          |     11,656 | No (harness), but **read every session by explicit CLAUDE.md instruction** | See "Out of scope" note below                                                |

Key finding that unlocks the biggest win: **`ARCHITECTURE.md`'s "Update log" duplicates the purpose of the project's own `.remember/` memory system** (`today-*.md` / `recent.md` / `archive.md`, visible in this session's hook output) — the project already has a dedicated, non-auto-loaded place for "what happened recently." The changelog embedded in the auto-loaded architecture file is redundant infrastructure for the same job.

---

### Task 1: Extract `ARCHITECTURE.md`'s Update Log to a new changelog file

**Files:**

- Create: `.claude/docs/ARCHITECTURE_CHANGELOG.md`
- Modify: `.claude/rules/ARCHITECTURE.md:384-441` (the `## Update log` section — verify line numbers first, content may have shifted)

This is a pure move — the biggest single win (~9,300 words, 48% of the file) with the lowest risk (no paraphrasing, so no chance of losing nuance).

- [ ] **Step 1: Confirm current section boundaries**

```bash
grep -n "^## Update log" .claude/rules/ARCHITECTURE.md
tail -n +$(grep -n "^## Update log" .claude/rules/ARCHITECTURE.md | cut -d: -f1) .claude/rules/ARCHITECTURE.md | wc -w
```

Expected: one match, word count ≈ 9,300 (confirms nothing else changed the file since this plan was written; if the count is very different, re-read the section before proceeding).

- [ ] **Step 2: Create the changelog file with the section moved verbatim**

Copy everything from `## Update log` (the heading itself) to end-of-file into the new file, prefixed with this header:

```markdown
# ARCHITECTURE_CHANGELOG.md — RTSH-OTT

Full dated history of architecture decisions, moved out of `rules/ARCHITECTURE.md`
on 2026-07-03 to keep that file lean — it's auto-loaded every session; this file
is read on demand (git-log-adjacent, not standing context).

**Append new entries here, newest at the bottom** — never grow the inline
section back in `ARCHITECTURE.md`. Each entry: `- **YYYY-MM-DD** — **Title.** Body.`

---

<the moved content, verbatim, starting from the first dated entry — drop the
"## Update log" heading itself since this file's own H1 replaces it>
```

- [ ] **Step 3: Replace the section in `ARCHITECTURE.md` with a pointer**

Replace the entire `## Update log` section (heading through EOF) with:

```markdown
## Update log

Full dated history: [`ARCHITECTURE_CHANGELOG.md`](../docs/ARCHITECTURE_CHANGELOG.md).
Append new entries **there**, not here — this keeps the auto-loaded footprint of
this file stable as history grows. See `CLAUDE.md → Doc sync` for when to log one.
```

- [ ] **Step 4: Verify no entries were dropped**

```bash
# Count dated entries in the new file vs. what the old section had (spot-check a few known dates survived)
grep -c "^- \*\*20" .claude/docs/ARCHITECTURE_CHANGELOG.md
grep -n "2026-06-01\|2026-06-29.*Real-time layer\|2026-07-03.*Component tests" .claude/docs/ARCHITECTURE_CHANGELOG.md
wc -w .claude/rules/ARCHITECTURE.md   # expect ≈ 10,000-10,100 (was 19,299)
```

- [ ] **Step 5: Commit**

```bash
git add .claude/rules/ARCHITECTURE.md .claude/docs/ARCHITECTURE_CHANGELOG.md
git commit -m "docs: extract ARCHITECTURE.md update log to a separate changelog file"
```

---

### Task 2: Add the two facts missing from `ARCHITECTURE.md`'s Real-time section (needed before Task 3 can safely cut them from CLAUDE.md)

**Files:**

- Modify: `.claude/rules/ARCHITECTURE.md` — the `## Real-time (STOMP over WebSocket)` section body (now ends right before the Task-1 pointer; find the paragraph that starts `**Mid-roll scheduling (Ads = Option A...`)

`CLAUDE.md`'s Ads bullet (line 199, 436 words — the single largest bullet in the file) contains two facts with **no home anywhere in `ARCHITECTURE.md`'s body** (only buried in old changelog entries, which Task 1 just archived): preroll gating (`adPending`) and the reveal delay (`AD_REVEAL_DELAY_MS` / `useDelayedReveal`). Everything else in that bullet (mid-roll pause, PiP gating, live-edge reseek, self-reported impressions) is **already** in this section's body — confirmed by reading it. Add only the two missing facts so Task 3 can cut them from CLAUDE.md without losing them.

- [ ] **Step 1: Insert this paragraph** immediately after the existing `**The content stream pauses for the break...**` paragraph in the Real-time section body:

```markdown
**Preroll gating & reveal delay.** While a channel-change or app-open preroll is active, the content player stays **unmounted** (`adPending = !!channelAd && !adDone` in `channel/[id].tsx`) so nothing autoplays behind the overlay — a skeleton holds the 16:9 slot until `onComplete` fires. Both prerolls ease in via **`useDelayedReveal(ready, delayMs)`** (`hooks/`, `AD_REVEAL_DELAY_MS` = 2000ms in `constants/ads.ts`) **after their host screen has settled** (Home channels loaded / channel EPG loaded), not the instant the ad is fetched — so the overlay doesn't snap up over a freshly-drawn page. The player stays unmounted for the whole delay too, so there's no autoplay leak behind the deferred overlay.
```

- [ ] **Step 2: Verify placement**

```bash
grep -n "Preroll gating & reveal delay" .claude/rules/ARCHITECTURE.md
```

Expected: exactly one match, inside the Real-time section (line number should be well before the new Task-1 pointer).

- [ ] **Step 3: Commit**

```bash
git add .claude/rules/ARCHITECTURE.md
git commit -m "docs(architecture): document preroll gating + reveal delay in Real-time section"
```

---

### Task 3: De-duplicate `CLAUDE.md`'s "Mandatory product features" bullets

**Files:**

- Modify: `.claude/CLAUDE.md:190-206` (the `## Mandatory product features (spec-required)` section)

Six of the eleven bullets restate facts that now live in full elsewhere (five already did before this plan; Ads is fully covered as of Task 2). Trim each to what/status + a pointer. The other five bullets (T&C, Cellular-data gate, Mosaic view, PIP + iOS background video, Quality picker, Background audio) have **no fuller version anywhere else** — leave them untouched.

- [ ] **Step 1: Replace the Geoblocking bullet** (currently line 195, 175 words) with:

```markdown
- **Geoblocking** — channel-level (CDN / `PlaybackDecision`) + per-programme (EPG `decision` flag, live-boundary stop). Full mechanism: `rules/ARCHITECTURE.md → Real-time → Geo`.
```

- [ ] **Step 2: Replace the Ads bullet** (currently line 199, 436 words — the largest bullet in the file) with:

```markdown
- **Ads** — three slots (`APP_OPEN`, `CHANNEL_CHANGE` preroll, `MID_ROLL`), one merged array per context (`GET /ads?channelId=`), single `AdOverlay` component (`components/Media/AdOverlay.tsx`, design `adpop`). Full slot orchestration (preroll gating, reveal delay, mid-roll pause + PiP gating, impression reporting): `rules/ARCHITECTURE.md → Real-time`.
```

- [ ] **Step 3: Replace the Parental control bullet** (currently line 201, 118 words) with:

```markdown
- **Parental control** — 4–6 digit PIN, device-level, client-only (SHA-256 local compare, no backend, no cross-device sync). Gates adult-flagged content only when enabled. Full mechanism: `rules/ARCHITECTURE.md → Parental control`.
```

- [ ] **Step 4: Replace the Change password bullet** (currently line 202, 37 words) with:

```markdown
- **Change password** — `POST /users/me/change-password`, rotates the refresh token, folds in "sign out other devices." See `rules/ARCHITECTURE.md → Auth flow 5b`.
```

- [ ] **Step 5: Replace the Delete account bullet** (currently line 203, 79 words) with:

```markdown
- **Delete account** — `DELETE /users/me`; wipes session + parental config only on a confirmed 200. See `rules/ARCHITECTURE.md → Auth flow 5a`.
```

- [ ] **Step 6: Replace the Analytics bullet** (currently line 205, 102 words) with:

```markdown
- **Analytics** — first-party telemetry, **currently DISABLED** (mounts commented out, pending backend ingestion — `.claude/docs/AUDIT-2026-07-03.md` B1). Full mechanism: `rules/ARCHITECTURE.md → Analytics & telemetry`.
```

- [ ] **Step 7: Verify the block shrank and nothing else in the section changed**

```bash
sed -n '/^## Mandatory product features/,/^## Out of scope/p' .claude/CLAUDE.md | wc -w
```

Expected: ≈ 400-450 words (was 1,062).

- [ ] **Step 8: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs(claude): de-duplicate mandatory-features bullets already covered in ARCHITECTURE.md"
```

---

### Task 4: Fix the stale `docs/PLAYER.md` reference + add the missing `REALTIME_SOCKET.md` pointer

**Files:**

- Modify: `.claude/CLAUDE.md:156-159` (the `### Specs` section)

`docs/PLAYER.md` is referenced but was **never created** — confirmed via `.claude/docs/plan-archive.md:922`: _"No `docs/PLAYER.md` exists yet; decision lives here + in code comments."_ This is dead doc drift. Separately, `docs/REALTIME_SOCKET.md` exists and is referenced constantly elsewhere but was never added to this pointer list.

- [ ] **Step 1: Replace the `### Specs` section**

Old:

```markdown
### Specs

- `docs/API.md` — backend contract (source of truth for `src/api/`)
- `docs/PLAYER.md` — HLS + AES-128 spec + fallback decision
```

New:

```markdown
### Specs

- `docs/API.md` — backend contract (source of truth for `src/api/`)
- `docs/REALTIME_SOCKET.md` — STOMP/WebSocket backend contract (presence, watch-time, mid-roll, geo)
- HLS + AES-128 player decisions have no standalone doc — see `### Player` above and `docs/API.md → Channels` (`PlaybackDecisionDTO`)
```

- [ ] **Step 2: Verify no other file references the dead doc**

```bash
grep -rn "docs/PLAYER.md" --include="*.md" . | grep -v node_modules
```

Expected: no matches after this change (there were 1 before, in CLAUDE.md itself; `plan-archive.md`'s mention is a historical record and should NOT be touched — it correctly documents that the file never existed).

- [ ] **Step 3: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs(claude): remove dead docs/PLAYER.md reference, add missing REALTIME_SOCKET.md pointer"
```

---

### Task 5: Correct the now-false "load lazily" instruction in `CLAUDE.md`

**Files:**

- Modify: `.claude/CLAUDE.md:177-184` (the `## On every session start` section)

This section currently tells the agent to "load lazily, only when the task needs it" for `rules/ARCHITECTURE.md` and `rules/STYLE_GUIDE.md`. That's no longer true (confirmed in this session: both are force-loaded by the harness alongside `CLAUDE.md`, unconditionally). Leaving this in place wastes a future agent's effort re-reading files already in its context, and misrepresents the actual cost model to anyone reading the doc.

- [ ] **Step 1: Replace the section**

Old:

```markdown
## On every session start

1. Read this file.
2. Read `.claude/docs/plan.md` to find the next step to execute (audit backlog: `.claude/docs/AUDIT-2026-07-03.md`).

Then load lazily, only when the task needs it (keeps non-coding turns cheap):

- `rules/ARCHITECTURE.md` — before answering "how does X work" or changing any cross-cutting flow (auth, theme, boot/splash, network, persistence, radio audio).
- `rules/STYLE_GUIDE.md` — before writing or editing components/hooks/slices.
```

New:

```markdown
## On every session start

`rules/ARCHITECTURE.md` and `rules/STYLE_GUIDE.md` are auto-loaded alongside this
file every session — they're already in context, don't re-read them. Use
`ARCHITECTURE.md` as the detail layer before changing a cross-cutting flow
(auth, theme, boot/splash, network, persistence, radio audio); use
`STYLE_GUIDE.md` before writing or editing components/hooks/slices.

Read `.claude/docs/plan.md` to find the next step to execute (audit backlog:
`.claude/docs/AUDIT-2026-07-03.md`).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs(claude): correct stale lazy-load instruction — rules/ is auto-loaded, not on-demand"
```

---

### Task 6: Final verification pass

- [ ] **Step 1: Re-measure the full auto-loaded set**

```bash
wc -w .claude/CLAUDE.md AGENTS.md .claude/rules/ARCHITECTURE.md .claude/rules/STYLE_GUIDE.md
```

Expected total ≈ 17,300-17,700 words (was 27,316) — a ~35-37% cut.

- [ ] **Step 2: Grep for any dangling reference to moved/removed content**

```bash
grep -rn "docs/PLAYER.md" --include="*.md" . | grep -v node_modules | grep -v plan-archive.md
# expect: no output
grep -n "load lazily" .claude/CLAUDE.md
# expect: no output
```

- [ ] **Step 3: Read through the final `CLAUDE.md` and `ARCHITECTURE.md` top-to-bottom once**, confirming every pointer added in Tasks 3-4 actually resolves to real content in the target section (self-review — no automated check for this).

- [ ] **Step 4: Update the memory index** — `MEMORY.md` already has a `project-*` entry pattern; add or update one noting the new changelog file location so a future session doesn't rediscover this from scratch. (Handled by the assistant's memory system directly, not a repo commit.)

---

## Out of scope (flagged, not part of this plan)

- **`.claude/docs/plan.md` (11,656 words) is read every session** by explicit instruction in `CLAUDE.md → On every session start`, step 2 — not via harness auto-load, but the token cost is real and recurring. It already splits completed-phase detail into `plan-archive.md` (the same pattern this plan applies to `ARCHITECTURE.md`), but the _active_ sections (Phase 22 design implementation + inventory, ~250 of its 462 lines) have grown large. Worth the same treatment later — moving anything no-longer-actionable to `plan-archive.md` — but it's a separate decision from "CLAUDE.md + rules/ duplication" the user asked about here, and plan.md is actively being executed against, so trimming it carries more risk of losing an in-flight TODO. Recommend revisiting as its own pass once Phase 22 wraps.
- **`STYLE_GUIDE.md` vs `STANDARDS.md` overlap** — reviewed, found to be intentional and correct (generic-portable vs. project-concrete, cross-referenced already, and `STANDARDS.md` isn't auto-loaded so `STYLE_GUIDE.md` can't skip its own copies of the same rules). No action.
- **Deeper edit of `ARCHITECTURE.md`'s per-flow sections** (checking each "How it works" / "Why these choices" pair for internal redundancy) — Task 1 alone removes 48% of the file's bulk; a further line-editing pass on the remaining ~10,000 words is a much smaller, higher-risk-of-losing-nuance win. Not recommended unless the user wants to push further after measuring the result of this plan.

## Expected outcome

| File                            |      Before |         After |                        Δ |
| ------------------------------- | ----------: | ------------: | -----------------------: |
| `.claude/CLAUDE.md`             |      3,350w |      ≈ 2,650w |                     -21% |
| `.claude/rules/ARCHITECTURE.md` |     19,299w |     ≈ 10,100w |                     -48% |
| `.claude/rules/STYLE_GUIDE.md`  |      4,652w |        4,652w | 0% (reviewed, no change) |
| **Auto-loaded total**           | **27,316w** | **≈ 17,400w** |                 **-36%** |

At roughly 1.3 tokens/word for this kind of dense technical markdown, that's approximately **13,000 fewer tokens spent on every single session** before any task begins — permanently, since new architecture history now appends to a file that isn't auto-loaded instead of growing the one that is.

## Execution order

Tasks 1 → 2 → 3 → 4 → 5 → 6, strictly in that order — Task 3 depends on Task 2 having landed the two missing facts first, and Task 6 is the verification pass over everything.
