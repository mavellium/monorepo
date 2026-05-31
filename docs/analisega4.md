SDD Fase 1: Escopo e Requisitos do Produto
1.1. Visão Geral e Proposta de Valor
Uma aplicação web de visualização de dados que atua como uma camada de abstração sobre o GA4. O sistema substitui a complexidade de exploração e configuração do Google Analytics e Looker Studio por uma interface "pronta para uso" e altamente opinativa, focada em responder perguntas de negócios de forma visual e direta.
1.2. Usuário Alvo e Casos de Uso
Perfil: Gestores de marketing, donos de empresas e profissionais não-técnicos em dados.
Dor: O GA4 é denso, técnico e exige conhecimento prévio de modelagem de dados. Ferramentas de BI exigem construção do zero.
Caso de Uso Principal: Entrar na plataforma, bater o olho e entender imediatamente o estado atual da aquisição e conversão do site, sem precisar configurar filtros complexos.
1.3. O Essencial (Métricas Core para o Teste)
Para garantir a integridade dos dados e evitar o thresholding do GA4, o MVP focará na tríade de aquisição e comportamento:
Motor de Aquisição: Tráfego por Origem/Mídia e Campanhas (Quais canais trazem mais pessoas?).
Engajamento e Retenção: Páginas mais acessadas e tempo de engajamento (Onde a atenção está sendo gasta?).
Conversões (Leads): Contagem de eventos marcados como conversão atrelados à origem do tráfego (Quais canais geram dinheiro/contatos reais?).
1.4. Critérios de Êxito (Validação do Teste)
Usabilidade: O usuário (você, inicialmente) consegue extrair uma conclusão acionável em menos de 2 minutos de uso.
Zero Configuração: A interface não exige construção de gráficos por parte do usuário (como o Looker Studio), apenas consumo através de interações simples (como mudar a janela de tempo).
Performance: A interface carrega de forma instantânea e fluida, validando o uso de cache no backend para isolar o tempo de resposta do BigQuery.
SDD Fase 2: Arquitetura e Fluxo de Dados
2.1. Topologia do Sistema
O sistema opera em uma arquitetura de três camadas e fluxo unidirecional:
Coleta e Armazenamento (GCP): O GA4 atua como um "dumb pipe" (coletor passivo) que exporta os dados brutos diariamente para um dataset no BigQuery.
Camada de Dados e Servidor (Next.js Server): Utiliza Server Components (.tsx) ou Data Fetching functions (lib/) rodando em Node.js para conectar ao BigQuery, processar a lógica SQL e manter os resultados em memória.
Camada de Apresentação (Next.js Client): Utiliza Client Components (marcados com "use client") puramente para renderizar a interface visual interativa usando bibliotecas de gráficos (ex: Recharts) e Tailwind CSS.
2.2. A Fronteira de Segurança e Serialização
A comunicação direta entre o frontend e o BigQuery é estritamente proibida.
Gestão de Credenciais: A chave da Service Account do Google Cloud viverá exclusivamente no ambiente do servidor (via variáveis de ambiente .env.local). O código compilado para o navegador jamais terá conhecimento dessa chave.
Serialização de Dados: O BigQuery retorna tipos de dados específicos (como BigQueryDate ou BigQueryTimestamp). O Next.js exige que os dados passados do Servidor para o Cliente sejam JSON puro. A Camada de Dados deve incluir uma função de "limpeza" que converta as respostas brutas do BigQuery em arrays de objetos serializáveis nativos do JavaScript antes de despachá-los para a UI.
2.3. Estratégia de Cache e Otimização de Custos
O modelo de cobrança do BigQuery é por volume de dados lidos (bytes processed). Para garantir a viabilidade financeira e a performance em tempo real do painel:
Isolamento de Requisição: Se o painel for atualizado 100 vezes no mesmo dia, o banco de dados só pode ser consultado 1 vez.
Mecanismo: Como o SDK oficial @google-cloud/bigquery utiliza conexões RPC nativas e não a API fetch padrão da web, o cache automático de fetch do Next.js não se aplica. A arquitetura utilizará a função unstable_cache (ou abstração equivalente do Next.js 14+) envolvendo a chamada do BigQuery.
Ciclo de Vida (Revalidation): O cache será configurado com uma revalidação baseada em tempo (ISR - Incremental Static Regeneration) de 24 horas (ou 86400 segundos), alinhando-se exatamente com a frequência de exportação diária do GA4. Não há utilidade em consultar o banco a cada minuto se o dado subjacente só atualiza uma vez por dia.
SDD Fase 3: Modelagem e Contratos de Dados
3.1. Estratégia de Achatamento (Flattening)
A tabela do GA4 no BigQuery (events_*) guarda os detalhes de cada evento em um array chamado event_params. Para extrair informações como a URL da página ou a origem da sessão (source), o servidor deverá utilizar a função SQL UNNEST(event_params). O backend será o único responsável por essa complexidade. O frontend não deve saber o que é um UNNEST.
3.2. Contratos de Dados (Tipagem JSON)
O servidor entregará exatamente estas três estruturas de dados para suprir os requisitos da Fase 1:
A. Estrutura de Aquisição (Tráfego por Origem) Alimenta os gráficos de barras ou tabelas de canais.
JSON
[
  { "source_medium": "google / organic", "sessions": 1450, "new_users": 1200 },
  { "source_medium": "instagram / social", "sessions": 830, "new_users": 650 }
]

