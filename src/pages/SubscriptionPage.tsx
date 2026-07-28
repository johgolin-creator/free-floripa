import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, Lock, Search, ShieldCheck, Star, WalletCards, Zap } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatDate } from "../lib/format";

const freeBenefits = [
  "Criar perfil de trabalhador",
  "Ver previa das vagas abertas",
  "Acompanhar candidaturas ja enviadas",
  "Receber avaliacoes no historico"
];

const professionalBenefits = [
  "Ver descricao completa da vaga",
  "Liberar requisitos, beneficios e detalhes protegidos",
  "Enviar candidaturas ilimitadas",
  "Acessar contato apos aprovacao",
  "Prioridade em melhorias futuras do app"
];

export function SubscriptionPage() {
  const { state, subscribeProfessional } = useAppStore();
  const [message, setMessage] = useState("");
  const isProfessional = state.subscription.plan === "Profissional";

  function handleSubscribe() {
    subscribeProfessional();
    setMessage("Plano profissional ativado. As vagas completas foram liberadas.");
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Planos"
        title="Assinatura Free Floripa"
        description="Controle seu acesso as vagas completas, candidaturas e recursos profissionais do app."
        action={<Link to="/app/vagas" className="secondary"><Search size={17} /> Ver vagas</Link>}
      />

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="badge bg-aqua-50 text-aqua-700">
              <CreditCard size={15} /> Plano atual: {state.subscription.plan}
            </span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-navy-950 md:text-4xl">
              {isProfessional ? "Seu acesso profissional esta ativo" : "Libere vagas completas e candidaturas ilimitadas"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              O plano gratuito permite conhecer as oportunidades. O profissional libera os dados completos da vaga para voce decidir melhor e se candidatar.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <PlanStat icon={<Lock size={18} />} label="Vaga completa" value={isProfessional ? "Liberada" : "Bloqueada"} />
              <PlanStat icon={<WalletCards size={18} />} label="Candidaturas" value={isProfessional ? "Ilimitadas" : "Bloqueadas"} />
              <PlanStat icon={<BadgeCheck size={18} />} label="Renovacao" value={formatDate(state.subscription.renewalDate)} />
            </div>
          </div>

          <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy-950 text-aqua-300">
              <Star size={22} />
            </span>
            <h3 className="mt-4 text-2xl font-black text-navy-950">Profissional</h3>
            <div className="mt-2 flex items-end gap-1">
              <strong className="text-4xl font-black text-navy-950">R$ 14,90</strong>
              <span className="pb-1 text-sm font-black text-slate-500">/mes</span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Para quem quer trabalhar com mais previsibilidade e ver todas as informacoes antes de se candidatar.
            </p>
            <button type="button" onClick={handleSubscribe} disabled={isProfessional} className="primary mt-5 w-full">
              {isProfessional ? <CheckCircle2 size={17} /> : <Zap size={17} />}
              {isProfessional ? "Plano ativo" : "Assinar agora"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PlanCard
          title="Gratuito"
          price="R$ 0"
          description="Bom para criar perfil e conhecer o app."
          current={!isProfessional}
          benefits={freeBenefits}
          action={<Link to="/app/vagas" className="secondary w-full"><Search size={17} /> Ver previas</Link>}
        />
        <PlanCard
          featured
          title="Profissional"
          price="R$ 14,90"
          description="Feito para quem quer ver vagas completas e se candidatar sem limite."
          current={isProfessional}
          benefits={professionalBenefits}
          action={
            isProfessional ? (
              <Link to="/app/vagas" className="primary w-full">Buscar vagas completas <ArrowRight size={17} /></Link>
            ) : (
              <button type="button" onClick={handleSubscribe} className="primary w-full">Assinar profissional <ArrowRight size={17} /></button>
            )
          }
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Feature icon={<ShieldCheck />} title="Mais seguranca" text="O freelancer decide com mais informacao antes de se candidatar." />
        <Feature icon={<CreditCard />} title="Pagamento real depois" text="Hoje o MVP ativa o plano. Depois conectamos Mercado Pago, Stripe ou outro provedor." />
        <Feature icon={<Zap />} title="Mais conversao" text="A tela explica o valor do plano antes do bloqueio, sem deixar o usuario perdido." />
      </section>
    </div>
  );
}

function PlanStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 text-aqua-700">{icon}</div>
      <strong className="block text-sm text-navy-950">{value}</strong>
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
    </div>
  );
}

function PlanCard({
  title,
  price,
  description,
  benefits,
  action,
  current,
  featured = false
}: {
  title: string;
  price: string;
  description: string;
  benefits: string[];
  action: ReactNode;
  current: boolean;
  featured?: boolean;
}) {
  return (
    <article className={`card grid gap-4 p-5 ${featured ? "border-aqua-200 bg-aqua-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="badge">{current ? "Plano atual" : "Opcao"}</span>
          <h3 className="mt-3 text-2xl font-black text-navy-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{description}</p>
        </div>
        <strong className="rounded-lg bg-white px-3 py-2 text-lg font-black text-navy-950 shadow-sm">{price}</strong>
      </div>
      <div className="grid gap-2">
        {benefits.map((benefit) => (
          <span key={benefit} className="flex items-start gap-2 text-sm font-semibold text-slate-600">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-aqua-700" /> {benefit}
          </span>
        ))}
      </div>
      {action}
    </article>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="card p-4">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <h3 className="font-black text-navy-950">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
    </article>
  );
}
