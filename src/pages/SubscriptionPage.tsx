import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
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

const freeBenefits = [
  "Criar perfil e manter histórico",
  "Ver prévias das vagas abertas",
  "Receber moedas iniciais para testar",
  "Receber avaliações no perfil"
];

const professionalBenefits = [
  "20 moedas no saldo",
  "Liberar vagas completas conforme usar",
  "Enviar candidaturas com controle de saldo",
  "Pagar somente quando precisar",
  "Bom para quem pega diárias aos poucos"
];

const plusBenefits = [
  "35 moedas no saldo",
  "Mais custo-benefício por pacote",
  "Ideal para quem se candidata com frequência",
  "Preparado para destaques e recursos premium",
  "Mais fôlego para vagas urgentes"
];

const unlockItems = [
  "Endereço e detalhes completos",
  "Requisitos e benefícios",
  "Candidatura liberada",
  "Histórico organizado"
];

export function SubscriptionPage() {
  const { state, subscribeProfessional, subscribePlus } = useAppStore();
  const [message, setMessage] = useState("");
  const isProfessional = state.subscription.plan === "Profissional";
  const isPlus = state.subscription.plan === "Plus";

  function handleSubscribe() {
    subscribeProfessional();
    setMessage("Pacote Profissional comprado. 20 moedas foram adicionadas ao seu saldo.");
  }

  function handleSubscribePlus() {
    subscribePlus();
    setMessage("Pacote Plus comprado. 35 moedas foram adicionadas ao seu saldo.");
  }

  return (
    <div className="grid gap-5">
      <SectionHeader
        eyebrow="Moedas"
        title="Compre moedas e use quando precisar"
        description="Use moedas para liberar vagas completas e enviar candidaturas sem mensalidade fixa."
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
            <CreditCard size={15} /> Saldo: {state.subscription.creditsRemaining} moeda(s)
          </span>
          <h2>Pague por uso, sem travar em mensalidade</h2>
          <p>
            O gratuito deixa você conhecer as oportunidades. As moedas liberam a vaga inteira e a candidatura apenas quando você decidir usar.
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
            <strong>R$ 19,90</strong>
            <span>20 moedas</span>
          </div>
          <p>Ideal para quem quer testar o fluxo e se candidatar com mais segurança.</p>
          <button type="button" onClick={handleSubscribe} className="primary w-full">
            <Zap size={17} />
            Comprar 20 moedas
          </button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <PlanStat icon={<WalletCards size={18} />} label="Saldo atual" value={`${state.subscription.creditsRemaining} moeda(s)`} />
        <PlanStat icon={<Lock size={18} />} label="Desbloqueio de vaga" value="1 moeda" />
        <PlanStat icon={<CreditCard size={18} />} label="Candidatura" value="1 moeda" />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlanCard
          title="Gratuito"
          price="R$ 0"
          description="Para criar perfil, conhecer o app e ver prévias."
          current={state.subscription.plan === "Gratuito"}
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
          price="R$ 19,90"
          description="Pacote com 20 moedas para liberar vagas e candidaturas."
          current={isProfessional}
          benefits={professionalBenefits}
          action={
            isProfessional ? (
              <Link to="/app/vagas" className="primary w-full">
                Usar moedas <ArrowRight size={17} />
              </Link>
            ) : (
              <button type="button" onClick={handleSubscribe} className="primary w-full">
                Comprar 20 moedas <ArrowRight size={17} />
              </button>
            )
          }
        />
        <PlanCard
          title="Plus"
          price="R$ 29,90"
          description="Pacote com 35 moedas para quem usa o app com mais frequência."
          current={isPlus}
          benefits={plusBenefits}
          action={
            isPlus ? (
              <Link to="/app/vagas" className="primary w-full">
                Usar moedas <ArrowRight size={17} />
              </Link>
            ) : (
              <button type="button" onClick={handleSubscribePlus} className="primary w-full">
                Comprar 35 moedas <ArrowRight size={17} />
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
            Nesta fase, o botão adiciona moedas dentro do app para teste. Depois conectamos Mercado Pago, Stripe ou outro provedor de pagamento.
          </p>
        </div>
        <div className="plan-note-list">
          <Feature icon={<ShieldCheck />} title="Dados protegidos" text="Detalhes sensíveis aparecem só quando o fluxo permite." />
          <Feature icon={<BadgeCheck />} title="Decisão melhor" text="O trabalhador paga para ver detalhes quando a vaga fizer sentido." />
          <Feature icon={<Zap />} title="Sem mensalidade" text="A pessoa compra moedas e usa conforme a necessidade." />
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
          <span className="badge">{current ? "Pacote atual" : "Opção"}</span>
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
