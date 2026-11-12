> **Plano original, superado.** Este documento descreve a primeira ideia (bandeiras de times de futebol, bola como tiro).
> O jogo foi refeito sem futebol: nave espacial, laser e ondas de naves alienígenas. O que vale hoje está em
> `invasao-estelar/README.md`. O login/ranking e as etapas de publicação abaixo continuam valendo.

# Plano — jogo de nave com times de futebol (estilo "atirador de ondas" do Atari)

Nome provisório: **Invasão FC** (slug `invasao-fc`). Falta escolher o nome de verdade.

## 1. A ideia em uma frase

O jogador é uma bandeira do seu time lá embaixo da tela, só anda para a esquerda e para a direita
e chuta bolas de futebol para cima. Lá em cima vêm ondas de naves alienígenas, e cada onda é
**um** time adversário. Destruiu a onda inteira, vem a próxima com outro time e outro jeito de se mexer.

## 2. Regras do jogo

### Controles (só esquerda/direita)
- **Celular**: segurar o lado esquerdo da tela anda para a esquerda, o lado direito anda para a direita.
  Dois botões grandes e meio transparentes no rodapé mostram isso.
- **Computador**: setas ← → ou A/D (para testar).
- **Chute automático**: como não tem botão de tiro, a bandeira chuta sozinha. Só uma bola por vez
  na tela: quando ela acerta ou sai, sai a próxima. Assim mirar faz diferença.
- **Bola com efeito** (opcional, ver perguntas): enquanto sobe, a bola acompanha um pouco o
  movimento do jogador, como o tiro "guiado" desse tipo de jogo.

### Fases (ondas)
- Cada fase é uma leva de 8 a 12 naves, **todas do mesmo time**.
- O time de cada fase sai da lista de times **sem o time do jogador**. A ordem é embaralhada no
  começo da partida e passa por todos os adversários antes de repetir nenhum.
- Cada fase tem um **padrão de movimento** diferente (o que faz esse tipo de jogo ser divertido):
  1. fila indo e voltando de lado;
  2. zigue-zague descendo;
  3. onda (seno) atravessando a tela;
  4. naves que param e mergulham uma de cada vez;
  5. grupos girando em círculo;
  6. naves que entram pelos lados e cruzam a tela na diagonal;
  7. "barreira" que desce devagar e acelera quando sobram poucas;
  8. naves que se dividem quando o grupo é atingido (mais difícil).
  Depois do padrão 8 o ciclo recomeça mais rápido (velocidade, frequência de tiro inimigo e
  número de naves sobem a cada volta).
- Os inimigos jogam **cartões amarelos e vermelhos** para baixo. Cartão acertou: perde uma vida.
  Encostar em nave também perde vida.

### Fôlego (barra de energia)
- Uma barra de **fôlego** vai esvaziando durante a fase. Se zerar, perde uma vida e a fase recomeça.
- Terminou a fase: o fôlego que sobrou vira **pontos de bônus** e a barra enche de novo.

### Pontos e vidas
- Cada nave destruída vale `20 × número da fase` (fase 1 = 20, fase 2 = 40, …), até um teto.
- Bônus de fim de fase pelo fôlego restante.
- Começa com 3 vidas; ganha 1 vida extra a cada 10.000 pontos (máx. 6).
- Fim de jogo: mostra pontos, fase alcançada, recorde do aparelho e o ranking (se tiver login).

### Times e bandeiras
- Lista fixa de **20 clubes** (sugestão: os da Série A do Brasileirão), cada um com nome, 2–3 cores
  e um desenho de bandeira (listras horizontais, verticais, diagonal, metade-metade, faixa no meio).
- As bandeiras são **desenhadas no código com as cores do time, sem escudo oficial**. Escudos são
  marcas registradas; cores e nome bastam para a criança reconhecer.
- **Tela de escolha**: grade de bandeiras para tocar. A escolha fica salva no aparelho (`localStorage`).
- **Nave inimiga**: um disco voador (o formato muda conforme o padrão da fase) pintado com a
  bandeira do time da onda. O nome do time aparece no começo da fase: "Fase 3 — contra o Time X".

## 3. Login e ranking (o mesmo do queres.games)

O login **não será recriado**. Todos os jogos do queres.games, incluindo o Jopuzzle, usam o arquivo
único `public/conta.js` do site (`QGConta`): apelido gerado (bicho + qualidade), código de 3
caracteres, confirmar apelido, três rodas para entrar. O cookie vale no site todo, então quem já
entrou no Jopuzzle já está logado aqui.

### No jogo (cliente)
- `index.html` inclui `<script src="/conta.js?v=2"></script>` (caminho absoluto, igual ao Jopuzzle).
- `src/conta-ponte.js`:
  - `const eu = window.QGConta ? await QGConta.me() : null;`
  - `null` → sem servidor (GitHub Pages / arquivo local): **esconde** botões de conta e ranking;
    o jogo funciona normal, só com recorde local.
  - Menu: botão "Entrar" (`QGConta.entrar()`) ou o apelido (`QGConta.perfil()`).
  - Fim de jogo sem login: botão "Entrar para salvar no ranking", que abre
    `QGConta.montar(painel, { aoConcluir, aoFechar, rotuloFechar: 'Voltar ao jogo' })`
    e depois envia a pontuação.
  - `QGConta.aoMudar(...)` atualiza a tela ao entrar ou sair.

