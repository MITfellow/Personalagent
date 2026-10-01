import { useEffect, useRef } from 'react';
import type { ScreenEffect } from '../types';

interface P {
  effect: ScreenEffect;
  onDone: () => void;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function Effects({ effect, onDone }: P) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (effect === 'none') return;
    if (effect === 'spotlight') {
      const t = window.setTimeout(onDone, 2500);
      return () => window.clearTimeout(t);
    }
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = () => cv.width / dpr;
    const H = () => cv.height / dpr;
    const resize = () => {
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    let raf = 0;
    const DURATION: Record<string, number> = {
      confetti: 4200,
      balloons: 6000,
      love: 4200,
      lasers: 3400,
      fireworks: 4800,
      celebration: 4600,
      echo: 3000,
    };
    const duration = DURATION[effect] ?? 4000;

    /* ── particle systems ───────────────────────────── */
    let parts: any[] = [];

    if (effect === 'confetti') {
      const colors = ['#ff5f6d', '#ffc371', '#2ec4b6', '#0a84ff', '#b388ff', '#ffd60a', '#ff2d95'];
      parts = Array.from({ length: 260 }, () => ({
        x: rand(0, window.innerWidth),
        y: rand(-window.innerHeight, 0),
        w: rand(6, 11),
        h: rand(9, 16),
        vy: rand(90, 230),
        vx: rand(-40, 40),
        rot: rand(0, Math.PI * 2),
        vr: rand(-4, 4),
        c: colors[Math.floor(Math.random() * colors.length)],
        sway: rand(0.6, 2.2),
      }));
    } else if (effect === 'balloons') {
      const colors = ['#ff4d6d', '#ffb703', '#2ec4b6', '#4895ef', '#b5179e', '#8ac926'];
      parts = Array.from({ length: 26 }, () => ({
        x: rand(20, window.innerWidth - 20),
        y: window.innerHeight + rand(40, 700),
        r: rand(26, 46),
        vy: rand(60, 130),
        sway: rand(0.4, 1.3),
        ph: rand(0, 6),
        c: colors[Math.floor(Math.random() * colors.length)],
      }));
    } else if (effect === 'love') {
      parts = Array.from({ length: 1 }, () => ({}));
    } else if (effect === 'lasers') {
      parts = Array.from({ length: 16 }, (_, i) => ({
        y: (i + 0.5) * (window.innerHeight / 16),
        ph: rand(0, 6.28),
        hue: rand(0, 360),
        sp: rand(1.4, 3),
      }));
    } else if (effect === 'fireworks' || effect === 'celebration') {
      parts = [];
    } else if (effect === 'echo') {
      parts = Array.from({ length: 46 }, () => ({
        x: rand(0, window.innerWidth),
        y: window.innerHeight + rand(0, 400),
        w: rand(90, 260),
        vy: rand(120, 340),
        rot: rand(-0.25, 0.25),
        a: rand(0.35, 0.95),
      }));
    }

    const bursts: any[] = [];
    const spawnBurst = (x: number, y: number, hue: number) => {
      const n = 70;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + rand(-0.05, 0.05);
        const sp = rand(60, 260);
        bursts.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: rand(0.8, 1.5),
          age: 0,
          hue: hue + rand(-18, 18),
        });
      }
    };
    let nextFw = 0;

    const heart = (x: number, y: number, s: number, c: string, a: number) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.scale(s / 16, s / 16);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-1, 2, -8, -2, -8, -7);
      ctx.bezierCurveTo(-8, -12, -2, -13, 0, -8);
      ctx.bezierCurveTo(2, -13, 8, -12, 8, -7);
      ctx.bezierCurveTo(8, -2, 1, 2, 0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const hearts: any[] = [];
    let last = start;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const elapsed = now - start;
      const fade = elapsed > duration - 700 ? Math.max(0, (duration - elapsed) / 700) : 1;
      ctx.clearRect(0, 0, W(), H());
      ctx.globalAlpha = 1;

      if (effect === 'confetti') {
        for (const p of parts) {
          p.y += p.vy * dt;
          p.x += p.vx * dt + Math.sin(now / 600 * p.sway) * 0.7;
          p.rot += p.vr * dt;
          if (p.y > H() + 30) {
            p.y = -20;
            p.x = rand(0, W());
          }
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.5 + Math.abs(Math.cos(p.rot)) * 0.5));
          ctx.restore();
        }
      } else if (effect === 'balloons') {
        for (const p of parts) {
          p.y -= p.vy * dt;
          const x = p.x + Math.sin(now / 1000 * p.sway + p.ph) * 18;
          ctx.save();
          ctx.globalAlpha = fade;
          // string
          ctx.strokeStyle = 'rgba(160,160,170,.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, p.y + p.r * 1.15);
          ctx.quadraticCurveTo(x + 8, p.y + p.r * 1.8, x - 2, p.y + p.r * 2.5);
          ctx.stroke();
          // body
          const g = ctx.createRadialGradient(x - p.r * 0.3, p.y - p.r * 0.4, p.r * 0.1, x, p.y, p.r);
          g.addColorStop(0, 'rgba(255,255,255,.75)');
          g.addColorStop(0.25, p.c);
          g.addColorStop(1, p.c);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(x, p.y, p.r * 0.84, p.r, 0, 0, Math.PI * 2);
          ctx.fill();
          // knot
          ctx.beginPath();
          ctx.moveTo(x - 4, p.y + p.r);
          ctx.lineTo(x + 4, p.y + p.r);
          ctx.lineTo(x, p.y + p.r * 1.2);
          ctx.fillStyle = p.c;
          ctx.fill();
          ctx.restore();
        }
      } else if (effect === 'love') {
        if (Math.random() < 0.5 && elapsed < duration - 1200) {
          hearts.push({
            x: W() / 2 + rand(-60, 60),
            y: H() - 120,
            s: rand(16, 26),
            vy: rand(90, 190),
            vx: rand(-45, 45),
            age: 0,
            grow: rand(1.6, 3.2),
          });
        }
        for (const h of hearts) {
          h.age += dt;
          h.y -= h.vy * dt;
          h.x += h.vx * dt;
          const sc = h.s * (1 + h.age * h.grow);
          const a = Math.max(0, 1 - h.age / 2.6) * fade;
          heart(h.x, h.y, sc, '#ff375f', a);
        }
      } else if (effect === 'lasers') {
        ctx.globalCompositeOperation = 'lighter';
        for (const p of parts) {
          const t = now / 1000;
          const x = (Math.sin(t * p.sp + p.ph) * 0.5 + 0.5) * W();
          const hue = (p.hue + t * 90) % 360;
          const grad = ctx.createLinearGradient(x - 160, p.y, x + 160, p.y);
          grad.addColorStop(0, `hsla(${hue},100%,60%,0)`);
          grad.addColorStop(0.5, `hsla(${hue},100%,65%,${0.85 * fade})`);
          grad.addColorStop(1, `hsla(${hue},100%,60%,0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = rand(1.5, 3.5);
          ctx.beginPath();
          ctx.moveTo(x - 220, p.y);
          ctx.lineTo(x + 220, p.y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      } else if (effect === 'fireworks' || effect === 'celebration') {
        if (now > nextFw && elapsed < duration - 900) {
          spawnBurst(rand(W() * 0.15, W() * 0.85), rand(H() * 0.12, H() * 0.55), rand(0, 360));
          nextFw = now + rand(260, 620);
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.age += dt;
          if (b.age > b.life) {
            bursts.splice(i, 1);
            continue;
          }
          b.vy += 60 * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.vx *= 0.985;
          b.vy *= 0.985;
          const a = (1 - b.age / b.life) * fade;
          ctx.fillStyle = `hsla(${b.hue},100%,62%,${a})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        if (effect === 'celebration') {
          // add a golden shower of sparks from the bottom
          for (let i = 0; i < 3; i++) {
            bursts.push({
              x: rand(0, W()),
              y: H() + 5,
              vx: rand(-40, 40),
              vy: rand(-520, -300),
              life: rand(1.1, 1.8),
              age: 0,
              hue: rand(38, 52),
            });
          }
        }
      } else if (effect === 'echo') {
        for (const p of parts) {
          p.y -= p.vy * dt;
          if (p.y < -80) p.y = H() + rand(20, 200);
          ctx.save();
          ctx.globalAlpha = p.a * 0.5 * fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = '#0a84ff';
          const h = 34;
          const r = h / 2;
          ctx.beginPath();
          ctx.roundRect(-p.w / 2, -r, p.w, h, r);
          ctx.fill();
          ctx.restore();
        }
      }

      if (elapsed < duration) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W(), H());
        onDone();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [effect, onDone]);

  if (effect === 'none') return null;
  if (effect === 'spotlight') return <div className="fx-spotlight" />;
  return <canvas className="fx-canvas" ref={ref} />;
}
