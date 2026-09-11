import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, CreditCard, ExternalLink, Lock, Search, WalletCards } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { useAppStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { loadRemoteCoinTransactions, supabaseCoinsEnabled, type CoinTransaction } from "../lib/supabaseCoins";
import { formatProductPrice, getCoinProductsForRole, type CoinProduct } from "../lib/coinCatalog";
import { createCoinPayment, getPaymentStatus, openCheckout, paymentsDemo, paymentsEnabled } from "../lib/payments";
import type { UserRole } from "../lib/types";

export function SubscriptionPage() {
  const { state, purchaseDemoProduct } = useAppStore();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");
  const isCompany = state.activeRole === "empresa";
  const activeBalance = isCompany ? state.subscription.companyCreditsRemaining : state.subscription.creditsRemaining;
  const pageDescription = isCompany
    ? "Use moedas empresariais para ações da empresa, como cancelar vagas que já foram preenchidas."
    : "Cada candidatura enviada usa 1 moeda, sem mensalidade fixa.";
  const localTransactions = state.coinLedger.filter((transaction) => transaction.role === state.activeRole);
  const statementTransactions = transactions.length > 0 ? transactions : localTransactions;
  const activePlusUntil = isCompany ? state.subscription.companyPlusActiveUntil : state.subscription.plusActiveUntil;
  const hasActivePlus = Boolean(activePlusUntil) && new Date(activePlusUntil as string) > new Date();
  const activePlusUntilLabel = hasActivePlus
    ? new Date(activePlusUntil as string).toLocaleDateString("pt-BR")
    : "";

  useEffect(() => {
    if (isCompany || !user || !supabaseCoinsEnabled) {
      setTransactions([]);
      return;
    }

    let active = true;
    setTransactionsLoading(true);
    loadRemoteCoinTransactions(user.id, 30)
      .then((items) => {
        if (!active) return;
        setTransactions(items);
        setTransactionsError("");
      })
      .catch((error) => {
        if (!active) return;
        setTransactionsError(error instanceof Error ? error.message : "Não foi possível carregar o extrato de moedas.");
      })
      .finally(() => {
        if (active) setTransactionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isCompany, state.subscription.creditsRemaining, user]);

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Moedas"
        title="Suas moedas"
        description={pageDescription}
        action={
          <Link to={isCompany ? "/app/minhas-vagas" : "/app/vagas"} className="secondary">
            <Search size={17} /> {isCompany ? "Ver minhas vagas" : "Ver vagas"}
          </Link>
        }
      />

      {paymentsEnabled ? (
        <CoinStore role={state.activeRole} />
      ) : paymentsDemo ? (
        <DemoCoinStore role={state.activeRole} onBuy={purchaseDemoProduct} />
      ) : (
        <section className="card p-5">
          <div className="flex items-center gap-2 text-aqua-700">
            <Lock size={18} />
            <strong>Compra de moedas em breve</strong>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            A compra de moedas será liberada no lançamento do app. Por enquanto, cada conta nova começa com
            5 moedas{isCompany ? "" : " e você usa 1 a cada candidatura enviada"}.
          </p>
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <StatTile
          variant="primary"
          icon={<Lock size={18} />}
          label={isCompany ? "Cancelar vaga preenchida" : "Candidatura"}
          value={hasActivePlus ? "Ilimitado" : isCompany ? "10 moedas" : "1 moeda"}
        />
        <StatTile
          tone={hasActivePlus ? "positive" : "normal"}
          icon={<CreditCard size={18} />}
          label={hasActivePlus ? `Ilimitado até ${activePlusUntilLabel}` : "Saldo atual"}
          value={hasActivePlus ? "Plus ativo" : `${activeBalance} moeda(s)`}
        />
      </div>

      <CoinStatement
        transactions={statementTransactions}
        loading={transactionsLoading}
        error={transactionsError}
        localBalance={activeBalance}
        role={state.activeRole}
      />
    </div>
  );
}

const COLLAPSED_TRANSACTION_COUNT = 5;

function CoinStatement({
  transactions,
  loading,
  error,
  localBalance,
  role
}: {
  transactions: CoinTransaction[];
  loading: boolean;
  error: string;
  localBalance: number;
  role: "trabalhador" | "empresa";
}) {
  const [expanded, setExpanded] = useState(false);
  const isCompany = role === "empresa";
  const hasMore = transactions.length > COLLAPSED_TRANSACTION_COUNT;
  const visibleTransactions = expanded ? transactions : transactions.slice(0, COLLAPSED_TRANSACTION_COUNT);

  return (
    <section className="card p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="section-eyebrow">Extrato</span>
          <h3 className="text-xl font-black text-white">{isCompany ? "Histórico de moedas da empresa" : "Histórico de moedas do trabalhador"}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {isCompany
              ? "Acompanhe compras e cobranças empresariais, separadas do saldo do trabalhador."
              : "Acompanhe compras e candidaturas enviadas."}
          </p>
        </div>
        <span className="badge bg-aqua-50 text-aqua-700">
          <WalletCards size={15} /> Saldo atual: {localBalance}
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-600">Carregando extrato de moedas...</div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-bold text-alert">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5">
          <strong className="text-white">Nenhuma movimentação registrada ainda.</strong>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {isCompany
              ? "Quando a empresa comprar moedas ou tiver uma cobrança empresarial, o histórico aparecerá aqui."
              : "Quando você comprar moedas ou se candidatar a uma vaga, o histórico aparecerá aqui."}
          </p>
        </div>
      ) : (
        <>
          <div className={`grid gap-3 ${expanded ? "max-h-[28rem] overflow-y-auto pr-1" : ""}`}>
            {visibleTransactions.map((transaction) => (
              <CoinTransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
          {hasMore && (
            <button type="button" onClick={() => setExpanded((current) => !current)} className="secondary mt-3 w-full">
              {expanded ? "Mostrar menos" : `Ver histórico completo (${transactions.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function CoinTransactionRow({ transaction }: { transaction: CoinTransaction }) {
  // Compra de plano (Plus/mensalidade) não mexe no saldo: amount 0, mas ainda
  // é uma "entrada" no extrato.
  const isPlan = transaction.amount === 0 && transaction.kind === "purchase";
  const positive = transaction.amount > 0 || isPlan;
  return (
    <article className="worker-application-card">
      <div className="worker-card-head">
        <div className="flex min-w-0 gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${positive ? "bg-aqua-50 text-aqua-700" : "bg-slate-100 text-slate-600"}`}>
            {positive ? <WalletCards size={19} /> : <Lock size={19} />}
          </span>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={`badge ${positive ? "bg-aqua-50 text-aqua-700" : ""}`}>{positive ? "Entrada" : "Uso"}</span>
              <span className="badge">{formatDateTime(transaction.createdAt)}</span>
            </div>
            <h4 className="font-black text-white">{getTransactionTitle(transaction)}</h4>
            <p className="text-sm font-semibold leading-6 text-slate-600">{getTransactionDescription(transaction)}</p>
          </div>
        </div>
        <div className="text-right">
          <strong className={`block text-lg font-black ${positive ? "text-aqua-700" : "text-white"}`}>
            {isPlan
              ? "Plano ativado"
              : `${positive ? "+" : ""}${transaction.amount} moeda${Math.abs(transaction.amount) === 1 ? "" : "s"}`}
          </strong>
          <span className="text-xs font-black uppercase text-slate-500">Saldo: {transaction.balanceAfter}</span>
        </div>
      </div>
    </article>
  );
}

function CoinStore({ role }: { role: UserRole }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const products = getCoinProductsForRole(role);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [awaitingPaymentId, setAwaitingPaymentId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const returnStatus = searchParams.get("pagamento");

  useEffect(() => {
    if (!returnStatus) return;
    const timeout = window.setTimeout(() => {
      searchParams.delete("pagamento");
      setSearchParams(searchParams, { replace: true });
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [returnStatus, searchParams, setSearchParams]);

  useEffect(() => {
    if (!awaitingPaymentId) return;

    let active = true;
    let tries = 0;
    const intervalId = window.setInterval(async () => {
      tries += 1;
      try {
        const payment = await getPaymentStatus(awaitingPaymentId);
        if (!active) return;
        if (payment?.credited || payment?.status === "approved") {
          setConfirmed(true);
          setAwaitingPaymentId(null);
          window.clearInterval(intervalId);
        }
      } catch {
        // segue tentando
      }
      if (tries >= 75 && active) {
        setAwaitingPaymentId(null);
        window.clearInterval(intervalId);
      }
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [awaitingPaymentId]);

  async function buy(product: CoinProduct) {
    setError("");
    setConfirmed(false);
    setPendingProductId(product.id);
    try {
      const { paymentId, initPoint } = await createCoinPayment(product.id);
      openCheckout(initPoint);
      setAwaitingPaymentId(paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setPendingProductId(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2 text-aqua-700">
        <CreditCard size={18} />
        <strong>Comprar moedas</strong>
      </div>
      <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
        Pagamento por Pix ou cartão pelo Mercado Pago. O checkout abre no navegador; ao confirmar, o saldo
        entra automaticamente aqui.
      </p>

      {returnStatus === "sucesso" && (
        <div className="mb-3 rounded-lg bg-aqua-50 p-3 text-sm font-bold text-aqua-800">
          Pagamento recebido. Assim que o Mercado Pago confirmar, as moedas aparecem no seu saldo.
        </div>
      )}
      {returnStatus === "pendente" && (
        <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">
          Pagamento em processamento. O saldo é atualizado assim que for aprovado.
        </div>
      )}
      {returnStatus === "falha" && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">
          O pagamento não foi concluído. Você pode tentar de novo.
        </div>
      )}
      {confirmed && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-aqua-50 p-3 text-sm font-bold text-aqua-800">
          <CheckCircle2 size={16} /> Pagamento confirmado! Seu novo saldo já está valendo.
        </div>
      )}
      {awaitingPaymentId && !confirmed && (
        <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-600">
          Aguardando a confirmação do pagamento… pode fechar a aba do checkout depois de pagar.
        </div>
      )}
      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="worker-info-tile flex flex-col gap-2">
            <div>
              <strong className="block text-white">{product.title}</strong>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{product.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="text-lg font-black text-white">{formatProductPrice(product.priceCents)}</span>
              <button
                type="button"
                className="primary"
                disabled={pendingProductId !== null}
                onClick={() => buy(product)}
              >
                {pendingProductId === product.id ? (
                  "Abrindo…"
                ) : (
                  <>
                    <ExternalLink size={16} /> Comprar
                  </>
                )}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DemoCoinStore({
  role,
  onBuy
}: {
  role: UserRole;
  onBuy: (productId: string) => { ok: boolean; message: string };
}) {
  const products = getCoinProductsForRole(role);
  const [checkoutProduct, setCheckoutProduct] = useState<CoinProduct | null>(null);

  return (
    <section className="card p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-aqua-700">
        <CreditCard size={18} />
        <strong>{role === "empresa" ? "Planos e moedas da empresa" : "Comprar moedas"}</strong>
        <span className="badge bg-amber-50 text-amber-800">Demonstração</span>
      </div>
      <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
        Ambiente de demonstração: o checkout é simulado e nenhuma cobrança é feita. Serve para acompanhar
        o trâmite de compra do começo ao fim.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="worker-info-tile flex flex-col gap-2">
            <div>
              <strong className="block text-white">{product.title}</strong>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{product.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="text-lg font-black text-white">{formatProductPrice(product.priceCents)}</span>
              <button type="button" className="primary" onClick={() => setCheckoutProduct(product)}>
                <CreditCard size={16} /> Comprar
              </button>
            </div>
          </article>
        ))}
      </div>

      {checkoutProduct && (
        <DemoCheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onConfirm={() => onBuy(checkoutProduct.id)}
        />
      )}
    </section>
  );
}

function DemoCheckoutModal({
  product,
  onClose,
  onConfirm
}: {
  product: CoinProduct;
  onClose: () => void;
  onConfirm: () => { ok: boolean; message: string };
}) {
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function pay() {
    setPhase("processing");
    window.setTimeout(() => {
      setResult(onConfirm());
      setPhase("done");
    }, 1100);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout de demonstração"
      onClick={phase === "processing" ? undefined : onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-charcoal shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6 pb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} className="text-aqua-300" />
            <div>
              <strong className="block text-lg font-black text-white">Checkout</strong>
              <span className="block text-xs font-semibold text-slate-300">Pagamento de demonstração</span>
            </div>
          </div>
          <span className="badge bg-amber-50 text-amber-800">Demo</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border border-white/10 bg-brand-dark p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-white">{product.title}</span>
              <span className="text-lg font-black text-white">{formatProductPrice(product.priceCents)}</span>
            </div>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-400">{product.description}</p>
          </div>

          {phase !== "done" ? (
            <>
              <p className="mt-4 text-xs font-black uppercase text-slate-400">Forma de pagamento</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["pix", "card"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMethod(option)}
                    disabled={phase === "processing"}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-black transition ${
                      method === option
                        ? "border-aqua-300 bg-aqua-400/15 text-white"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {option === "pix" ? "Pix" : "Cartão"}
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-800">
                Simulação: nenhuma cobrança real é feita e nenhum dado de pagamento é coletado.
              </p>
            </>
          ) : (
            result && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-sm font-bold ${
                  result.ok ? "bg-aqua-50 text-aqua-800" : "bg-red-50 text-alert"
                }`}
              >
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{result.message}</span>
              </div>
            )
          )}
        </div>

        <div className="border-t border-white/10 p-6 pt-4">
          {phase === "done" ? (
            <button type="button" onClick={onClose} className="primary w-full">
              Concluir
            </button>
          ) : (
            <button type="button" onClick={pay} disabled={phase === "processing"} className="primary w-full">
              {phase === "processing" ? "Processando…" : `Pagar ${formatProductPrice(product.priceCents)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getTransactionTitle(transaction: CoinTransaction) {
  if (transaction.reason === "welcome_bonus") return "Bônus de boas-vindas";
  if (transaction.reason === "package_professional") return "Pacote Profissional comprado";
  if (transaction.reason === "package_plus") return "Pacote Plus comprado";
  if (transaction.reason === "company_plus") return "Mensalidade da empresa";
  if (transaction.reason === "company_coin_pack") return "Moedas da empresa compradas";
  if (transaction.reason === "coin_pack") return "Pacote de moedas comprado";
  if (transaction.reason === "unlock_job") return "Vaga completa liberada";
  if (transaction.reason === "apply_job") return "Candidatura enviada";
  if (transaction.reason === "cancel_filled_job") return "Cancelamento de vaga preenchida";
  if (transaction.kind === "refund") return "Moedas estornadas";
  if (transaction.kind === "bonus") return "Bônus de moedas";
  return "Movimentação de moedas";
}

function getTransactionDescription(transaction: CoinTransaction) {
  if (transaction.reason === "welcome_bonus") return "5 moedas para você começar a usar o PONT.";
  if (transaction.reason === "company_plus") return "Mensalidade da empresa — ações ilimitadas por 30 dias.";
  if (transaction.reason === "unlock_job" && transaction.jobId) return `Desbloqueio da vaga ${transaction.jobId}.`;
  if (transaction.reason === "apply_job" && transaction.applicationId) return `Candidatura ${transaction.applicationId}.`;
  if (transaction.reason === "cancel_filled_job" && transaction.jobId) return `Taxa de cancelamento da vaga preenchida ${transaction.jobId}.`;
  if (transaction.amount > 0) return "Moedas adicionadas ao saldo da sua conta.";
  return "Moedas utilizadas dentro do PONT.";
}
