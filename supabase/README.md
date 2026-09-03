# Banco de dados (Supabase)

A partir de 2026-08-21, mudanças no banco passam pela Supabase CLI em vez de
colar SQL manualmente no editor do Supabase.

## Como era antes

Os arquivos `.sql` soltos nesta pasta (`schema.sql`, `security_hardening.sql`,
`invite_flow.sql` etc.) são o histórico de tudo que já foi aplicado
manualmente no projeto até aqui, na ordem indicada pelos comentários de cada
arquivo. Eles continuam aqui como referência de por que cada mudança foi
feita, mas não devem mais ser usados para aplicar mudanças novas.

## Como é agora

Mudanças novas viram um arquivo em `supabase/migrations/`, versionado no
repositório, aplicado ao banco real via CLI (manualmente ou automático pelo
GitHub Actions em `.github/workflows/supabase-migrations.yml`).

### Configuração única (feita uma vez por quem tem acesso ao projeto)

```
pnpm exec supabase login
pnpm run supabase:link
pnpm run supabase:pull
```

- `login` abre o navegador para autorizar a CLI na sua conta Supabase.
- `link` conecta este repositório ao projeto `vhicxnrjgirtevtamlzt` (vai
  pedir a senha do banco - Project Settings → Database → Connection string,
  no painel do Supabase).
- `pull` lê o schema real do banco em produção e gera o arquivo de migration
  inicial (`supabase/migrations/<timestamp>_remote_schema.sql`), capturando
  tudo que os arquivos soltos acima já aplicaram. Revise o arquivo gerado e
  faça commit dele - esse é o ponto de partida de onde as migrations passam
  a valer.

Depois disso, para o deploy automático funcionar, adicione em Settings →
Secrets and variables → Actions do repositório no GitHub:

- `SUPABASE_ACCESS_TOKEN` - gerado em
  https://supabase.com/dashboard/account/tokens
- `SUPABASE_DB_PASSWORD` - a mesma senha do banco usada no `link`
- `SUPABASE_PROJECT_ID` - `vhicxnrjgirtevtamlzt`

### No dia a dia, para uma mudança nova

```
pnpm run supabase:new nome_da_mudanca
```

Isso cria `supabase/migrations/<timestamp>_nome_da_mudanca.sql` vazio - edite
com o SQL da mudança. Ao dar commit e push para `main`, o GitHub Actions roda
`supabase db push` sozinho e aplica no banco real. Para aplicar na hora, sem
esperar o push, `pnpm run supabase:push` aplica direto da sua máquina (usa a
mesma conexão do `link`).

## E-mails de autenticação (recuperação de senha etc.)

O assunto e o HTML do e-mail de recuperação de senha estão versionados:

- `supabase/config.toml` -> seção `[auth.email.template.recovery]` (assunto) e
  `site_url` / `additional_redirect_urls` (para onde o link do e-mail pode
  voltar - inclui `usepont.com.br` e o dev local em `localhost:5180`).
- `supabase/templates/recovery.html` -> corpo do e-mail, com a marca PONT.
  A variável `{{ .ConfirmationURL }}` é obrigatória - o Supabase a troca pelo
  link real com o token.

Para aplicar no projeto hospedado: `pnpm exec supabase config push` (ou colar
o mesmo conteúdo no painel em Authentication -> Emails).

O **remetente** (`From:`) só deixa de ser o do Supabase
(`noreply@mail.app.supabase.io`, limitado a ~2 e-mails/hora) depois de
configurar um SMTP próprio - ver o bloco `[auth.email.smtp]` comentado no
`config.toml`. Isso exige um provedor (ex.: Resend) com o domínio
`usepont.com.br` verificado (SPF/DKIM no DNS) e a senha SMTP guardada como
variável de ambiente, nunca commitada.
