# Invasão Estelar: plano de evolução

> Plano para melhorar bastante o jogo: jogabilidade, gráficos e som, motivos para voltar a jogar e jogo online.
> **Ainda não implementado.** Cada etapa só começa com o ok do dono.
> Ponto de partida: a versão que está no ar em queres.games (commit `62afc0a` deste repositório, arquivos `?v=5`).

## 1. Como o jogo está hoje

- A nave anda só para os lados e atira sozinha (um laser por vez).
- Ondas de 8 a 12 inimigos, com 10 tipos de inimigo e 8 jeitos de se mover. A cada 8 ondas, tudo fica 12% mais rápido.
- 4 cenários de guerra, trocando a cada 2 ondas.
- Energia que esvazia (60 s), 3 naves, nave extra a cada 30.000 pontos (até 6).
- Pontos: 20 × número da onda por inimigo (até a onda 10), mais o bônus da energia que sobra.
- Ranking geral e do mês (melhor partida de cada conta). No site, só joga quem entra na conta.
- Medição anônima do site com 5 avisos do jogo: partida iniciada, partida terminada (com a onda), pausada, saiu no meio e ranking aberto.

### O que mais limita o jogo

1. **Os 10 inimigos só mudam na aparência.** Todos têm 1 de vida e o mesmo tiro, então depois de algumas ondas a partida fica repetitiva.
2. **Pouco para decidir.** Não há nada para pegar, nenhum risco que valha mais pontos e nenhum chefão. O ranking mede quase só quanto tempo a pessoa sobreviveu.
3. **Nenhum motivo para voltar amanhã**, a não ser bater o próprio recorde.
4. **Atrito para começar.** No site, quem não tem conta precisa criar uma antes da primeira partida.
5. **Só dá para jogar sozinho.**
6. **Som simples e sem música.**

## 2. Regras do plano (não mudam)

- **Só esquerda e direita, com tiro automático** (o pedido original). Toda novidade funciona com esses dois controles.
- **Difícil, mas justo.** Todo ataque perigoso avisa antes: pisca, mostra uma linha ou faz um som.
- **Partidas curtas**, de 3 a 8 minutos.
- **Regras do site para crianças:** conta só de apelido, sem chat, sem texto livre, medição só pela telemetria do site e tudo dentro do jogo (nada de arquivos de outros sites).
- **Vontade de voltar, sem armadilhas:** sem notificações, sem sequência de dias que se perde, sem caixas-surpresa, sem compras, sem anúncios e sem "volte em X horas para ganhar".
- **Uma etapa por vez.** Cada etapa é publicada sozinha, com post no blog, e comparada no painel do site (versão antes × versão depois). Com menos de 30 sessões, não se conclui nada.

## 3. As etapas

### Etapa 0: preparar o terreno

O que quem joga percebe: **dá para jogar sem conta** (o ranking continua só para quem entra) e o jogo **se ajusta sozinho em celular mais fraco**.

- **Modo convidado.** Quem não entra na conta joga normalmente. No fim, o jogo mostra "Entre na conta para aparecer no ranking na próxima partida". A partida do convidado não vai para o ranking, porque o servidor precisa contar o tempo desde o começo. (Decisão 2)
- **Qualidade automática.** Se o celular não aguentar uns 50 quadros por segundo, o jogo tira enfeites (névoa, brilhos, partículas) até ficar liso.
- **Jogo repetível (por dentro).** Com o mesmo número de sorteio, as ondas e os tiros saem iguais. Isso é a base do desafio do dia, do desafio entre amigos, do duelo e dos testes automáticos.
- **Ondas e inimigos descritos em tabelas.** Assim fica fácil ajustar a dificuldade sem mexer no resto.
- **Versão dos arquivos automática.** Um comando troca o `?v=` em todos os arquivos (hoje é manual, e esquecer deixa o celular com arquivos velhos).
- **Sempre partir da versão do site.** Outras sessões já mudaram o jogo direto no site (os avisos de medição). Antes de cada etapa, conferir se o site e este repositório estão iguais.

Detalhes técnicos: passo fixo de 1/60 s com acumulador; toda a aleatoriedade que afeta a partida vem de `p.rand` com semente (os efeitos visuais seguem com outro sorteio); tabelas `ONDAS` e `INIMIGOS` num arquivo de dados; gravação das entradas (mudanças de direção com o número do quadro) para testes de repetição; script que atualiza o `?v=`.

