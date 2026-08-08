import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import {
  playCelebrationSound,
  stopCelebrationSound,
} from "./celebrationSound";

const DURATION_MS = 3000;
const REDUCED_DURATION_MS = 1200;
const CONFETTI_COUNT = 20;

interface ScoreCelebrationProps {
  colors: string[];
  label: string;
  playSound: boolean;
  onDone: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function padColors(colors: string[]): [string, string] {
  const a = colors[0] ?? "#EF0107";
  const b = colors[1] ?? "#FFFFFF";
  return [a, b];
}

function goalLabel(name?: string, abbr?: string): string {
  const team = name?.trim() || abbr?.trim() || "Team";
  return `${team} Goal`;
}

function ScoreCelebration({
  colors,
  label,
  playSound,
  onDone,
}: ScoreCelebrationProps) {
  const reactId = useId().replace(/:/g, "");
  const scope = `ethio-goal-${reactId}`;
  const [c1, c2] = padColors(colors);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const duration = reduced ? REDUCED_DURATION_MS : DURATION_MS;
  const onDoneRef = useRef(onDone);

  const confetti = useMemo(() => {
    const palette = [c1, c2, "#ffffff"];
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (i % 3) * 0.15;
      const dist = 28 + (i % 5) * 8;
      return {
        id: i,
        color: palette[i % palette.length]!,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 8,
        rot: (i * 41) % 360,
        delay: (i % 6) * 0.04,
        size: 5 + (i % 3) * 2,
      };
    });
  }, [c1, c2]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (playSound && !reduced) {
      playCelebrationSound();
    }
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      onDoneRef.current();
    }, duration);
    return () => {
      window.clearTimeout(timer);
      // Keep cheer playing after a normal finish; cut only on early teardown.
      if (!completed) stopCelebrationSound();
    };
  }, [duration, playSound, reduced]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={scope}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <style>{`
        .${scope} .ethio-goal-wash {
          position: absolute;
          inset: 0;
          animation: ${scope}-wash ${duration}ms ease-out both;
          background:
            radial-gradient(ellipse 90% 70% at 30% 40%, ${c1}55, transparent 60%),
            radial-gradient(ellipse 80% 60% at 75% 65%, ${c2}40, transparent 55%),
            ${c1}14;
        }
        .${scope} .ethio-goal-spot {
          position: absolute;
          width: 48vmax;
          height: 48vmax;
          border-radius: 50%;
          filter: blur(56px);
          opacity: 0.35;
        }
        .${scope} .ethio-goal-spot-a {
          top: -12%;
          left: -8%;
          background: ${c1};
          animation: ${scope}-drift-a ${reduced ? duration : 1600}ms ease-in-out ${reduced ? "both" : "infinite alternate"};
        }
        .${scope} .ethio-goal-spot-b {
          bottom: -16%;
          right: -10%;
          background: ${c2};
          animation: ${scope}-drift-b ${reduced ? duration : 1900}ms ease-in-out ${reduced ? "both" : "infinite alternate"};
        }
        .${scope} .ethio-goal-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1.25rem;
          text-align: center;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(2rem, 8vw, 5rem);
          letter-spacing: 0.06em;
          color: #fff;
          text-shadow:
            0 2px 16px ${c1}aa,
            0 0 28px ${c1}66;
          animation: ${scope}-label ${duration}ms cubic-bezier(0.22, 1.2, 0.36, 1) both;
        }
        .${scope} .ethio-goal-confetti {
          position: absolute;
          left: 50%;
          top: 48%;
          border-radius: 2px;
          animation: ${scope}-confetti ${duration}ms ease-out both;
        }
        @keyframes ${scope}-wash {
          0% { opacity: 0; }
          18% { opacity: 1; }
          72% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ${scope}-drift-a {
          0% { transform: translate(0, 0) scale(1); opacity: 0.28; }
          100% { transform: translate(8vw, 6vh) scale(1.08); opacity: 0.4; }
        }
        @keyframes ${scope}-drift-b {
          0% { transform: translate(0, 0) scale(1.05); opacity: 0.22; }
          100% { transform: translate(-7vw, -5vh) scale(0.95); opacity: 0.36; }
        }
        @keyframes ${scope}-label {
          0% { opacity: 0; transform: scale(0.72); }
          20% { opacity: 1; transform: scale(1.04); }
          34% { transform: scale(1); }
          78% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.06); }
        }
        @keyframes ${scope}-confetti {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
          }
          14% { opacity: 0.9; }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--dx)),
                calc(-50% + var(--dy))
              )
              rotate(var(--rot))
              scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .${scope} .ethio-goal-spot-a,
          .${scope} .ethio-goal-spot-b {
            animation: ${scope}-wash ${duration}ms ease-out both !important;
          }
          .${scope} .ethio-goal-confetti {
            display: none;
          }
        }
      `}</style>

      <div className="ethio-goal-wash" />
      {!reduced ? (
        <>
          <div className="ethio-goal-spot ethio-goal-spot-a" />
          <div className="ethio-goal-spot ethio-goal-spot-b" />
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="ethio-goal-confetti"
              style={
                {
                  width: piece.size,
                  height: piece.size * 0.55,
                  background: piece.color,
                  animationDelay: `${piece.delay}s`,
                  "--dx": `${piece.x}vw`,
                  "--dy": `${piece.y}vh`,
                  "--rot": `${piece.rot + 180}deg`,
                } as CSSProperties
              }
            />
          ))}
        </>
      ) : null}
      <div className="ethio-goal-label">{label}</div>
    </div>,
    document.body,
  );
}

