# Validação desta entrega

## Ativação no Supabase

- Projeto FynlyAx `vjvpjjbphaomielprzet` confirmado ativo na organização informada pelo usuário.
- Migração `fynlyax_cloud_sync` aplicada com sucesso em banco inicialmente vazio.
- RLS habilitada e forçada; política de leitura limitada a `auth.uid()`.
- Usuário autenticado tem SELECT e execução da função de sincronização; UPDATE direto e execução anônima estão bloqueados.
- Chave publishable configurada em arquivo ignorado pelo Git. Nenhuma chave privilegiada utilizada.
- Endpoint Supabase Auth respondeu HTTP 200 via Node; cadastro e autenticação por e-mail estão habilitados, confirmação de e-mail exigida.
- API local passou de 503 (não configurada) para 401 (autenticação exigida), e a tela de login está habilitada.
- Teste remoto com usuários temporários foi bloqueado pelo conector SQL somente leitura; nenhum usuário de teste foi criado. Testes de gravação e conflitos permanecem validados localmente. Validação completa na nuvem depende do primeiro login.

## Atualização: sincronização

- Build aprovado com rotas de login, cadastro, callback, dashboard e APIs de autenticação/sincronização.
- 11 testes aprovados, incluindo fila de gravação, conflito entre dispositivos, recuperação após falha e validação da migração em PostgreSQL local (PGlite).
- `/api/sync` sem configuração retorna 503 `not_configured`; requisição PUT de outra origem retorna 403.
- Tela de login verificada no navegador com aviso explícito de projeto não conectado.
- Nenhuma migração remota aplicada: o usuário escolheu outro projeto e ainda não informou seu nome/ID.

## Validação anterior da demonstração

- TypeScript: verificação sem erros.
- Next.js: build de produção concluído; páginas / e /demo renderizadas estaticamente.
- Testes financeiros: 4 aprovados (conservação de saldo em transferências, exclusão de previstos do saldo, parsing decimal exato, parcelas preservando centavos).
- Navegador: dashboard carregou e exibiu saldo total BRL 27.079,30, receita de setembro 14.900,00 e despesas realizadas 3.940,70.
- Formulário: entrada negativa rejeitada com mensagem traduzida.
- Configurações: troca para inglês e tema claro conferida. Layout de configurações verificado em 390 × 844; preferências restauradas para português e escuro.
- Identidade: arte original preservada; símbolo enquadrado por CSS na navegação. Logo também incluído no cabeçalho mobile.
- Ajustes após inspeção: movimentos previstos removidos da lista compacta de realizados, rótulo de tipo corrigido, cores de progresso semânticas e períodos derivados dos lançamentos.

O build usa a API do TypeScript e workers em threads porque o ambiente restringe subprocessos. Nenhuma proteção de sistema foi desativada.

Ainda sem validação: migração em uma instância PostgreSQL/Supabase, RLS com usuários reais, autenticação, e-mails, cobrança, auditoria de acessibilidade completa e desempenho em dispositivos físicos. Esses itens não estão certificados para produção.
