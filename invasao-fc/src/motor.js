// Motor da partida: estado e atualização a cada quadro. Não desenha nada (quem desenha é desenho.js).
import * as L from './logica.js';

export function novaPartida({ time, ids, rand = Math.random }) {
  const p = {
    time,
    fila: L.filaDeAdversarios(ids, time, rand),
    rand,
    fase: 1,
    pontos: 0,
    vidas: L.VIDAS_INICIAIS,
    abates: 0,
    tempo: 0,
    estado: 'jogando', // 'jogando' | 'fim'
    jx: L.LARGURA / 2,
    vx: 0,
    adversario: null,
    padrao: 0,
    vel: 1,
    naves: [],
    descida: 0,
    tempoFase: 0,
    banner: 0,
    folego: 0,
    folegoMax: 0,
    cooldown: 0.4,
    invulneravel: 0,
    bolas: [],
    cartoes: [],
    explosoes: [],
    eventos: [], // 'chute' | 'explosao' | 'cartao' | 'perdeu' | 'fase' | 'vida' | 'fim'
  };
  comecarFase(p);
  return p;
}

function comecarFase(p) {
  const n = L.numNaves(p.fase);
  p.adversario = p.fila.pegar(p.fase);
  p.padrao = L.padraoDaFase(p.fase);
  p.vel = L.multVelocidade(p.fase);
  p.naves = [];
  for (let i = 0; i < n; i++) {
    const col = i % 4;
    const linha = Math.floor(i / 4);
    p.naves.push({ i, n, hx: 75 + col * 70, hy: 90 + linha * 46, x: 0, y: 0, vivo: true });
  }
  p.descida = 0;
  p.tempoFase = 0;
  p.banner = L.BANNER_SEG;
  p.folegoMax = L.folegoDaFase(p.fase);
  p.folego = p.folegoMax;
  p.bolas = [];
  p.cartoes = [];
  atualizarPosicoes(p);
}

function atualizarPosicoes(p) {
  const ctx = { jx: p.jx, vel: p.vel, descida: p.descida };
  for (const n of p.naves) {
    if (!n.vivo) continue;
    const pos = L.posicaoNave(p.padrao, n, p.tempoFase, ctx);
    n.x = pos.x;
    n.y = pos.y;
  }
}

function vivosFrac(p) {
  const total = p.naves.length;
  return total ? p.naves.filter((n) => n.vivo).length / total : 0;
}

function ganharPontos(p, quantidade) {
  const antes = p.pontos;
  p.pontos += quantidade;
  const extras = L.vidasGanhas(antes, p.pontos);
  if (extras > 0) {
    p.vidas = Math.min(L.VIDAS_MAX, p.vidas + extras);
    p.eventos.push('vida');
  }
}

function abater(p, nave) {
  nave.vivo = false;
  p.abates++;
  ganharPontos(p, L.pontosPorNave(p.fase));
  p.explosoes.push({ x: nave.x, y: nave.y, t: 0 });
  p.eventos.push('explosao');
}

// Perde uma vida. Depois de bater numa carta, fica um tempo invulnerável (não vale para o fôlego).
export function perderVida(p, motivo) {
  if (p.estado !== 'jogando') return;
  if (motivo !== 'folego' && p.invulneravel > 0) return;
  p.vidas--;
  p.invulneravel = 1.5;
  p.eventos.push('perdeu');
  if (p.vidas <= 0) {
    p.vidas = 0;
    p.estado = 'fim';
    p.eventos.push('fim');
  }
}

// Avança a partida em `dt` segundos. `dirEntrada` é -1 (esquerda), 0 (parado) ou 1 (direita).
export function atualizar(p, dt, dirEntrada) {
  if (p.estado !== 'jogando') return;
  const d = Math.min(Math.max(dt, 0), 0.05);
  p.tempo += d;

  p.vx = dirEntrada * L.VELOCIDADE_JOGADOR;
  p.jx = L.clamp(p.jx + p.vx * d, L.MARGEM_JOGADOR, L.LARGURA - L.MARGEM_JOGADOR);
  p.invulneravel = Math.max(0, p.invulneravel - d);

  for (const e of p.explosoes) e.t += d;
  p.explosoes = p.explosoes.filter((e) => e.t < 0.45);

  if (p.banner > 0) {
    // antes de cada fase: só a bandeira se mexe
    p.banner = Math.max(0, p.banner - d);
    return;
  }

  p.tempoFase += d;
  p.descida = L.avancarDescida(p.descida, d, p.padrao, vivosFrac(p));
  atualizarPosicoes(p);

  // chute automático: uma bola por vez
  p.cooldown -= d;
  if (p.bolas.length === 0 && p.cooldown <= 0) {
    p.bolas.push({ x: p.jx, y: L.Y_JOGADOR - 16, vx: p.vx * L.EFEITO_BOLA });
    p.cooldown = 0.25;
    p.eventos.push('chute');
  }
  for (const b of p.bolas) {
    b.y -= L.VELOCIDADE_BOLA * d;
    b.x += b.vx * d;
  }
  p.bolas = p.bolas.filter((b) => {
    if (b.y < -12 || b.x < -20 || b.x > L.LARGURA + 20) return false;
    const alvo = p.naves.find((n) => n.vivo && Math.hypot(n.x - b.x, n.y - b.y) < 24);
    if (alvo) {
      abater(p, alvo);
      return false;
    }
    return true;
  });

  // cartões dos adversários (amarelo e vermelho); ambos tiram uma vida
  const chance = 0.05 * p.vel * d;
  for (const n of p.naves) {
    if (n.vivo && p.cartoes.length < 5 && p.rand() < chance) {
      const vermelho = p.rand() < 0.25;
      p.cartoes.push({ x: n.x, y: n.y + 14, vy: (vermelho ? 230 : 170) + 25 * L.cicloDaFase(p.fase), vermelho });
      p.eventos.push('cartao');
    }
  }
  for (const c of p.cartoes) c.y += c.vy * d;
  const acertaram = [];
  p.cartoes = p.cartoes.filter((c) => {
    if (c.y > L.ALTURA + 20) return false;
    if (Math.abs(c.x - p.jx) < 22 && Math.abs(c.y - L.Y_JOGADOR) < 18) {
      acertaram.push(c);
      return false;
    }
    return true;
  });
  if (acertaram.length) perderVida(p, 'cartao');

  // nave que encosta na bandeira: perde uma vida e sai da tela (sem pontos)
  for (const n of p.naves) {
    if (n.vivo && n.y > L.Y_JOGADOR - 30 && Math.abs(n.x - p.jx) < 26) {
      n.vivo = false;
      p.explosoes.push({ x: n.x, y: n.y, t: 0 });
      perderVida(p, 'colisao');
    }
  }
  if (p.estado !== 'jogando') return;

  // fôlego: se zerar, perde uma vida e a fase recomeça
  p.folego -= d;
  if (p.folego <= 0) {
    perderVida(p, 'folego');
    if (p.estado === 'jogando') comecarFase(p);
    return;
  }

  // fase limpa: o fôlego que sobrou vira bônus e vai para a próxima fase
  if (p.naves.every((n) => !n.vivo)) {
    ganharPontos(p, L.bonusDeFase(p.fase, p.folego));
    p.eventos.push('fase');
    p.fase++;
    comecarFase(p);
  }
}

// Resultado final, para mandar ao servidor.
export function resultado(p) {
  return {
    pontos: p.pontos,
    fase: p.fase,
    naves: p.abates,
    tempoMs: Math.round(p.tempo * 1000),
  };
}
