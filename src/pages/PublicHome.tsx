import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Download,
  Flame,
  Heart,
  LogIn,
  MapPin,
  PartyPopper,
  PlusSquare,
  Share,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Waves,
  X
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo, PontMark } from "../components/BrandLogo";
import { functions } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { usePwaInstallPrompt } from "../lib/pwaInstall";

export function PublicHome() {
  const { setRole } = useAppStore();
  const [showIos, setShowIos] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const { canInstall, promptInstall } = usePwaInstallPrompt();

  async function handleInstallAndroid() {
    const outcome = canInstall ? await promptInstall() : null;
    if (!outcome) setShowAndroidHelp(true);
  }

  return (
    <div className="min-h-screen bg-ice">
      {showIos && <IosInstallModal onClose={() => setShowIos(false)} />}
      {showAndroidHelp && <AndroidInstallModal onClose={() => setShowAndroidHelp(false)} />}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-charcoal/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="min-w-0">
            <BrandLogo compact />
          </Link>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-brand-charcoal px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/5"
            >
              <LogIn size={17} /> Entrar
            </Link>
            <Link
              to="/cadastro-trabalhador"
              onClick={() => setRole("trabalhador")}
              className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-brand-charcoal px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/5 md:inline-flex"
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
          <div className="hero-content public-hero-content relative mx-auto grid min-h-[620px] max-w-7xl content-center gap-8 px-4 py-10">
            <div className="max-w-4xl">
              <PontMark className="hero-brand-logo" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm font-black text-aqua-300 shadow-soft backdrop-blur">
                <Waves size={17} /> Florianópolis pronta para turnos, diárias e eventos
              </div>
              <h1 className="hero-title max-w-3xl text-5xl font-black leading-tight md:text-7xl">PONT</h1>
              <p className="hero-copy mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-300 md:text-lg">
                Conecta empresas de Florianópolis a freelancers para turnos, diárias e eventos. Empresa publica a
                vaga com valor e horário, freelancer se candidata e ambos acompanham tudo pelo app — do primeiro
                turno até o pagamento.
              </p>
              <div className="hero-actions mt-6 grid gap-3 sm:flex">
                <Link to="/cadastro-trabalhador" onClick={() => setRole("trabalhador")} className="secondary">
                  Quero trabalhar
                </Link>
                <Link to="/cadastro-empresa" onClick={() => setRole("empresa")} className="primary">
                  Publicar vaga <ArrowRight size={18} />
                </Link>
              </div>
            </div>
            <div className="phone-showcase" aria-label="Previa do aplicativo PONT">
              <PhoneMockup title="PONT" eyebrow="Ola, Gabriela!" variant="worker" />
              <PhoneMockup title="Beach Club Jurere" eyebrow="Vaga urgente" variant="job" featured />
              <PhoneMockup title="Painel da empresa" eyebrow="Beach Club Jurere" variant="company" />
              <PhoneMockup title="Criar evento" eyebrow="Casamento" variant="event" />
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-brand-dark">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-lg font-black text-white">Leve o PONT no celular</strong>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                Instale como app direto pelo navegador, sem loja de aplicativos nem arquivo para baixar —
                no Android e no iPhone. Também funciona pelo navegador, sem instalar nada.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleInstallAndroid}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-aqua-200 bg-aqua-50 px-4 text-sm font-black text-aqua-700 shadow-sm transition hover:bg-aqua-100"
              >
                <Download size={17} /> Instalar no Android
              </button>
              <button
                type="button"
                onClick={() => setShowIos(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-aqua-200 bg-aqua-50 px-4 text-sm font-black text-aqua-700 shadow-sm transition hover:bg-aqua-100"
              >
                <Smartphone size={17} /> Instalar no iPhone
              </button>
              <Link
                to="/app"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-brand-charcoal px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/5"
              >
                <Smartphone size={17} /> Abrir no navegador
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-brand-dark">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:grid-cols-3">
            <Metric value="Profissional" label="libera vaga completa" />
            <Metric value="3 min" label="para publicar uma vaga" />
            <Metric value="por função" label="nível de experiência" />
          </div>
        </section>

        <section className="bg-brand-dark">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <p className="text-xs font-black uppercase text-aqua-700">Passo a passo</p>
            <h2 className="mt-1 text-2xl font-black text-white">Como funciona</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["1", "Vaga com critério", "A empresa informa função, valor, horário, bairro e experiência esperada."],
                ["2", "Candidatura transparente", "O trabalhador aparece com nível de experiência por profissão."],
                ["3", "Equipe confirmada", "Aprovação, conclusão do turno e avaliações ficam organizadas no histórico."]
              ].map(([step, title, text]) => (
                <article key={step} className="card p-5 hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-950 font-black text-aqua-300">{step}</span>
                  <h3 className="mt-4 font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase text-aqua-700">Profissões</p>
            <h2 className="text-2xl font-black text-white">Categorias de profissionais</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {functions.map((item) => (
              <div key={item} className="flex min-h-20 items-center rounded-lg border border-white/10 bg-brand-charcoal p-4 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:border-aqua-200 hover:bg-aqua-50 hover:text-aqua-800">
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
      <footer className="border-t border-white/10 bg-brand-dark">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm font-semibold text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>PONT - plataforma para turnos, diárias e eventos.</span>
          <div className="flex flex-wrap gap-3">
            <Link to="/termos" className="font-black text-white hover:text-aqua-700">Termos de Uso</Link>
            <Link to="/privacidade" className="font-black text-white hover:text-aqua-700">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-brand-charcoal p-4 shadow-soft">
      <strong className="block text-2xl font-black text-white">{value}</strong>
      <span className="mt-1 block text-sm font-black text-aqua-700">{label}</span>
    </div>
  );
}

function PhoneMockup({
  title,
  eyebrow,
  variant,
  featured = false
}: {
  title: string;
  eyebrow: string;
  variant: "worker" | "job" | "company" | "event";
  featured?: boolean;
}) {
  return (
    <article className={`phone-mockup ${featured ? "is-featured" : ""}`}>
      <div className="phone-status">
        <span>9:41</span>
        <span>•••</span>
      </div>
      <div className="phone-app-head">
        <span>{eyebrow}</span>
        {variant === "job" ? <Heart size={16} /> : <BadgeCheck size={16} />}
      </div>
      <h3>{title}</h3>
      {variant === "worker" && (
        <>
          <div className="phone-search">Buscar vagas, locais ou empresas</div>
          <div className="phone-category-row">
            {["Garçom", "Bartender", "Limpeza", "Recepção"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="phone-job-card">
            <strong><Flame size={14} /> Beach Club Jurerê</strong>
            <small>Garçom • Hoje • R$ 180,00</small>
          </div>
        </>
      )}
      {variant === "job" && (
        <>
          <div className="phone-cover" />
          <div className="phone-detail-list">
            <span><CalendarDays size={14} /> Hoje, 18/05</span>
            <span><MapPin size={14} /> Jurerê Internacional</span>
            <span><UsersRound size={14} /> 6 vagas</span>
          </div>
          <button type="button">Candidatar-se</button>
        </>
      )}
      {variant === "company" && (
        <>
          <div className="phone-metric-grid">
            <span><strong>8</strong> vagas abertas</span>
            <span><strong>24</strong> equipe</span>
            <span><strong>56</strong> candidatos</span>
            <span><strong>1.250</strong> moedas</span>
          </div>
          <button type="button">+ Criar vaga</button>
        </>
      )}
      {variant === "event" && (
        <>
          <div className="phone-step-row">
            {[1, 2, 3, 4].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="phone-event-card">
            <PartyPopper size={18} />
            <strong>Casamento</strong>
            <small>Equipe sugerida: 12 profissionais</small>
          </div>
          <div className="phone-price"><Coins size={16} /> R$ 2.850 - 3.450</div>
          <button type="button">Criar evento</button>
        </>
      )}
    </article>
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
      <h3 className="font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-aqua-700">
        <BadgeCheck size={14} /> PONT
      </span>
    </article>
  );
}

function IosInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <InstallStepsModal
      onClose={onClose}
      iconSrc="/apple-touch-icon.png"
      title="Instalar no iPhone"
      subtitle="iOS / iPadOS · Safari"
      ariaLabel="Instalar o PONT no iPhone"
      intro="O iPhone não permite baixar apps fora da App Store. O PONT é instalado como app web direto pelo navegador — leva menos de 30 segundos:"
      steps={[
        {
          icon: <Smartphone size={18} />,
          text: (
            <>
              Abra <strong className="text-white">usepont.com.br</strong> no{" "}
              <strong className="text-white">Safari</strong> (o Chrome do iPhone não mostra a opção de instalar).
            </>
          )
        },
        {
          icon: <Share size={18} />,
          text: (
            <>
              Toque no botão <strong className="text-white">Compartilhar</strong> — o quadrado com uma seta
              para cima, na barra inferior.
            </>
          )
        },
        {
          icon: <PlusSquare size={18} />,
          text: (
            <>
              Escolha <strong className="text-white">Adicionar à Tela de Início</strong>.
            </>
          )
        },
        {
          icon: <CheckCircle2 size={18} />,
          text: (
            <>
              Toque em <strong className="text-white">Adicionar</strong>. O ícone do PONT fica na tela inicial
              e abre em tela cheia, como um app.
            </>
          )
        }
      ]}
    />
  );
}

function AndroidInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <InstallStepsModal
      onClose={onClose}
      iconSrc="/icon-192.png"
      title="Instalar no Android"
      subtitle="Chrome (ou outro navegador Chromium)"
      ariaLabel="Instalar o PONT no Android"
      intro="Seu navegador não ofereceu a instalação automática agora (pode já estar instalado, ou o navegador não suporta). Dá pra instalar manualmente:"
      steps={[
        {
          icon: <Smartphone size={18} />,
          text: (
            <>
              Abra <strong className="text-white">usepont.com.br</strong> no <strong className="text-white">Chrome</strong>.
            </>
          )
        },
        {
          icon: <Share size={18} />,
          text: (
            <>
              Toque no menu <strong className="text-white">⋮</strong> no canto superior direito.
            </>
          )
        },
        {
          icon: <PlusSquare size={18} />,
          text: (
            <>
              Escolha <strong className="text-white">Instalar app</strong> (ou{" "}
              <strong className="text-white">Adicionar à tela inicial</strong>).
            </>
          )
        },
        {
          icon: <CheckCircle2 size={18} />,
          text: (
            <>
              Confirme. O ícone do PONT fica na tela inicial e abre em tela cheia, como um app.
            </>
          )
        }
      ]}
    />
  );
}

function InstallStepsModal({
  onClose,
  iconSrc,
  title,
  subtitle,
  ariaLabel,
  intro,
  steps
}: {
  onClose: () => void;
  iconSrc: string;
  title: string;
  subtitle: string;
  ariaLabel: string;
  intro: string;
  steps: { icon: ReactNode; text: ReactNode }[];
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-charcoal shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-dark ring-1 ring-white/10">
              <img src={iconSrc} alt="" className="h-full w-full rounded-xl" />
            </span>
            <div>
              <strong className="block text-lg font-black text-white">{title}</strong>
              <span className="block text-xs font-semibold text-slate-300">{subtitle}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <p className="text-sm font-semibold leading-6 text-slate-300">{intro}</p>

          <ol className="mt-4 grid gap-3">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-950 font-black text-aqua-300">
                  {index + 1}
                </span>
                <span className="flex items-center gap-2 pt-0.5 text-sm font-semibold leading-6 text-slate-300">
                  <span className="shrink-0 text-aqua-300">{step.icon}</span>
                  <span>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-white/10 p-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-aqua-200 bg-aqua-50 px-4 text-sm font-black text-aqua-700 shadow-sm transition hover:bg-aqua-100"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
