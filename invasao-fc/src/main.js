// Invasão FC: telas, entrada (toque e teclado), laço do jogo e fluxo de conta/ranking.
import * as L from './logica.js';
import { novaPartida, atualizar, resultado } from './motor.js';
import { desenharPartida } from './desenho.js';
import { TIMES, TIMES_POR_ID, IDS_TIMES } from './times.js';
import { spriteBandeira } from './bandeiras.js';
import { temSite, eu, iniciarPartida, enviarPartida, ranking } from './conta-ponte.js';
import { liberarSom, tocar, vibrar, alternarSom, somLigado } from './som.js';

const $ = (id) => document.getElementById(id);
const LS_TIME = 'invasao_fc_time';
const LS_RECORDE = 'invasao_fc_recorde';
const TELAS = ['tela-inicio', 'tela-times', 'tela-ranking', 'tela-jogo', 'tela-fim'];

const canvas = $('campo');
const g = canvas.getContext('2d');

let escolhido = null; // id do time
let partida = null; // estado do motor
let partidaServidor = null; // id da partida no servidor (só se a pessoa estiver logada)
let semRanking = null; // null | 'sem-site' (jogo fora do queres.games) | 'sem-servidor' (sem conexão agora)
let rodando = false;
let pausado = false;
let ultimoQuadro = 0;
let estadoConta = null; // { logado, apelido } ou null (sem servidor)
let escopoRanking = 'geral';
const teclas = { esq: false, dir: false };
const toques = new Map(); // pointerId -> -1 (esquerda) ou 1 (direita)

/* ---------- utilidades ---------- */
function mostrar(id) {
  for (const t of TELAS) $(t).hidden = t !== id;
}

function lerTime() {
  try {
    const id = localStorage.getItem(LS_TIME);
    return IDS_TIMES.includes(id) ? id : null;
  } catch (e) { return null; }
}
function guardarTime(id) {
  try { localStorage.setItem(LS_TIME, id); } catch (e) { /* sem armazenamento */ }
}
function lerRecorde() {
  try { return Number(localStorage.getItem(LS_RECORDE)) || 0; } catch (e) { return 0; }
}
function guardarRecorde(pontos) {
  try { localStorage.setItem(LS_RECORDE, String(pontos)); } catch (e) { /* sem armazenamento */ }
}

function elemento(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  n.append(...filhos);
  return n;
}

/* ---------- tela do jogo: tamanho e entrada ---------- */
function ajustarCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const escala = Math.min(window.innerWidth / L.LARGURA, window.innerHeight / L.ALTURA);
  canvas.style.width = `${Math.floor(L.LARGURA * escala)}px`;
  canvas.style.height = `${Math.floor(L.ALTURA * escala)}px`;
  canvas.width = Math.round(L.LARGURA * escala * dpr);
  canvas.height = Math.round(L.ALTURA * escala * dpr);
  g.setTransform(canvas.width / L.LARGURA, 0, 0, canvas.height / L.ALTURA, 0, 0);
}

function ladoDoToque(e) {
  const r = canvas.getBoundingClientRect();
  return e.clientX < r.left + r.width / 2 ? -1 : 1;
}

function direcaoDaEntrada() {
  let d = 0;
  for (const v of toques.values()) d += v;
  if (teclas.esq) d -= 1;
  if (teclas.dir) d += 1;
  return L.clamp(d, -1, 1);
}

canvas.addEventListener('pointerdown', (e) => {
  if (!rodando) return;
  e.preventDefault();
  liberarSom();
  canvas.setPointerCapture(e.pointerId);
  toques.set(e.pointerId, ladoDoToque(e));
});
for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(tipo, (e) => toques.delete(e.pointerId));
}

const TECLAS_ESQ = ['ArrowLeft', 'KeyA'];
const TECLAS_DIR = ['ArrowRight', 'KeyD'];
window.addEventListener('keydown', (e) => {
  if (!rodando) return;
  if (TECLAS_ESQ.includes(e.code)) { teclas.esq = true; e.preventDefault(); }
  if (TECLAS_DIR.includes(e.code)) { teclas.dir = true; e.preventDefault(); }
  if (e.code === 'KeyP' || e.code === 'Escape') alternarPausa();
});
window.addEventListener('keyup', (e) => {
  if (TECLAS_ESQ.includes(e.code)) teclas.esq = false;
  if (TECLAS_DIR.includes(e.code)) teclas.dir = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && rodando && !pausado) alternarPausa();
});
window.addEventListener('resize', () => { if (rodando) ajustarCanvas(); });

