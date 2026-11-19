import React from 'react';

export const SKYSCRAPER_160X600_KEY = 'ddd37b67d2fd67224fb97e2ebc2ba1da';
export const SKYSCRAPER_160X600_SRC =
  'https://brijmohan.org/22/ddd37b67d2fd67224fb97e2ebc2ba1da';

export const LEADERBOARD_728X90_KEY = '94f978f9e484ce94ba9c9a71029389c2';
export const LEADERBOARD_728X90_SRC =
  'https://brijmohan.org/22/94f978f9e484ce94ba9c9a71029389c2';

export const STORY_INLINE_320X50_KEY = '8b7cf0d164a509e4bfdbd2075d5f7896';
export const STORY_INLINE_320X50_SRC =
  'https://brijmohan.org/22/8b7cf0d164a509e4bfdbd2075d5f7896';

function buildAtOptionsIframeDoc(params: {
  adKey: string;
  scriptSrc: string;
  width: number;
  height: number;
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${params.width}px;height:${params.height}px;}</style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${params.adKey}',
        'format' : 'iframe',
        'height' : ${params.height},
        'width' : ${params.width},
        'params' : {}
      };
    </script>
    <script src="${params.scriptSrc}"></script>
  </body>
</html>`;
}

const SKYSCRAPER_SRCDOC = buildAtOptionsIframeDoc({
  adKey: SKYSCRAPER_160X600_KEY,
  scriptSrc: SKYSCRAPER_160X600_SRC,
  width: 160,
  height: 600,
});

const LEADERBOARD_SRCDOC = buildAtOptionsIframeDoc({
  adKey: LEADERBOARD_728X90_KEY,
  scriptSrc: LEADERBOARD_728X90_SRC,
  width: 728,
  height: 90,
});

const STORY_INLINE_320X50_SRCDOC = buildAtOptionsIframeDoc({
  adKey: STORY_INLINE_320X50_KEY,
  scriptSrc: STORY_INLINE_320X50_SRC,
  width: 320,
  height: 50,
});

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
  count = 4,
}: {
  side: 'left' | 'right';
  count?: number;
}) {
  const slots = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <aside
      aria-label={side === 'left' ? 'Left sidebar banners' : 'Right sidebar banners'}
      data-ad-rail={side}
      className="hidden xl:flex flex-col items-center gap-4 w-[160px] shrink-0 pt-2"
    >
      {slots.map((slot) => (
        <div
          key={`${side}-${slot}`}
          className="w-[160px] h-[600px] shrink-0 overflow-hidden rounded-lg bg-slate-200/40 dark:bg-[#0d1730]/60"
        >
          <iframe
            title={`Banner ${side} ${slot}`}
            srcDoc={SKYSCRAPER_SRCDOC}
            width={160}
            height={600}
            scrolling="no"
            frameBorder={0}
            loading="lazy"
            className="block w-[160px] h-[600px] border-0"
          />
        </div>
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
          <div className="w-[728px] h-[90px] shrink-0 overflow-hidden rounded-lg bg-slate-200/40 dark:bg-[#0a1124]/60">
            <iframe
              title={`Footer banner ${slot}`}
              srcDoc={LEADERBOARD_SRCDOC}
              width={728}
              height={90}
              scrolling="no"
              frameBorder={0}
              loading="lazy"
              className="block w-[728px] h-[90px] border-0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StoryInlineBanner320x50({ slot }: { slot: number }) {
  return (
    <div
      data-ad-slot={`story-inline-${slot}`}
      className="my-4 w-full flex justify-center overflow-x-auto"
    >
      <div className="w-[320px] h-[50px] shrink-0 overflow-hidden rounded-md bg-slate-200/40 dark:bg-[#0d1730]/60">
        <iframe
          title={`Story inline banner ${slot}`}
          srcDoc={STORY_INLINE_320X50_SRCDOC}
          width={320}
          height={50}
          scrolling="no"
          frameBorder={0}
          loading="lazy"
          className="block w-[320px] h-[50px] border-0"
        />
      </div>
    </div>
  );
}
