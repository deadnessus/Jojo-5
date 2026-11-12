// Testa as rotas do servidor contra um D1 falso feito com SQLite de verdade (node:sqlite).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { criarSessao, prepararBanco } from '../servidor/functions/_lib/conta.js';
import { conferirEnvio, pontosMaximos, mesDe } from '../servidor/functions/_lib/invasao-fc.js';
import { onRequestPost as iniciar } from '../servidor/functions/api/invasao-fc/iniciar.js';
import { onRequestPost as enviar } from '../servidor/functions/api/invasao-fc/enviar.js';
import { onRequestGet as ranking } from '../servidor/functions/api/invasao-fc/ranking.js';

// Imita o suficiente do D1 (prepare/bind/first/all/run/batch) para as rotas.
function d1Falso() {
  const db = new DatabaseSync(':memory:');
  // compila só na hora de executar (como o D1): o SQL pode referir a uma tabela que ainda vai ser criada
  const preparar = (sql) => {
    let args = [];
    const o = {
      bind(...a) { args = a; return o; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() {
        const info = db.prepare(sql).run(...args);
        return { meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
      },
    };
    return o;
  };
  return {
    prepare: preparar,
    async batch(lista) { const r = []; for (const s of lista) r.push(await s.run()); return r; },
    _raw: db,
  };
}

const ORIGEM = 'https://queres.games';
const URL_BASE = 'https://queres.games/api/invasao-fc/';

let env;
let cookieA;
let cookieB;

async function criarConta(db, apelido, codigo) {
  const agora = Math.floor(Date.now() / 1000);
  const r = await db.prepare('INSERT INTO contas (apelido, codigo, criada_em) VALUES (?, ?, ?)').bind(apelido, codigo, agora).run();
  return r.meta.last_row_id;
}

async function logar(id) {
  const fake = new Request(URL_BASE + 'x', { headers: {} });
  const set = await criarSessao(env, fake, id);
  return set.split(';')[0]; // "qg_sessao=TOKEN"
}

function pedidoPost(caminho, corpo, cookie) {
  const headers = { 'content-type': 'application/json', origin: ORIGEM };
  if (cookie) headers.cookie = cookie;
  return new Request(URL_BASE + caminho, { method: 'POST', headers, body: JSON.stringify(corpo) });
}

function pedidoGet(caminho, cookie) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  return new Request(URL_BASE + caminho, { headers });
}

// Pula tempo: a partida foi iniciada `segundos` atrás (o servidor mede o tempo a partir do início).
async function envelhecer(id, segundos = 120) {
  await env.DB.prepare('UPDATE ifc_partidas SET iniciado_em = iniciado_em - ? WHERE id = ?').bind(segundos * 1000, id).run();
}

before(async () => {
  env = { DB: d1Falso() };
  await prepararBanco(env.DB);
  const a = await criarConta(env.DB, 'Lobo Azul', 'AB3');
  const b = await criarConta(env.DB, 'Raposa Verde', 'CD4');
  cookieA = await logar(a);
  cookieB = await logar(b);
});

test('conferência: envio plausível passa', () => {
  assert.equal(conferirEnvio({ pontos: 300, fase: 2, naves: 12, tempoMs: 60000 }, 70000), null);
});

test('conferência: recusa pontuação acima do que as naves permitem', () => {
  const max = pontosMaximos(1, 5);
  assert.match(conferirEnvio({ pontos: max + 1, fase: 1, naves: 5, tempoMs: 60000 }, 70000), /impossível/);
  assert.equal(conferirEnvio({ pontos: max, fase: 1, naves: 5, tempoMs: 60000 }, 70000), null);
});

test('conferência: aceita naves acumuladas por recomeços da mesma fase', () => {
  // fôlego zerado recomeça a fase com naves novas: 30 naves na fase 2 é possível
  assert.equal(conferirEnvio({ pontos: 1200, fase: 2, naves: 30, tempoMs: 120000 }, 130000), null);
});

test('conferência: recusa tempo maior do que o tempo real da partida', () => {
  assert.match(conferirEnvio({ pontos: 20, fase: 1, naves: 1, tempoMs: 600000 }, 10000), /tempo maior/);
});

test('conferência: recusa partida rápido demais para as naves', () => {
  assert.match(conferirEnvio({ pontos: 400, fase: 1, naves: 12, tempoMs: 1000 }, 10000), /rápido demais/);
});

test('conferência: recusa tempo do jogo maior que o tempo da partida, mesmo com pontos baixos', () => {
  assert.match(conferirEnvio({ pontos: 20, fase: 1, naves: 1, tempoMs: 50000 }, 1000), /tempo maior/);
});

test('conferência: recusa pontos menores que 20 por nave derrubada', () => {
  assert.match(conferirEnvio({ pontos: 10, fase: 1, naves: 1, tempoMs: 9000 }, 20000), /impossível/);
});

test('conferência: tipo errado é recusado', () => {
  assert.match(conferirEnvio({ pontos: '300', fase: 1, naves: 1, tempoMs: 9000 }, 20000), /pontuação/);
  assert.match(conferirEnvio({ pontos: 300, fase: 1.5, naves: 1, tempoMs: 9000 }, 20000), /fase/);
});

test('iniciar: sem login responde 401', async () => {
  const r = await iniciar({ request: pedidoPost('iniciar', { time: 'flamengo' }), env });
  assert.equal(r.status, 401);
});

test('iniciar: time que não existe é recusado', async () => {
  const r = await iniciar({ request: pedidoPost('iniciar', { time: 'time-inventado' }, cookieA), env });
  assert.equal(r.status, 400);
});

test('iniciar: pedido de outro site é recusado', async () => {
  const req = new Request(URL_BASE + 'iniciar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://site-estranho.com', cookie: cookieA },
    body: JSON.stringify({ time: 'flamengo' }),
  });
  assert.equal((await iniciar({ request: req, env })).status, 403);
});

