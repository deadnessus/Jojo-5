// Regras do jogo, sem tela nem canvas. Testadas com `node --test`.
// Os mesmos números que contam pontos estão no servidor (servidor/functions/_lib/invasao-fc.js).
// Se mudar um número aqui, mude lá também (o teste de consistência avisa se a lista de times divergir).

export const LARGURA = 360;
export const ALTURA = 640;
export const Y_JOGADOR = 586;
export const MARGEM_JOGADOR = 24;
export const VELOCIDADE_JOGADOR = 260; // px/s
export const VELOCIDADE_BOLA = 520; // px/s, subindo
export const EFEITO_BOLA = 0.2; // a bola herda parte do movimento lateral da bandeira
export const PONTOS_NAVE_BASE = 20;
export const MULT_MAX = 10; // a pontuação por nave para de subir na fase 10
export const NAVES_MAX_FASE = 12;
export const NAVES_MIN_FASE = 8;
export const VIDAS_INICIAIS = 3;
export const VIDA_EXTRA_CADA = 10000;
export const VIDAS_MAX = 6;
export const FOLEGO_MAX_SEG = 60;
export const FOLEGO_MIN_SEG = 35;
export const BONUS_POR_SEG = 10; // pontos por segundo de fôlego sobrando, vezes a fase
export const BANNER_SEG = 2;
export const DESCIDA_MAX = 200; // px: quanto o grupo desce no máximo
export const PADROES_NA_VOLTA = 8;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export { clamp };

export function pontosPorNave(fase) {
  return PONTOS_NAVE_BASE * Math.min(fase, MULT_MAX);
}

export function numNaves(fase) {
  return Math.min(NAVES_MAX_FASE, NAVES_MIN_FASE + Math.floor((fase - 1) / 2));
}

export function cicloDaFase(fase) {
  return Math.floor((fase - 1) / PADROES_NA_VOLTA);
}

export function padraoDaFase(fase) {
  return (fase - 1) % PADROES_NA_VOLTA;
}

// Cada volta de 8 fases fica um pouco mais rápida.
export function multVelocidade(fase) {
  return 1 + 0.12 * cicloDaFase(fase);
}

export function folegoDaFase(fase) {
  return Math.max(FOLEGO_MIN_SEG, FOLEGO_MAX_SEG - 3 * cicloDaFase(fase));
}

export function bonusDeFase(fase, folegoRestanteSeg) {
  return Math.floor(folegoRestanteSeg) * BONUS_POR_SEG * fase;
}

// Quantas vidas extras entram quando a pontuação passa de um múltiplo de VIDA_EXTRA_CADA.
export function vidasGanhas(pontosAntes, pontosDepois) {
  return Math.floor(pontosDepois / VIDA_EXTRA_CADA) - Math.floor(pontosAntes / VIDA_EXTRA_CADA);
}

// Fila de adversários: sorteia todos os adversários em um bloco, depois outro bloco, etc.
// Assim nenhum time se repete antes de todos os outros passarem, e o time do jogador nunca entra.
export function filaDeAdversarios(ids, meuTime, rand = Math.random) {
  const adversarios = ids.filter((id) => id !== meuTime);
  const sequencia = [];
  return {
    pegar(fase) {
      while (sequencia.length < fase) {
        const bloco = [...adversarios];
        for (let i = bloco.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [bloco[i], bloco[j]] = [bloco[j], bloco[i]];
        }
        // evita repetir o último time do bloco anterior logo no começo deste bloco
        if (sequencia.length && bloco[0] === sequencia[sequencia.length - 1]) {
          [bloco[0], bloco[bloco.length - 1]] = [bloco[bloco.length - 1], bloco[0]];
        }
        sequencia.push(...bloco);
      }
      return sequencia[fase - 1];
    },
  };
}

// Triângulo entre -1 e 1 com período 1.
function triangular(u) {
  const f = u - Math.floor(u);
  return f < 0.5 ? 4 * f - 1 : 3 - 4 * f;
}

// Faz x dar a volta na tela (com uma folga de 30 px nas bordas).
function darVolta(x) {
  return (((x + 30) % 420) + 420) % 420 - 30;
}

// Posição de uma nave. Tudo é função do tempo (t, em segundos desde o começo da fase),
// então o mesmo padrão sempre se mexe igual. `hx`/`hy` são a posição de origem na formação;
// `ctx.descida` é quanto o grupo já desceu; `ctx.jx` é onde está a bandeira do jogador.
export function posicaoNave(padrao, nave, t, ctx) {
  const { i, n, hx, hy } = nave;
  const k = ctx.vel;
  const y0 = hy + ctx.descida;
  switch (padrao) {
    case 0: // vaivém
      return { x: hx + Math.sin(t * 1.6 * k) * 60, y: y0 };
    case 1: // zigue-zague
      return { x: hx + triangular(t * 0.7 * k + i * 0.07) * 80, y: y0 + 10 * Math.sin(t * k) };
    case 2: // onda
      return { x: hx + Math.sin(t * 2 * k + y0 * 0.02) * 40, y: y0 + Math.sin(t * 2 * k + hx * 0.03) * 18 };
    case 3: { // mergulho: cada nave sai da formação, desce até quase a bandeira e volta
      const P = 4.5 / k;
      const p = (t + i * 0.35) % P;
      const d = p < 2 ? 0 : Math.sin((Math.PI * (p - 2)) / (P - 2));
      const fundo = Math.max(40, Y_JOGADOR - 60 - y0);
      return { x: hx + (ctx.jx - hx) * d * 0.9, y: y0 + d * fundo };
    }
    case 4: { // roda: as naves giram em círculo
      const a = t * 0.8 * k + (i / n) * 2 * Math.PI;
      return { x: LARGURA / 2 + Math.cos(a) * 130, y: 170 + ctx.descida * 0.3 + Math.sin(a) * 60 };
    }
    case 5: // cruza a tela, metade indo para cada lado
      return { x: darVolta(hx + (i % 2 ? 1 : -1) * t * 80 * k), y: y0 };
    case 6: // barreira: balança de leve e desce mais rápido quando sobram poucas
      return { x: hx + Math.sin(t * 0.5) * 15, y: y0 };
    default: // 7: espiral rápida
      return { x: hx + Math.sin(t * 2.4 * k + i) * 90, y: y0 + Math.sin(t * 1.2 * k) * 30 };
  }
}

// O grupo desce devagar. Na barreira (padrão 6) desce mais rápido quando sobram poucas naves.
export function avancarDescida(descida, dt, padrao, vivosFrac) {
  const taxa = padrao === 6 ? 6 + (1 - vivosFrac) * 40 : 6;
  return Math.min(DESCIDA_MAX, descida + taxa * dt);
}

// Pontuação máxima possível para `naves` derrubadas e a fase mais alta alcançada (usada pelo servidor).
// As naves valem no máximo o multiplicador da fase mais alta. Quando o fôlego acaba a fase recomeça,
// então as naves derrubadas se acumulam: por isso o limite é por total de naves, não por fase.
export function pontosMaximos(fase, naves) {
  let bonus = 0;
  for (let k = 1; k <= fase; k++) bonus += FOLEGO_MAX_SEG * BONUS_POR_SEG * k;
  return naves * pontosPorNave(fase) + bonus;
}
