# AGENTS.md — Contexto do projeto PONT (Free Floripa)

Este arquivo vale para **qualquer agente de IA, de qualquer modelo** (Claude,
Codex/GPT, Gemini, Copilot etc.) e para pessoas que contribuem com o projeto.
Leia e siga este padrão **antes de implementar qualquer mudança**.

## O projeto

- App PONT: marketplace de freelancers para eventos (React + Vite + TypeScript,
  Supabase, Capacitor para Android/iOS).
- Repositório: `johgolin-creator/free-floripa`, branch principal `main`.
- Deploy do site: Render (`render.yaml`), com deploy automático a cada commit
  na `main`. Ou seja, **merge na `main` = deploy em produção**.
- Migrations do Supabase em `supabase/migrations/**` são aplicadas
  automaticamente pelo workflow `.github/workflows/supabase-migrations.yml`
  quando chegam na `main`.
- Idioma: Issues, PRs, commits e comunicação em **português**.

## Fluxo obrigatório: Issue → Branch → Pull Request → Merge

### 1. Toda tarefa começa com uma Issue

Antes de escrever código, crie (ou encontre) uma Issue no GitHub para a tarefa.
Cada Issue recebe **exatamente um** destes tipos, como label e como prefixo
no título:

| Tipo         | Label          | Quando usar                                          |
|--------------|----------------|------------------------------------------------------|
| Correção     | `correção`     | Algo que deveria funcionar e não funciona (bug).     |
| Melhoria     | `melhoria`     | Ajuste ou evolução de algo que já existe.            |
| Nova função  | `nova função`  | Funcionalidade que ainda não existe.                 |

Título: `[Correção] ...`, `[Melhoria] ...` ou `[Nova função] ...`.

O corpo da Issue deve ter: contexto/problema, comportamento esperado e
critérios de aceite. Tarefas grandes devem ser quebradas em várias Issues.

### 2. Uma branch por Issue

Não commite direto na `main`. Crie a branch a partir da `main` atualizada:

- `correcao/<numero>-descricao-curta`
- `melhoria/<numero>-descricao-curta`
- `nova-funcao/<numero>-descricao-curta`

Exemplo: `correcao/42-cpf-no-convite`.

### 3. Pull Request para toda entrega

Todo PR deve seguir o template `.github/pull_request_template.md` e conter:

1. **Issue relacionada**: `Closes #<numero>` (ou `Refs #<numero>` se não
   fechar a Issue).
2. **O que mudou**: resumo objetivo das alterações.
3. **Como foi validado**: comandos rodados (`pnpm lint`, `pnpm build`), testes
   manuais feitos, telas verificadas, SQL testado etc. Diga também o que
   **não** foi validado.
4. **Riscos, limitações e próximos passos**: impacto em produção, migrations,
   dados, app mobile, e o que fica pendente.

### 4. Merge e deploy

- O merge na `main` publica em produção (Render) e aplica migrations
  (Supabase). Só faça merge quando o PR estiver validado.
- Prefira *squash merge*, mantendo `Closes #<numero>` na mensagem.
- Depois do merge, confira o deploy e comente na Issue/PR se algo ficou
  pendente.

## Checklist rápido para agentes

- [ ] Existe Issue com tipo (Correção / Melhoria / Nova função)?
- [ ] Estou numa branch própria, e não na `main`?
- [ ] `pnpm lint` e `pnpm build` passam?
- [ ] O PR menciona a Issue, explica o que mudou, como foi validado, riscos,
      limitações e próximos passos?
