import { ArrowRight, BriefcaseBusiness, CheckCircle2, ShieldCheck, Smartphone, UsersRound, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { functions } from "../data/demoData";
import { JobCard } from "../components/JobCard";
import { useAppStore } from "../lib/store";

export function PublicHome() {
  const { state, setRole } = useAppStore();
  const recentJobs = state.jobs.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-aqua-300 font-black text-navy-950">FF</div>
            <div>
              <strong className="block text-lg text-navy-950">Free Floripa</strong>
              <span className="text-xs font-semibold text-slate-500">A equipe que você precisa, quando você precisa.</span>
            </div>
          </Link>
          <div className="flex gap-2">
            <Link to="/login" className="secondary hidden sm:inline-flex">
              Login
            </Link>
            <Link to="/cadastro-empresa" className="primary">
              Cadastro
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-navy-950 text-white">
          <img
            src="https://images.unsplash.com/photo-1532634896-26909d0d4b4f?auto=format&fit=crop&w=1800&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-28"
          />
          <div className="relative mx-auto grid min-h-[620px] max-w-7xl content-center gap-8 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-aqua-100">
                <Waves size={17} /> Temporada de verão em Florianópolis
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Encontre trabalho. Monte sua equipe. Sem depender de grupos de WhatsApp.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
                Free Floripa conecta empresas a profissionais temporários para turnos, diárias e eventos com cadastro rápido,
                candidaturas organizadas e confirmação segura.
              </p>
              <div className="mt-7 grid gap-3 sm:flex">
                <Link to="/cadastro-trabalhador" onClick={() => setRole("trabalhador")} className="primary">
                  Quero trabalhar <ArrowRight size={18} />
                </Link>
                <Link to="/cadastro-empresa" onClick={() => setRole("empresa")} className="secondary bg-white/95">
                  Quero contratar
                </Link>
              </div>
            </div>

            <div className="card bg-white/95 p-4 text-navy-950">
              <h2 className="mb-3 text-xl font-black">Vagas recentes</h2>
              <div className="grid gap-3">
                {recentJobs.map((job) => (
                  <JobCard key={job.id} job={job} compact />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["1", "Empresa publica a vaga", "Informe função, data, horário, valor e bairro em poucos minutos."],
              ["2", "Trabalhadores se candidatam", "Profissionais veem detalhes, vagas restantes e se candidatam rapidamente."],
              ["3", "Confirmação organizada", "Aprovação, check-in, check-out e avaliações ficam registrados no app."]
            ].map(([step, title, text]) => (
              <article key={step} className="card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-aqua-100 font-black text-aqua-700">{step}</span>
                <h3 className="mt-4 font-black text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-aqua-700">Profissões</p>
              <h2 className="text-2xl font-black text-navy-950">Categorias de profissionais</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {functions.map((item) => (
              <div key={item} className="card p-4 text-sm font-black text-navy-950">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-2">
            <BenefitBlock
              icon={<BriefcaseBusiness />}
              title="Benefícios para empresas"
              items={["Reposição urgente", "Candidatos organizados", "Profissionais favoritos", "Histórico de contratações"]}
            />
            <BenefitBlock
              icon={<UsersRound />}
              title="Benefícios para trabalhadores"
              items={["Vagas próximas", "Candidatura rápida", "Créditos gratuitos mensais", "Histórico e avaliações"]}
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={<ShieldCheck />} title="Contato protegido" text="Telefone e endereço completo aparecem somente após confirmação." />
            <Feature icon={<Smartphone />} title="Mobile primeiro" text="Interface preparada para usar no celular durante a operação." />
            <Feature icon={<CheckCircle2 />} title="Confiabilidade" text="Índice simples considera comparecimento, pontualidade, trabalhos e avaliações." />
          </div>
        </section>
      </main>
    </div>
  );
}

function BenefitBlock({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <article className="card p-5">
      <div className="mb-4 flex items-center gap-3 text-aqua-700">
        {icon}
        <h3 className="text-xl font-black text-navy-950">{title}</h3>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <CheckCircle2 size={17} className="text-aqua-700" /> {item}
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
    </article>
  );
}
