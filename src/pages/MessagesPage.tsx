import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, MessageCircle, UserRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatDate, formatDateTime } from "../lib/format";
import type { Application, Job } from "../lib/types";

type Conversation = {
  application: Application;
  job: Job;
  title: string;
  subtitle: string;
  participant: string;
};

export function MessagesPage() {
  const { state, currentWorker, currentCompany, markChatConversationRead, sendChatMessage } = useAppStore();
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const conversations = useMemo(() => {
    const eligibleStatuses = ["Aprovada", "Trabalho concluído"] as Application["status"][];
    return state.applications
      .filter((application) => eligibleStatuses.includes(application.status))
      .map((application) => {
        const job = state.jobs.find((item) => item.id === application.jobId);
        if (!job) return null;
        if (state.activeRole === "empresa" && job.companyId !== currentCompany.id) return null;
        if (state.activeRole === "trabalhador" && application.workerId !== currentWorker.id) return null;

        const worker = state.workers.find((item) => item.id === application.workerId);
        const company = state.companies.find((item) => item.id === job.companyId);
        if (!worker || !company) return null;

        return {
          application,
          job,
          title: job.title,
          subtitle: `${formatDate(job.date)} - ${job.startsAt} às ${job.endsAt}`,
          participant: state.activeRole === "empresa" ? worker.name : company.establishmentName
        };
      })
      .filter((item): item is Conversation => Boolean(item))
      .sort((a, b) => `${b.job.date} ${b.job.startsAt}`.localeCompare(`${a.job.date} ${a.job.startsAt}`));
  }, [currentCompany.id, currentWorker.id, state.activeRole, state.applications, state.companies, state.jobs, state.workers]);

  const selected = conversations.find((conversation) => conversation.application.id === selectedId) ?? conversations[0];
  const messages = selected
    ? (state.chatMessages ?? [])
        .filter((item) => item.applicationId === selected.application.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  useEffect(() => {
    if (selected) markChatConversationRead(selected.application.id);
  }, [markChatConversationRead, selected]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const result = sendChatMessage(selected.application.id, message);
    setFeedback(result.message);
    if (result.ok) setMessage("");
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Mensagens"
        title="Chat interno"
        description="Converse dentro do Free Floripa depois que a candidatura for aprovada."
      />

      {feedback && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{feedback}</div>}

      {conversations.length === 0 ? (
        <EmptyState title="Nenhuma conversa liberada" text="O chat fica disponível quando uma candidatura é aprovada." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="smart-panel">
            <div className="smart-panel-head">
              <h3>Conversas</h3>
              <span>{conversations.length}</span>
            </div>
            <div className="grid gap-2">
              {conversations.map((conversation) => {
                const unread = (state.chatMessages ?? []).filter(
                  (item) =>
                    item.applicationId === conversation.application.id &&
                    item.senderRole !== state.activeRole &&
                    (state.activeRole === "empresa" ? !item.readByCompany : !item.readByWorker)
                ).length;
                return (
                  <button
                    key={conversation.application.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.application.id)}
                    className={`smart-action-item text-left ${selected?.application.id === conversation.application.id ? "border-aqua-200 bg-aqua-50 text-aqua-700" : ""}`}
                  >
                    <MessageCircle size={17} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-navy-950">{conversation.participant}</strong>
                      <small className="block truncate text-xs font-bold text-slate-500">{conversation.title}</small>
                    </span>
                    {unread > 0 && <span className="badge bg-aqua-100 text-aqua-700">{unread}</span>}
                  </button>
                );
              })}
            </div>
          </aside>

          {selected && (
            <section className="smart-panel min-h-[620px]">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-aqua-700">
                    <UserRound size={17} /> {selected.participant}
                  </div>
                  <h3 className="mt-1 text-xl font-black text-navy-950">{selected.title}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <CalendarDays size={15} /> {selected.subtitle}
                  </p>
                </div>
                <span className="badge bg-aqua-50 text-aqua-700">
                  <CheckCircle2 size={14} /> {selected.application.status}
                </span>
              </div>

              <div className="grid max-h-[440px] gap-2 overflow-auto pr-1">
                {messages.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    Nenhuma mensagem ainda. Envie a primeira combinação do turno por aqui.
                  </div>
                ) : (
                  messages.map((item) => {
                    const mine = item.senderRole === state.activeRole;
                    return (
                      <div key={item.id} className={`grid ${mine ? "justify-items-end" : "justify-items-start"}`}>
                        <div className={`max-w-[82%] rounded-lg p-3 ${mine ? "bg-navy-950 text-white" : "bg-slate-50 text-navy-950"}`}>
                          <strong className="block text-xs">{item.senderName}</strong>
                          <p className="mt-1 text-sm font-semibold leading-6">{item.body}</p>
                          <span className={`mt-2 block text-[0.68rem] font-bold ${mine ? "text-slate-300" : "text-slate-500"}`}>
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="mt-auto grid gap-2 border-t border-slate-100 pt-3 md:grid-cols-[1fr_auto]" onSubmit={submit}>
                <label className="sr-only" htmlFor="chat-message">Mensagem</label>
                <textarea
                  id="chat-message"
                  className="input min-h-24 py-3"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Combine horário, entrada, uniforme ou qualquer detalhe do turno."
                />
                <button type="submit" className="primary self-stretch">
                  <MessageCircle size={17} /> Enviar
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
