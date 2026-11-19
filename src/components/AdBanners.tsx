import React, { useEffect, useRef } from 'react';

export const SKYSCRAPER_160X600_KEY = 'ddd37b67d2fd67224fb97e2ebc2ba1da';
export const SKYSCRAPER_160X600_SRC =
  'https://brijmohan.org/22/ddd37b67d2fd67224fb97e2ebc2ba1da';

export const LEADERBOARD_728X90_KEY = '94f978f9e484ce94ba9c9a71029389c2';
export const LEADERBOARD_728X90_SRC =
  'https://brijmohan.org/22/94f978f9e484ce94ba9c9a71029389c2';

export const STORY_INLINE_320X50_KEY = '8b7cf0d164a509e4bfdbd2075d5f7896';
export const STORY_INLINE_320X50_SRC =
  'https://brijmohan.org/22/8b7cf0d164a509e4bfdbd2075d5f7896';

declare global {
  interface Window {
    atOptions?: {
      key: string;
      format: string;
      height: number;
      width: number;
      params: Record<string, unknown>;
    };
  }
}

/**
 * Serializes `window.atOptions` + external ad script execution across all mounted
 * banners on the page so each slot runs on the real page origin (not `about:srcdoc`)
 * without overwriting another banner's `atOptions` configuration.
 */
let bannerLoadQueue: Promise<void> = Promise.resolve();

function enqueueBannerLoad(task: () => Promise<void>): void {
  bannerLoadQueue = bannerLoadQueue.then(task, task);
}

interface AdBannerSlotProps {
  adKey: string;
  scriptSrc: string;
  width: number;
  height: number;
  slotId: string;
  sizeClassName: string;
}

function AdBannerSlot({
  adKey,
  scriptSrc,
  width,
  height,
  slotId,
  sizeClassName,
}: AdBannerSlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof document === 'undefined') return;

    let cancelled = false;

    enqueueBannerLoad(
      () =>
        new Promise<void>((resolve) => {
          if (cancelled || !container.isConnected) {
            resolve();
            return;
          }

          container.innerHTML = '';

          window.atOptions = {
            key: adKey,
            format: 'iframe',
            height,
            width,
            params: {},
          };

          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = scriptSrc;
          script.async = false;

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve();
          };

          const timer = window.setTimeout(finish, 2500);
          script.onload = finish;
          script.onerror = finish;

          container.appendChild(script);
        })
    );

    return () => {
      cancelled = true;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [adKey, scriptSrc, width, height, slotId]);

  return (
    <div
      ref={containerRef}
      data-ad-key={adKey}
      data-ad-src={scriptSrc}
      data-ad-slot={slotId}
      className={`${sizeClassName} shrink-0 overflow-hidden flex items-center justify-center`}
    />
  );
}

export function getInlineBannerMap(
  paragraphCount: number,
  bannerCount = 3
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

export function SidebarBannerRail({
  side,
  count = 7,
}: {
  side: 'left' | 'right';
  count?: number;
}) {
  const slots = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <aside
      aria-label={side === 'left' ? 'Left sidebar banners' : 'Right sidebar banners'}
      data-ad-rail={side}
      className="hidden lg:flex flex-col items-center gap-4 w-[160px] shrink-0 pt-2"
    >
      {slots.map((slot) => (
        <AdBannerSlot
          key={`${side}-${slot}`}
          adKey={SKYSCRAPER_160X600_KEY}
          scriptSrc={SKYSCRAPER_160X600_SRC}
          width={160}
          height={600}
          slotId={`sidebar-${side}-${slot}`}
          sizeClassName="w-[160px] min-h-[600px]"
        />
      ))}
    </aside>
  );
}

export function FooterLeaderboardBanners({ count = 2 }: { count?: number }) {
  const slots = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <div
      data-ad-slot="footer-leaderboard"
      className="w-full flex flex-col items-center gap-4 pb-6 border-b border-slate-200/70 dark:border-[#1e2f52]/70"
    >
      {slots.map((slot) => (
        <div
          key={`footer-banner-${slot}`}
          className="max-w-full overflow-x-auto flex justify-center"
        >
          <AdBannerSlot
            adKey={LEADERBOARD_728X90_KEY}
            scriptSrc={LEADERBOARD_728X90_SRC}
            width={728}
            height={90}
            slotId={`footer-leaderboard-${slot}`}
            sizeClassName="w-[728px] min-h-[90px]"
          />
        </div>
      ))}
    </div>
  );
}

export function StoryInlineBanner320x50({
  slot,
  storyKey,
}: {
  slot: number;
  storyKey?: string;
}) {
  return (
    <div
      data-ad-slot={`story-inline-${slot}`}
      className="my-4 w-full flex justify-center overflow-x-auto"
    >
      <AdBannerSlot
        adKey={STORY_INLINE_320X50_KEY}
        scriptSrc={STORY_INLINE_320X50_SRC}
        width={320}
        height={50}
        slotId={`story-inline-${storyKey || 'post'}-${slot}`}
        sizeClassName="w-[320px] min-h-[50px]"
      />
    </div>
  );
}