### No servidor (Cloudflare Pages Functions, no repositório `queres-games`)
A pontuação vem do navegador, então o servidor confere o que dá:
- `POST /api/invasao-fc/iniciar` → cria uma partida (`id`, hora de início **do servidor**).
- `POST /api/invasao-fc/enviar` `{ partida, pontos, fase, time }` → recusa se:
  a partida não é dessa conta, já foi enviada, ou os pontos são impossíveis para o tempo que
  passou e a fase informada (teto de pontos por fase e tempo mínimo por fase).
- `GET /api/invasao-fc/ranking` → top 20 (apelido + bandeira do time + pontos) e a posição da pessoa.
  Opcional: ranking do mês, como no Jopuzzle.
- Tabelas D1 com prefixo `ifc_`: `ifc_partidas` e `ifc_recordes`, ligadas a `contas.id`.
  **Nada muda em `contas` nem em `sessoes`.**
- Base: o modelo `exemplo-pontuacao.js` da skill `login-queres-games`, mais `contaAtual`,
  `origemInvalida`, `lerJson`, `semBanco` de `functions/_lib/conta.js`.
- Regras do site (público infantil): nada de texto livre, nome, e-mail ou IP. O ranking mostra só
  o apelido gerado, a bandeira (escolhida numa lista fixa) e números.

Esses arquivos ficam em `servidor/functions/api/invasao-fc/` neste repositório e são copiados para
o `queres-games` na hora de publicar.

## 4. Tecnologia e estrutura

- HTML + CSS + JavaScript puro com `<canvas>`, sem build e sem bibliotecas externas (como os outros
  jogos do site). Caminhos relativos, porque o jogo roda em `/jogar/<slug>/`.
- Tela em **retrato**, área de jogo fixa (ex.: 360×640 lógicos) escalada para a tela, nítida em telas
  retina (`devicePixelRatio`), respeitando a área segura do iPhone.
- Laço com `requestAnimationFrame` e passo de tempo fixo (mesma velocidade em qualquer celular).
- Pausa sozinha quando o app sai de foco (`visibilitychange`).
- Sons feitos no código (Web Audio): chute, explosão, cartão, fim de fase. Vibração curta ao perder vida.
- PWA (`manifest.webmanifest` + ícones) para "adicionar à tela inicial".

```
index.html
style.css
manifest.webmanifest
icones/
src/
  main.js          telas (início, escolher time, jogo, fim) e laço
  times.js         lista dos 20 times: nome, cores, padrão da bandeira
  bandeiras.js     desenha bandeiras e naves com as cores do time
  controles.js     toque (metade da tela) e teclado
  jogador.js       bandeira do jogador e chute automático
  inimigos.js      naves e os 8 padrões de movimento
  fases.js         ordem dos times (sem o do jogador), dificuldade por fase
  pontos.js        pontos, bônus, vidas extras, recorde local
  som.js           sons gerados
  hud.js           pontos, vidas, barra de fôlego, aviso de fase
  conta-ponte.js   QGConta + chamadas da API de ranking
servidor/functions/api/invasao-fc/   iniciar.js, enviar.js, ranking.js
tests/             testes da lógica com node:test
```

## 5. Etapas

1. **Base**: canvas, escala, controles, bandeira andando, chute automático.
2. **Uma fase jogável**: naves, colisão, explosão, pontos, cartões, vidas, fim de jogo.
3. **Fases**: os 8 padrões, troca de time a cada fase sem o time do jogador, fôlego, bônus,
   dificuldade crescente.
4. **Times**: lista, bandeiras desenhadas, tela de escolha, nome do adversário no começo da fase.
5. **Acabamento**: sons, efeitos, tela de início, pausa, recorde local, PWA, ícones.
6. **Login e ranking**: `conta-ponte.js` e as funções do servidor; teste no simulador local
   (`npx wrangler@4 pages dev dist --d1 DB=teste-local` no `queres-games`).
7. **Publicar** com a skill `publicar-no-queres-games` (card, capa, post no blog, linha nova na
   tabela do `CLAUDE.md`). Como envolve ranking de crianças, o merge na `main` só com o seu ok.

Cada etapa termina com teste no Playwright em celular (390×844 e 360×640), sem erros no console,
e com commit nesta branch.

## 6. Testes

- `node --test tests/`: ordem dos times nunca inclui o time do jogador e não repete antes de passar
  por todos; pontos por fase; bônus; vida extra; teto de pontos usado no servidor.
- Playwright: abrir, escolher time, jogar alguns segundos segurando cada lado, perder todas as vidas,
  ver a tela de fim. Jogo sem servidor não mostra botões de conta.
- Login local: entrar com uma conta de teste, enviar pontuação, ver no ranking; pontuação impossível
  é recusada.
- Não dá para testar aqui: toque num celular de verdade e o Cloudflare de produção.

## 7. Perguntas em aberto

1. **Nome do jogo** (e o slug do site).
2. **Times**: os 20 da Série A do Brasileirão? Outros clubes? Seleções também?
3. **Autores** no card: Jojô, Bento ou os dois?
4. **Chute automático** está ok (já que só tem esquerda/direita)? E a "bola com efeito"?
5. Ranking **geral** (melhor pontuação de sempre) ou também **do mês**, como no Jopuzzle?
