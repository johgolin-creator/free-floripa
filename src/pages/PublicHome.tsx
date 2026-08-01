import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  LogIn,
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
    <div className="min-h-screen bg-ice">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="min-w-0">
            <BrandLogo compact />
          </Link>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-navy-900 shadow-sm transition hover:bg-slate-50"
            >
              <LogIn size={17} /> Entrar
            </Link>
            <Link
              to="/app"
              className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-aqua-200 bg-aqua-50 px-4 text-sm font-black text-aqua-700 shadow-sm transition hover:bg-aqua-100 lg:inline-flex"
            >
              <Smartphone size={17} /> Abrir app
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
        <section className="hero-section relative overflow-hidden bg-navy-950 text-white">
          <img
            src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1900&q=80"
            alt=""
            className="hero-bg absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="hero-overlay absolute inset-0" />
          <div className="hero-content relative mx-auto grid min-h-[560px] max-w-7xl content-center gap-5 px-4 py-10">
            <img src={logoUrl} alt="Free Floripa" className="hero-brand-logo" />
            <div className="hero-text max-w-4xl">
              <div className="hero-badge mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-black text-aqua-100 shadow-soft backdrop-blur">
                <Waves size={17} /> Florianópolis pronta para turnos, diárias e eventos
              </div>
              <h1 className="hero-title max-w-3xl text-5xl font-black leading-tight md:text-7xl">Free Floripa</h1>
              <p className="hero-copy mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-200 md:text-lg">
                A plataforma para empresas encontrarem mão de obra temporária com mais organização, histórico e nível de experiência por função.
              </p>
              <div className="hero-actions mt-6 grid gap-3 sm:flex">
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <LogIn size={17} /> Entrar
                </Link>
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

        <section className="home-entry-section">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 md:grid-cols-4">
            <EntryCard
              icon={<LogIn size={20} />}
              title="Já tenho conta"
              text="Entrar como freelancer ou empresa usando e-mail e senha."
              to="/login"
              label="Entrar"
            />
            <EntryCard
              icon={<Smartphone size={20} />}
              title="Abrir meu painel"
              text="Ir direto para o app instalado ou para a área logada no navegador."
              to="/app"
              label="Continuar"
            />
            <EntryCard
              icon={<UsersRound size={20} />}
              title="Sou freelancer"
              text="Criar perfil com profissão, nível de experiência, bairro e disponibilidade."
              to="/cadastro-trabalhador"
              label="Criar perfil"
              onClick={() => setRole("trabalhador")}
            />
            <EntryCard
              icon={<BriefcaseBusiness size={20} />}
              title="Sou empresa"
              text="Cadastrar estabelecimento para publicar vagas, montar escala e aprovar candidatos."
              to="/cadastro-empresa"
              label="Cadastrar empresa"
              onClick={() => setRole("empresa")}
            />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-3">
            <Metric value="Profissional" label="libera vaga completa" />
            <Metric value="3 min" label="para publicar uma vaga" />
            <Metric value="por função" label="nível de experiência" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14">
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

        <section className="bg-white/80">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
            {[
              ["1", "Vaga com critério", "A empresa informa função, valor, horário, bairro e experiência esperada."],
              ["2", "Candidatura transparente", "O trabalhador aparece com nível por profissão e indicação se aceita auxiliar."],
              ["3", "Equipe confirmada", "Aprovação, check-in, check-out e avaliações ficam organizados no histórico."]
            ].map(([step, title, text]) => (
              <article key={step} className="card p-5 hover:-translate-y-0.5 hover:shadow-lift">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-950 font-black text-aqua-300">{step}</span>
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
              <div key={item} className="flex min-h-20 items-center rounded-lg border border-white bg-white p-4 text-sm font-black text-navy-950 shadow-soft transition hover:-translate-y-0.5 hover:border-aqua-200 hover:bg-aqua-50">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section text-white">
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
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm font-semibold text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>Free Floripa - plataforma para turnos, diárias e eventos.</span>
          <div className="flex flex-wrap gap-3">
            <Link to="/termos" className="font-black text-navy-950 hover:text-aqua-700">Termos de Uso</Link>
            <Link to="/privacidade" className="font-black text-navy-950 hover:text-aqua-700">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EntryCard({
  icon,
  title,
  text,
  to,
  label,
  onClick
}: {
  icon: ReactNode;
  title: string;
  text: string;
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link to={to} onClick={onClick} className="home-entry-card">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <em>{label} <ArrowRight size={15} /></em>
    </Link>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white bg-white p-4 shadow-soft">
      <strong className="block text-2xl font-black text-navy-950">{value}</strong>
      <span className="mt-1 block text-sm font-black text-aqua-700">{label}</span>
    </div>
  );
}

function BenefitBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-soft backdrop-blur">
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
    <article className="card p-5 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="mb-3 text-aqua-700">{icon}</div>
      <h3 className="font-black text-navy-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-aqua-700">
        <BadgeCheck size={14} /> Free Floripa
      </span>
    </article>
  );
}
