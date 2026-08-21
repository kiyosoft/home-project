import { useEffect, useId, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function marqueeSeconds(text: string): number {
  return Math.min(28, Math.max(8, text.length * 0.16));
}

export function LastPlayMarquee({ text }: { text: string }) {
  const scope = `ethio-play-${useId().replace(/:/g, "")}`;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(() => text.length > 36);
  const reduced = prefersReducedMotion();
  const scroll = overflows && !reduced;
  const duration = marqueeSeconds(text);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const measure = measureRef.current;
    if (!scroller || !measure) return;

    const check = () => {
      setOverflows(measure.scrollWidth > scroller.clientWidth + 8);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className={`${scope} mt-1.5 min-w-0`}>
      <style>{`
        .${scope} .ethio-last-play {
          position: relative;
          overflow: hidden;
          mask-image: linear-gradient(
            90deg,
            transparent,
            #000 0.75rem,
            #000 calc(100% - 0.75rem),
            transparent
          );
        }
        .${scope} .ethio-last-play__track {
          display: flex;
          width: max-content;
        }
        .${scope} .ethio-last-play__item {
          padding-right: 3rem;
          white-space: nowrap;
        }
        .${scope} .ethio-last-play--scroll .ethio-last-play__track {
          animation: ${scope}-marquee ${duration}s linear infinite;
        }
        .${scope} .ethio-last-play--static {
          mask-image: none;
        }
        .${scope} .ethio-last-play--static .ethio-last-play__track {
          width: 100%;
          justify-content: center;
        }
        .${scope} .ethio-last-play--static .ethio-last-play__item {
          padding-right: 0;
        }
        @keyframes ${scope}-marquee {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .${scope} .ethio-last-play {
            mask-image: none;
          }
          .${scope} .ethio-last-play__track {
            animation: none !important;
            width: 100%;
            justify-content: center;
          }
          .${scope} .ethio-last-play__item {
            max-width: 100%;
            padding-right: 0;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .${scope} .ethio-last-play__item[aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
      <p className="mb-0.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Last play
      </p>
      <div
        ref={scrollerRef}
        className={`ethio-last-play ${scroll ? "ethio-last-play--scroll" : "ethio-last-play--static"}`}
        title={text}
      >
        <span
          ref={measureRef}
          className="invisible absolute whitespace-nowrap text-[11px]"
          aria-hidden
        >
          {text}
        </span>
        <div key={text} className="ethio-last-play__track">
          <span className="ethio-last-play__item text-[11px] text-muted-foreground">
            {text}
          </span>
          {scroll ? (
            <span
              className="ethio-last-play__item text-[11px] text-muted-foreground"
              aria-hidden
            >
              {text}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
