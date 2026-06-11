# Adaptive video quality (Auto + manual) — design

**Date:** 2026-06-11
**Status:** Approved → implementing
**Scope this round:** quality selection only. **Analytics is explicitly OUT** — per-user
bandwidth/consumption metering is deferred to the CDN/backend later (see "Deferred").

---

## Problem

Each live channel can be served at multiple resolutions (1080p / 720p / 576p / 360p). We need:

1. **Auto (default):** the player picks the best resolution for the connection automatically.
2. **Manual:** the user can pin a fixed resolution from the quality sheet.
3. The app must **play whatever source shape it's given** — a backend set of per-rendition URLs,
   a master + renditions, or a single public test URL — without breaking.

## Key technical facts (verified)

- **`expo-video` 56.1.2 cannot pin/cap a rendition.** `videoTrack` and `availableVideoTracks`
  are `readonly`; there is no setter and no `preferredPeakBitRate`. So manual selection **cannot**
  be done by capping the player.
- **Native ABR works** when you hand the player a **master `.m3u8`** (multivariant playlist): the
  native engine (AVPlayer / ExoPlayer) measures segment-download throughput and switches renditions
  seamlessly. That *is* "Auto".
- Therefore **manual selection = feed the player a different source URL** (the chosen rendition's
  own child playlist). Switching source causes one brief rebuffer — normal and expected on a manual
  change.
- "Bandwidth" ≈ "connection speed" colloquially; ABR actually uses **measured throughput** (segment
  download rate), not `NetInfo`. NetInfo only knows wifi-vs-cellular + rough generation — too coarse
  to drive resolution. We do **not** use NetInfo for quality.

## Interim reality (no master yet)

The backend will first expose **4 separate per-rendition URLs** (no master). Without a master,
`expo-video` cannot do true ABR across separate URLs, and we will **not** hand-roll ABR. So:

- **Interim "Auto" = a fixed sensible default (720p)** chosen from the available renditions.
- **Manual** = swap to the chosen rendition URL.
- The day the backend returns a `masterUrl`, **Auto becomes real ABR automatically** — no code
  change (the resolver prefers `masterUrl`).
- A **public master test URL** (the mock already uses one: a real Mux master) exercises genuine
  native ABR today through the same path.

## Design

### Data model (`StreamManifest`, `Rendition`)

```ts
interface Rendition {
  id: QualityId;        // '1080p' | '720p' | '576p' | '360p'
  url: string;          // the rendition's own (child) playlist URL
  bitrate?: number;     // bits/s, optional (display/future analytics)
  width?: number;
  height?: number;
}

interface StreamManifest {
  hlsUrl: string;            // ALWAYS present. Master if available, else primary/720p child. Back-compat fallback.
  masterUrl?: string;        // explicit master → enables native ABR when present
  renditions?: Rendition[];  // per-rendition child URLs → enables manual pinning
  drmKeyUrl?: string;
  headers?: Record<string, string>;
}
```

`hlsUrl` stays the always-present field so a single source (or a lone test URL) just works.

### Source resolver (pure, `src/utils/resolveStreamSource.ts`)

```
resolveStreamSource(manifest, quality):
  if quality !== 'auto':
     return rendition(quality)?.url ?? manifest.masterUrl ?? manifest.hlsUrl   // never breaks
  // auto:
  return manifest.masterUrl                  // real ABR if a master exists
      ?? rendition('720p')?.url              // else fixed 720p from the 4 URLs
      ?? renditions?.[0]?.url                // else any rendition
      ?? manifest.hlsUrl                     // else the single source we have
```

Plus `availableQualityIds(manifest): QualityId[]` → the rendition ids we can actually pin
(`[]` when there are no child URLs → menu shows **Auto only**).

### Player wiring

- `channel/[id].tsx` resolves the source from `stream` + `videoQuality` and passes it to `LivePlayer`.
- On stream load, the channel screen writes `availableQualities` into `PlayerSlice` (for the sheet)
  and **seeds `videoQuality` from `settings.defaultQuality`** on mount (closes plan gap 1).
- `VideoPlayer` calls `player.replace()` when `source` changes (in-place swap — no full remount, so
  fullscreen/PiP survive). Guarded by a last-URI ref so the initial mount doesn't double-load.

### Quality sheet (`quality.tsx`)

- **Default target** (from Settings): show the full option list (a preference independent of any channel).
- **Active player target**: show `Auto` + only the renditions the current stream actually offers
  (`availableQualities`). No renditions → **Auto only** (honest menu, not a fake list).

### Test source

The mock `/streams/*` handler returns a real public **master** (`MOCK_LIVE_STREAM`, Mux test stream)
as both `hlsUrl` and `masterUrl`, so dev/mock playback + genuine ABR work immediately. A commented
block documents how to add real per-rendition URLs when the backend provides them.

## What to verify later (carry-overs)

- **Backend contract:** confirm `StreamManifest` shape — does it return `masterUrl`, `renditions`,
  or only `hlsUrl`? Update `docs/API.md` once known.
- **Interim Auto is not adaptive** — it's fixed 720p until a `masterUrl` lands. Expected, documented.
- **Manual switch rebuffers** — acceptable on expo-video. For seamless manual + true ABR from a single
  master, migrate the live player to `react-native-video` (`selectedVideoTrack` / `maxBitRate`) once
  the master + CDN behavior are known. Resolver and sheet stay; only the player engine changes.
- **AES-128 key-header forwarding** still unvalidated on a real RTSH stream (pre-existing TODO).

## Deferred (NOT in this round)

- **Per-user consumption / bandwidth analytics.** Owned by CDN/backend later (CDN access logs are the
  billing-grade source of truth). No client heartbeat is built now.
