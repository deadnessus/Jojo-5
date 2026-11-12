# Invasão FC

Jogo de celular inspirado no Atari (nave que atira contra ondas de inimigos), com bandeiras dos times da Série A.
A bandeira do jogador só anda para a esquerda e para a direita e chuta bolas de futebol sozinha.
Cada fase é uma leva de naves de um único time adversário. O time escolhido nunca aparece como adversário.

Feito para o site queres.games, com o login compartilhado (`/conta.js`) e ranking geral e do mês.

## Estrutura

```
index.html, style.css, manifest.webmanifest, icone.svg   páginas e instalação no celular
src/
  logica.js        regras (fases, padrões de movimento, fila de times, pontos, vidas, limites do servidor)
  motor.js         estado da partida e atualização a cada quadro (sem desenho)
  desenho.js       desenho no canvas (campo, naves, bola, cartões, HUD, faixa de fase)
  bandeiras.js     bandeiras e naves desenhadas (sem escudos oficiais)
  times.js         os 20 times (nome, cores, desenho da bandeira)
  som.js           sons feitos no código (Web Audio) e vibração
  conta-ponte.js   chamadas do login (QGConta) e da API de ranking
  main.js          telas, toque e teclado, laço do jogo, fluxo de conta e ranking
tests/             testes com node:test (regras, motor e rotas do servidor)
servidor/functions/
  _lib/invasao-fc.js          conferência da pontuação, ranking
  api/invasao-fc/iniciar.js   começa a partida (relógio do servidor)
  api/invasao-fc/enviar.js    confere e grava a partida
  api/invasao-fc/ranking.js   ranking geral e do mês
  _lib/conta.js               CÓPIA do functions/_lib/conta.js do queres-games, só para os testes
```

## Testes

```
npm test          # regras, motor, conferência e rotas do servidor (D1 falso sobre SQLite)
```

`conta.js` dentro de `servidor/functions/_lib/` é uma cópia de teste. **Não publique essa cópia:** ao publicar,
copie só `_lib/invasao-fc.js` e `api/invasao-fc/`. O site já tem o `conta.js` verdadeiro.

## Como publicar (skill `publicar-no-queres-games`)

1. Copiar para `public/jogar/invasao-fc/`: `index.html style.css manifest.webmanifest icone.svg src/`. Não copiar `tests/`, `servidor/`, `package.json` nem este README.
2. Copiar `servidor/functions/_lib/invasao-fc.js` para `functions/_lib/` e `servidor/functions/api/invasao-fc/*.js` para `functions/api/invasao-fc/`.
3. Card em `src/content/jogos/invasao-fc.md`, capa, post no blog e linha na tabela de jogos do `CLAUDE.md`.
4. Confirmar que a lista de times em `src/times.js` e `_lib/invasao-fc.js` está atual (são iguais; o teste confere).

## Decisões

- **Ranking exige login.** Quem toca em "Jogar" entra na conta primeiro. O servidor começa o relógio ao iniciar a partida,
  então uma pontuação só pode ser conferida se a partida começou no servidor antes. Sem o site (abrindo o arquivo ou
  no GitHub Pages), o jogo funciona normal e só guarda o recorde no aparelho.
- **Conferência da pontuação** (`conferirEnvio`): o tempo informado não pode passar do tempo medido no servidor; pontos
  não podem passar do máximo para o número de naves e fase; cada nave vale no mínimo 20; e a partida tem tempo mínimo por
  nave e por fase. Isso limita trapaças, mas **não impede** uma pessoa que conhece as regras de mandar números plausíveis.
- **Recomeço por fôlego**: quando o fôlego acaba, a fase recomeça com naves novas e as derrubadas se acumulam. Por isso o
  limite é por total de naves, não por fase.
- **Efeito da bola**: 20% do movimento lateral da bandeira (`EFEITO_BOLA` em `src/logica.js`).
- **Padrão 8 é a espiral**, não a divisão de naves (a divisão ficou de fora por complexidade).

## Ajustar

- Números do jogo: `src/logica.js`. Se mudar pontos, vidas ou limites, mude também `servidor/functions/_lib/invasao-fc.js`.
- Times e cores: `src/times.js` (a lista de ids do servidor também). As cores são aproximadas.