let partidaA;

test('iniciar: começa a partida e devolve o id e o mês de Brasília', async () => {
  const r = await iniciar({ request: pedidoPost('iniciar', { time: 'flamengo' }, cookieA), env });
  assert.equal(r.status, 200);
  const corpo = await r.json();
  assert.ok(Number.isInteger(corpo.partida));
  assert.equal(corpo.mes, mesDe());
  partidaA = corpo.partida;
});

test('enviar: sem login responde 401', async () => {
  const r = await enviar({ request: pedidoPost('enviar', { partida: partidaA, pontos: 20, fase: 1, naves: 1, tempoMs: 1000 }), env });
  assert.equal(r.status, 401);
});

test('enviar: partida de outra conta não é encontrada', async () => {
  const r = await enviar({ request: pedidoPost('enviar', { partida: partidaA, pontos: 20, fase: 1, naves: 1, tempoMs: 1000 }, cookieB), env });
  assert.equal(r.status, 404);
});

test('enviar: pontuação impossível é recusada e a partida continua aberta', async () => {
  const r = await enviar({ request: pedidoPost('enviar', { partida: partidaA, pontos: 99999999, fase: 1, naves: 1, tempoMs: 1000 }, cookieA), env });
  assert.equal(r.status, 422);
  const linha = await env.DB.prepare('SELECT estado FROM ifc_partidas WHERE id = ?').bind(partidaA).first();
  assert.equal(linha.estado, 'jogando');
});

test('enviar: partida válida entra no ranking', async () => {
  await envelhecer(partidaA);
  const r = await enviar({ request: pedidoPost('enviar', { partida: partidaA, pontos: 340, fase: 2, naves: 12, tempoMs: 50000 }, cookieA), env });
  assert.equal(r.status, 200, await r.clone().text());
  const corpo = await r.json();
  assert.equal(corpo.ok, true);
  assert.equal(corpo.geral.posicao, 1);
  assert.equal(corpo.mes.posicao, 1);
});

test('enviar: a mesma partida não vale duas vezes', async () => {
  const r = await enviar({ request: pedidoPost('enviar', { partida: partidaA, pontos: 340, fase: 2, naves: 12, tempoMs: 50000 }, cookieA), env });
  assert.equal(r.status, 409);
});

test('iniciar de novo abandona a partida aberta anterior', async () => {
  const abriu = await (await iniciar({ request: pedidoPost('iniciar', { time: 'santos' }, cookieB), env })).json();
  const outra = await (await iniciar({ request: pedidoPost('iniciar', { time: 'santos' }, cookieB), env })).json();
  const antiga = await env.DB.prepare('SELECT estado FROM ifc_partidas WHERE id = ?').bind(abriu.partida).first();
  assert.equal(antiga.estado, 'abandonada');
  const nova = await env.DB.prepare('SELECT estado FROM ifc_partidas WHERE id = ?').bind(outra.partida).first();
  assert.equal(nova.estado, 'jogando');
});

test('ranking: geral e do mês mostram a melhor partida de cada conta, em ordem', async () => {
  // B envia uma partida pior que a de A
  const bId = (await (await iniciar({ request: pedidoPost('iniciar', { time: 'santos' }, cookieB), env })).json()).partida;
  await envelhecer(bId);
  await enviar({ request: pedidoPost('enviar', { partida: bId, pontos: 100, fase: 1, naves: 5, tempoMs: 30000 }, cookieB), env });
  // A envia uma partida melhor e outra pior: a melhor é a que conta
  const aId = (await (await iniciar({ request: pedidoPost('iniciar', { time: 'flamengo' }, cookieA), env })).json()).partida;
  await envelhecer(aId);
  await enviar({ request: pedidoPost('enviar', { partida: aId, pontos: 200, fase: 1, naves: 10, tempoMs: 40000 }, cookieA), env });

  const r = await ranking({ request: pedidoGet('ranking?escopo=geral', cookieB), env });
  assert.equal(r.status, 200);
  const corpo = await r.json();
  assert.equal(corpo.escopo, 'geral');
  assert.equal(corpo.total, 2);
  assert.equal(corpo.top[0].apelido, 'Lobo Azul');
  assert.equal(corpo.top[0].pontos, 340);
  assert.equal(corpo.top[1].apelido, 'Raposa Verde');
  assert.equal(corpo.top[1].pontos, 100);
  assert.equal(corpo.eu.apelido, 'Raposa Verde');
  assert.equal(corpo.eu.posicao, 2);
});

test('ranking do mês: aceita o mês escolhido e recusa mês inválido', async () => {
  const mes = mesDe();
  const r = await ranking({ request: pedidoGet(`ranking?escopo=mes&mes=${mes}`), env });
  const corpo = await r.json();
  assert.equal(corpo.escopo, 'mes');
  assert.equal(corpo.mes, mes);
  assert.equal(corpo.total, 2);
  const invalido = await (await ranking({ request: pedidoGet('ranking?escopo=mes&mes=2026-99'), env })).json();
  assert.equal(invalido.mes, mesDe());
});

test('ranking: quem não está logado vê o top e não recebe "eu"', async () => {
  const corpo = await (await ranking({ request: pedidoGet('ranking'), env })).json();
  assert.equal(corpo.escopo, 'geral');
  assert.equal(corpo.eu, undefined);
  assert.ok(corpo.top.length >= 1);
  assert.ok(!('conta_id' in corpo.top[0]), 'não expõe o id interno da conta');
});

test('ranking: sem o banco responde 503', async () => {
  const r = await ranking({ request: pedidoGet('ranking'), env: {} });
  assert.equal(r.status, 503);
});
