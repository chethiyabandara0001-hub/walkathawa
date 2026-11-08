import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export const SMARTLINK_URL =
  'https://asiaso.org/4/d7afdde7726388c479952a1f7b637033';

const BANNER_160X600_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;}</style>
</head>
<body>
<script>
  atOptions = {
    'key' : 'ddd37b67d2fd67224fb97e2ebc2ba1da',
    'format' : 'iframe',
    'height' : 600,
    'width' : 160,
    'params' : {}
  };
</script>
<script src="https://brijmohan.org/22/ddd37b67d2fd67224fb97e2ebc2ba1da"></script>
</body>
</html>`;

const BANNER_320X50_SRCDOC = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;}</style>
</head>
<body>
<script>
  atOptions = {
    'key' : '8b7cf0d164a509e4bfdbd2075d5f7896',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script src="https://brijmohan.org/22/8b7cf0d164a509e4bfdbd2075d5f7896"></script>
</body>
</html>`;

function LazySkyscraperSlot({ index }: { index: number }) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = slotRef.current;
    if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setMounted(true);
      return;
    }

    // Mount when approaching viewport (within 250px); unmount when far off-screen (> 1400px away)
    const mountObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true);
          }
        }
      },
      { rootMargin: '250px 0px' }
    );

    const unmountObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            setMounted(false);
          }
        }
      },
      { rootMargin: '1400px 0px' }
    );

    mountObserver.observe(el);
    unmountObserver.observe(el);

    return () => {
      mountObserver.disconnect();
      unmountObserver.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={slotRef}
        className="w-[160px] h-[600px] overflow-hidden rounded-lg border border-slate-200/60 dark:border-[#1e2f52]/60 bg-slate-100/40 dark:bg-[#0d1730]/40 flex items-center justify-center shrink-0"
      >
        {mounted && (
          <iframe
            title={`Sponsored Vertical Banner 160x600 #${index + 1}`}
            srcDoc={BANNER_160X600_SRCDOC}
            width={160}
            height={600}
            loading="lazy"
            scrolling="no"
            style={{
              border: 0,
              width: '160px',
              height: '600px',
              overflow: 'hidden',
            }}
          />
        )}
      </div>
    </div>
  );
}

export function AdSkyscraper160x600({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-start gap-6 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <LazySkyscraperSlot key={idx} index={idx} />
      ))}
    </div>
  );
}

export function AdBanner320x50({
  showDoubleOnDesktop = true,
  className = '',
}: {
  showDoubleOnDesktop?: boolean;
  showSmartlink?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center my-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        <div className="w-[320px] h-[50px] max-w-full overflow-hidden rounded-md border border-slate-200/50 dark:border-[#1e2f52]/50 bg-slate-100/30 dark:bg-[#0d1730]/30 flex items-center justify-center shrink-0">
          <iframe
            title="Sponsored Banner 320x50"
            srcDoc={BANNER_320X50_SRCDOC}
            width={320}
            height={50}
            scrolling="no"
            style={{ border: 0, width: '320px', height: '50px', overflow: 'hidden' }}
          />
        </div>

        {showDoubleOnDesktop && (
          <div className="hidden md:flex w-[320px] h-[50px] overflow-hidden rounded-md border border-slate-200/50 dark:border-[#1e2f52]/50 bg-slate-100/30 dark:bg-[#0d1730]/30 items-center justify-center shrink-0">
            <iframe
              title="Sponsored Banner 320x50 Secondary"
              srcDoc={BANNER_320X50_SRCDOC}
              width={320}
              height={50}
              scrolling="no"
              style={{ border: 0, width: '320px', height: '50px', overflow: 'hidden' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function SmartLinkCta({
  label = 'අලුත්ම සිංහල වල් කතා සහ චිත්‍ර කතා — සියලුම විශේෂ කොටස් මෙතැනින් බලන්න (Open Exclusive Link)',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`w-full flex justify-center my-2 ${className}`}>
      <a
        href={SMARTLINK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50/90 dark:bg-[#162544]/90 border border-blue-300/70 dark:border-blue-500/40 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-colors text-center"
      >
        <span>{label}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    </div>
  );
}
