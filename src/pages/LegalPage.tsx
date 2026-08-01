import { ArrowLeft, CheckCircle2, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

type LegalKind = "terms" | "privacy";

const lastUpdated = "31 de julho de 2026";

const termsSections = [
  {
    title: "Uso da plataforma",
    text: "O Free Floripa conecta empresas que precisam de mão de obra temporária com trabalhadores freelancers. A plataforma organiza cadastro, vagas, candidaturas, escalas, mensagens, moedas internas e histórico de avaliações."
  },
  {
    title: "Responsabilidade das empresas",
    text: "A empresa deve publicar informações verdadeiras sobre função, valor, horário, bairro, endereço, uniforme, forma de pagamento e requisitos da vaga. A contratação, o pagamento do serviço e o cumprimento de regras trabalhistas, fiscais e de segurança são responsabilidade da empresa contratante."
  },
  {
    title: "Responsabilidade dos trabalhadores",
    text: "O trabalhador deve informar apenas profissões que realmente conhece, manter dados de contato atualizados, comparecer aos turnos confirmados e agir com profissionalismo. Informações falsas, faltas recorrentes ou mau uso podem limitar o acesso a vagas."
  },
  {
    title: "Moedas internas",
    text: "As moedas do Free Floripa são usadas para liberar detalhes de vagas e candidaturas dentro da plataforma. Nesta fase, elas não representam saldo bancário, investimento, dinheiro eletrônico ou promessa de saque."
  },
  {
    title: "Avaliações e moderação",
    text: "Empresas podem avaliar colaboradores após o turno, e a administração pode bloquear contas ou conteúdos que prejudiquem a segurança, a confiança ou o funcionamento do aplicativo."
  },
  {
    title: "Limitacao de responsabilidade",
    text: "O Free Floripa ajuda na organização e na aproximação entre as partes, mas não garante contratação, pagamento, disponibilidade de vagas, comparecimento, qualidade do serviço ou ausência de conflitos entre usuários."
  }
];

const privacySections = [
  {
    title: "Dados que coletamos",
    text: "Podemos coletar nome, e-mail, telefone, foto, cidade, bairro, profissões, nível de experiência, disponibilidade, dados da empresa, CNPJ, vagas, candidaturas, mensagens, avaliações, saldo de moedas e registros de uso do aplicativo."
  },
  {
    title: "Como usamos os dados",
    text: "Usamos esses dados para criar contas, exibir perfis, publicar vagas, recomendar profissionais, permitir candidaturas, liberar contato após confirmação, manter histórico, melhorar a segurança e enviar notificações importantes."
  },
  {
    title: "Compartilhamento dentro do app",
    text: "Empresas podem ver dados profissionais dos trabalhadores quando isso for necessário para selecionar candidatos. Trabalhadores podem ver dados da vaga e, após confirmação, informações de contato e local combinadas pela empresa."
  },
  {
    title: "Serviços de tecnologia",
    text: "O aplicativo usa serviços de infraestrutura para autenticação, banco de dados e armazenamento de informações. Futuramente poderemos usar provedores de e-mail, notificação e pagamento, sempre para operar o próprio Free Floripa."
  },
  {
    title: "Segurança e retenção",
    text: "Mantemos controles de acesso, regras no banco de dados e histórico de operações para reduzir abusos. Os dados podem ser mantidos enquanto a conta existir ou pelo tempo necessário para segurança, suporte, auditoria e obrigações legais."
  },
  {
    title: "Direitos do usuário",
    text: "O usuário pode solicitar correção, acesso ou exclusão de dados. Alguns registros podem ser preservados quando forem necessários para segurança, prevenção de fraude, histórico operacional ou cumprimento de obrigações legais."
  }
];

export function LegalPage({ kind }: { kind: LegalKind }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Política de Privacidade" : "Termos de Uso";
  const subtitle = isPrivacy
    ? "Como o Free Floripa trata dados de trabalhadores, empresas, vagas, mensagens e moedas internas."
    : "Regras principais para usar o Free Floripa com mais clareza entre empresas e trabalhadores.";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <div className="min-h-screen bg-ice">
      <header className="border-b border-white/80 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="min-w-0">
            <BrandLogo compact />
          </Link>
          <Link to="/" className="secondary min-h-10">
            <ArrowLeft size={17} /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <section className="overflow-hidden rounded-lg border border-white bg-white shadow-soft">
          <div className="color-strip h-2" />
          <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-aqua-100 bg-aqua-50 px-3 py-1 text-xs font-black uppercase text-aqua-700">
                {isPrivacy ? <LockKeyhole size={15} /> : <FileText size={15} />}
                Free Floripa
              </p>
              <h1 className="mt-4 text-3xl font-black text-navy-950 md:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 md:text-base">{subtitle}</p>
              <p className="mt-4 text-xs font-black uppercase text-slate-500">Última atualização: {lastUpdated}</p>
            </div>
            <aside className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-navy-950">
                <ShieldCheck size={20} />
                <strong>Resumo rápido</strong>
              </div>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                <span className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-aqua-700" /> Dados usados para operar vagas, perfis, mensagens e moedas.</span>
                <span className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-aqua-700" /> Contato completo aparece apenas quando fizer sentido no fluxo.</span>
                <span className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-aqua-700" /> Empresas e trabalhadores continuam responsaveis pelos combinados reais.</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="card p-5">
              <h2 className="text-lg font-black text-navy-950">{section.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-lg border border-aqua-100 bg-aqua-50 p-5">
          <div className="flex items-center gap-2 text-aqua-800">
            <Mail size={18} />
            <strong>Contato e ajustes antes da publicacao final</strong>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Antes de publicar na Play Store, defina o e-mail oficial de suporte do Free Floripa e substitua este aviso pelo canal definitivo de atendimento.
          </p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/termos" className="secondary">Termos de Uso</Link>
                <Link to="/privacidade" className="secondary">Política de Privacidade</Link>
          <Link to="/login" className="primary">Entrar no app</Link>
        </div>
      </main>
    </div>
  );
}
