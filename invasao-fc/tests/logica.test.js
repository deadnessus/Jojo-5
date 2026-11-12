import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/logica.js';
import { novaPartida, atualizar, perderVida, resultado } from '../src/motor.js';
import { IDS_TIMES } from '../src/times.js';
import { IDS_TIMES as IDS_SERVIDOR } from '../servidor/functions/_lib/invasao-fc.js';

// gerador determinístico (para os testes sempre dar o mesmo resultado)
function semente(n) {
  let s = n >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

test('a lista de times do jogo e a do servidor são a mesma', () => {
  assert.deepEqual([...IDS_TIMES].sort(), [...IDS_SERVIDOR].sort());
  assert.equal(new Set(IDS_TIMES).size, 20);
});

test('o time do jogador nunca aparece como adversário', () => {
  for (const meu of IDS_TIMES) {
    const fila = L.filaDeAdversarios(IDS_TIMES, meu, semente(meu.length));
    for (let f = 1; f <= 200; f++) assert.notEqual(fila.pegar(f), meu);
  }
});

test('nenhum adversário se repete antes de todos passarem, nem entre blocos', () => {
  const fila = L.filaDeAdversarios(IDS_TIMES, 'flamengo', semente(42));
  const adversarios = 19;
  for (let bloco = 0; bloco < 10; bloco++) {
    const parte = [];
    for (let k = 1; k <= adversarios; k++) parte.push(fila.pegar(bloco * adversarios + k));
    assert.equal(new Set(parte).size, adversarios, `bloco ${bloco} repete time`);
  }
  // a troca de bloco também não repete o último time logo de cara
  for (let bloco = 1; bloco < 10; bloco++) {
    assert.notEqual(fila.pegar(bloco * adversarios), fila.pegar(bloco * adversarios + 1));
  }
});

test('número de naves por fase fica entre 8 e 12', () => {
  for (let f = 1; f <= 200; f++) {
    const n = L.numNaves(f);
    assert.ok(n >= 8 && n <= 12, `fase ${f} tem ${n}`);
  }
  assert.equal(L.numNaves(1), 8);
  assert.equal(L.numNaves(200), 12);
});

test('os 8 padrões se repetem em volta, e cada volta fica mais rápida', () => {
  assert.equal(L.padraoDaFase(1), 0);
  assert.equal(L.padraoDaFase(8), 7);
  assert.equal(L.padraoDaFase(9), 0);
  assert.equal(L.multVelocidade(1), 1);
  assert.ok(L.multVelocidade(9) > L.multVelocidade(1));
  assert.ok(L.folegoDaFase(17) < L.folegoDaFase(1));
  assert.ok(L.folegoDaFase(200) >= L.FOLEGO_MIN_SEG);
});

test('pontos por nave sobem com a fase e param na fase 10', () => {
  assert.equal(L.pontosPorNave(1), 20);
  assert.equal(L.pontosPorNave(2), 40);
  assert.equal(L.pontosPorNave(10), 200);
  assert.equal(L.pontosPorNave(50), 200);
});

test('vidas extras entram a cada 10.000 pontos, com teto', () => {
  assert.equal(L.vidasGanhas(0, 9999), 0);
  assert.equal(L.vidasGanhas(9990, 10000), 1);
  assert.equal(L.vidasGanhas(5000, 25000), 2);
});

test('o bônus de fase cresce com o fôlego sobrando e com a fase', () => {
  assert.equal(L.bonusDeFase(1, 0), 0);
  assert.equal(L.bonusDeFase(1, 10.9), 100);
  assert.equal(L.bonusDeFase(3, 10), 300);
});

test('a descida do grupo para no limite, e a barreira desce mais depressa', () => {
  let d = 0;
  for (let i = 0; i < 10000; i++) d = L.avancarDescida(d, 0.05, 0, 1);
  assert.equal(d, L.DESCIDA_MAX);
  const normal = L.avancarDescida(0, 1, 0, 1);
  const barreiraPoucas = L.avancarDescida(0, 1, 6, 0.1);
  const barreiraCheia = L.avancarDescida(0, 1, 6, 1);
  assert.ok(barreiraPoucas > barreiraCheia);
  assert.ok(barreiraPoucas > normal);
});

test('todos os padrões dão posições finitas e dentro de uma faixa razoável da tela', () => {
  for (let padrao = 0; padrao < 8; padrao++) {
    for (let i = 0; i < 12; i++) {
      for (let t = 0; t < 30; t += 0.37) {
        const nave = { i, n: 12, hx: 75 + (i % 4) * 70, hy: 90 + Math.floor(i / 4) * 46 };
        const p = L.posicaoNave(padrao, nave, t, { jx: 180, vel: 1.12, descida: 120 });
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `padrão ${padrao}`);
        assert.ok(p.x > -60 && p.x < L.LARGURA + 60, `padrão ${padrao} x=${p.x}`);
        assert.ok(p.y > -20 && p.y < L.Y_JOGADOR, `padrão ${padrao} y=${p.y}`);
      }
    }
  }
});

