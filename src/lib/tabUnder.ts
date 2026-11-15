export function triggerHomepageTabUnder(_destPathOrUrl: string): boolean {
  return false;
}

export function triggerStoryReaderTabUnder(
  _destPathOrUrl?: string,
  _scrollY?: number
): boolean {
  return false;
}

export function peekReopenedStoryScroll(): null {
  return null;
}

export function consumeReopenedStoryScroll(): null {
  return null;
}

export function isExcludedUserLink(_anchor: HTMLAnchorElement | null): boolean {
  return true;
}
