# Sincronização da FynlyAx

## Implementado

- `/login` e `/register`: autenticação Supabase por e-mail e senha; confirmação de cadastro via e-mail quando habilitada no projeto.
- `/dashboard`: dados reais da conta, iniciando vazios. `/demo` continua independente e local; seus dados não são enviados automaticamente.
- `/api/sync`: lê e salva contas, transações, metas, limites de orçamento e preferências. O servidor valida a sessão pelo Supabase Auth em cada operação.
- Cookies de sessão HttpOnly/SameSite=Lax, Secure em produção fora do localhost. As chaves e tokens não são enviados como props React.
- Salvamento automático após 700 ms sem edição, em fila; atualização entre dispositivos a cada 15 segundos enquanto a aba está visível e ao retornar à janela.
- Controle otimista de versão atômico no PostgreSQL. Uma edição desatualizada recebe conflito, preserva alterações em memória e oferece download antes de carregar a versão da nuvem.
- Sem conexão, nenhum estado é anunciado como salvo. As alterações permanecem na página; existe aviso ao sair e opção de baixar JSON. Não há persistência offline dos dados reais em localStorage.
- Saída bloqueada enquanto há alterações pendentes. A conta autenticada é verificada para não enviar dados de uma sessão anterior a outra conta.

## Armazenamento desta fase

A migração `database/002_cloud_sync.sql` cria uma tabela exclusiva, `fynlyax_user_state`, e a função `fynlyax_save_state`. Cada usuário tem um documento validado e versionado. Esse formato preserva atomicidade entre os módulos existentes, que hoje operam em um estado conjunto. RLS permite somente a leitura do próprio documento; escritas diretas são revogadas. A função de escrita obtém o proprietário de `auth.uid()`, nunca de um parâmetro controlado pelo cliente.

O schema relacional `001_initial.sql` é o desenho da fase anterior e não precisa ser executado para habilitar a sincronização. Os dados não são duplicados entre os dois modelos. Migração futura para tabelas normalizadas deverá manter a atomicidade e o controle de versões, antes de ampliar o volume ou introduzir compartilhamento familiar.

Limites desta versão: 100 contas BRL, 100 metas, 10.000 transações, documento de até 2 MB. Limites de orçamento são preferências globais por categoria, como na demonstração atual. Aportes de metas são acompanhamento independente, sem débito automático de conta. Não há conversão de moedas nem merge automático de conflitos.

## Ativação no projeto escolhido

1. Identificar o projeto Supabase correto e conferir seu schema antes da migração.
2. Aplicar `database/002_cloud_sync.sql` no projeto de destino.
3. Configurar `.env.local`, conforme `.env.example`, com URL e chave **publishable** do projeto. Nenhuma chave service_role é necessária.
4. Definir `APP_ORIGIN` para a URL real. Em desenvolvimento: `http://127.0.0.1:3000`.
5. No Supabase Authentication > URL Configuration, incluir a URL do app e `/auth/callback` entre os redirecionamentos autorizados. Em produção, usar HTTPS e configurar SMTP e limites de autenticação adequados.
6. Recompilar/reiniciar o Next.js. Entrar pela própria interface e verificar a mesma conta em dois dispositivos.

Projeto conectado: FynlyAx (`vjvpjjbphaomielprzet`), organização Fynly Finanças (`cfwzmvmvwvckykqmvqxr`). Migração aplicada e chave publishable configurada em .env.local. O projeto Fynlybrasil não foi alterado. Autenticação por e-mail habilitada, cadastro permitido e confirmação de e-mail exigida. Os redirecionamentos de e-mail não foram alterados: o painel web do Supabase exige login. Após confirmar o e-mail, é possível retornar manualmente à tela de login.

## Testes

`npm test` executa cálculos financeiros, fila de gravação, conflitos entre dispositivos, consultas atrasadas, retenção de alterações após falha e troca de conta. O teste de migração usa PostgreSQL em memória (PGlite), com papéis equivalentes e `auth.uid()` simulado, para conferir RLS, permissões, validação e rejeição de versões antigas. Isso não substitui a verificação de login e cookies na instância Supabase escolhida.

## Recuperação de senha na Netlify

O login inclui Recuperar senha. `/forgot-password` solicita o e-mail pelo Supabase; `/auth/callback?next=reset-password` troca o código PKCE por uma sessão e encaminha para `/reset-password`. Abra o link no mesmo navegador em que fez a solicitação. Links inválidos encaminham para uma nova solicitação.

A nova senha exige 12 a 128 caracteres e confirmação idêntica. A API valida origem e sessão antes de atualizar a senha. Após sucesso, encerra a sessão local e orienta novo login. A resposta à solicitação não revela se uma conta existe.

Site URL configurada no Supabase: https://fynlyax.netlify.app. Retornos autorizados: https://fynlyax.netlify.app/auth/callback e https://fynlyax.netlify.app/auth/callback?next=reset-password.

A entrega real de e-mails depende do serviço de e-mail do Supabase e seus limites. Testes com uma caixa de e-mail e alteração de senha real devem ser concluídos pelo titular da conta.