- **Tamanho:** médio (1 sessão).
- **Como medir:** toques em "Jogar" (`btn-jogar`) comparados com partidas iniciadas (`partida_iniciada`); saídas rápidas.

### Etapa 1: batalha mais rica

O que quem joga percebe: cada inimigo ataca de um jeito, aparecem cápsulas para pegar e combos dão muitos pontos.

**Cada inimigo com um comportamento** (todos avisam antes de atacar):

| Inimigo | Como passa a se comportar |
|---|---|
| Caças Garra | rápidos; tiro duplo reto |
| Vespas | se soltam em zigue-zague curto e voltam; ferroada rápida |
| Lâminas | escudo na frente: o primeiro tiro quebra o escudo, o segundo derruba |
| Devoradores | 2 de vida; ficam vermelhos e mais rápidos depois do primeiro tiro |
| Bombardeiros | soltam uma bomba que estoura em 3 pedaços perto do chão |
| Aranhas | soltam teia: se acertar, a nave fica lenta por 2 s |
| Sentinelas | mostram uma linha vermelha piscando e depois disparam um raio reto |
| Parasitas | quando derrubados, viram 2 filhotes pequenos |
| Crânios | tiro em leque de 3 |
| Olhos | tiro lento que segue a nave |

**Cápsulas.** Caem às vezes de inimigos derrubados e são pegas encostando nelas, o que combina com "só esquerda e direita". Somem se ninguém pegar.

| Cápsula | Efeito |
|---|---|
| Tiro duplo | 2 lasers por vez, por 10 s |
| Leque | 3 lasers abertos, por 8 s |
| Escudo | aguenta 1 tiro |
| Energia | +10 s na barra |
| Câmera lenta | inimigos e tiros a meia velocidade, por 5 s |
| Bomba | apaga todos os tiros inimigos da tela |

- **Combo.** Derrubar inimigos em sequência (até 1,5 s entre um e outro) sobe o multiplicador: ×2, ×3, ×4, ×5. Levar um tiro zera. Assim o ranking premia habilidade, não só sobrevivência.
- **Tiro carregado (opcional).** Ficar parado por 1 s carrega um tiro forte que atravessa uma fila. Ficar parado é arriscado, então vira uma escolha de risco, sem botão novo. (Decisão 1)
- **Ondas especiais** de vez em quando: chuva de meteoros (só desviar, valendo pontos) e onda bônus (inimigos que não atiram e valem o dobro).
- **Dificuldade em degraus**, calibrada pelos números do painel (em que onda as partidas terminam). Opcional: um nível "Recruta", mais calmo e sem ranking, para crianças menores. (Decisão 3)
- **Tela de resultado nova:** onda, pontos, maior combo, precisão (acertos ÷ tiros), inimigos de cada tipo e "novo recorde!".
- **Sensação de impacto:** o inimigo quebra em pedaços e pisca branco ao levar tiro, "+40" sobe do lugar onde ele caiu, e o jogo dá uma pausa curtinha quando algo grande cai.

Detalhes técnicos: tabela `INIMIGOS` com vida, tipo de tiro, especial e aviso; cápsulas e combo no motor. O limite de pontos do servidor (`pontosMaximos`) precisa subir junto (multiplicador ×5, cápsulas, ondas bônus), senão partidas boas são recusadas. Testes automáticos para cada comportamento.

- **Tamanho:** grande (2 a 3 sessões).
- **Como medir:** tempo médio por sessão; onda em que a partida termina (`partida_terminada`).

### Etapa 2: chefões, gráficos e som

O que quem joga percebe: um chefão no fim de cada volta, um salto no hiperespaço e música.

- **Chefão nas ondas 8, 16, 24…** (fim de cada volta). Três chefões que se revezam:
  - **Nave-mãe:** canhões que precisam ser destruídos um a um antes do núcleo.
  - **Rainha Aranha:** solta filhotes e teias e muda de lado.
  - **Olho Gigante:** raios com aviso que varrem a tela.

  Todos com barra de vida no topo e uma explosão grande no fim.
- **Salto no hiperespaço** entre uma volta e outra: as estrelas viram riscos, a tela clareia e o cenário muda.
- **Música feita no próprio jogo** (sem arquivos de fora). Ela fica mais intensa nas ondas difíceis e muda no chefão. Sons novos para cada cápsula e ataque, e botões separados para música e efeitos.
- **Hangar no menu:** a nave girando, com a cor escolhida (ver Etapa 3).
- **Acessibilidade:** opção "menos tremor"; tiros inimigos com formas diferentes, não só cores.
- **Fundos com mais profundidade** (mais camadas) e acontecimentos ligados ao jogo, como um cruzador que explode ao fundo quando a onda acaba.

