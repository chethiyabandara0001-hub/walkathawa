export const STORY_INLINE_BANNER_COUNT = 3;

/**
 * Maps paragraph indices to inline banner slot numbers so the 3 mid-story
 * banners are distributed evenly through the middle of the story body.
 */
export function getInlineBannerMap(
  paragraphCount: number,
  bannerCount = STORY_INLINE_BANNER_COUNT
): Map<number, number[]> {
  const map = new Map<number, number[]>();
  if (paragraphCount <= 0 || bannerCount <= 0) return map;

  for (let b = 1; b <= bannerCount; b++) {
    const rawIdx = Math.floor((paragraphCount * b) / (bannerCount + 1)) - 1;
    const clampedIdx = Math.max(0, Math.min(paragraphCount - 1, rawIdx));
    const list = map.get(clampedIdx) || [];
    list.push(b);
    map.set(clampedIdx, list);
  }
  return map;
}
