import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Waves
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logoUrl from "../assets/free-floripa-logo.jpg?inline";
import { BrandLogo } from "../components/BrandLogo";
import { JobCard } from "../components/JobCard";
import { functions } from "../data/demoData";
import { useAppStore } from "../lib/store";

export function PublicHome() {
  const { state, setRole } = useAppStore();
  const recentJobs = state.jobs.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="min-w-0">
            <BrandLogo compact />
          </Link>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/login"
              className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-navy-900 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
            >
              Login
            </Link>
            <Link
              to="/cadastro-trabalhador"
              onClick={() => setRole("trabalhador")}
              className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-navy-900 shadow-sm transition hover:bg-slate-50 md:inline-flex"
            >
              Trabalhar
            </Link>
            <Link to="/cadastro-empresa" onClick={() => setRole("empresa")} className="primary">
              Contratar
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-navy-950 text-white">
          <img
            src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1900&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-navy-950/55" />
          <div className="relative mx-auto grid min-h-[430px] max-w-7xl content-center gap-4 px-4 py-8">
            <img src={logoUrl} alt="Free Floripa" className="h-auto w-full max-w-[230px] rounded-lg bg-white p-3 shadow-soft md:max-w-[280px]" />
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-aqua-100">
                <Waves size={17} /> Florianópolis pronta para turnos, diárias e eventos
              </div>
              <h1 className="text-4xl font-black leading-tight md:text-5xl">Free Floripa</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
                A plataforma para empresas encontrarem mão de obra temporária com mais organização, histórico e nível de experiência por função.
              </p>
              <div className="mt-6 grid gap-3 sm:flex">
                <Link to="/cadastro-empresa" onClick={() => setRole("empresa")} className="primary">
                  Publicar vaga <ArrowRight size={18} />
                </Link>
                <Link to="/cadastro-trabalhador" onClick={() => setRole("trabalhador")} className="secondary bg-white/95">
                  Quero trabalhar
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-3">
            <Metric value="5" label="candidaturas grátis por mês" />
            <Metric value="3 min" label="para publicar uma vaga" />
            <Metric value="por função" label="nível de experiência" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-aqua-700">Vagas abertas</p>
              <h2 className="text-2xl font-black text-navy-950">Oportunidades recentes</h2>
            </div>
            <Link to="/app/vagas" onClick={() => setRole("trabalhador")} className="secondary">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {recentJobs.map((job) => (
              <JobCard key={job.id} job={job} compact />
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
            {[
              ["1", "Vaga com critério", "A empresa informa função, valor, horário, bairro e experiência esperada."],
              ["2", "Candidatura transparente", "O trabalhador aparece com nível por profissão e indicação se aceita auxiliar."],
              ["3", "Equipe confirmada", "Aprovação, check-in, check-out e avaliações ficam organizados no histórico."]
            ].map(([step, title, text]) => (
              <article key={step} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-aqua-100 font-black text-aqua-700">{step}</span>
                <h3 className="mt-4 font-black text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase text-aqua-700">Profissões</p>
            <h2 className="text-2xl font-black text-navy-950">Categorias de profissionais</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {functions.map((item) => (
              <div key={item} className="flex min-h-20 items-center rounded-lg border border-slate-200 bg-white p-4 text-sm font-black text-navy-950 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-navy-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-2">
            <BenefitBlock
              icon={<BriefcaseBusiness />}
              title="Para empresas"
              items={["Reposição urgente", "Candidatos por nível", "Favoritos", "Histórico de contratações"]}
            />
            <BenefitBlock
              icon={<UsersRound />}
              title="Para trabalhadores"
              items={["Vagas próximas", "Perfil por profissão", "Candidatura rápida", "Avaliações no histórico"]}
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={<ShieldCheck />} title="Contato protegido" text="Telefone e endereço completo aparecem somente após confirmação." />
            <Feature icon={<ClipboardCheck />} title="Experiência declarada" text="Cada profissão tem nível próprio para reduzir candidaturas fora do perfil." />
            <Feature icon={<Smartphone />} title="Mobile primeiro" text="Interface preparada para publicar, aprovar e acompanhar pelo celular." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <strong className="block text-2xl font-black text-aqua-700">{value}</strong>
      <span className="mt-1 block text-sm font-semibold text-slate-600">{label}</span>
    </div>
  );
}

function BenefitBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-3 text-aqua-300">
        {icon}
        <h3 className="text-xl font-black text-white">{title}</h3>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <CheckCircle2 size={17} className="text-aqua-300" /> {item}
          </span>
        ))}
      </div>
    </article>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="card p-5">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <h3 className="font-black text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-aqua-700">
        <BadgeCheck size={14} /> Free Floripa
      </span>
    </article>
  );
}