- **Tamanho:** grande (2 sessões).
- **Como medir:** tempo médio; quantos chegam ao primeiro chefão e quantos vencem (aviso `chefe`).

### Etapa 3: motivos para voltar

O que quem joga percebe: um desafio novo todo dia, missões da semana, patente de piloto, medalhas e naves para liberar.

- **Desafio do dia** (como o do Jopuzzle). As mesmas ondas para todo mundo naquele dia, sorteadas pela data, com **uma tentativa que vale ranking**. Depois dá para treinar à vontade. Ranking do dia e soma do mês. O dia troca à meia-noite de Brasília.
- **Missões da semana.** São 3 por semana, iguais para todos (exemplos: "derrube 30 aranhas", "chegue à onda 8", "faça um combo ×4"). Semanais, para não virar obrigação diária.
- **Patente do piloto.** Toda partida dá experiência, com patentes de Cadete a Almirante. O ícone da patente aparece ao lado do apelido no ranking.
- **Medalhas** (umas 20): "primeiro chefão", "onda 10", "sem perder nave até a onda 5", "combo ×5", "derrubou os 10 tipos"…
- **Hangar com naves para liberar** por patente e medalhas: 4 naves com visual próprio e um traço leve (mais rápida, começa com escudo, atira mais rápido, mais energia). (Decisão 4)
- **Ranking mais motivador:** mostra "faltam N pontos para passar o próximo" e o recorde pessoal.
- **Progresso de quem joga sem conta** fica só no aparelho. Ao entrar na conta, dá para levar esse progresso para a conta.

Detalhes técnicos: tabelas novas no site, `ie_desafio` (uma tentativa por conta por dia) e `ie_progresso` (experiência, medalhas, missões e nave), só com números e o id da conta; rotas novas em `functions/api/invasao-estelar/`; atualizar o `CLAUDE.md` do site. No desafio do dia o servidor sabe exatamente quais ondas existem, então a conferência da pontuação fica bem mais rígida.

- **Tamanho:** grande (2 sessões).
- **Como medir:** **aparelho que volta em outro dia** (medida do site) e sessões por semana.

### Etapa 4: jogar com amigos (online)

Em três passos, do mais simples ao mais difícil.

1. **Desafie um amigo (sem jogar ao mesmo tempo).** O jogo cria um código de 4 letras. Quem tiver o código joga exatamente as mesmas ondas, quando quiser, durante 7 dias. Um placar daquele código mostra apelidos e pontos. É bom para os irmãos se desafiarem em horários diferentes. Não precisa de servidor novo.
2. **Duelo ao vivo (2 a 4 pilotos).** Sala por código, sala de espera e as mesmas ondas para todos ao mesmo tempo, cada um no seu celular. Barrinhas no topo mostram a onda e as naves dos rivais. Limpar uma onda manda 2 inimigos extras para os outros. Vence quem durar mais; no empate, quem fez mais pontos. Como cada celular roda o próprio jogo, atraso de internet quase não atrapalha.
3. **Esquadrão (cooperativo, 2 a 4 na mesma tela)**, opcional e para depois. Todos contra as ondas e os chefões, com naves de cores diferentes. Os inimigos aumentam com o número de jogadores, e dá para salvar um colega passando por cima da cápsula dele. É o mais difícil de fazer bem: o celular de quem criou a sala roda o jogo e os outros mandam só esquerda e direita, como no Fúria.

Regras: só entra quem tem conta; o nome é o apelido; sem chat; só números passam pelo servidor; a sala some 10 minutos depois que todos saem.

**Onde roda:** dentro do servidor online do Fúria, como o Infiltrados já faz. Esse servidor já está publicado e se atualiza sozinho a cada merge, então **o dono não precisa configurar nada no Cloudflare**. A alternativa é um servidor próprio, que exige um passo a passo de uns 10 minutos no Cloudflare, feito num computador. (Decisão 5)

Para testar: 2 celulares, ou celular e computador.

- **Tamanho:** passo 1 médio; passo 2 grande; passo 3 grande.
- **Como medir:** partidas online por semana (aviso `online`).

