/**
 * A short, quiet confetti burst for moments worth marking (a payment going through).
 * One canvas over the page, about 2.5 seconds, small pieces in the product's colours that
 * fall and fade. Nothing is drawn for people who ask their system for reduced motion.
 */

export interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: 'rect' | 'dot';
  /** Seconds before it appears, so the burst blooms instead of popping. */
  delay: number;
}

export const CONFETTI_COLORS = ['#0075de', '#ffb110', '#f64932', '#62aef0', '#02093a', '#17795e'];
export const CONFETTI_SECONDS = 2.6;
const GRAVITY = 900;
const DRAG = 0.992;

/** Two soft bursts from the upper corners of the screen, aimed inwards and upwards. */
export function createPieces(width: number, height: number, count = 80, random: () => number = Math.random): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i += 1) {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -62 : -118) * (Math.PI / 180) + (random() - 0.5) * 0.9;
    const speed = (0.55 + random() * 0.55) * Math.min(1100, height * 1.15);
    pieces.push({
      x: fromLeft ? width * 0.12 : width * 0.88,
      y: height * 0.32,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + random() * 5,
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * 12,
      color: CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)]!,
      shape: random() < 0.3 ? 'dot' : 'rect',
      delay: random() * 0.18,
    });
  }
  return pieces;
}

/** Moves a piece forward by dt seconds: gravity pulls it down and the air slows it. */
export function stepPiece(piece: Piece, dt: number): void {
  if (piece.delay > 0) {
    piece.delay -= dt;
    return;
  }
  piece.vx *= DRAG;
  piece.vy = piece.vy * DRAG + GRAVITY * dt;
  piece.x += piece.vx * dt;
  piece.y += piece.vy * dt;
  piece.rotation += piece.spin * dt;
}

export const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Plays the celebration. Resolves when it is finished (or straight away when it is skipped). */
export function celebrate(): Promise<void> {
  if (typeof document === 'undefined' || prefersReducedMotion()) return Promise.resolve();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;inset:0;width:${width}px;height:${height}px;pointer-events:none;z-index:2147483000`;
  document.body.append(canvas);
  context.scale(ratio, ratio);

  const pieces = createPieces(width, height);
  return new Promise((resolve) => {
    let last = performance.now();
    let elapsed = 0;
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      context.clearRect(0, 0, width, height);
      // Ease out over the last 0.9 seconds so nothing disappears abruptly.
      const alpha = Math.max(0, Math.min(1, (CONFETTI_SECONDS - elapsed) / 0.9));
      for (const piece of pieces) {
        stepPiece(piece, dt);
        if (piece.delay > 0) continue;
        context.save();
        context.globalAlpha = alpha;
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        if (piece.shape === 'dot') {
          context.beginPath();
          context.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        }
        context.restore();
      }
      if (elapsed < CONFETTI_SECONDS) requestAnimationFrame(frame);
      else {
        canvas.remove();
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
