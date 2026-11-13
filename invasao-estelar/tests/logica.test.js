import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/logica.js';
import { novaPartida, atualizar, perderVida, resultado } from '../src/motor.js';

// gerador determinístico (para os testes sempre dar o mesmo resultado)
function semente(n) {
  let s = n >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Anda o jogo até acabar a abertura da onda (as naves entram voando).
function passarAbertura(p) {
  for (let i = 0; i < 400 && p.abertura > 0; i++) atualizar(p, 1 / 60, 0);
}

test('número de naves por onda fica entre 8 e 12', () => {
  for (let f = 1; f <= 200; f++) {
    const n = L.numNaves(f);
    assert.ok(n >= 8 && n <= 12, `onda ${f} tem ${n}`);
  }
  assert.equal(L.numNaves(1), 8);
  assert.equal(L.numNaves(200), 12);
});

test('os 8 padrões de movimento se repetem em volta, e cada volta fica mais rápida', () => {
  assert.equal(L.padraoDaFase(1), 0);
  assert.equal(L.padraoDaFase(8), 7);
  assert.equal(L.padraoDaFase(9), 0);
  assert.equal(L.multVelocidade(1), 1);
  assert.ok(L.multVelocidade(9) > L.multVelocidade(1));
  assert.ok(L.energiaDaFase(17) < L.energiaDaFase(1));
  assert.ok(L.energiaDaFase(200) >= L.ENERGIA_MIN_SEG);
});

test('os 10 tipos de nave se alternam, e a combinação tipo + padrão demora a repetir', () => {
  const vistos = new Set();
  for (let f = 1; f <= 40; f++) vistos.add(`${L.tipoDaFase(f)}-${L.padraoDaFase(f)}`);
  assert.equal(vistos.size, 40, 'as 40 primeiras ondas têm combinações todas diferentes');
  for (let f = 1; f <= 200; f++) assert.ok(L.tipoDaFase(f) >= 0 && L.tipoDaFase(f) < L.NUM_TIPOS);
  assert.notEqual(L.tipoDaFase(1), L.tipoDaFase(2));
});

test('o cenário do fundo muda a cada duas ondas e passa pelos quatro', () => {
  assert.equal(L.cenarioDaFase(1), 0);
  assert.equal(L.cenarioDaFase(2), 0);
  assert.equal(L.cenarioDaFase(3), 1);
  assert.equal(L.cenarioDaFase(8), 3);
  assert.equal(L.cenarioDaFase(9), 0);
  for (let f = 1; f <= 200; f++) assert.ok(L.cenarioDaFase(f) >= 0 && L.cenarioDaFase(f) < L.NUM_CENARIOS);
});

test('pontos por nave sobem com a onda e param na onda 10', () => {
  assert.equal(L.pontosPorNave(1), 20);
  assert.equal(L.pontosPorNave(2), 40);
  assert.equal(L.pontosPorNave(10), 200);
  assert.equal(L.pontosPorNave(50), 200);
});

test('vidas extras entram a cada 10.000 pontos', () => {
  assert.equal(L.vidasGanhas(0, 9999), 0);
  assert.equal(L.vidasGanhas(9990, 10000), 1);
  assert.equal(L.vidasGanhas(5000, 25000), 2);
});

test('o bônus cresce com a energia que sobra e com a onda', () => {
  assert.equal(L.bonusDeFase(1, 0), 0);
  assert.equal(L.bonusDeFase(1, 10.9), 100);
  assert.equal(L.bonusDeFase(3, 10), 300);
});

test('o grupo acelera quando sobram poucas naves', () => {
  assert.equal(L.rapidezDoGrupo(1), 1);
  assert.ok(L.rapidezDoGrupo(0.25) > L.rapidezDoGrupo(0.75));
  assert.ok(Math.abs(L.rapidezDoGrupo(0) - 1.8) < 1e-9);
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

test('todos os padrões ficam dentro da tela, abaixo do painel e acima da nave do jogador', () => {
  for (let padrao = 0; padrao < 8; padrao++) {
    for (let n = 8; n <= 12; n += 4) {
      for (let i = 0; i < n; i++) {
        for (let tm = 0; tm < 60; tm += 0.23) {
          for (const jx of [28, 180, 332]) {
            const nave = { i, n, hx: 75 + (i % 4) * 70, hy: 108 + Math.floor(i / 4) * 46 };
            const p = L.posicaoPadrao(padrao, nave, tm, { jx, vel: 1.24, descida: L.DESCIDA_MAX });
            assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `padrão ${padrao}`);
            // a cortina (padrão 2) atravessa a tela de propósito; os outros ficam inteiros na tela (sprite de 60 px)
            if (padrao !== 2) assert.ok(p.x >= 28 && p.x <= L.LARGURA - 28, `padrão ${padrao} x=${p.x.toFixed(1)}`);
            assert.ok(p.x > -35 && p.x < L.LARGURA + 35, `padrão ${padrao} x=${p.x.toFixed(1)}`);
            assert.ok(p.y >= 80 && p.y <= L.Y_JOGADOR, `padrão ${padrao} y=${p.y.toFixed(1)}`);
          }
        }
      }
    }
  }
});

test('o mergulho chega perto da nave do jogador e depois volta para a formação', () => {
  let maisFundo = 0;
  let voltou = false;
  const nave = { i: 2, n: 8, hx: 215, hy: 108 };
  for (let tm = 0; tm < 20; tm += 0.02) {
    const p = L.posicaoPadrao(3, nave, tm, { jx: 180, vel: 1, descida: 0 });
    maisFundo = Math.max(maisFundo, p.y);
    if (maisFundo > 400 && p.y < 140) voltou = true;
  }
  assert.ok(maisFundo > L.Y_JOGADOR - 60, `chegou só até y=${maisFundo.toFixed(0)}`);
  assert.ok(voltou, 'não voltou para a formação');
});

test('no mergulho ninguém desce no começo da onda e no máximo 2 descem juntas', () => {
  for (const k of [1, 1.12, 1.24]) {
    for (let n = 8; n <= 12; n++) {
      for (let tm = 0; tm < 60; tm += 0.05) {
        let descendo = 0;
        for (let i = 0; i < n; i++) {
          const nave = { i, n, hx: 75 + (i % 4) * 70, hy: 108 + Math.floor(i / 4) * 46 };
          const p = L.posicaoPadrao(3, nave, tm, { jx: 180, vel: k, descida: 0 });
          if (p.y > nave.hy + 15) descendo++;
        }
        if (tm < L.PAUSA_MERGULHO) assert.equal(descendo, 0, `mergulho antes da pausa (tm=${tm.toFixed(2)})`);
        assert.ok(descendo <= 2, `${descendo} naves descendo juntas (n=${n}, k=${k}, tm=${tm.toFixed(2)})`);
      }
    }
  }
});

test('na entrada as naves vêm de fora da tela e se juntam ao padrão', () => {
  const ctx = { jx: 180, vel: 1, descida: 0 };
  for (let i = 0; i < 12; i++) {
    const nave = { i, n: 12, hx: 75 + (i % 4) * 70, hy: 108 + Math.floor(i / 4) * 46 };
    const antes = L.posicaoNave(0, nave, i * L.ATRASO_ENTRADA, 0, ctx); // no instante em que a nave começa a entrar
    assert.ok(antes.y < 0, `a nave ${i} começa fora da tela (y=${antes.y.toFixed(0)})`);
    const depois = L.posicaoNave(0, nave, 10, 10, ctx);
    const alvo = L.posicaoPadrao(0, nave, 10, ctx);
    assert.deepEqual(depois, alvo, 'depois da entrada a nave segue só o padrão');
  }
  // a entrada é contínua: nenhum salto entre quadros
  const nave = { i: 5, n: 12, hx: 145, hy: 154 };
  let ant = L.posicaoNave(0, nave, 0, 0, ctx);
  for (let t = 1 / 60; t < 3; t += 1 / 60) {
    const p = L.posicaoNave(0, nave, t, t, ctx);
    assert.ok(Math.hypot(p.x - ant.x, p.y - ant.y) < 24, `salto de ${Math.hypot(p.x - ant.x, p.y - ant.y).toFixed(1)} px em t=${t.toFixed(2)}`);
    ant = p;
  }
});

test('pontos máximos crescem com a onda e com o número de naves', () => {
  let anterior = 0;
  for (let f = 1; f <= 30; f++) {
    const m = L.pontosMaximos(f, 10);
    assert.ok(m > anterior);
    anterior = m;
  }
  assert.ok(L.pontosMaximos(3, 20) > L.pontosMaximos(3, 19));
});

test('partida: sem tocar a tela não quebra e termina quando as vidas acabam', () => {
  const p = novaPartida({ rand: semente(1) });
  let quadros = 0;
  while (p.estado === 'jogando' && quadros < 60 * 60 * 30) {
    atualizar(p, 1 / 60, 0);
    p.eventos.length = 0;
    quadros++;
  }
  assert.equal(p.estado, 'fim');
  assert.equal(p.vidas, 0);
});

test('partida com toques: invariantes sempre valem', () => {
  const r = semente(99);
  const p = novaPartida({ rand: r });
  let pontosAntes = 0;
  let faseAntes = 1;
  for (let q = 0; q < 60 * 900 && p.estado === 'jogando'; q++) {
    const dir = q % 240 < 120 ? -1 : 1;
    atualizar(p, 1 / 60, r() < 0.8 ? dir : 0);
    assert.ok(p.pontos >= pontosAntes, 'pontos nunca diminuem');
    assert.ok(p.vidas >= 0 && p.vidas <= L.VIDAS_MAX, 'vidas dentro do limite');
    assert.ok(p.jx >= L.MARGEM_JOGADOR - 1e-9 && p.jx <= L.LARGURA - L.MARGEM_JOGADOR + 1e-9, 'nave dentro da tela');
    assert.ok(Math.abs(p.vx) <= L.VEL_MAX_JOGADOR + 1e-9, 'velocidade dentro do limite');
    assert.ok(p.energia >= 0 && p.energia <= p.energiaMax + 1e-9);
    assert.ok(p.fase >= faseAntes, 'a onda só sobe');
    for (const ev of p.eventos) assert.ok(typeof ev.tipo === 'string' && Number.isFinite(ev.x) && Number.isFinite(ev.y), 'evento com posição');
    pontosAntes = p.pontos;
    faseAntes = p.fase;
    p.eventos.length = 0;
  }
  const res = resultado(p);
  assert.ok(res.pontos >= L.PONTOS_NAVE_BASE * res.naves, 'cada nave vale pelo menos 20');
  assert.ok(res.pontos <= L.pontosMaximos(res.fase, res.naves), 'pontuação dentro do máximo possível');
});

test('a nave do jogador acelera e freia aos poucos', () => {
  const p = novaPartida({ rand: semente(2) });
  atualizar(p, 1 / 60, 1);
  assert.ok(p.vx > 0 && p.vx < L.VEL_MAX_JOGADOR, `primeiro quadro: vx=${p.vx}`);
  for (let i = 0; i < 30; i++) atualizar(p, 1 / 60, 1);
  assert.equal(p.vx, L.VEL_MAX_JOGADOR);
  atualizar(p, 1 / 60, 0);
  assert.ok(p.vx > 0 && p.vx < L.VEL_MAX_JOGADOR, 'ao soltar, ainda desliza um pouco');
});

test('na abertura da onda ninguém atira nem tira vida', () => {
  const p = novaPartida({ rand: () => 0 }); // sorteio que sempre "acerta" um disparo, se pudesse
  const vidas = p.vidas;
  for (let i = 0; i < 60; i++) atualizar(p, 1 / 60, 0);
  assert.ok(p.abertura > 0, 'ainda na abertura');
  assert.equal(p.tiros.length, 0);
  assert.equal(p.disparos.length, 0);
  assert.equal(p.vidas, vidas);
  passarAbertura(p);
  assert.equal(p.abertura, 0);
});

test('acerto de plasma tira vida, depois fica invulnerável por um tempo', () => {
  const p = novaPartida({ rand: semente(3) });
  const vidas = p.vidas;
  perderVida(p, 'disparo');
  assert.equal(p.vidas, vidas - 1);
  perderVida(p, 'disparo'); // ainda invulnerável
  assert.equal(p.vidas, vidas - 1);
  perderVida(p, 'energia'); // energia zerada não respeita a invulnerabilidade
  assert.equal(p.vidas, vidas - 2);
});

test('derrubar a última nave limpa a onda, dá o bônus e passa para a próxima', () => {
  const p = novaPartida({ rand: semente(5) });
  passarAbertura(p);
  p.padrao = 6; // barreira: com o tempo do grupo em zero a nave fica na origem
  p.tm = 0;
  p.naves.forEach((n) => { n.vivo = false; });
  p.naves[0].vivo = true;
  p.naves[0].hx = p.jx;
  p.naves[0].hy = 300;
  p.tiros.push({ x: p.jx, y: 310 });
  p.cooldown = 10;
  atualizar(p, 1 / 60, 0);
  assert.equal(p.fase, 2, 'passou para a onda 2');
  assert.ok(p.pontos > 20, 'ganhou o bônus de energia');
  assert.equal(p.abates, 1);
  assert.ok(p.eventos.some((e) => e.tipo === 'fase'));
  assert.ok(p.eventos.some((e) => e.tipo === 'explosao' && Number.isFinite(e.x)));
});

test('passar de 10.000 pontos dá uma vida', () => {
  const p = novaPartida({ rand: semente(5) });
  passarAbertura(p);
  p.vidas = 2;
  p.pontos = 9990;
  p.padrao = 6;
  p.tm = 0;
  p.naves.forEach((n) => { n.vivo = false; });
  p.naves[0].vivo = true;
  p.naves[0].hx = p.jx;
  p.naves[0].hy = 300;
  p.tiros.push({ x: p.jx, y: 310 });
  p.cooldown = 10;
  atualizar(p, 1 / 60, 0);
  assert.ok(p.pontos >= 10000);
  assert.equal(p.vidas, 3);
});

test('o laser não "pula" uma nave, mesmo num quadro longo', () => {
  const p = novaPartida({ rand: semente(7) });
  passarAbertura(p);
  p.padrao = 6;
  p.tm = 0;
  p.naves.forEach((n) => { n.vivo = false; });
  p.naves[0].vivo = true;
  p.naves[0].hx = p.jx;
  p.naves[0].hy = 400;
  p.naves[1].vivo = true;
  p.naves[1].hx = 60;
  p.naves[1].hy = 200; // longe: a partida não termina
  p.tiros.push({ x: p.jx, y: 425 }); // a nave está 25 px acima: o laser anda 32 px no quadro de 0,05 s
  p.cooldown = 10;
  atualizar(p, 0.05, 0);
  assert.equal(p.abates, 1, 'o laser acertou a nave');
});