## 4. Medição (telemetria do site)

Hoje o jogo manda 5 avisos e o limite é 12 nomes. Proposta, sem pontuação exata, sem código de sala e com poucos valores diferentes:

| Aviso | Quando | Dados |
|---|---|---|
| `partida_iniciada` (já existe) | começo da partida | acrescentar `modo`: normal, recruta, desafio, amigo, duelo |
| `partida_terminada`, `partida_pausada`, `saiu_da_partida`, `ranking_aberto` (já existem) | como hoje | como hoje |
| `chefe` | chefão vencido ou perdido | `numero` (1 a 3), `resultado` (venceu ou perdeu) |
| `desafio_dia` | jogou o desafio do dia | nenhum |
| `missao_concluida` | completou uma missão da semana | `numero` (1 a 3) |
| `online` | partida online terminou | `modo` (amigo, duelo, esquadrao), `resultado` |
| `qualidade_reduzida` | o celular pediu menos enfeites | `nivel` (1 a 3) |

Total: 10 nomes. Os botões novos ganham `id` claros e estáveis (o site conta os toques por eles).

## 5. Ranking e conferência de pontos

- Toda regra nova de pontos (combo, chefão, cápsulas, ondas bônus) exige subir o limite do servidor junto, senão partidas boas são recusadas. Testes automáticos garantem isso.
- O desafio do dia permite uma conferência bem mais rígida, porque as ondas são conhecidas.
- Conferir a partida inteira no servidor, refazendo-a a partir das entradas gravadas, deixaria o ranking quase à prova de trapaça. Mas o plano gratuito da Cloudflare dá pouco tempo de processamento por pedido. Só vale tentar se couber (medir antes). Se não couber, continua a conferência por limites.

## 6. Ordem, tamanho e o que precisa do dono

| Etapa | Tamanho | O que precisa do dono |
|---|---|---|
| 0. Preparar o terreno | médio (1 sessão) | decidir o modo convidado; aprovar a publicação |
| 1. Batalha mais rica | grande (2 a 3 sessões) | decidir tiro carregado e nível Recruta; os meninos testarem a dificuldade |
| 2. Chefões, gráficos e som | grande (2 sessões) | testar num celular de verdade |
| 3. Motivos para voltar | grande (2 sessões) | decidir as naves; aprovar as tabelas novas no servidor |
| 4. Jogar com amigos | médio a grande | decidir onde roda; 2 aparelhos para testar |

Ordem sugerida: 0 → 1 → 2 → 3 → 4. Se o online for a prioridade, dá para fazer 0 → passos 1 e 2 da Etapa 4 → Etapa 1…, porque o duelo funciona com o jogo de hoje.

## 7. Decisões para o dono

1. **Controles:** manter só esquerda e direita? Recomendo manter, com o "tiro carregado (ficar parado)" como única mecânica nova de controle.
2. **Jogar sem conta** no site (sem ranking)? Recomendo sim.
3. **Nível Recruta** (mais calmo, sem ranking) para crianças menores? Recomendo sim.
4. **Naves do hangar:** só aparência ou com um traço leve? Recomendo traço leve, com a nave aparecendo no ranking.
5. **Online:** começar pelo duelo e rodar dentro do servidor do Fúria? Recomendo sim.
6. **Missões:** semanais (recomendo) ou diárias?
7. **PR #4 deste repositório** (skills do site: verificador, privacidade e telemetria) está aberto. Recomendo aprovar antes de começar, para as próximas sessões terem o verificador.
8. **Issues:** cada item vira uma issue neste repositório, como manda o `CLAUDE.md`, para aprovar item por item? Recomendo sim.

## 8. Fora do plano (de propósito)

Compras, anúncios, notificações, chat ou mensagens prontas entre jogadores, caixas-surpresa, recompensas por voltar dias seguidos e ranking com nome real ou foto.

## 9. Riscos

- **Celular fraco:** chefões, música e muitos tiros pesam. Por isso a qualidade automática e o teste num aparelho de verdade a cada etapa.
- **Dificuldade:** os meninos já pediram "mais difícil" e "mais fácil" em momentos diferentes. Por isso os níveis e os números do painel por versão.
- **Online:** depende da internet e de dois aparelhos para testar. Começa pelo passo mais simples.
- **Edições em paralelo:** outras sessões mexem no site e neste repositório. Por isso sempre partir da versão do site.
