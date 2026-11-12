// Desenho das bandeiras e das naves (canvas). Cada time vira um sprite guardado em cache.
import { TIMES_POR_ID } from './times.js';

function listas(g, cores, x, y, w, h, vertical) {
  const n = cores.length;
  cores.forEach((cor, i) => {
    g.fillStyle = cor;
    if (vertical) g.fillRect(x + (w * i) / n, y, w / n + 0.5, h);
    else g.fillRect(x, y + (h * i) / n, w, h / n + 0.5);
  });
}

export function desenharBandeira(g, time, x, y, w, h) {
  const [c0, c1] = time.cores;
  g.save();
  switch (time.desenho) {
    case 'listras-h': listas(g, time.cores, x, y, w, h, false); break;
    case 'listras-v': listas(g, time.cores, x, y, w, h, true); break;
    case 'metade':
      g.fillStyle = c0; g.fillRect(x, y, w / 2, h);
      g.fillStyle = c1; g.fillRect(x + w / 2, y, w / 2, h);
      break;
    case 'diagonal':
      g.fillStyle = c0; g.fillRect(x, y, w, h);
      g.fillStyle = c1;
      g.beginPath();
      g.moveTo(x, y + h * 0.1); g.lineTo(x + w * 0.1, y); g.lineTo(x + w, y + h * 0.9); g.lineTo(x + w * 0.9, y + h); g.closePath();
      g.fill();
      break;
    case 'cruz':
      g.fillStyle = c0; g.fillRect(x, y, w, h);
      g.fillStyle = c1;
      g.fillRect(x + w * 0.38, y, w * 0.24, h);
      g.fillRect(x, y + h * 0.38, w, h * 0.24);
      break;
    default: // faixa
      g.fillStyle = c0; g.fillRect(x, y, w, h);
      g.fillStyle = c1; g.fillRect(x, y + h * 0.36, w, h * 0.28);
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.45)';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

const cacheBandeiras = new Map();

// Canvas pronto com a bandeira (usado na tela de times, no ranking e no HUD).
export function spriteBandeira(idTime, w, h) {
  const chave = `${idTime}|${w}x${h}`;
  if (cacheBandeiras.has(chave)) return cacheBandeiras.get(chave);
  const c = document.createElement('canvas');
  const escala = Math.min(3, window.devicePixelRatio || 1);
  c.width = Math.round(w * escala);
  c.height = Math.round(h * escala);
  const g = c.getContext('2d');
  g.scale(escala, escala);
  desenharBandeira(g, TIMES_POR_ID[idTime], 0, 0, w, h);
  cacheBandeiras.set(chave, c);
  return c;
}

const cacheNaves = new Map();

// Nave: disco voador pintado com a bandeira do adversário.
export function spriteNave(idTime) {
  if (cacheNaves.has(idTime)) return cacheNaves.get(idTime);
  const W = 50, H = 34, escala = 2;
  const c = document.createElement('canvas');
  c.width = W * escala;
  c.height = H * escala;
  const g = c.getContext('2d');
  g.scale(escala, escala);
  const time = TIMES_POR_ID[idTime];
  // corpo: a bandeira aparece dentro de uma elipse
  g.save();
  g.beginPath();
  g.ellipse(W / 2, 20, 22, 11, 0, 0, Math.PI * 2);
  g.clip();
  desenharBandeira(g, time, W / 2 - 22, 9, 44, 22);
  g.restore();
  g.strokeStyle = '#0b0d22';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(W / 2, 20, 22, 11, 0, 0, Math.PI * 2);
  g.stroke();
  // cúpula
  g.fillStyle = 'rgba(190, 235, 255, 0.55)';
  g.beginPath();
  g.ellipse(W / 2, 13, 9, 6, 0, Math.PI, 0);
  g.fill();
  g.strokeStyle = '#0b0d22';
  g.stroke();
  // luzes
  g.fillStyle = '#ffe66d';
  for (const x of [W / 2 - 10, W / 2, W / 2 + 10]) {
    g.beginPath();
    g.arc(x, 27, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  cacheNaves.set(idTime, c);
  return c;
}
