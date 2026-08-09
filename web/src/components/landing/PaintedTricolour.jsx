"use client";

/**
 * The hero's Indian identity: two soft brush strokes and a chakra ring, not a
 * flag.
 *
 * Deliberately abstract — cropped off the edges, no rectangle, no white band,
 * no proportions from the real flag. It reads as "made here", which is the
 * point; a literal tricolour would read as a government portal or a campaign,
 * which is what this product must not look like.
 *
 * Opacity stays low enough that hero text sits at full contrast over it, and
 * the whole thing is `aria-hidden` — it carries feeling, not information.
 */
export function PaintedTricolour({ className = "" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 420"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        {/* A brush edge rather than a printed one: the turbulence roughens the
            stroke ends so they look laid down, not filled. */}
        <filter id="mn-brush" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="mn-saffron" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0" />
          <stop offset="45%" stopColor="#FF8A3D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mn-green" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3FAE72" stopOpacity="0" />
          <stop offset="55%" stopColor="#3FAE72" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#3FAE72" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g filter="url(#mn-brush)" opacity="0.22">
        <path d="M-40 96 C 180 58, 430 84, 700 52 L 700 128 C 430 158, 180 132, -40 168 Z" fill="url(#mn-saffron)" />
        <path d="M-40 268 C 200 236, 440 262, 700 232 L 700 306 C 440 336, 200 310, -40 344 Z" fill="url(#mn-green)" />
      </g>

      {/* The chakra, as a quiet ring — spokes at low opacity so it suggests
          rather than reproduces. */}
      <g opacity="0.1" stroke="#245B9C" fill="none" strokeWidth="2">
        <circle cx="320" cy="200" r="58" />
        <circle cx="320" cy="200" r="7" />
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 24;
          return (
            <line
              key={i}
              x1={320 + Math.cos(angle) * 9}
              y1={200 + Math.sin(angle) * 9}
              x2={320 + Math.cos(angle) * 57}
              y2={200 + Math.sin(angle) * 57}
              strokeWidth="1"
            />
          );
        })}
      </g>
    </svg>
  );
}
