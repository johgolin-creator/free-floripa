import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Loader2, Phone, Plus, Trash2, UserRoundSearch, UsersRound, WalletCards } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/format";
import { listMySalesRepCompanies, salesRepSignupLink, type SalesRepCompany } from "../lib/salesReps";
import { formatBrl, listMySales, type Sale } from "../lib/sales";
import {
  createSalesRepLead,
  deleteSalesRepLead,
  listMySalesRepLeads,
  SALES_REP_LEAD_STATUS_LABELS,
  SALES_REP_LEAD_STATUSES,
  updateSalesRepLeadStatus,
  type SalesRepLead,
  type SalesRepLeadStatus
} from "../lib/salesRepLeads";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="secondary"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        })
      }
    >
      <Copy size={16} /> {done ? "Copiado!" : label}
    </button>
  );
}

export function VendedorDashboard() {
  const { salesRep } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [companies, setCompanies] = useState<SalesRepCompany[]>([]);
  const [leads, setLeads] = useState<SalesRepLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [addingLead, setAddingLead] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadFilter, setLeadFilter] = useState<"Todos" | SalesRepLeadStatus>("a_contatar");

  function reloadLeads() {
    listMySalesRepLeads()
      .then(setLeads)
      .catch((err) => setLeadError(err instanceof Error ? err.message : "Não foi possível carregar os contatos."));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listMySales(), listMySalesRepCompanies(), listMySalesRepLeads()])
      .then(([saleRows, companyRows, leadRows]) => {
        if (!active) return;
        setSales(saleRows);
        setCompanies(companyRows);
        setLeads(leadRows);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar seus dados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleAddLead() {
    if (!salesRep || !leadName.trim()) return;
    setAddingLead(true);
    setLeadError("");
    try {
      const created = await createSalesRepLead(salesRep.id, {
        name: leadName,
        phone: leadPhone,
        email: leadEmail,
        notes: leadNotes
      });
      setLeads((prev) => [created, ...prev]);
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      setLeadNotes("");
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Não foi possível adicionar o contato.");
    } finally {
      setAddingLead(false);
    }
  }

  async function handleLeadStatusChange(lead: SalesRepLead, status: SalesRepLeadStatus) {
    setLeads((prev) => prev.map((item) => (item.id === lead.id ? { ...item, status } : item)));
    try {
      await updateSalesRepLeadStatus(lead.id, status);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
      reloadLeads();
    }
  }

  async function handleDeleteLead(lead: SalesRepLead) {
    setLeads((prev) => prev.filter((item) => item.id !== lead.id));
    try {
      await deleteSalesRepLead(lead.id);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Não foi possível remover o contato.");
      reloadLeads();
    }
  }

  const filteredLeads = useMemo(
    () => (leadFilter === "Todos" ? leads : leads.filter((lead) => lead.status === leadFilter)),
    [leads, leadFilter]
  );

  const pendingLeadsCount = useMemo(() => leads.filter((lead) => lead.status === "a_contatar").length, [leads]);

  const stats = useMemo(() => {
    const paid = sales.filter((sale) => sale.paymentStatus === "pago");
    // "Clientes indicados" = empresas que se cadastraram pelo link (sold_by)
    // somadas às que já têm venda registrada, sem contar duas vezes.
    const clientIds = new Set<string>([
      ...companies.map((company) => company.id),
      ...sales.map((sale) => sale.companyId).filter((id): id is string => Boolean(id))
    ]);
    return {
      clients: clientIds.size,
      count: sales.length,
      revenueCents: paid.reduce((sum, sale) => sum + sale.amountCents, 0)
    };
  }, [sales, companies]);

  if (!salesRep) {
    return <EmptyState title="Área do vendedor" text="Sua conta não está vinculada a um vendedor." />;
  }

  const link = salesRepSignupLink(salesRep.code);

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Vendedor" title={`Olá, ${salesRep.name.split(" ")[0]}!`} description="Suas indicações e vendas." />

      <section className="card p-5">
        <div className="grid gap-3">
          <div>
            <span className="text-xs font-black uppercase text-slate-500">Seu código</span>
            <strong className="mt-1 block text-2xl font-black text-white">{salesRep.code}</strong>
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
              <Link2 size={13} /> Seu link de indicação
            </span>
            <p className="mt-1 break-all text-sm font-semibold text-slate-600">{link}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={salesRep.code} label="Copiar código" />
            <CopyButton text={link} label="Copiar link" />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile icon={<UsersRound />} label="Clientes indicados" value={stats.clients} />
        <StatTile icon={<WalletCards />} label="Vendas realizadas" value={stats.count} />
        <StatTile variant="primary" icon={<WalletCards />} label="Valor total vendido" value={formatBrl(stats.revenueCents)} />
        <StatTile tone={pendingLeadsCount > 0 ? "positive" : "normal"} icon={<UserRoundSearch />} label="Contatos pendentes" value={pendingLeadsCount} />
      </div>

      <section className="card p-4">
        <h3 className="mb-1 font-black text-white">Quem falta contatar</h3>
        <p className="mb-3 text-xs font-semibold text-slate-500">
          Sua lista pessoal de prospecção: adicione contatos e acompanhe o status até virarem clientes.
        </p>

        <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          <input
            type="text"
            value={leadName}
            onChange={(event) => setLeadName(event.target.value)}
            placeholder="Nome do contato / empresa *"
            className="input"
          />
          <input
            type="text"
            value={leadPhone}
            onChange={(event) => setLeadPhone(event.target.value)}
            placeholder="Telefone"
            className="input"
          />
          <input
            type="email"
            value={leadEmail}
            onChange={(event) => setLeadEmail(event.target.value)}
            placeholder="E-mail"
            className="input"
          />
          <input
            type="text"
            value={leadNotes}
            onChange={(event) => setLeadNotes(event.target.value)}
            placeholder="Observações"
            className="input"
          />
          <button
            type="button"
            onClick={handleAddLead}
            disabled={addingLead || !leadName.trim()}
            className="primary sm:col-span-2"
          >
            {addingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar contato
          </button>
        </div>

        {leadError && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{leadError}</div>}

        <div className="worker-filter-buttons mb-3">
          {(["Todos", ...SALES_REP_LEAD_STATUSES] as ("Todos" | SalesRepLeadStatus)[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLeadFilter(item)}
              className={`worker-filter-button ${leadFilter === item ? "is-active" : ""}`}
            >
              {item === "Todos" ? "Todos" : SALES_REP_LEAD_STATUS_LABELS[item]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm font-bold text-slate-600">Carregando…</p>
        ) : filteredLeads.length === 0 ? (
          <EmptyState title="Nenhum contato aqui" text="Adicione as empresas que você está prospectando para acompanhar quem falta contatar." />
        ) : (
          <div className="grid gap-2">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-white">{lead.name}</strong>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {[lead.phone, lead.email, lead.notes].filter(Boolean).join(" · ") || "Sem detalhes"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="secondary" aria-label="Ligar">
                      <Phone size={15} />
                    </a>
                  )}
                  <select
                    value={lead.status}
                    onChange={(event) => handleLeadStatusChange(lead, event.target.value as SalesRepLeadStatus)}
                    className="input !w-auto"
                  >
                    {SALES_REP_LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {SALES_REP_LEAD_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => handleDeleteLead(lead)} className="danger" aria-label="Remover contato">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h3 className="mb-1 font-black text-white">Minhas indicações</h3>
        <p className="mb-3 text-xs font-semibold text-slate-500">
          Empresas que se cadastraram pelo seu link. Aparecem aqui assim que entram no app, antes de comprar qualquer pacote.
        </p>
        {loading ? (
          <p className="text-sm font-bold text-slate-600">Carregando…</p>
        ) : companies.length === 0 ? (
          <EmptyState
            title="Nenhuma indicação ainda"
            text="Quando alguém criar uma conta de empresa pelo seu link, a empresa aparece aqui."
          />
        ) : (
          <div className="grid gap-2">
            {companies.map((company) => (
              <div key={company.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-white">{company.establishmentName}</strong>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {[company.neighborhood, company.responsibleName].filter(Boolean).join(" · ") || "Empresa indicada"}
                  </p>
                </div>
                {company.createdAt && (
                  <span className="shrink-0 text-xs font-bold text-slate-500">{formatDate(company.createdAt)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h3 className="mb-3 font-black text-white">Minhas vendas</h3>
        {loading ? (
          <p className="text-sm font-bold text-slate-600">Carregando…</p>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>
        ) : sales.length === 0 ? (
          <EmptyState title="Nenhuma venda ainda" text="Quando um cliente seu contratar um plano, a venda aparece aqui." />
        ) : (
          <div className="grid gap-2">
            {sales.map((sale) => (
              <div key={sale.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-white">{sale.companyName || "Empresa"}</strong>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {sale.plan} - {formatDate(sale.soldAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <strong className="text-sm text-white">{formatBrl(sale.amountCents)}</strong>
                  <span
                    className={
                      sale.paymentStatus === "pago"
                        ? "badge bg-aqua-50 text-aqua-700"
                        : sale.paymentStatus === "pendente"
                          ? "badge border-amber-200 bg-amber-50 text-amber-700"
                          : "badge border-red-100 bg-red-50 text-alert"
                    }
                  >
                    {sale.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
