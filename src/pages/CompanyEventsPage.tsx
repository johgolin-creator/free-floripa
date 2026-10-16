import { useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, Minus, Plus, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { functions, neighborhoods } from "../data/demoData";
import { formatCurrency, formatDate, todayLocalISODate } from "../lib/format";
import { calculateReliability, getFunctionExperience } from "../lib/rules";
import { useAppStore } from "../lib/store";
import type { JobFunction, Neighborhood, PaymentMethod } from "../lib/types";

const demoWorkerIds = new Set(["worker-1", "worker-2", "worker-3", "worker-4"]);
const eventTypes = ["Casamento", "Aniversário", "Evento corporativo", "Formatura", "Confraternização", "Outro"];
const eventFunctions = functions.filter((item) =>
  ["Garçom", "Bartender", "Segurança", "Vigilante", "Recepcionista", "Auxiliar de cozinha", "Copeiro", "Limpeza", "Promotor"].includes(item)
);

type CrewNeeds = Record<JobFunction, number>;

function createEmptyNeeds(): CrewNeeds {
  return functions.reduce((acc, item) => ({ ...acc, [item]: 0 }), {} as CrewNeeds);
}

function suggestCrewSize(guests: number, functionName: JobFunction) {
  if (functionName === "Garçom") return Math.max(1, Math.ceil(guests / 25));
  if (functionName === "Bartender") return guests >= 60 ? Math.ceil(guests / 80) : 1;
  if (functionName === "Segurança") return guests >= 120 ? 2 : guests >= 70 ? 1 : 0;
  if (functionName === "Recepcionista") return guests >= 80 ? 2 : 1;
  if (functionName === "Auxiliar de cozinha") return guests >= 80 ? 2 : 1;
  if (functionName === "Copeiro") return guests >= 80 ? 2 : 1;
  if (functionName === "Limpeza") return guests >= 120 ? 2 : 1;
  return 0;
}

export function CompanyEventsPage() {
  const { state, currentCompany, createJob } = useAppStore();
  const lastCreatedEventKey = useRef("");
  const today = todayLocalISODate();
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState(today);
  const [startsAt, setStartsAt] = useState("18:00");
  const [endsAt, setEndsAt] = useState("02:00");
  const [neighborhood, setNeighborhood] = useState<Neighborhood>(currentCompany.neighborhood);
  const [location, setLocation] = useState(currentCompany.address);
  const [guests, setGuests] = useState(100);
  const [dailyValue, setDailyValue] = useState(180);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<JobFunction>("Garçom");
  const [needs, setNeeds] = useState<CrewNeeds>(() => ({
    ...createEmptyNeeds(),
    Garçom: 4,
    Bartender: 1,
    Segurança: 1,
    Recepcionista: 1,
    "Auxiliar de cozinha": 1,
    Limpeza: 1
  }));
  const [message, setMessage] = useState("");
  const companyBlocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);

  const realWorkers = useMemo(
    () => state.workers.filter((worker) => !demoWorkerIds.has(worker.id) && !state.adminModeration.blockedWorkerIds.includes(worker.id)),
    [state.adminModeration.blockedWorkerIds, state.workers]
  );
  const selectedWorkers = useMemo(
    () =>
      realWorkers
        .filter((worker) => Boolean(getFunctionExperience(worker, selectedFunction)))
        .sort((a, b) => calculateReliability(b) - calculateReliability(a) || b.rating - a.rating),
    [realWorkers, selectedFunction]
  );
  const requestedFunctions = eventFunctions.filter((item) => needs[item] > 0);
  const totalProfessionals = requestedFunctions.reduce((total, item) => total + needs[item], 0);
  const estimatedEventCost = totalProfessionals * dailyValue;
  const availableByFunction = eventFunctions.reduce((acc, item) => {
    acc[item] = realWorkers.filter((worker) => Boolean(getFunctionExperience(worker, item))).length;
    return acc;
  }, {} as CrewNeeds);
  const eventCreationKey = useMemo(
    () =>
      JSON.stringify({
        eventName: eventName.trim(),
        eventType,
        date,
        startsAt,
        endsAt,
        neighborhood,
        location: location.trim(),
        guests,
        dailyValue,
        paymentMethod,
        needs: requestedFunctions.map((item) => [item, needs[item]])
      }),
    [dailyValue, date, endsAt, eventName, eventType, guests, location, needs, neighborhood, paymentMethod, requestedFunctions, startsAt]
  );
  const eventAlreadyCreated = lastCreatedEventKey.current === eventCreationKey;

  function updateNeed(functionName: JobFunction, quantity: number) {
    setNeeds((current) => ({ ...current, [functionName]: Math.max(0, quantity) }));
  }

  function applySuggestion() {
    const suggested = createEmptyNeeds();
    eventFunctions.forEach((item) => {
      suggested[item] = suggestCrewSize(guests, item);
    });
    setNeeds(suggested);
    setMessage("Sugestão aplicada com base no tamanho do evento. Ajuste as quantidades se precisar.");
  }

  function createEventJobs() {
    if (isCreating) return;

    if (companyBlocked) {
      setMessage("Sua empresa está em revisão pela administração e não pode criar vagas de evento no momento.");
      return;
    }

    if (!eventName.trim() || !eventType || !date || !startsAt || !endsAt || !location.trim()) {
      setMessage("Preencha nome, tipo, data, horário e local do evento antes de criar as vagas.");
      return;
    }

    if (requestedFunctions.length === 0) {
      setMessage("Informe pelo menos uma função com quantidade maior que zero.");
      return;
    }

    if (lastCreatedEventKey.current === eventCreationKey) {
      setMessage("Essas vagas já foram criadas para este evento. Altere algum dado se quiser gerar um novo pacote.");
      return;
    }

    setIsCreating(true);
    requestedFunctions.forEach((functionName) => {
      createJob({
        title: `${eventName}: ${functionName}`,
        function: functionName,
        quantity: needs[functionName],
        date,
        startsAt,
        endsAt,
        dailyValue,
        paymentMethod,
        approximateAddress: `${neighborhood}, Florianópolis`,
        fullAddress: location,
        neighborhood,
        uniform: eventType === "Casamento" ? "Social preto ou conforme orientação dos noivos" : "A combinar com a organização",
        requiredExperience: "Experiência compatível com evento social e atendimento ao público",
        description: `${eventType} para aproximadamente ${guests} convidados. Equipe criada pela aba Eventos do PONT.`,
        benefits: ["Contato liberado após confirmação", "Equipe organizada por função"],
        urgent: false
      });
    });
    lastCreatedEventKey.current = eventCreationKey;
    setIsCreating(false);

    setMessage(`${requestedFunctions.length} vaga${requestedFunctions.length === 1 ? "" : "s"} criada${requestedFunctions.length === 1 ? "" : "s"} para ${eventName}. Agora você pode acompanhar os candidatos em Minhas vagas.`);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <SectionHeader
        eyebrow="Eventos"
        title="Monte a equipe do evento"
        description="Preencha os dados, escolha quantas pessoas precisa em cada função e o PONT cria uma vaga para cada função."
      />

      {companyBlocked && (
        <SafetyNotice title="Criação pausada" tone="warning">
          Criação de vagas de evento está pausada enquanto a administração revisa sua empresa.
        </SafetyNotice>
      )}

      <section className="event-builder-grid">
        <div className="grid min-w-0 gap-4">
          <div className="event-form-card">
            <EventStep number={1} title="O evento" />
            <div className="event-data-grid">
              <label className="label md:col-span-2">
                Nome do evento
                <input value={eventName} onChange={(event) => setEventName(event.target.value)} className="input" placeholder="Ex.: Casamento Ana e João" />
              </label>
              <label className="label">
                Tipo
                <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="input">
                  <option value="">Selecione o tipo</option>
                  {eventTypes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="label">
                Convidados
                <input value={guests} onChange={(event) => setGuests(Number(event.target.value || 0))} className="input" min={1} type="number" inputMode="numeric" />
              </label>
            </div>

            <EventStep number={2} title="Quando e onde" />
            <div className="event-data-grid md:grid-cols-3">
              <label className="label">
                Data
                <input value={date} onChange={(event) => setDate(event.target.value)} className="input" type="date" />
              </label>
              <label className="label">
                Início
                <input value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="input" type="time" />
              </label>
              <label className="label">
                Término
                <input value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="input" type="time" />
              </label>
              <label className="label">
                Bairro
                <input
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value as Neighborhood)}
                  list="neighborhoods-event"
                  className="input"
                  placeholder="Digite o bairro"
                  autoComplete="off"
                />
                <datalist id="neighborhoods-event">
                  {neighborhoods.map((item) => <option key={item} value={item} />)}
                </datalist>
              </label>
              <label className="label md:col-span-2">
                Endereço completo
                <input value={location} onChange={(event) => setLocation(event.target.value)} className="input" placeholder="Salão, casa de eventos ou residência" />
              </label>
            </div>

            <EventStep number={3} title="Pagamento" />
            <div className="event-data-grid">
              <label className="label">
                Diária por pessoa (R$)
                <input value={dailyValue} onChange={(event) => setDailyValue(Number(event.target.value || 0))} className="input" min={1} type="number" inputMode="numeric" />
              </label>
              <label className="label">
                Forma de pagamento
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="input">
                  <option>Pix</option>
                  <option>Dinheiro</option>
                  <option>Transferência</option>
                  <option>A combinar</option>
                </select>
              </label>
            </div>
          </div>

          <section className="event-team-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <EventStep number={4} title="Equipe necessária" hint="Toque em + ou – para ajustar cada função." />
              <button type="button" onClick={applySuggestion} className="cand-btn">
                <Sparkles size={16} /> Sugerir para {guests} convidados
              </button>
            </div>
            <div className="event-needs-grid">
              {eventFunctions.map((item) => {
                const quantity = needs[item];
                const available = availableByFunction[item] ?? 0;
                return (
                  <div key={item} className={`event-need-card ${quantity > 0 ? "is-active" : ""}`}>
                    <div className="min-w-0">
                      <strong>{item}</strong>
                      <small>
                        {available} disponíve{available === 1 ? "l" : "is"}
                      </small>
                    </div>
                    <div className="event-stepper">
                      <button type="button" onClick={() => updateNeed(item, quantity - 1)} disabled={quantity === 0} aria-label={`Menos ${item}`}>
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite">{quantity}</span>
                      <button type="button" onClick={() => updateNeed(item, quantity + 1)} aria-label={`Mais ${item}`}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="event-summary-card">
          <span className="section-eyebrow">Resumo</span>
          <h3>{eventName.trim() || "Seu evento"}</h3>
          <p>
            {eventType || "Tipo não escolhido"} · {guests} convidados
          </p>
          <dl className="event-summary-list">
            <div>
              <dt>
                <CalendarDays size={15} /> Quando
              </dt>
              <dd>
                {date ? formatDate(date) : "-"} · {startsAt} às {endsAt}
              </dd>
            </div>
            <div>
              <dt>
                <MapPin size={15} /> Onde
              </dt>
              <dd>{neighborhood || "-"}</dd>
            </div>
            <div>
              <dt>
                <UsersRound size={15} /> Equipe
              </dt>
              <dd>
                {totalProfessionals} pessoa{totalProfessionals === 1 ? "" : "s"} em {requestedFunctions.length} funç{requestedFunctions.length === 1 ? "ão" : "ões"}
              </dd>
            </div>
          </dl>
          {requestedFunctions.length > 0 && (
            <div className="event-review-list">
              {requestedFunctions.map((item) => (
                <span key={item}>
                  <strong>{needs[item]}</strong>
                  {item}
                </span>
              ))}
            </div>
          )}
          <div className="event-summary-total">
            <span>Custo estimado</span>
            <strong>{formatCurrency(estimatedEventCost)}</strong>
          </div>
          {message && <div className="event-created-note">{message}</div>}
          <button
            aria-busy={isCreating}
            type="button"
            onClick={createEventJobs}
            disabled={isCreating || requestedFunctions.length === 0 || companyBlocked || eventAlreadyCreated}
            className="primary w-full"
          >
            <Plus size={17} />{" "}
            {isCreating
              ? "Criando vagas..."
              : eventAlreadyCreated
                ? "Vagas já criadas"
                : `Criar ${requestedFunctions.length} vaga${requestedFunctions.length === 1 ? "" : "s"} do evento`}
          </button>
          <small className="text-xs font-semibold leading-5 text-slate-500">
            {eventAlreadyCreated
              ? "Altere algum dado do evento para gerar um novo pacote de vagas."
              : "Cada função vira uma vaga separada. Perfis em revisão não entram nas sugestões."}
          </small>
        </aside>
      </section>

      <details className="event-browse-professionals">
        <summary>
          <Search size={17} /> Ver profissionais disponíveis por função
        </summary>
        <div className="mt-4 grid gap-4">
          <div className="cand-tabs flex-wrap" role="tablist" aria-label="Função">
            {eventFunctions.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={selectedFunction === item}
                onClick={() => setSelectedFunction(item)}
                className={`cand-tab flex-none ${selectedFunction === item ? "is-active" : ""}`}
              >
                {item}
                <span className="cand-tab-count">{availableByFunction[item] ?? 0}</span>
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <ShieldCheck size={16} /> {selectedFunction}: ordenados por confiabilidade
          </p>
          {selectedWorkers.length === 0 ? (
            <EmptyState title="Nenhum profissional nesta função" text="Quando trabalhadores completarem o perfil com essa profissão, eles aparecerão aqui." />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {selectedWorkers.slice(0, 8).map((worker) => (
                <WorkerCard key={worker.id} worker={worker} showActions={false} functionFocus={selectedFunction} />
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function EventStep({ number, title, hint }: { number: number; title: string; hint?: string }) {
  return (
    <div className="event-step">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </div>
    </div>
  );
}
