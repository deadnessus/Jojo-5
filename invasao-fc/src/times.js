// Os 20 times da Série A. Bandeiras desenhadas no próprio jogo, sem escudos oficiais.
// As cores são aproximadas e servem só para diferenciar os times. Confira a lista da temporada atual.
// Desenhos: 'listras-h' | 'listras-v' | 'metade' | 'diagonal' | 'cruz' | 'faixa'.
// A mesma lista de ids está no servidor (servidor/functions/_lib/invasao-fc.js); o teste confere as duas.

export const TIMES = [
  { id: 'atletico-mg', nome: 'Atlético-MG', sigla: 'CAM', cores: ['#1a1a1a', '#ffffff'], desenho: 'faixa' },
  { id: 'bahia', nome: 'Bahia', sigla: 'BAH', cores: ['#0b4ea2', '#d61e2c'], desenho: 'listras-v' },
  { id: 'botafogo', nome: 'Botafogo', sigla: 'BOT', cores: ['#111111', '#ffffff'], desenho: 'metade' },
  { id: 'bragantino', nome: 'Bragantino', sigla: 'RBB', cores: ['#ffffff', '#111111'], desenho: 'faixa' },
  { id: 'ceara', nome: 'Ceará', sigla: 'CEA', cores: ['#ffffff', '#111111'], desenho: 'cruz' },
  { id: 'corinthians', nome: 'Corinthians', sigla: 'COR', cores: ['#111111', '#ffffff'], desenho: 'listras-h' },
  { id: 'cruzeiro', nome: 'Cruzeiro', sigla: 'CRU', cores: ['#0d4ea6', '#ffffff'], desenho: 'cruz' },
  { id: 'flamengo', nome: 'Flamengo', sigla: 'FLA', cores: ['#c8102e', '#111111'], desenho: 'listras-h' },
  { id: 'fluminense', nome: 'Fluminense', sigla: 'FLU', cores: ['#7a1f3d', '#ffffff', '#0a7b41'], desenho: 'listras-h' },
  { id: 'fortaleza', nome: 'Fortaleza', sigla: 'FOR', cores: ['#0b4ea2', '#ffffff'], desenho: 'diagonal' },
  { id: 'gremio', nome: 'Grêmio', sigla: 'GRE', cores: ['#0b4ea2', '#111111', '#ffffff'], desenho: 'listras-v' },
  { id: 'internacional', nome: 'Internacional', sigla: 'INT', cores: ['#c8102e', '#ffffff', '#c8102e'], desenho: 'listras-h' },
  { id: 'juventude', nome: 'Juventude', sigla: 'JUV', cores: ['#0a7b41', '#ffffff'], desenho: 'metade' },
  { id: 'mirassol', nome: 'Mirassol', sigla: 'MIR', cores: ['#0a7b41', '#f2c200'], desenho: 'faixa' },
  { id: 'palmeiras', nome: 'Palmeiras', sigla: 'PAL', cores: ['#0a7b41', '#ffffff'], desenho: 'listras-v' },
  { id: 'santos', nome: 'Santos', sigla: 'SAN', cores: ['#ffffff', '#111111'], desenho: 'listras-v' },
  { id: 'sao-paulo', nome: 'São Paulo', sigla: 'SAO', cores: ['#d61e2c', '#ffffff', '#111111'], desenho: 'listras-h' },
  { id: 'sport', nome: 'Sport', sigla: 'SPO', cores: ['#d61e2c', '#111111', '#ffffff'], desenho: 'listras-h' },
  { id: 'vasco', nome: 'Vasco', sigla: 'VAS', cores: ['#ffffff', '#111111'], desenho: 'cruz' },
  { id: 'vitoria', nome: 'Vitória', sigla: 'VIT', cores: ['#d61e2c', '#111111'], desenho: 'listras-v' },
];

export const IDS_TIMES = TIMES.map((t) => t.id);
export const TIMES_POR_ID = Object.fromEntries(TIMES.map((t) => [t.id, t]));
