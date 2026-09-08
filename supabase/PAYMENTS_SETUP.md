# Loja de moedas — Mercado Pago (Pix + cartão)

Fluxo: o app chama a Edge Function **mercadopago-create-payment**, que cria um
pedido em `public.payments` e uma *preference* de checkout no Mercado Pago. O
app abre a URL do checkout **no navegador externo**. Quando o pagamento é
aprovado, o Mercado Pago chama a Edge Function **mercadopago-webhook**, que
confere o pagamento pela API do MP e credita a carteira via
`public.credit_payment` (service role). O cliente nunca credita a própria
carteira.

Enquanto `VITE_PAYMENTS_ENABLED` não for `on`, a tela de Moedas continua
mostrando "compra em breve" e nada disto precisa estar configurado.

## 1. Banco

No **SQL Editor** do Supabase, rode, nesta ordem (se ainda não tiver rodado os
anteriores): `coin_wallets.sql` → `coin_enforcement.sql` → `plus_unlimited.sql`
→ `close_coin_purchases.sql` → **`payments.sql`**.

`payments.sql` cria a tabela `public.payments` (com índice único por
`provider_payment_id` e por `external_reference` = idempotência) e a função
`public.credit_payment(target_payment_id, mp_payment_id, mp_status)`.

## 2. Conta Mercado Pago

1. Em <https://www.mercadopago.com.br/developers> crie uma aplicação
   ("Pagamentos online" / "CheckoutPro").
2. Anote o **Access Token** — comece com o de **teste** (`TEST-...`) e troque
   pelo de produção (`APP_USR-...`) quando for ao ar.
3. Em **Webhooks / Notificações**, cadastre a URL:
   `https://<project-ref>.supabase.co/functions/v1/mercadopago-webhook`
   evento **Pagamentos**. Copie a **Assinatura secreta** gerada.

## 3. Edge Functions

Publique as duas pelo Dashboard (Edge Functions > Deploy a new function),
colando o conteúdo de cada `index.ts`:

| Função | Enforce JWT Verification |
|---|---|
| `mercadopago-create-payment` | **LIGADO** |
| `mercadopago-webhook` | **DESLIGADO** (quem chama é o Mercado Pago) |

Secrets (Edge Functions > Secrets) — valem para as duas:

```
MERCADOPAGO_ACCESS_TOKEN   = TEST-... (depois APP_USR-...)
MERCADOPAGO_WEBHOOK_SECRET  = a assinatura secreta do passo 2.3
PUBLIC_APP_URL              = https://usepont.com.br
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetados
automaticamente.

## 4. Ligar no app

- Local: `VITE_PAYMENTS_ENABLED=on` no `.env.local`.
- Produção (Render): variável `VITE_PAYMENTS_ENABLED=on` no painel do serviço.

## 5. Catálogo

Os produtos ficam em **dois lugares que precisam bater**:

- `src/lib/coinCatalog.ts` (cliente)
- `supabase/functions/_shared/catalog.ts` (servidor — é a fonte de verdade do
  preço; o servidor ignora qualquer preço vindo do cliente)

Para mudar preço, quantidade de moedas ou dias de Plus, edite os dois com os
mesmos valores (`id`, `priceCents`, `coins`, `plusDays`, `ledgerReason`).

## 6. Teste ponta a ponta

1. Com o Access Token de **teste**, abra a tela de Moedas e clique em Comprar.
2. Pague com um [usuário de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/accounts)
   ou cartão de teste do MP.
3. Confira: a linha em `public.payments` vira `status = approved`,
   `credited = true`; aparece um lançamento em `public.coin_transactions`; o
   saldo na tela atualiza sozinho (o app faz polling a cada 5s).

## Android / Play Store

O checkout sempre abre no navegador externo (`window.open(..., "_blank")` em
`src/lib/payments.ts`), então o mesmo código serve para o APK distribuído
direto e, no futuro, para a versão da Play Store (que não permite vender bem
digital por Pix dentro do app).
