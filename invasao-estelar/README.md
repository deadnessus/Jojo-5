# Invasão Estelar

Jogo de celular inspirado no Atari (uma nave contra ondas de inimigos), para o site queres.games.
A nave só anda para a esquerda e para a direita e atira sozinha. Cada onda traz um tipo de nave alienígena
(10 tipos, com 8 jeitos de se mover), e o jogo fica mais rápido a cada volta de 8 ondas.

Login compartilhado (`/conta.js`) e ranking geral e do mês.

## Estrutura

```
index.html, style.css, manifest.webmanifest, icone.svg   páginas e instalação no celular
src/
  logica.js        regras (ondas, padrões de movimento, entrada das naves, pontos, vidas, limites do servidor)
  motor.js         estado da partida e atualização a cada quadro (sem desenho)
  naves.js         desenho das 10 naves inimigas (2 quadros cada) e da nave do jogador
  efeitos.js       faíscas, ondas de choque, tremor de tela, rastro do motor
  desenho.js       fundo (nebulosa e estrelas em camadas), tiros, painel, faixa de abertura
  som.js           sons feitos no código (Web Audio) e vibração
  conta-ponte.js   chamadas do login (QGConta) e da API de ranking
  main.js          telas, toque e teclado, laço do jogo, fluxo de conta e ranking
tests/             testes com node:test (regras, movimento, motor e rotas do servidor)
servidor/functions/
  _lib/invasao-estelar.js          conferência da pontuação e ranking
  api/invasao-estelar/iniciar.js   começa a partida (relógio do servidor)
  api/invasao-estelar/enviar.js    confere e grava a partida
  api/invasao-estelar/ranking.js   ranking geral e do mês
  _lib/conta.js                    CÓPIA do functions/_lib/conta.js do queres-games, só para os testes
```

## Como jogar

- Celular: segure a metade esquerda ou direita da tela. O ícone no painel pausa.
- Computador: setas ← → ou A e D. P ou Esc pausa.
- A energia (barra no topo) esvazia durante a onda. Se zerar, perde uma nave e a onda recomeça. Quem derruba todas as
  naves ganha o que sobrou de energia como bônus. A cada 10.000 pontos ganha uma nave extra (até 6).

## Testes

```
npm test          # regras, movimento, motor, conferência e rotas do servidor (D1 falso sobre SQLite)
```

`servidor/functions/_lib/conta.js` é uma cópia só para os testes. **Não publique essa cópia:** ao publicar, copie só
`_lib/invasao-estelar.js` e `api/invasao-estelar/`. O site já tem o `conta.js` verdadeiro.

## Como publicar (skill `publicar-no-queres-games`)

1. Copiar para `public/jogar/invasao-estelar/`: `index.html style.css manifest.webmanifest icone.svg src/`. Não copiar
   `tests/`, `servidor/`, `package.json` nem este README.
2. Copiar `servidor/functions/_lib/invasao-estelar.js` para `functions/_lib/` e `servidor/functions/api/invasao-estelar/*.js`
   para `functions/api/invasao-estelar/`.
3. Card em `src/content/jogos/invasao-estelar.md`, capa, post no blog e linha na tabela de jogos do `CLAUDE.md`.
4. Atualizar o `CLAUDE.md` com a tabela D1 nova (`ie_partidas`) e as rotas.

## Decisões

- **Ranking exige login.** Quem toca em "Jogar" entra na conta primeiro: o servidor precisa começar o relógio antes da
  partida para conferir a pontuação. Sem o site (abrindo o arquivo ou no GitHub Pages), o jogo funciona normal e só
  guarda o recorde no aparelho.
- **Ranking do mês** mostra a melhor partida de cada pessoa no mês (horário de Brasília), não a soma dos pontos.
- **Conferência da pontuação** (`conferirEnvio`): o tempo informado não pode passar do tempo medido no servidor; os pontos
  não podem passar do máximo para o número de naves e a onda; cada nave vale no mínimo 20; há tempo mínimo por nave e por
  onda. Isso limita trapaças, mas **não impede** quem conhece as regras de mandar números plausíveis.
- **Recomeço por energia:** quando a energia acaba, a onda recomeça com naves novas e as derrubadas se acumulam. Por isso o
  limite do servidor é por total de naves, não por onda.
- **Movimento:** as naves entram voando em curva (2,4 s de abertura, sem tiros nem colisão); depois seguem um dos 8
  padrões e aceleram quando sobram poucas. O tempo de cada padrão é do grupo, então a velocidade muda sem saltos.

## Ajustar

- Números do jogo: `src/logica.js`. Se mudar pontos, vidas ou limites, mude também `servidor/functions/_lib/invasao-estelar.js`.
- Visual das naves: `src/naves.js` (`TIPOS`). Cada tipo é uma função que desenha em 60 x 48; `f` é o quadro (0 ou 1).
