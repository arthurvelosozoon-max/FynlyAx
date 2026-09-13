# FynlyAx

Implementação inicial da plataforma descrita nos 98 requisitos, com integração de autenticação e sincronização preparada. Inclui a arte original fornecida pelo usuário em `public/logo.png`.

## Executar

Node.js 22 ou superior. No diretório deste projeto:

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000 para a página pública, `/demo` para a demonstração e `/login` para a conta sincronizada.

Para ativar a conta sincronizada, conecte o projeto Supabase conforme `docs/SINCRONIZACAO.md`. Conectado ao projeto FynlyAx vjvpjjbphaomielprzet; migração de sincronização aplicada. A validação completa de envio e leitura depende do primeiro login.

## Disponível

- Landing responsiva com identidade original e logo fornecido.
- Demonstração com dados fictícios, navegação desktop e mobile.
- Dashboard com saldo, receitas, despesas, economia e gráfico derivado dos lançamentos.
- Cadastro, exclusão e liquidação de transações; transferências conservam o saldo e não inflacionam receitas/despesas.
- Contas, limites de orçamento, acompanhamento de metas e aportes demonstrativos.
- Busca global Ctrl/Cmd+K, filtro mensal e exportação CSV com proteção contra fórmulas.
- Português, inglês e espanhol; tema claro/escuro/sistema; seis cores de destaque; ocultação de valores; métricas reordenáveis e ocultáveis.
- Persistência local da demonstração. Metas são acompanhamento independente: o aporte não debita uma conta.
- Schema SQL inicial com RLS e vínculos compostos de proprietário e moeda.

## Estado real

Esta entrega é uma fundação navegável, não um SaaS pronto para comercialização. Login/cadastro Supabase e sincronização foram implementados no código e testados localmente, mas já estão conectados ao projeto escolhido; a validação completa com uma sessão de usuário ainda depende do primeiro login. Cobrança, cartões, investimentos, dívidas, recorrências, onboarding completo, família, administração e e-mails financeiros continuam pendentes. Nenhuma infraestrutura externa foi criada.

A migração de sincronização é `database/002_cloud_sync.sql`: documento privado por usuário, controle atômico de versão e validação no PostgreSQL. O schema `001_initial.sql` permanece como desenho relacional para a expansão futura e não deve ser aplicado como requisito da sincronização atual. A demonstração não é importada para a nuvem automaticamente.

Moeda de preferência é salva, mas os valores em BRL mantêm a moeda original. Não existem taxas de câmbio nesta versão. Dados de exemplo usam agosto/setembro de 2026. Os saldos consideram todo o histórico, enquanto receitas e despesas respeitam o mês selecionado. O patrimônio inicial corresponde somente às contas cadastradas.

## Verificação

```sh
npm run typecheck
npm test
npm run build
```

Decisões, mapa de páginas e roadmap em `docs/ARCHITECTURE.md`. Migração de desenvolvimento em `database/001_initial.sql`.