/* ---------- laço do jogo ---------- */
function tocarEventos() {
  for (const ev of partida.eventos.splice(0)) {
    if (ev === 'perdeu') { tocar('perdeu'); vibrar(80); }
    else if (ev === 'explosao') tocar('explosao');
    else if (ev === 'chute') tocar('chute');
    else if (ev === 'cartao') tocar('cartao');
    else if (ev === 'fase') tocar('fase');
    else if (ev === 'vida') tocar('vida');
  }
}

function quadro(t) {
  if (!rodando) return;
  const dt = ultimoQuadro ? (t - ultimoQuadro) / 1000 : 0;
  ultimoQuadro = t;
  if (!pausado) {
    atualizar(partida, dt, direcaoDaEntrada());
    tocarEventos();
  }
  desenharPartida(g, partida, t / 1000);
  if (partida.estado === 'fim') {
    terminar();
    return;
  }
  requestAnimationFrame(quadro);
}

function alternarPausa() {
  if (!rodando) return;
  pausado = !pausado;
  $('pausa').hidden = !pausado;
  ultimoQuadro = 0; // não cobra o tempo da pausa
}

function comecarPartida() {
  partida = novaPartida({ time: escolhido, ids: IDS_TIMES });
  mostrar('tela-jogo');
  ajustarCanvas();
  rodando = true;
  pausado = false;
  $('pausa').hidden = true;
  ultimoQuadro = 0;
  toques.clear();
  requestAnimationFrame(quadro);
}

async function terminar() {
  rodando = false;
  toques.clear();
  tocar('fim');
  vibrar(200);
  const res = resultado(partida);
  partida = null;
  mostrar('tela-fim');
  $('fim-pontos').textContent = String(res.pontos);
  $('fim-detalhe').textContent = `Fase ${res.fase} · ${res.naves} ${res.naves === 1 ? 'nave derrubada' : 'naves derrubadas'}`;
  const recorde = lerRecorde();
  if (res.pontos > recorde) guardarRecorde(res.pontos);
  $('fim-recorde').textContent = `Recorde neste aparelho: ${Math.max(recorde, res.pontos)}`;

  const aviso = $('fim-ranking');
  if (partidaServidor) {
    const id = partidaServidor;
    partidaServidor = null;
    aviso.textContent = 'Salvando no ranking...';
    const r = await enviarPartida(id, res);
    if (r.ok) {
      const partes = [];
      if (r.geral.posicao) partes.push(`Geral: ${r.geral.posicao}º de ${r.geral.total}`);
      if (r.mes.posicao) partes.push(`Do mês: ${r.mes.posicao}º de ${r.mes.total}`);
      aviso.textContent = partes.length ? partes.join(' · ') : 'Salvo no ranking.';
    } else {
      aviso.textContent = `Não deu para salvar no ranking: ${r.erro}.`;
    }
  } else if (semRanking === 'sem-servidor') {
    aviso.textContent = 'Sem conexão com o ranking. Esta partida não foi salva lá.';
  } else {
    aviso.textContent = '';
  }
}

/* ---------- início, times, ranking e conta ---------- */
function desenharEscolhido() {
  const box = $('escolhido');
  box.replaceChildren();
  if (!escolhido) {
    box.append(elemento('p', { class: 'ajuda', text: 'Escolha seu time para começar.' }));
    return;
  }
  const t = TIMES_POR_ID[escolhido];
  box.append(spriteBandeira(escolhido, 64, 42), elemento('span', { class: 'nome-time', text: t.nome }));
}

function atualizarBotoesDeConta() {
  const servidor = estadoConta !== null;
  $('btn-conta').hidden = !servidor;
  $('btn-ranking').hidden = !servidor;
  if (servidor) $('btn-conta').textContent = estadoConta.logado ? `Perfil: ${estadoConta.apelido}` : 'Entrar';
}

function abrirTimes() {
  const grade = $('grade-times');
  grade.replaceChildren(...TIMES.map((t) => {
    const botao = elemento('button', { class: 'time-card' + (t.id === escolhido ? ' on' : ''), type: 'button', 'aria-label': t.nome });
    botao.append(spriteBandeira(t.id, 56, 38), elemento('span', { text: t.nome }));
    botao.addEventListener('click', () => {
      escolhido = t.id;
      guardarTime(t.id);
      desenharEscolhido();
      abrirInicio();
    });
    return botao;
  }));
  mostrar('tela-times');
}

function abrirInicio() {
  desenharEscolhido();
  mostrar('tela-inicio');
}

