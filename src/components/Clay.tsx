import type { ReactNode } from 'react';

/**
 * Large "clay" icons: soft rounded forms, one highlight, no outlines.
 * Drawn by hand as inline SVG so they ship with the page, stay crisp at any
 * size and need no image requests.
 */

interface Props {
  size?: number;
  className?: string;
}

function Svg({ size = 160, className, children, id, a, b }: Props & { children: ReactNode; id: string; a: string; b: string }) {
  return (
    <svg className={`clay ${className ?? ''}`} width={size} height={size} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <linearGradient id={`${id}-w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#e9e6e2" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="146" rx="42" ry="6" fill="rgba(0,0,0,.09)" />
      {children}
    </svg>
  );
}

const Shine = ({ x, y, r = 10 }: { x: number; y: number; r?: number }) => (
  <ellipse cx={x} cy={y} rx={r} ry={r / 2} fill="rgba(255,255,255,.45)" transform={`rotate(-35 ${x} ${y})`} />
);

export function Document({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cd" a="#ffc83d" b="#ff9f0a">
      <g transform="rotate(-8 80 80)">
        <rect x="34" y="18" width="88" height="114" rx="16" fill="url(#cd-w)" stroke="rgba(0,0,0,.07)" />
        <rect x="50" y="40" width="34" height="10" rx="5" fill="#02093a" />
        {[62, 76, 90, 104].map((y, i) => (
          <rect key={y} x="50" y={y} width={i === 3 ? 30 : 56} height="7" rx="3.5" fill="rgba(0,0,0,.13)" />
        ))}
      </g>
      <circle cx="120" cy="40" r="20" fill="url(#cd)" />
      <path d="M111 40.5l7 7 12-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Key({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="ck" a="#8cc4f6" b="#2f86df">
      <circle cx="62" cy="70" r="42" fill="url(#ck)" />
      <circle cx="62" cy="70" r="16" fill="#f6f5f4" />
      <Shine x={46} y={50} r={12} />
      <rect x="88" y="86" width="58" height="19" rx="9.5" fill="#ffb110" transform="rotate(32 88 86)" />
      <rect x="118" y="112" width="12" height="17" rx="6" fill="#f64932" transform="rotate(32 118 112)" />
    </Svg>
  );
}

export function Sparkle({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cs" a="#ff7a66" b="#f64932">
      <path d="M72 20c4 30 16 42 46 46-30 4-42 16-46 46-4-30-16-42-46-46 30-4 42-16 46-46z" fill="url(#cs)" />
      <path d="M121 88c2 15 8 21 23 23-15 2-21 8-23 23-2-15-8-21-23-23 15-2 21-8 23-23z" fill="#ffb110" />
      <Shine x={56} y={50} r={11} />
    </Svg>
  );
}

export function Shield({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="csh" a="#7ab8f2" b="#0075de">
      <path d="M80 16l50 18v42c0 32-22 52-50 64-28-12-50-32-50-64V34z" fill="url(#csh)" />
      <path d="M58 80l16 16 30-34" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <Shine x={54} y={44} r={13} />
    </Svg>
  );
}

export function Brain({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cb" a="#ffa59a" b="#f64932">
      <circle cx="58" cy="66" r="34" fill="url(#cb)" />
      <circle cx="102" cy="66" r="34" fill="url(#cb)" />
      <circle cx="80" cy="96" r="34" fill="url(#cb)" />
      <path d="M80 42v66M62 78c10 4 14 0 18-6M98 78c-10 4-14 0-18-6" stroke="rgba(255,255,255,.75)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <Shine x={50} y={50} r={10} />
    </Svg>
  );
}

export function Switch({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cw" a="#62aef0" b="#0075de">
      <rect x="18" y="36" width="124" height="44" rx="22" fill="url(#cw)" />
      <circle cx="46" cy="58" r="15" fill="#fff" />
      <rect x="18" y="84" width="124" height="44" rx="22" fill="#02093a" />
      <circle cx="114" cy="106" r="15" fill="#ffb110" />
      <path d="M80 54h30M92 46l10 8-10 8" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function Hand({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="ch" a="#ffd9a8" b="#ffb766">
      <rect x="40" y="22" width="22" height="64" rx="11" fill="url(#ch)" />
      <rect x="64" y="12" width="22" height="74" rx="11" fill="url(#ch)" />
      <rect x="88" y="18" width="22" height="68" rx="11" fill="url(#ch)" />
      <rect x="112" y="40" width="20" height="50" rx="10" fill="url(#ch)" />
      <rect x="34" y="62" width="104" height="64" rx="30" fill="url(#ch)" />
      <rect x="14" y="62" width="44" height="22" rx="11" fill="url(#ch)" transform="rotate(32 14 62)" />
      <Shine x={64} y={90} r={12} />
    </Svg>
  );
}

export function Puzzle({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cp" a="#8d83ff" b="#4f46e5">
      <path d="M30 50h30c-8-26 34-26 26 0h30v30c26-8 26 34 0 26v30H88c8-26-34-26-26 0H30V106c26 8 26-34 0-26z" fill="url(#cp)" />
      <Shine x={52} y={44} r={11} />
    </Svg>
  );
}

export function Heart({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cht" a="#ff8fa0" b="#f0405e">
      <path d="M80 130C26 96 18 62 38 42c16-16 36-8 42 6 6-14 26-22 42-6 20 20 12 54-42 88z" fill="url(#cht)" />
      <Shine x={52} y={54} r={12} />
    </Svg>
  );
}

export function Folder({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cf" a="#ffd36b" b="#ffa400">
      <path d="M22 44a12 12 0 0112-12h32l12 14h48a12 12 0 0112 12v62a12 12 0 01-12 12H34a12 12 0 01-12-12z" fill="url(#cf)" />
      <rect x="22" y="62" width="116" height="62" rx="12" fill="#ffc83d" />
      <Shine x={48} y={78} r={12} />
    </Svg>
  );
}

export function Bell({ size, className }: Props) {
  return (
    <Svg size={size} className={className} id="cbl" a="#ffd36b" b="#ffa400">
      <path d="M80 22c-24 0-40 18-40 42v22l-12 20h104l-12-20V64c0-24-16-42-40-42z" fill="url(#cbl)" />
      <rect x="64" y="112" width="32" height="16" rx="8" fill="#f64932" />
      <circle cx="116" cy="38" r="14" fill="#f64932" />
      <Shine x={58} y={54} r={12} />
    </Svg>
  );
}
