# FynlyAx: arquitetura e plano de entrega

## Decisões
Next.js App Router, React e TypeScript. Componentes interativos isolados no cliente. PostgreSQL/Supabase como destino de persistência autenticada. A demonstração utiliza somente dados fictícios locais e nunca representa uma sessão autenticada. Radix Dialog fornece foco, Escape e semântica dos modais; Lucide e Recharts compõem a interface.

## Modelo financeiro
Valores monetários inteiros em centavos, moeda ISO por conta e lançamento. Saldo inicial mais movimentos liquidados; previstos entram apenas nas projeções. Transferências têm origem e destino e não são receita/despesa. Investimentos e pagamentos de dívida requerem lançamentos correspondentes antes de integrar o livro financeiro. Sem taxas de câmbio, moedas distintas nunca são somadas ou apenas renomeadas.

## Módulos e páginas
Público: /, /demo. Autenticação planejada: /login, /register, /forgot-password, /reset-password, /verify-email. Aplicação: /dashboard, /transactions, /accounts, /cards, /budget, /investments, /assets, /debts, /goals, /calendar, /forecast, /insights, /score, /money-map, /future, /what-if, /reports, /family. Configurações: /settings/{profile,preferences,appearance,privacy,notifications,security}. Administração: /admin, com papel administrativo emitido pelo servidor.

Nesta primeira versão, a navegação dos módulos implementados fica em /demo. Rotas autenticadas ainda não são publicadas.

## Segurança e persistência
O schema inicial relaciona dados ao proprietário e usa RLS com auth.uid(). FKs compostas impedem referências entre proprietários. Não há chave service_role no cliente. Integração futura deverá usar cookies seguros do Supabase SSR, validação de entrada no servidor, rate limiting e testes reais de isolamento antes de receber dados pessoais. Família requer autorização por workspace com papéis; não ampliar as políticas pessoais sem essa etapa. Cobrança depende de webhook assinado e idempotente; o cliente não atribui planos.

## Design system
Direção: fintech pessoal premium, sóbria e informativa. Variância 4, movimento 2, densidade 5. Roxo #7C3AED, superfícies #181421 e #1E1928, fundo #0D0B14. Tokens semânticos, raio 16px, tipografia de sistema, foco visível, tema claro próprio. Verde/vermelho representam resultados, acompanhados de sinais e rótulos. Desktop com sidebar; mobile com navegação inferior. Textos de interface em dicionários por idioma; descrições cadastradas são conteúdo do usuário.

## Roadmap e critérios de aceite
1. Fundação: arquitetura, schema, design, demo, preferências. Próximo: Supabase Auth, onboarding persistente, proteção de rotas e e-mails reais.
2. Livro financeiro: contas, categorias, transações, transferências; depois recorrência idempotente, anexos privados e importação.
3. Dashboard: totais derivados, períodos, gráficos; depois histórico anual real e comparação consistente.
4. Cartões/orçamento: fechamento por fuso, parcelas com distribuição do resto, pagamento de fatura sem dupla contagem.
5. Investimentos/patrimônio/dívidas: posições, avaliações por data e evolução do saldo devedor.
6. Metas e simuladores: aportes, premissas explícitas, cenários; Score interno documentado, sem equivalência a crédito.
7. Relatórios, insights, família e billing: exportações seguras, isolamento por papel, webhook verificado.
8. Administração e produção: métricas reais, auditoria, observabilidade, testes de acesso e responsividade.

Requisitos 71–98 atravessam todas as fases: pt-BR/en-US/es-ES, preferências por conta, regionalização, temas, privacidade, acessibilidade e dashboard configurável. A demo persiste preferências neste navegador; sincronização entre dispositivos exige backend. Idioma e moeda são independentes. Taxas de câmbio, autenticação adicional para revelar dados, avatar com recorte, e-mails/push e gerenciamento de sessões permanecem pendentes.
