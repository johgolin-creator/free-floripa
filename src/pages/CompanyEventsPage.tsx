import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ClipboardList, MapPin, PartyPopper, Plus, Search, Star, UsersRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { WorkerCard } from "../components/WorkerCard";
import { functions, neighborhoods } from "../data/demoData";
import { formatCurrency } from "../lib/format";
import { calculateReliability, getFunctionExperience } from "../lib/rules";
import { useAppStore } from "../lib/store";
import type { JobFunction, Neighborhood, PaymentMethod, WorkerProfile } from "../lib/types";

const demoWorkerIds = new Set(["worker-1", "worker-2", "worker-3", "worker-4"]);
const eventTypes = ["Casamento", "Aniversário", "Evento corporativo", "Formatura", "Confraternização", "Outro"];
const eventFunctions = functions.filter((item) =>
  ["Garçom", "Bartender", "Segurança", "Recepcionista", "Auxiliar de cozinha", "Copeiro", "Limpeza", "Promotor"].includes(item)
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
  const today = new Date().toISOString().slice(0, 10);
  const [eventName, setEventName] = useState("Casamento");
  const [eventType, setEventType] = useState("Casamento");
  const [date, setDate] = useState(today);
  const [startsAt, setStartsAt] = useState("18:00");
  const [endsAt, setEndsAt] = useState("02:00");
  const [neighborhood, setNeighborhood] = useState<Neighborhood>(currentCompany.neighborhood);
  const [location, setLocation] = useState(currentCompany.address);
  const [guests, setGuests] = useState(100);
  const [dailyValue, setDailyValue] = useState(180);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
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

  const realWorkers = useMemo(() => state.workers.filter((worker) => !demoWorkerIds.has(worker.id)), [state.workers]);
  const selectedWorkers = useMemo(
    () =>
      realWorkers
        .filter((worker) => Boolean(getFunctionExperience(worker, selectedFunction)))
        .sort((a, b) => calculateReliability(b) - calculateReliability(a) || b.rating - a.rating),
    [realWorkers, selectedFunction]
  );
  const requestedFunctions = eventFunctions.filter((item) => needs[item] > 0);
  const totalProfessionals = requestedFunctions.reduce((total, item) => total + needs[item], 0);
  const availableByFunction = requestedFunctions.reduce((acc, item) => {
    acc[item] = realWorkers.filter((worker) => Boolean(getFunctionExperience(worker, item))).length;
    return acc;
  }, {} as CrewNeeds);

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
    if (!eventName.trim() || !date || !startsAt || !endsAt || !location.trim()) {
      setMessage("Preencha nome, data, horário e local do evento antes de criar as vagas.");
      return;
    }

    if (requestedFunctions.length === 0) {
      setMessage("Informe pelo menos uma função com quantidade maior que zero.");
      return;
    }

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
        description: `${eventType} para aproximadamente ${guests} convidados. Equipe criada pela aba Eventos do Free Floripa.`,
        benefits: ["Contato liberado após confirmação", "Equipe organizada por função"],
        urgent: false
      });
    });

    setMessage(`${requestedFunctions.length} vaga${requestedFunctions.length === 1 ? "" : "s"} criada${requestedFunctions.length === 1 ? "" : "s"} para ${eventName}. Agora você pode acompanhar os candidatos em Minhas vagas.`);
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Eventos"
        title="Monte a equipe do evento"
        description="Ideal para casamento, aniversário, formatura ou evento corporativo. Defina a equipe desejada, veja profissionais disponíveis por função e crie as vagas em lote."
      />

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-navy-950">
            <PartyPopper size={18} /> Dados do evento
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="label">
              Nome do evento
              <input value={eventName} onChange={(event) => setEventName(event.target.value)} className="input" placeholder="Casamento Ana e Joao" />
            </label>
            <label className="label">
              Tipo
              <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="input">
                {eventTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Data
              <input value={date} onChange={(event) => setDate(event.target.value)} className="input" type="date" />
            </label>
            <label className="label">
              Convidados
              <input value={guests} onChange={(event) => setGuests(Number(event.target.value || 0))} className="input" min={1} type="number" />
            </label>
            <label className="label">
              Inicio
              <input value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="input" type="time" />
            </label>
            <label className="label">
              Termino
              <input value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="input" type="time" />
            </label>
            <label className="label">
              Bairro
              <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value as Neighborhood)} className="input">
                {neighborhoods.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Diária base
              <input value={dailyValue} onChange={(event) => setDailyValue(Number(event.target.value || 0))} className="input" min={1} type="number" />
            </label>
            <label className="label md:col-span-2">
              Local completo
              <input value={location} onChange={(event) => setLocation(event.target.value)} className="input" placeholder="Endereço do salão, casa de eventos ou residência" />
            </label>
            <label className="label">
              Pagamento
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="input">
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Transferência</option>
                <option>A combinar</option>
              </select>
            </label>
          </div>
        </div>

        <aside className="grid gap-3">
          <Metric icon={<UsersRound />} label="Profissionais na equipe" value={totalProfessionals} />
          <Metric icon={<ClipboardList />} label="Funções com vagas" value={requestedFunctions.length} />
          <Metric icon={<Star />} label="Diária base" value={formatCurrency(dailyValue)} />
        </aside>
      </section>

      <section className="card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-navy-950">Equipe necessária</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">Ajuste quantas pessoas você precisa em cada função.</p>
          </div>
          <button type="button" onClick={applySuggestion} className="secondary">
            <CheckCircle2 size={17} /> Sugerir equipe
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {eventFunctions.map((item) => (
            <label key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm font-black text-navy-950">{item}</span>
              <span className="mt-2 flex items-center gap-2">
                <input
                  value={needs[item]}
                  onChange={(event) => updateNeed(item, Number(event.target.value || 0))}
                  className="input"
                  min={0}
                  type="number"
                />
                <small className="w-24 text-xs font-bold text-slate-500">
                  {availableByFunction[item] ?? 0} disponível{(availableByFunction[item] ?? 0) === 1 ? "" : "is"}
                </small>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={createEventJobs} className="primary">
            <Plus size={17} /> Criar vagas do evento
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-navy-950">
            <Search size={17} /> Ver profissionais por função
          </div>
          <div className="grid gap-2">
            {eventFunctions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedFunction(item)}
                className={`flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm font-black transition ${
                  selectedFunction === item ? "border-aqua-200 bg-aqua-50 text-aqua-800" : "border-slate-200 bg-white text-navy-950 hover:bg-slate-50"
                }`}
              >
                <span>{item}</span>
                <span>{realWorkers.filter((worker) => Boolean(getFunctionExperience(worker, item))).length}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Disponiveis</p>
              <h3 className="text-xl font-black text-navy-950">{selectedFunction}</h3>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
              <MapPin size={16} /> Ordenado por confiabilidade
            </p>
          </div>
          {selectedWorkers.length === 0 ? (
            <EmptyState title="Nenhum profissional nesta função" text="Quando trabalhadores completarem o perfil com essa profissão, eles aparecerão aqui." />
          ) : (
            <div className="grid gap-4 2xl:grid-cols-2">
              {selectedWorkers.slice(0, 8).map((worker) => (
                <WorkerOption key={worker.id} worker={worker} functionFocus={selectedFunction} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return (
    <article className="card p-4">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <strong className="block text-2xl font-black text-navy-950">{value}</strong>
      <span className="text-sm font-semibold text-slate-500">{label}</span>
    </article>
  );
}

function WorkerOption({ worker, functionFocus }: { worker: WorkerProfile; functionFocus: JobFunction }) {
  const reliability = calculateReliability(worker);
  return (
    <div className="grid gap-2">
      <WorkerCard worker={worker} showActions={false} functionFocus={functionFocus} />
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="metric-tile">
          <strong className="block text-navy-950">{worker.rating.toFixed(1)}</strong>
          <span className="text-slate-500">nota</span>
        </span>
        <span className="metric-tile">
          <strong className="block text-navy-950">{worker.completedJobs}</strong>
          <span className="text-slate-500">trabalhos</span>
        </span>
        <span className="metric-tile bg-aqua-50">
          <strong className="block text-navy-950">{reliability}%</strong>
          <span className="text-slate-600">confiavel</span>
        </span>
      </div>
    </div>
  );
}
