/**
 * Channel / station order for prev-next switching (swipe, remote CH±, radio
 * transport). The order is the cached list order — the same one Home shows —
 * so it is always derived from `ids` + the current id, never stored: a stored
 * index drifts the moment the list refetches or reorders.
 *
 * Returns `undefined` when there is nowhere to go (id not in the list yet, or
 * fewer than two entries), which callers treat as "switching disabled".
 */
export function getAdjacentId(
  ids: readonly string[],
  currentId: string,
  dir: 1 | -1,
  wrap = true,
): string | undefined {
  const i = ids.indexOf(currentId);
  if (i === -1 || ids.length < 2) return undefined;
  const next = i + dir;
  if (next >= 0 && next < ids.length) return ids[next];
  return wrap ? ids[(next + ids.length) % ids.length] : undefined;
}
