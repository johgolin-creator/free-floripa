import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Lock,
  Search,
  ShieldCheck,
  Star,
  WalletCards,
  Zap
} from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";
import { formatDate } from "../lib/format";

const freeBenefits = [
  "Criar perfil e manter histórico",
  "Ver prévias das vagas abertas",
  "Acompanhar candidaturas já enviadas",
  "Receber avaliações no perfil"
];

const professionalBenefits = [
  "Ver descrição completa da vaga",
  "Liberar requisitos, benefícios e dados protegidos",
  "Enviar candidaturas sem limite",
  "Acessar contato após aprovação",
  "Mais clareza antes de aceitar um turno"
];

const unlockItems = [
  "Endereço e detalhes completos",
  "Requisitos e benefícios",
  "Candidatura liberada",
  "Histórico organizado"
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
        title="Desbloqueie as vagas completas"
        description="Veja tudo antes de se candidatar: descrição, requisitos, benefícios, dados protegidos e candidatura."
        action={
          <Link to="/app/vagas" className="secondary">
            <Search size={17} /> Ver vagas
          </Link>
        }
      />

      {message && <div className="rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}

      <section className="plan-hero">
        <div className="plan-hero-copy">
          <span className="badge bg-aqua-50 text-aqua-700">
            <CreditCard size={15} /> Plano atual: {state.subscription.plan}
          </span>
          <h2>{isProfessional ? "Você já está com acesso completo" : "Trabalhe com mais informação e menos surpresa"}</h2>
          <p>
            O plano gratuito deixa você conhecer as oportunidades. O profissional mostra a vaga inteira e libera a candidatura para você escolher melhor onde vale a pena ir.
          </p>
          <div className="plan-unlock-grid">
            {unlockItems.map((item) => (
              <span key={item}>
                <CheckCircle2 size={17} /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="plan-price-card">
          <span className="plan-star">
            <Star size={22} />
          </span>
          <h3>Profissional</h3>
          <div className="plan-price">
            <strong>R$ 14,90</strong>
            <span>/mês</span>
          </div>
          <p>Ideal para quem quer se candidatar com segurança e acompanhar tudo pelo celular.</p>
          <button type="button" onClick={handleSubscribe} disabled={isProfessional} className="primary w-full">
            {isProfessional ? <CheckCircle2 size={17} /> : <Zap size={17} />}
            {isProfessional ? "Plano ativo" : "Assinar agora"}
          </button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <PlanStat icon={<Lock size={18} />} label="Vaga completa" value={isProfessional ? "Liberada" : "Bloqueada"} />
        <PlanStat icon={<WalletCards size={18} />} label="Candidaturas" value={isProfessional ? "Sem limite" : `${state.subscription.creditsRemaining} crédito(s)`} />
        <PlanStat icon={<Clock3 size={18} />} label="Renovação" value={formatDate(state.subscription.renewalDate)} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <PlanCard
          title="Gratuito"
          price="R$ 0"
          description="Para criar perfil, conhecer o app e ver prévias."
          current={!isProfessional}
          benefits={freeBenefits}
          action={
            <Link to="/app/vagas" className="secondary w-full">
              <Search size={17} /> Ver prévias
            </Link>
          }
        />
        <PlanCard
          featured
          title="Profissional"
          price="R$ 14,90"
          description="Para ver vagas completas e se candidatar com mais confiança."
          current={isProfessional}
          benefits={professionalBenefits}
          action={
            isProfessional ? (
              <Link to="/app/vagas" className="primary w-full">
                Buscar vagas completas <ArrowRight size={17} />
              </Link>
            ) : (
              <button type="button" onClick={handleSubscribe} className="primary w-full">
                Assinar profissional <ArrowRight size={17} />
              </button>
            )
          }
        />
      </section>

      <section className="plan-note">
        <div>
          <span className="badge bg-white text-aqua-700">
            <ShieldCheck size={15} /> MVP
          </span>
          <h3>Pagamento real entra depois</h3>
          <p>
            Nesta fase, o botão ativa o plano dentro do app para teste. Depois conectamos Mercado Pago, Stripe ou outro provedor de pagamento.
          </p>
        </div>
        <div className="plan-note-list">
          <Feature icon={<ShieldCheck />} title="Dados protegidos" text="Detalhes sensíveis aparecem só quando o fluxo permite." />
          <Feature icon={<BadgeCheck />} title="Decisão melhor" text="O trabalhador entende a vaga antes de se candidatar." />
          <Feature icon={<Zap />} title="Conversão clara" text="A pessoa sabe exatamente o que está desbloqueando." />
        </div>
      </section>
    </div>
  );
}

function PlanStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
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
    <article className={`plan-card ${featured ? "plan-card-featured" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="badge">{current ? "Plano atual" : "Opção"}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <strong className="plan-card-price">{price}</strong>
      </div>
      <div className="grid gap-2">
        {benefits.map((benefit) => (
          <span key={benefit} className="plan-benefit">
            <CheckCircle2 size={17} /> {benefit}
          </span>
        ))}
      </div>
      {action}
    </article>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="plan-mini-feature">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}