async function abrirRanking(escopo = escopoRanking) {
  escopoRanking = escopo;
  mostrar('tela-ranking');
  for (const b of document.querySelectorAll('[data-escopo]')) b.classList.toggle('on', b.dataset.escopo === escopo);
  const lista = $('lista-ranking');
  const status = $('status-ranking');
  lista.replaceChildren();
  status.textContent = 'Carregando...';
  const r = await ranking(escopo);
  if (escopo !== escopoRanking) return; // a pessoa trocou de aba enquanto carregava
  if (!r) {
    status.textContent = 'Ranking indisponível agora.';
    return;
  }
  const linha = (item) => elemento('li', { class: 'linha-rank' + (estadoConta && estadoConta.logado && r.eu && item.posicao === r.eu.posicao ? ' eu' : '') },
    elemento('span', { class: 'pos', text: `${item.posicao}º` }),
    spriteBandeira(item.time, 28, 19),
    elemento('span', { class: 'apelido', text: item.apelido }),
    elemento('span', { class: 'pontos', text: String(item.pontos) }));
  lista.replaceChildren(...r.top.map(linha));
  if (r.eu && r.eu.posicao > r.top.length) lista.append(elemento('li', { class: 'separador', text: '···' }), linha(r.eu));
  const onde = escopo === 'mes' ? 'neste mês' : 'no geral';
  status.textContent = r.total ? `${r.total} ${r.total === 1 ? 'partida' : 'partidas'} ${onde}` : `Ainda não há partidas ${onde}.`;
}

async function jogar() {
  if (!escolhido) {
    abrirTimes();
    return;
  }
  liberarSom();
  partidaServidor = null;
  semRanking = null;
  if (temSite()) {
    let e = await eu();
    if (e === null) {
      semRanking = 'sem-servidor'; // sem conexão com o servidor: joga, mas não entra no ranking
    } else {
      if (!e.logado) {
        // a partida só entra no ranking se o servidor começar a contar antes de jogar
        const r = await window.QGConta.entrar();
        if (!r) return;
        e = { logado: true, apelido: r.apelido };
      }
      partidaServidor = await iniciarPartida(escolhido);
      if (!partidaServidor) {
        abrirInicio();
        $('aviso-inicio').textContent = 'Não consegui começar a partida agora. Tente de novo.';
        return;
      }
      $('aviso-inicio').textContent = '';
    }
    estadoConta = await eu() || estadoConta;
    atualizarBotoesDeConta();
  } else {
    semRanking = 'sem-site';
  }
  comecarPartida();
}

function sairParaInicio() {
  rodando = false;
  pausado = false;
  partida = null;
  partidaServidor = null;
  $('pausa').hidden = true;
  abrirInicio();
}

async function botaoConta() {
  if (estadoConta && estadoConta.logado) await window.QGConta.perfil();
  else await window.QGConta.entrar();
  estadoConta = await eu();
  atualizarBotoesDeConta();
}

function atualizarBotaoSom() {
  $('btn-som').textContent = somLigado() ? 'Som: ligado' : 'Som: desligado';
}

/* ---------- ligar tudo ---------- */
function ligarBotoes() {
  $('btn-jogar').addEventListener('click', jogar);
  $('btn-times').addEventListener('click', abrirTimes);
  $('btn-ranking').addEventListener('click', () => abrirRanking('geral'));
  $('btn-conta').addEventListener('click', botaoConta);
  $('btn-som').addEventListener('click', () => { alternarSom(); atualizarBotaoSom(); });
  $('btn-voltar-times').addEventListener('click', abrirInicio);
  $('btn-voltar-ranking').addEventListener('click', abrirInicio);
  for (const b of document.querySelectorAll('[data-escopo]')) b.addEventListener('click', () => abrirRanking(b.dataset.escopo));
  $('btn-pausa').addEventListener('click', alternarPausa);
  $('btn-continuar').addEventListener('click', alternarPausa);
  $('btn-sair').addEventListener('click', sairParaInicio);
  $('btn-de-novo').addEventListener('click', jogar);
  $('btn-inicio-fim').addEventListener('click', abrirInicio);
  if (window.QGConta) window.QGConta.aoMudar((e) => { estadoConta = e; atualizarBotoesDeConta(); });
}

async function iniciar() {
  escolhido = lerTime();
  ligarBotoes();
  atualizarBotaoSom();
  abrirInicio();
  estadoConta = await eu();
  atualizarBotoesDeConta();
}

iniciar();