test('pontos máximos crescem com a fase e com o número de naves', () => {
  let anterior = 0;
  for (let f = 1; f <= 30; f++) {
    const m = L.pontosMaximos(f, 10);
    assert.ok(m > anterior);
    anterior = m;
  }
  assert.ok(L.pontosMaximos(3, 20) > L.pontosMaximos(3, 19));
});

test('partida: jogada sem toque não quebra e termina quando as vidas acabam', () => {
  const p = novaPartida({ time: 'flamengo', ids: IDS_TIMES, rand: semente(1) });
  let quadros = 0;
  while (p.estado === 'jogando' && quadros < 60 * 60 * 30) {
    atualizar(p, 1 / 60, 0);
    quadros++;
  }
  assert.equal(p.estado, 'fim');
  assert.equal(p.vidas, 0);
});

test('partida com toques: invariantes sempre valem', () => {
  const r = semente(99);
  const p = novaPartida({ time: 'vasco', ids: IDS_TIMES, rand: r });
  let pontosAntes = 0;
  let faseAntes = 1;
  for (let q = 0; q < 60 * 900 && p.estado === 'jogando'; q++) {
    const dir = q % 240 < 120 ? -1 : 1;
    atualizar(p, 1 / 60, r() < 0.8 ? dir : 0);
    assert.ok(p.pontos >= pontosAntes, 'pontos nunca diminuem');
    assert.ok(p.vidas >= 0 && p.vidas <= L.VIDAS_MAX, 'vidas dentro do limite');
    assert.ok(p.jx >= L.MARGEM_JOGADOR - 1e-9 && p.jx <= L.LARGURA - L.MARGEM_JOGADOR + 1e-9, 'bandeira dentro da tela');
    assert.ok(p.folego >= 0 && p.folego <= p.folegoMax + 1e-9);
    assert.ok(p.adversario !== 'vasco', 'nunca o time do jogador');
    assert.ok(p.fase >= faseAntes, 'fase só sobe');
    pontosAntes = p.pontos;
    faseAntes = p.fase;
    p.eventos.length = 0;
  }
  const res = resultado(p);
  assert.ok(res.pontos >= L.PONTOS_NAVE_BASE * res.naves, 'cada nave vale pelo menos 20');
  assert.ok(res.pontos <= L.pontosMaximos(res.fase, res.naves), 'pontuação dentro do máximo possível');
});

test('cartão acertado tira vida, depois fica invulnerável por um tempo', () => {
  const p = novaPartida({ time: 'vasco', ids: IDS_TIMES, rand: semente(3) });
  p.banner = 0;
  const vidas = p.vidas;
  perderVida(p, 'cartao');
  assert.equal(p.vidas, vidas - 1);
  perderVida(p, 'cartao'); // ainda invulnerável
  assert.equal(p.vidas, vidas - 1);
  perderVida(p, 'folego'); // o fôlego zerado não respeita a invulnerabilidade
  assert.equal(p.vidas, vidas - 2);
});

test('pontuação extra de vida: passar de 10.000 ganha uma vida', () => {
  const p = novaPartida({ time: 'vasco', ids: IDS_TIMES, rand: semente(5) });
  p.vidas = 2;
  p.pontos = 9990;
  p.abates = 0;
  // uma única nave, parada (padrão 6 só balança de leve), logo acima da bola: derrubada na fase 1 (20 pontos)
  p.padrao = 6;
  p.naves.forEach((n) => { n.vivo = false; });
  p.naves[0].vivo = true;
  p.naves[0].hx = p.jx;
  p.naves[0].hy = 300;
  p.bolas.push({ x: p.jx, y: 310, vx: 0 });
  p.banner = 0;
  p.cooldown = 10;
  atualizar(p, 1 / 60, 0);
  assert.equal(p.pontos >= 10000, true);
  assert.equal(p.vidas, 3);
});