B. Estrutura de Engajamento (Tendência de Acessos) Alimenta o gráfico de linhas principal (evolução no tempo).
JSON
[
  { "date": "2026-05-12", "pageviews": 450, "unique_visitors": 310 },
  { "date": "2026-05-13", "pageviews": 520, "unique_visitors": 365 }
]

C. Estrutura de Conversão (Eventos de Lead) Alimenta os scorecards (números grandes em destaque) e funil básico.
JSON
[
  { "event_name": "generate_lead", "total_conversions": 45 },
  { "event_name": "whatsapp_click", "total_conversions": 112 }
]

3.3. Padrão Arquitetural das Queries SQL
Para evitar queries gigantescas e de manutenção impossível, o sistema usará CTEs (Common Table Expressions - cláusula WITH) para primeiro filtrar o período desejado, depois achatar os dados (UNNEST), e só então agrupar e contar.
Exemplo Base para Pageviews (Que o Claude deverá seguir):
SQL
WITH flat_events AS (
  SELECT 
    event_date,
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS page_url
  FROM `seu-projeto.analytics_123456789.events_*`
  WHERE event_name = 'page_view'
    AND _TABLE_SUFFIX BETWEEN '20260512' AND '20260519'
)
SELECT 
  PARSE_DATE('%Y%m%d', event_date) as date,
  COUNT(*) as pageviews,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors
FROM flat_events
GROUP BY date
ORDER BY date ASC

O contrato está assinado. O frontend já sabe o que vai receber. Agora, na Fase 4, vamos definir como a interface vai se comportar e qual a estrutura de pastas do Next.js para organizar esse código.
SDD Fase 4: Design de Interface e Estrutura de Componentes
4.1. Estrutura de Diretórios (Árvore do Projeto)
O projeto seguirá uma separação estrita de responsabilidades, isolando regras de negócio da camada visual.
Plaintext
/
├── app/
│   ├── layout.tsx         # Template global (Navbar, Sidebar lateral simples)
│   └── page.tsx           # Server Component: Chama a lib do BQ, repassa dados aos gráficos
├── components/
│   ├── dashboard/         # Client Components ("use client")
│   │   ├── AcquisitionTable.tsx # Tabela de Origem/Mídia
│   │   ├── EngagementChart.tsx  # Gráfico de linha de Pageviews (Recharts)
│   │   └── MetricCard.tsx       # Cards de resumo (Total de Leads, etc)
│   └── ui/                # Componentes genéricos (Botões, Skeletons)
├── lib/
│   ├── bigquery.ts        # Setup do cliente BQ do Google Cloud
│   ├── queries.ts         # Funções SQL com cache (unstable_cache)
│   └── utils.ts           # Funções auxiliares (formatação de data, conversão BQ -> JSON)
└── .env.local             # Credenciais do GCP (NUNCA commitado)

4.2. Fronteira Server vs. Client
A arquitetura do painel dependerá da passagem limpa de props do servidor para o cliente.
O Coordenador (Server): O arquivo app/page.tsx será estritamente um Server Component (sem "use client"). Ele fará o await das três consultas definidas na Fase 3. Enquanto carrega, exibirá um arquivo loading.tsx (Skeleton nativo do Next.js).
Os Executores (Client): Os componentes dentro de components/dashboard/ receberão as arrays em formato JSON via props. Eles carregarão a diretiva "use client" no topo do arquivo, o que permite usar bibliotecas interativas como o Recharts e reagir a cliques (ex: tooltip no gráfico).
4.3. Stack Visual e Bibliotecas
Estilização: Tailwind CSS (nativo do Next.js). Foco em um design "dark mode" elegante ou "light mode" corporativo, com uso de grids (grid-cols-1 md:grid-cols-3) para layout responsivo.
Gráficos: recharts. É a biblioteca mais estável, fácil de implementar em React e que aceita exatamente o array de objetos JSON que definimos na Fase 3, sem exigir transformações complexas no frontend.
Ícones: lucide-react. Leve e padrão na comunidade moderna.
4.4. Regras de Interface (UI/UX)
Ausência de Loading Spinners na Interação: Como o dado é cacheados no backend (D-1), o carregamento inicial deve ser o único momento de "espera" real.
Cards Auto-Explicativos: Cada gráfico terá um subtítulo opinativo. Ex: Em vez de apenas "Sessões por Origem", usaremos "De onde vem a maior parte da sua atenção?".

