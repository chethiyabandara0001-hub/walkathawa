import React, { useEffect, useRef } from 'react';
import { getInlineBannerMap } from '../lib/adLayout';

export { getInlineBannerMap };

export const SKYSCRAPER_160X600_KEY = 'ddd37b67d2fd67224fb97e2ebc2ba1da';
export const SKYSCRAPER_160X600_SRC =
  'https://brijmohan.org/22/ddd37b67d2fd67224fb97e2ebc2ba1da';

export const LEADERBOARD_728X90_KEY = '94f978f9e484ce94ba9c9a71029389c2';
export const LEADERBOARD_728X90_SRC =
  'https://brijmohan.org/22/94f978f9e484ce94ba9c9a71029389c2';

export const STORY_INLINE_320X50_KEY = '8b7cf0d164a509e4bfdbd2075d5f7896';
export const STORY_INLINE_320X50_SRC =
  'https://brijmohan.org/22/8b7cf0d164a509e4bfdbd2075d5f7896';

interface FriendlyBannerFrameProps {
  adKey: string;
  scriptSrc: string;
  width: number;
  height: number;
  slotId: string;
  title: string;
  sizeClassName: string;
}

/**
 * Renders an `atOptions` banner inside a friendly same-origin iframe written via
 * `doc.open() / doc.write() / doc.close()` with `<base href="${origin}/">`.
 *
 * Why this works reliably for `atOptions` scripts:
 * 1. Synchronous `document.write()` inside the ad script works (browsers block
 *    `document.write()` from dynamically appended scripts on an already-loaded page).
 * 2. Each banner has its own isolated `atOptions` global, preventing collisions
 *    across multiple banners on the same page.
 * 3. `<base href="${window.location.origin}/">` ensures protocol-relative URLs
 *    resolve to `https://` rather than `about://`, while preserving parent origin.
 */
function FriendlyBannerFrame({
  adKey,
  scriptSrc,
  width,
  height,
  slotId,
  title,
  sizeClassName,
}: FriendlyBannerFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || typeof window === 'undefined') return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const origin = window.location.origin || 'https://walkathawa.com';
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${origin}/" />
    <style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${width}px;height:${height}px;}</style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    </script>
    <script src="${scriptSrc}"></script>
  </body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();
  }, [adKey, scriptSrc, width, height, slotId]);

  return (
    <div
      data-ad-key={adKey}
      data-ad-src={scriptSrc}
      data-ad-slot={slotId}
      className={`${sizeClassName} shrink-0 overflow-hidden flex items-center justify-center`}
    >
      <iframe
        ref={iframeRef}
        title={title}
        width={width}
        height={height}
        scrolling="no"
        frameBorder={0}
        className={`block border-0 ${sizeClassName}`}
      />
    </div>
  );
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
      className="hidden lg:flex flex-col items-center gap-4 w-[160px] shrink-0 pt-2"
    >
      {slots.map((slot) => (
        <FriendlyBannerFrame
          key={`${side}-${slot}`}
          adKey={SKYSCRAPER_160X600_KEY}
          scriptSrc={SKYSCRAPER_160X600_SRC}
          width={160}
          height={600}
          slotId={`sidebar-${side}-${slot}`}
          title={`Sidebar banner ${side} ${slot}`}
          sizeClassName="w-[160px] h-[600px]"
        />
      ))}
    </aside>
  );
}

export function FooterLeaderboardBanners({ count = 2 }: { count?: number }) {
  const slots = Array.from({ length: count }, (_, i) => i + 1);
  return (
    <div
      data-ad-placement="footer-leaderboard"
      className="w-full flex flex-col items-center gap-4 pb-6 border-b border-slate-200/70 dark:border-[#1e2f52]/70"
    >
      {slots.map((slot) => (
        <div
          key={`footer-banner-${slot}`}
          className="max-w-full overflow-x-auto flex justify-center"
        >
          <FriendlyBannerFrame
            adKey={LEADERBOARD_728X90_KEY}
            scriptSrc={LEADERBOARD_728X90_SRC}
            width={728}
            height={90}
            slotId={`footer-leaderboard-${slot}`}
            title={`Footer banner ${slot}`}
            sizeClassName="w-[728px] h-[90px]"
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
      data-ad-placement="story-inline"
      className="my-4 w-full flex justify-center overflow-x-auto"
    >
      <FriendlyBannerFrame
        adKey={STORY_INLINE_320X50_KEY}
        scriptSrc={STORY_INLINE_320X50_SRC}
        width={320}
        height={50}
        slotId={`story-inline-${storyKey || 'post'}-${slot}`}
        title={`Story inline banner ${slot}`}
        sizeClassName="w-[320px] h-[50px]"
      />
    </div>
  );
}
