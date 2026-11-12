// Desenho da partida no canvas (coordenadas lógicas 360 x 640).
import * as L from './logica.js';
import { TIMES_POR_ID } from './times.js';
import { desenharBandeira, spriteBandeira, spriteNave } from './bandeiras.js';

// Estrelas fixas (geradas com uma semente, para não mudar a cada partida).
function gerarEstrelas(n) {
  const estrelas = [];
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) estrelas.push({ x: rnd() * L.LARGURA, y: rnd() * L.ALTURA, r: 0.4 + rnd() * 1.2, v: 8 + rnd() * 24 });
  return estrelas;
}
const ESTRELAS = gerarEstrelas(70);

export function desenharFundo(g, t) {
  const grad = g.createLinearGradient(0, 0, 0, L.ALTURA);
  grad.addColorStop(0, '#0a0c24');
  grad.addColorStop(1, '#1b1450');
  g.fillStyle = grad;
  g.fillRect(0, 0, L.LARGURA, L.ALTURA);
  g.fillStyle = '#fff';
  for (const e of ESTRELAS) {
    const y = (e.y + t * e.v) % L.ALTURA;
    g.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t + e.x));
    g.beginPath();
    g.arc(e.x, y, e.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function desenharBola(g, x, y, r) {
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#111111';
  for (const [dx, dy] of [[0, 0], [-0.55, -0.35], [0.55, -0.35], [-0.35, 0.55], [0.35, 0.55]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, r * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#111';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
}

function desenharBandeiraDoJogador(g, idTime, x, y) {
  // mastro e base
  g.fillStyle = '#c9d2ff';
  g.fillRect(x - 1.5, y - 4, 3, 36);
  g.fillStyle = '#2b3170';
  g.fillRect(x - 12, y + 30, 24, 4);
  // a bandeira do time, presa no mastro
  desenharBandeira(g, TIMES_POR_ID[idTime], x + 2, y - 12, 44, 30);
}

function desenharCartao(g, c) {
  g.fillStyle = c.vermelho ? '#e53935' : '#ffd93d';
  g.strokeStyle = '#fff';
  g.lineWidth = 1;
  g.fillRect(c.x - 4, c.y - 6, 8, 12);
  g.strokeRect(c.x - 4, c.y - 6, 8, 12);
}

// Pequena contagem regressiva nas vidas: bolinhas.
function desenharVidas(g, vidas) {
  for (let i = 0; i < L.VIDAS_MAX; i++) {
    const cheia = i < vidas;
    g.fillStyle = cheia ? '#ffffff' : 'rgba(255,255,255,.15)';
    g.beginPath();
    g.arc(L.LARGURA - 14 - i * 17, 22, 6, 0, Math.PI * 2);
    g.fill();
  }
}

export function desenharPartida(g, p, t) {
  desenharFundo(g, t);

  // naves
  for (const n of p.naves) {
    if (!n.vivo) continue;
    const s = spriteNave(p.adversario);
    g.drawImage(s, n.x - 25, n.y - 17, 50, 34);
  }

  // cartões
  for (const c of p.cartoes) desenharCartao(g, c);

  // bola
  for (const b of p.bolas) desenharBola(g, b.x, b.y, 7);

  // explosões
  for (const e of p.explosoes) {
    const k = e.t / 0.45;
    g.globalAlpha = 1 - k;
    g.strokeStyle = '#ffd93d';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(e.x, e.y, 6 + k * 22, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }

  // bandeira do jogador (pisca quando invulnerável)
  if (!(p.invulneravel > 0 && Math.floor(p.invulneravel * 12) % 2 === 0)) {
    desenharBandeiraDoJogador(g, p.time, p.jx - 2, L.Y_JOGADOR - 10);
  }

  desenharHud(g, p);
  if (p.banner > 0) desenharFaixa(g, p);
}

function desenharHud(g, p) {
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(0, 0, L.LARGURA, 74);

  g.fillStyle = '#fff';
  g.font = '700 14px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'left';
  g.fillText(`PONTOS ${String(p.pontos).padStart(5, '0')}`, 12, 27);
  g.textAlign = 'center';
  g.fillText(`FASE ${p.fase}`, L.LARGURA / 2, 27);
  g.fillStyle = '#fff';
  desenharVidas(g, p.vidas);

  // fôlego
  const frac = p.folegoMax ? Math.max(0, p.folego / p.folegoMax) : 0;
  g.textAlign = 'left';
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.font = '600 11px system-ui, sans-serif';
  g.fillText('FÔLEGO', 12, 50);
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.fillRect(12, 56, L.LARGURA - 24, 10);
  const cor = frac > 0.5 ? '#3ee6a0' : frac > 0.2 ? '#ffd93d' : '#ff4d6d';
  g.fillStyle = cor;
  g.fillRect(12, 56, (L.LARGURA - 24) * frac, 10);
  g.textAlign = 'left';
}

function desenharFaixa(g, p) {
  const alfa = Math.min(1, p.banner / 0.4);
  g.save();
  g.globalAlpha = alfa;
  g.fillStyle = 'rgba(5,6,20,.7)';
  g.fillRect(0, 250, L.LARGURA, 150);
  g.fillStyle = '#ffd93d';
  g.textAlign = 'center';
  g.font = '800 34px system-ui, sans-serif';
  g.fillText(`FASE ${p.fase}`, L.LARGURA / 2, 296);
  g.fillStyle = '#fff';
  g.font = '600 16px system-ui, sans-serif';
  g.fillText('contra', L.LARGURA / 2, 328);
  const nome = TIMES_POR_ID[p.adversario].nome;
  g.font = '800 22px system-ui, sans-serif';
  g.fillText(nome, L.LARGURA / 2, 360);
  g.drawImage(spriteBandeira(p.adversario, 40, 26), L.LARGURA / 2 - 20, 370);
  g.restore();
}