/** Watches team / opponent scores and mounts a full-screen celebration on increase. */
export function TeamScoreCelebrationHost({
  celebrateTeam,
  celebrateOpponent,
  cheerEnabled,
  teamScore,
  opponentScore,
  gameState,
  teamColors,
  opponentColors,
  teamName,
  teamAbbr,
  opponentName,
  opponentAbbr,
}: {
  celebrateTeam: boolean;
  celebrateOpponent: boolean;
  cheerEnabled: boolean;
  teamScore?: number;
  opponentScore?: number;
  gameState: string;
  teamColors: string[];
  opponentColors: string[];
  teamName?: string;
  teamAbbr?: string;
  opponentName?: string;
  opponentAbbr?: string;
}) {
  const [active, setActive] = useState<{
    key: number;
    colors: string[];
    label: string;
    playSound: boolean;
  } | null>(null);
  const prevTeamRef = useRef<number | undefined>(undefined);
  const prevOppRef = useRef<number | undefined>(undefined);
  const primedRef = useRef(false);

  const teamColorsKey = teamColors.join(",");
  const oppColorsKey = opponentColors.join(",");
  const watching = celebrateTeam || celebrateOpponent;

  useEffect(() => {
    if (!watching) {
      prevTeamRef.current = teamScore;
      prevOppRef.current = opponentScore;
      primedRef.current = false;
      return;
    }

    if (!primedRef.current) {
      prevTeamRef.current = teamScore;
      prevOppRef.current = opponentScore;
      primedRef.current = true;
      return;
    }

    const prevTeam = prevTeamRef.current;
    const prevOpp = prevOppRef.current;
    prevTeamRef.current = teamScore;
    prevOppRef.current = opponentScore;

    if (gameState !== "IN") return;

    if (
      celebrateTeam &&
      typeof teamScore === "number" &&
      typeof prevTeam === "number" &&
      teamScore > prevTeam
    ) {
      setActive({
        key: Date.now(),
        colors: teamColorsKey ? teamColorsKey.split(",") : [],
        label: goalLabel(teamName, teamAbbr),
        playSound: cheerEnabled,
      });
      return;
    }

    if (
      celebrateOpponent &&
      typeof opponentScore === "number" &&
      typeof prevOpp === "number" &&
      opponentScore > prevOpp
    ) {
      setActive({
        key: Date.now(),
        colors: oppColorsKey ? oppColorsKey.split(",") : [],
        label: goalLabel(opponentName, opponentAbbr),
        playSound: false,
      });
    }
  }, [
    watching,
    celebrateTeam,
    celebrateOpponent,
    cheerEnabled,
    teamScore,
    opponentScore,
    gameState,
    teamColorsKey,
    oppColorsKey,
    teamName,
    teamAbbr,
    opponentName,
    opponentAbbr,
  ]);

  if (!active) return null;

  return (
    <ScoreCelebration
      key={active.key}
      colors={active.colors}
      label={active.label}
      playSound={active.playSound}
      onDone={() => setActive(null)}
    />
  );
}
