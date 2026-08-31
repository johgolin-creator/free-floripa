import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Lock, Search, WalletCards } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { useAppStore } from "../lib/store";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { loadRemoteCoinTransactions, supabaseCoinsEnabled, type CoinTransaction } from "../lib/supabaseCoins";

export function SubscriptionPage() {
  const { state } = useAppStore();
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
  const positive = transaction.amount > 0;
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
            {positive ? "+" : ""}{transaction.amount} moeda{Math.abs(transaction.amount) === 1 ? "" : "s"}
          </strong>
          <span className="text-xs font-black uppercase text-slate-500">Saldo: {transaction.balanceAfter}</span>
        </div>
      </div>
    </article>
  );
}

function getTransactionTitle(transaction: CoinTransaction) {
  if (transaction.reason === "welcome_bonus") return "Bônus de boas-vindas";
  if (transaction.reason === "package_professional") return "Pacote Profissional comprado";
  if (transaction.reason === "package_plus") return "Pacote Plus comprado";
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
  if (transaction.reason === "unlock_job" && transaction.jobId) return `Desbloqueio da vaga ${transaction.jobId}.`;
  if (transaction.reason === "apply_job" && transaction.applicationId) return `Candidatura ${transaction.applicationId}.`;
  if (transaction.reason === "cancel_filled_job" && transaction.jobId) return `Taxa de cancelamento da vaga preenchida ${transaction.jobId}.`;
  if (transaction.amount > 0) return "Moedas adicionadas ao saldo da sua conta.";
  return "Moedas utilizadas dentro do PONT.";
}
