import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  FileSearch,
  Globe,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Search,
  Trash2
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { StatTile } from "../components/StatTile";
import { CITY_OPTIONS, COMPANY_LEAD_SEGMENTS, DEFAULT_CITY, searchCompanyLeads } from "../lib/companyProspecting";
import {
  deleteRemoteCompanyLead,
  loadRemoteCompanyLeads,
  setRemoteCompanyLeadContacted,
  supabaseCompanyLeadsEnabled,
  upsertRemoteCompanyLeads
} from "../lib/supabaseCompanyLeads";
import { useAppStore } from "../lib/store";
import { formatDateTime } from "../lib/format";
import type { CompanyLead, CompanyLeadSegment } from "../lib/types";

type SegmentFilter = "Todos" | CompanyLeadSegment;

export function AdminLeadsPage() {
  const { state, addCompanyLeads, replaceCompanyLeads, toggleCompanyLeadContacted, removeCompanyLead } = useAppStore();
  const [segment, setSegment] = useState<CompanyLeadSegment>("Restaurantes");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("Todos");
  const [contactFilter, setContactFilter] = useState<"Todas" | "Sem contato" | "Contatadas">("Todas");

  useEffect(() => {
    if (!supabaseCompanyLeadsEnabled) return;
    loadRemoteCompanyLeads()
      .then((remoteLeads) => {
        if (remoteLeads.length > 0) replaceCompanyLeads(remoteLeads);
      })
      .catch(() => {
        setError("Não foi possível carregar a lista compartilhada. Mostrando apenas o que já estava neste aparelho.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leads = state.companyLeads;
  const filteredLeads = useMemo(
    () =>
      leads
        .filter((lead) => segmentFilter === "Todos" || lead.segment === segmentFilter)
        .filter((lead) => {
          if (contactFilter === "Todas") return true;
          return contactFilter === "Contatadas" ? lead.contacted : !lead.contacted;
        })
        .sort((a, b) => b.foundAt.localeCompare(a.foundAt)),
    [leads, segmentFilter, contactFilter]
  );

  const groupedLeads = useMemo(() => {
    if (segmentFilter !== "Todos") return null;
    return COMPANY_LEAD_SEGMENTS.map((item) => ({
      segment: item.value,
      label: item.label,
      leads: filteredLeads.filter((lead) => lead.segment === item.value)
    })).filter((group) => group.leads.length > 0);
  }, [filteredLeads, segmentFilter]);

  const stats = {
    total: leads.length,
    withContact: leads.filter((lead) => lead.phone || lead.email).length,
    contacted: leads.filter((lead) => lead.contacted).length
  };

  async function runSearch() {
    setSearching(true);
    setError("");
    setMessage("");
    try {
      const found = await searchCompanyLeads({ segment, city });
      const { added, updated } = addCompanyLeads(found);
      if (found.length === 0) {
        setMessage("Nenhuma empresa encontrada para esse segmento e cidade.");
      } else {
        setMessage(`${found.length} empresa(s) encontrada(s): ${added} nova(s), ${updated} já conhecida(s).`);
      }
      if (supabaseCompanyLeadsEnabled) {
        upsertRemoteCompanyLeads(found).catch(() => {
          setError("Empresas salvas neste aparelho, mas não foi possível sincronizar com a lista compartilhada.");
        });
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Não foi possível concluir a busca.");
    } finally {
      setSearching(false);
    }
  }

  function handleToggleContacted(lead: CompanyLead) {
    toggleCompanyLeadContacted(lead.id);
    if (supabaseCompanyLeadsEnabled) {
      setRemoteCompanyLeadContacted(lead.id, !lead.contacted).catch(() => {
        setError("Não foi possível sincronizar o status de contato.");
      });
    }
  }

  function handleRemove(lead: CompanyLead) {
    removeCompanyLead(lead.id);
    if (supabaseCompanyLeadsEnabled) {
      deleteRemoteCompanyLead(lead.id).catch(() => {
        setError("Não foi possível remover da lista compartilhada.");
      });
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Captação de empresas"
        title="Buscar empresas potenciais"
        description="Pesquisa restaurantes, baladas, hotéis, mercados e atacados na região para prospecção comercial."
      />

      <section className="mb-5 grid gap-4 rounded-lg border border-white/10 bg-brand-charcoal p-4 shadow-soft ring-1 ring-white/5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="label">
            Área de atuação
            <select value={segment} onChange={(event) => setSegment(event.target.value as CompanyLeadSegment)} className="input">
              {COMPANY_LEAD_SEGMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            Cidade
            <select value={city} onChange={(event) => setCity(event.target.value)} className="input">
              {CITY_OPTIONS.map((item) => (
                <option key={item.label} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={runSearch} disabled={searching} className="primary">
            {searching ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
            {searching ? "Buscando..." : "Buscar empresas"}
          </button>
        </div>
        <p className="text-xs font-semibold leading-5 text-slate-400">
          Busca dados públicos do OpenStreetMap. Nem toda empresa tem telefone ou e-mail cadastrado ali — use o nome e endereço
          para pesquisar o contato quando faltar. Antes de abordar, respeite as regras de proteção de dados (LGPD) e prefira
          canais de opt-in.
        </p>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
        {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile variant="primary" icon={<Building2 size={19} />} label="empresas encontradas" value={stats.total} />
        <StatTile tone={stats.withContact > 0 ? "positive" : "normal"} icon={<Phone size={19} />} label="com telefone ou e-mail" value={stats.withContact} />
        <StatTile icon={<CheckCircle2 size={19} />} label="já contatadas" value={stats.contacted} />
      </section>

      <section className="jobs-filter-panel">
        <div className="jobs-filter-title">
          <div>
            <h3>
              <Search size={18} /> Filtrar lista
            </h3>
            <p>Veja por área de atuação ou por status de contato.</p>
          </div>
          <span className="badge">{filteredLeads.length} exibidas</span>
        </div>
        <div className="worker-filter-buttons">
          {(["Todos", ...COMPANY_LEAD_SEGMENTS.map((item) => item.value)] as SegmentFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSegmentFilter(item)}
              className={`worker-filter-button ${segmentFilter === item ? "is-active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="worker-filter-buttons mt-2">
          {(["Todas", "Sem contato", "Contatadas"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setContactFilter(item)}
              className={`worker-filter-button ${contactFilter === item ? "is-active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {leads.length === 0 ? (
        <EmptyState title="Nenhuma empresa buscada ainda" text="Escolha uma área de atuação e clique em Buscar empresas para começar." />
      ) : filteredLeads.length === 0 ? (
        <EmptyState title="Nada neste filtro" text="Troque o filtro para ver outras empresas encontradas." />
      ) : groupedLeads ? (
        <div className="mt-4 grid gap-6">
          {groupedLeads.map((group) => (
            <section key={group.segment}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">{group.label}</h3>
                <span className="badge">{group.leads.length}</span>
              </div>
              <div className="grid gap-3">
                {group.leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onToggleContacted={() => handleToggleContacted(lead)}
                    onRemove={() => handleRemove(lead)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onToggleContacted={() => handleToggleContacted(lead)}
              onRemove={() => handleRemove(lead)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildSearchLinks(lead: CompanyLead) {
  const query = `${lead.name} ${lead.city}`;
  return {
    maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    instagram: `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com ${query}`)}`,
    cnpj: `https://www.google.com/search?q=${encodeURIComponent(`CNPJ ${query}`)}`
  };
}

function LeadCard({
  lead,
  onToggleContacted,
  onRemove
}: {
  lead: CompanyLead;
  onToggleContacted: () => void;
  onRemove: () => void;
}) {
  const hasContact = Boolean(lead.phone || lead.email);
  const searchLinks = buildSearchLinks(lead);

  return (
    <article className={`worker-application-card ${lead.contacted ? "" : hasContact ? "border-aqua-200 bg-aqua-50/40" : ""}`}>
      <div className="worker-card-head">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-aqua-100 bg-aqua-50 text-aqua-700">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge">{lead.segment}</span>
              {lead.contacted && <span className="badge border-aqua-200 bg-aqua-50 text-aqua-700">Contatada</span>}
              {!hasContact && <span className="badge">Sem contato direto</span>}
            </div>
            <h3 className="mt-2">{lead.name}</h3>
            {lead.address && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <MapPin size={14} /> {lead.address}
              </p>
            )}
            <span className="mt-2 block text-xs font-black uppercase text-slate-500">
              Encontrada em {formatDateTime(lead.foundAt)}
            </span>
          </div>
        </div>
        <div className="worker-action-row">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="secondary">
              <Phone size={16} /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="secondary">
              <Mail size={16} /> {lead.email}
            </a>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noreferrer" className="secondary">
              <Globe size={16} /> Site
            </a>
          )}
          {!hasContact && (
            <>
              <a href={searchLinks.maps} target="_blank" rel="noreferrer" className="secondary">
                <MapPinned size={16} /> Buscar no Maps
              </a>
              <a href={searchLinks.instagram} target="_blank" rel="noreferrer" className="secondary">
                <Instagram size={16} /> Buscar no Instagram
              </a>
              <a href={searchLinks.cnpj} target="_blank" rel="noreferrer" className="secondary">
                <FileSearch size={16} /> Buscar CNPJ
              </a>
            </>
          )}
          <button type="button" onClick={onToggleContacted} className={lead.contacted ? "secondary" : "primary"}>
            <CheckCircle2 size={16} /> {lead.contacted ? "Marcar como pendente" : "Marcar como contatada"}
          </button>
          <button type="button" onClick={onRemove} className="danger" aria-label="Remover">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
