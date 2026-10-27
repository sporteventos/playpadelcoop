# Emails de inscrições — Play Padel Coop

## Colocar o secret do IDM

Abrir [Supabase > Edge Functions > Secrets](https://supabase.com/dashboard/project/jjtsqsumczbhfgbgjxsd/functions/secrets).
Adicionar os valores abaixo nesse painel, **não no GitHub, no JavaScript, no
localStorage ou numa mensagem de chat**.

| Secret | Valor |
|---|---|
| `NOTIFY_CLIENT_ID` | `playpadelcoop-api` |
| `NOTIFY_CLIENT_SECRET` | Secret confidencial fornecido pelo IDM |
| `NOTIFY_TOKEN_URL` | `https://idm.efforge.co.mz/realms/efforge/protocol/openid-connect/token` |
| `NOTIFY_API_URL` | `https://notify.efforge.co.mz/api` (sem `/notifications`) |
| `NOTIFY_WORKER_SECRET` | Um novo valor aleatório de pelo menos 32 caracteres, exclusivo deste worker |

Gerar o último valor com um gestor de passwords ou `openssl rand -hex 32`.
Não reutilizar o secret do IDM. O `NOTIFY_WORKER_SECRET` autentica apenas o
agendador privado. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados
automaticamente pelo ambiente Supabase; nunca copiar para o site.

No IDM, o client precisa de client credentials/service account e do papel
`NOTIFICATION_SENDER`. No Notification Engine, a aplicação deve ter o remetente
`Play Padel Coop <no-reply@efforge.co.mz>`. O remetente é configurado no engine:
não é um campo livre enviado pelo browser ou pela função.

## Publicar e ativar

1. Configurar os secrets acima.
2. Executar `supabase/fase6-notificacoes.sql` no SQL Editor.
3. Autenticar o CLI Supabase na própria máquina e publicar:

   ```sh
   supabase login
   supabase functions deploy registration-emails \
     --project-ref jjtsqsumczbhfgbgjxsd --no-verify-jwt
   ```

   A configuração de JWT desligada é intencional: o endpoint **não é público
   para envio**. Exige `Authorization: Bearer <NOTIFY_WORKER_SECRET>`, verificado
   pela aplicação. Não usa CORS, não aceita destinatários no body nem deve ser
   chamado pelo frontend.

4. Ativar `pg_cron` e `pg_net` em Database > Extensions. No Supabase Vault,
   criar um secret chamado `registration_emails_worker_secret`, com exatamente
   o valor de `NOTIFY_WORKER_SECRET`. O secret OAuth do IDM **não** vai para o Vault.
5. Executar `supabase/fase6-notificacoes-cron.sql` no SQL Editor. Isso ativa o
   processamento a cada minuto. O SQL usa o URL deste projeto; adaptar se
   instalar noutro clube/projeto.

O deploy do GitHub Pages não publica Edge Functions nem executa SQL. São passos
separados. Não ativar o agendamento antes de publicar a função e os secrets.

## Comportamento

- O email continua **facultativo**. Sem endereço, a inscrição é guardada
  normalmente e o evento fica `skipped_no_email`.
- Uma dupla tem duas inscrições: cada jogador com email recebe a sua mensagem,
  independentemente do parceiro.
- `nova`: confirmação de receção, **não** confirmação de participação.
  Explica o pagamento presencial no clube e a validação pela organização.
- `espera`: informa a lista de espera e diz para **não pagar** antes de ser contactado.
- `espera` → `nova`: informa a promoção e os próximos passos de pagamento.
- `confirmada`: confirma a participação quando o backoffice grava esse estado.
- Não há envio retroativo às inscrições que já existiam quando se instala o
  trigger. IDs com prefixo `test-` não geram eventos.
- Guardar novamente o mesmo estado ou reverter e reconfirmar não duplica o
  mesmo evento. Cada par `(inscrição, evento)` recebe um UUID de idempotência
  persistente, reutilizado em todas as tentativas.
  - O assunto e o HTML são guardados antes da primeira tentativa e reutilizados
    nos retries, mesmo que a configuração do torneio mude entretanto. O HTML da
    fila é eliminado quando o engine confirma `SENT`.
- Adicionar email a uma inscrição anteriormente sem email ativa o evento
  correspondente ao estado atual. Alterar um endereço depois de enfileirar uma
  mensagem faz o worker ignorar o evento antigo, sem enviar para o contacto antigo;
  não reenvia automaticamente mensagens já aceites.
- Não são enviados telefones dos jogadores, disponibilidades ou dados de t-shirts ao engine.
  Só nome, categoria, referência e instruções do evento.

## Entrega, limites e operação

O trigger grava a fila na mesma transação da inscrição. O worker reclama três
eventos por execução (com bloqueio e lease de cinco minutos), faz OAuth com
timeout de dez segundos, cacheia o token até `expires_in - 30s` e renova uma
única vez quando o engine responde `401`.

`200/202` com ID do fornecedor significa **aceite**, não entregue. O worker
consulta posteriormente `/notifications/{id}`: `SENT` → `delivered`,
`FAILED` → `failed`. Falhas transitórias de rede, `429` e `5xx` têm até seis
tentativas com espera exponencial. Outros `4xx` ficam em falha definitiva.
Uma falha de email não desfaz a inscrição. `sensitive: true` pede ao engine que
elimine o conteúdo após entrega.

A fila tem RLS sem acesso anónimo ou autenticado comum; apenas `service_role`
e o SQL Editor podem consultá-la. Não há painel de operação de emails no
frontend. Não expor a fila no browser: contém endereços e nomes.

Há um limite de cinco eventos por destinatário/hora e mil eventos/dia no
conjunto da aplicação. Endereços inválidos e excesso de quota ficam
`suppressed`, sem impedir a inscrição. Estes limites reduzem abuso; **não
substituem CAPTCHA e rate limiting do formulário público**. O formulário
continua a usar o endpoint de inscrições existente e as suas políticas RLS.

Monitorizar com:

```sql
select status, count(*) from public.notification_outbox group by status;

select id, registration_id, event_name, status, attempts, provider_id, last_error,
       created_at, accepted_at, checked_at
from public.notification_outbox
order by created_at desc limit 50;

select * from cron.job_run_details order by start_time desc limit 10;
-- pg_net é assíncrono: verificar também o resultado HTTP, não só o sucesso do cron.
select id, status_code, timed_out, error_msg, created
from net._http_response order by created desc limit 10;
```

Uma mensagem `accepted` sem entrega durante muito tempo exige consulta ao
engine pelo `provider_id`; não reenviar às cegas. Erros OAuth permanentes exigem
corrigir a configuração antes de qualquer retry. Depois de corrigir a causa,
um operador pode repor **apenas falhas sem `provider_id`** em `pending`, zerar
`attempts`, limpar `last_error` e definir `next_attempt_at = now()`, mantendo o
mesmo `idempotency_key`. Falhas de entrega com ID devem ser tratadas no engine.

Para pausar o processamento:

```sql
select cron.unschedule(jobid)
from cron.job where jobname = 'registration-emails-every-minute';
```

Isso não elimina a fila: eventos pendentes serão processados quando reativar.
Para suspender também a produção de novos eventos, desativar explicitamente o
trigger `registration_email_events` na tabela `inscricoes`.

## Verificação antes de anunciar a funcionalidade

Usar uma caixa de email própria e uma inscrição real de teste com ID
`ins-...` (IDs `test-...` são intencionalmente ignorados). Confirmar:

1. Sem email: grava a inscrição, não envia, fica `skipped_no_email`.
2. Dupla com um único email: só esse jogador recebe.
3. Inscrição com vaga: mensagem de pré-inscrição e pagamento presencial.
4. Lista de espera: mensagem sem pedido de pagamento.
5. Promoção: instruções de pagamento. Confirmação no admin: email de confirmação.
6. Repetir o upsert: não cria outro evento; `provider_id` permite verificar
   `SENT` e `contentPurged` no engine.
7. Credenciais erradas ou engine indisponível: inscrição permanece na BD,
   fila mostra a falha e a página não promete que o email foi entregue.

Testes locais (sem credenciais e sem contactar o engine):

```sh
deno check supabase/functions/registration-emails/index.ts
deno test --config supabase/tests/deno.json --allow-read --allow-env supabase/tests/
```
