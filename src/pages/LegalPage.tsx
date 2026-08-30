import { ArrowLeft, CheckCircle2, FileText, LockKeyhole, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

type LegalKind = "terms" | "privacy";

const lastUpdated = "29 de agosto de 2026";
const supportEmail = "contato@usepont.com.br";

// Responsável pela plataforma (pessoa física). Esses dados aparecem no
// rodapé dos dois documentos e na cláusula de foro dos Termos.
const operator = {
  name: "Jonathan Mateus de Lima Golin",
  jurisdiction: "Florianópolis/SC"
};

const termsIntro =
  "Estes Termos de Uso regulam o acesso e o uso do PONT. Ao criar uma conta ou utilizar a plataforma, você declara que leu, entendeu e concorda com estes Termos e com a Política de Privacidade.";

const privacyIntro =
  "Esta Política de Privacidade explica quais dados pessoais o PONT trata, com quais finalidades e bases legais, com quem eles são compartilhados e como você pode exercer seus direitos previstos na Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).";

const termsSummary = [
  "O PONT apenas conecta empresas e profissionais; não é empregador nem intermedia o pagamento do serviço prestado.",
  "Empresas e profissionais são responsáveis pelos combinados reais, pelo pagamento e pelas regras trabalhistas, fiscais e de segurança.",
  "O uso exige 18 anos ou mais, dados verdadeiros e conduta profissional; você pode excluir sua conta quando quiser."
];

const privacySummary = [
  "Coletamos apenas o necessário para operar contas, vagas, mensagens e moedas internas; não vendemos seus dados.",
  "O contato completo (telefone e endereço) só aparece quando o fluxo da vaga permite, após a confirmação.",
  `Você pode acessar, corrigir ou excluir seus dados pelo aplicativo ou pelo e-mail ${supportEmail}.`
];

const termsSections = [
  {
    title: "Quem oferece o PONT",
    text: `O PONT é uma plataforma digital que conecta empresas que precisam de mão de obra temporária a profissionais autônomos (freelancers) para turnos, diárias e eventos. A plataforma é operada por ${operator.name}, pessoa física, identificado ao final deste documento e com contato pelo e-mail ${supportEmail}.`
  },
  {
    title: "Aceitação dos Termos",
    text: "Ao criar uma conta ou usar o PONT, você concorda com estes Termos de Uso e com a Política de Privacidade. Caso não concorde com qualquer ponto, não utilize a plataforma."
  },
  {
    title: "Quem pode usar",
    text: "O PONT é destinado a pessoas com 18 anos ou mais e capacidade civil plena. Ao se cadastrar como empresa, você declara ter poderes para representar o estabelecimento informado. Cada usuário deve manter uma única conta, com informações verdadeiras e atualizadas."
  },
  {
    title: "O papel do PONT",
    text: "O PONT é um intermediário tecnológico que aproxima as partes e organiza cadastro, vagas, candidaturas, escalas, mensagens, moedas internas e histórico de avaliações. O PONT não é empregador, não participa da negociação entre empresa e profissional, não intermedeia o pagamento pelo serviço prestado e não garante contratação, comparecimento, pagamento ou qualidade do trabalho."
  },
  {
    title: "Responsabilidades da empresa",
    text: "A empresa deve publicar informações verdadeiras sobre função, valor, horário, bairro, endereço, uniforme, forma de pagamento e requisitos da vaga. A contratação, o pagamento do serviço, as condições do local de trabalho e o cumprimento das obrigações trabalhistas, fiscais, previdenciárias e de segurança são de responsabilidade exclusiva da empresa contratante."
  },
  {
    title: "Responsabilidades do profissional",
    text: "O profissional deve informar apenas funções e níveis de experiência que realmente possui, manter os dados de contato atualizados, comparecer aos turnos que confirmar e agir com profissionalismo. Informações falsas, faltas recorrentes e mau uso da plataforma podem limitar o acesso a vagas."
  },
  {
    title: "Conduta proibida",
    text: "É vedado usar identidade falsa, fraudar avaliações ou candidaturas, assediar ou discriminar outros usuários, publicar dados de terceiros sem base legal, tentar burlar a segurança da plataforma, coletar dados de forma automatizada ou usar o PONT para qualquer atividade ilícita."
  },
  {
    title: "Moedas internas",
    text: "As moedas do PONT são um recurso interno usado para habilitar ações dentro do aplicativo, como enviar candidaturas ou liberar detalhes completos de vagas. Elas não são moeda de curso legal, dinheiro eletrônico, investimento nem saldo resgatável, não podem ser transferidas entre contas nem convertidas em dinheiro, e as moedas concedidas como bônus podem ter prazo de validade."
  },
  {
    title: "Pagamentos",
    text: "Quando houver compra de moedas ou de pacotes pagos, os valores, as formas de pagamento e as regras de reembolso são exibidos no momento da compra. Compras de itens digitais realizadas pelo aplicativo Android são processadas pelo sistema de pagamentos da loja de aplicativos, conforme as regras dessa loja."
  },
  {
    title: "Avaliações e moderação",
    text: "Empresas podem avaliar profissionais após o turno. As avaliações devem ser verdadeiras e respeitosas. A administração do PONT pode ocultar conteúdo, advertir, suspender ou remover contas que prejudiquem a segurança, a confiança ou o funcionamento da plataforma."
  },
  {
    title: "Suspensão e encerramento",
    text: "Você pode parar de usar o PONT e excluir sua conta a qualquer momento. O PONT pode suspender ou encerrar contas que violem estes Termos ou a legislação aplicável, com aviso prévio sempre que possível."
  },
  {
    title: "Exclusão de conta",
    text: `Você pode excluir sua conta e os dados associados a qualquer momento pela opção de exclusão dentro do aplicativo ou enviando o pedido para ${supportEmail}. A exclusão é processada em até 30 dias. Alguns registros podem ser mantidos pelo prazo exigido por lei ou para prevenção a fraude e exercício regular de direitos, conforme a Política de Privacidade.`
  },
  {
    title: "Propriedade intelectual",
    text: "A marca PONT, o aplicativo, seu código, layout e conteúdos próprios pertencem ao operador da plataforma. É concedida a você uma licença limitada, pessoal, não exclusiva e revogável para usar o aplicativo conforme sua finalidade. O conteúdo que você envia continua seu, mas você autoriza o PONT a hospedá-lo e exibi-lo para operar o serviço."
  },
  {
    title: "Limitação de responsabilidade",
    text: "O PONT é fornecido no estado em que se encontra. Na máxima extensão permitida pela lei, o PONT não se responsabiliza por atos de usuários, faltas, ausência de pagamento pelo serviço, qualidade do trabalho, conflitos entre as partes ou prejuízos decorrentes da relação formada por meio da plataforma."
  },
  {
    title: "Alterações destes Termos",
    text: "Estes Termos podem ser atualizados. Mudanças relevantes são comunicadas pelo aplicativo ou por e-mail. O uso da plataforma após a data de vigência da nova versão indica concordância com as alterações."
  },
  {
    title: "Lei aplicável e foro",
    text: `Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de ${operator.jurisdiction} para dirimir questões decorrentes deste documento, sem prejuízo do direito do consumidor de acionar o foro de seu domicílio.`
  }
];

const privacySections = [
  {
    title: "Controlador dos dados",
    text: `O responsável pelo tratamento dos seus dados pessoais (controlador, nos termos da LGPD) é ${operator.name}, pessoa física, operador do PONT e identificado ao final deste documento. Para qualquer assunto de privacidade, incluindo o exercício de direitos, use o e-mail ${supportEmail}.`
  },
  {
    title: "Dados que você fornece",
    text: "Ao usar o PONT, você pode fornecer: nome, e-mail, telefone, foto, data de nascimento, cidade, bairro, funções, nível de experiência, disponibilidade e transporte próprio; no caso de empresas, nome do estabelecimento, nome do responsável, CNPJ, categoria e endereço; além de vagas, candidaturas, escalas, mensagens, avaliações e relatos de problema criados dentro do aplicativo."
  },
  {
    title: "Dados coletados automaticamente",
    text: "Coletamos dados de uso e de funcionamento do aplicativo, como registros de acesso, identificadores técnicos do dispositivo, ações realizadas no app e o saldo e o histórico de movimentação de moedas. Não coletamos dados sensíveis de forma intencional nem localização precisa em segundo plano."
  },
  {
    title: "Finalidades e bases legais",
    text: "Tratamos seus dados para: criar e manter sua conta e autenticar o acesso; exibir perfis, publicar vagas e permitir candidaturas e recomendações; liberar informações de contato após a confirmação; registrar moedas e compras; enviar notificações sobre vagas, convites e avaliações; garantir segurança, prevenir fraudes e moderar abusos; melhorar o aplicativo; e cumprir obrigações legais e exercer direitos. As bases legais aplicáveis são a execução de contrato, o cumprimento de obrigação legal ou regulatória, o legítimo interesse e o exercício regular de direitos."
  },
  {
    title: "Compartilhamento de dados",
    text: "Não vendemos seus dados. Compartilhamos apenas: (a) entre usuários do PONT, o mínimo necessário para o fluxo - empresas veem os dados profissionais dos candidatos, e profissionais veem os dados da vaga e, após a confirmação, o contato e o local combinados; (b) com fornecedores de tecnologia que operam a plataforma sob nossas instruções, como infraestrutura de banco de dados, autenticação e armazenamento de arquivos (atualmente Supabase) e hospedagem do site; (c) quando exigido por lei, ordem judicial ou autoridade competente; (d) em caso de reorganização societária, mantidas as proteções deste documento."
  },
  {
    title: "Armazenamento e transferência internacional",
    text: "Os dados podem ser armazenados em servidores localizados fora do Brasil, inclusive nos Estados Unidos, por meio dos provedores de infraestrutura utilizados pelo PONT. Nesses casos, adotamos salvaguardas contratuais para manter o nível de proteção exigido pela LGPD."
  },
  {
    title: "Cookies e armazenamento local",
    text: "O PONT usa o armazenamento local do dispositivo (localStorage e preferências nativas) para manter você conectado e guardar preferências de uso. Não utilizamos cookies de publicidade nem rastreamento de terceiros para anúncios."
  },
  {
    title: "Retenção dos dados",
    text: "Mantemos seus dados enquanto a conta existir. Após a exclusão da conta, apagamos ou anonimizamos os dados em até 30 dias, exceto registros que precisamos conservar por prazo legal, como obrigações fiscais e prazos de guarda, ou para prevenção a fraude e exercício regular de direitos em processo."
  },
  {
    title: "Seus direitos como titular",
    text: `Você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos, portabilidade, informação sobre compartilhamentos, revogação de consentimento e revisão de decisões automatizadas, além de peticionar à Autoridade Nacional de Proteção de Dados (ANPD). Para exercer seus direitos, escreva para ${supportEmail}; podemos solicitar informações adicionais para confirmar sua identidade.`
  },
  {
    title: "Exclusão de conta e dados",
    text: `Você pode excluir sua conta pela opção de exclusão dentro do aplicativo ou pelo e-mail ${supportEmail}. A exclusão remove seu perfil e o conteúdo associado da plataforma, ressalvados os registros de guarda legal descritos em "Retenção dos dados".`
  },
  {
    title: "Segurança da informação",
    text: "Adotamos controles de acesso, regras de segurança no banco de dados, registro de operações e criptografia em trânsito para proteger seus dados. Nenhum sistema é totalmente seguro; em caso de incidente relevante, comunicaremos você e a ANPD conforme a legislação."
  },
  {
    title: "Crianças e adolescentes",
    text: "O PONT não é destinado a menores de 18 anos e não coletamos intencionalmente dados dessas pessoas. Caso identifiquemos uma conta nessa situação, ela será encerrada e os dados serão apagados."
  },
  {
    title: "Alterações desta Política",
    text: "Esta Política pode ser atualizada. Mudanças relevantes são comunicadas pelo aplicativo ou por e-mail, e a data da última atualização fica indicada no início do documento."
  }
];

export function LegalPage({ kind }: { kind: LegalKind }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Política de Privacidade" : "Termos de Uso";
  const subtitle = isPrivacy
    ? "Como o PONT trata os dados de trabalhadores, empresas, vagas, mensagens e moedas internas."
    : "Regras principais para usar o PONT com clareza entre empresas e trabalhadores.";
  const intro = isPrivacy ? privacyIntro : termsIntro;
  const sections = isPrivacy ? privacySections : termsSections;
  const summary = isPrivacy ? privacySummary : termsSummary;

  return (
    <div className="min-h-screen bg-ice">
      <header className="border-b border-white/10 bg-brand-charcoal/90 shadow-sm backdrop-blur-xl">
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
        <section className="overflow-hidden rounded-lg border border-white/10 bg-brand-charcoal shadow-soft">
          <div className="color-strip h-2" />
          <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-aqua-100 bg-aqua-50 px-3 py-1 text-xs font-black uppercase text-aqua-700">
                {isPrivacy ? <LockKeyhole size={15} /> : <FileText size={15} />}
                PONT
              </p>
              <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 md:text-base">{subtitle}</p>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500">{intro}</p>
              <p className="mt-4 text-xs font-black uppercase text-slate-500">Última atualização: {lastUpdated}</p>
            </div>
            <aside className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck size={20} />
                <strong>Resumo rápido</strong>
              </div>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                {summary.map((item) => (
                  <span key={item} className="flex gap-2">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-aqua-700" /> {item}
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-5 grid gap-4">
          {sections.map((section, index) => (
            <article key={section.title} className="card p-5">
              <h2 className="text-lg font-black text-white">
                {index + 1}. {section.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{section.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-5">
            <div className="flex items-center gap-2 text-aqua-800">
              <Mail size={18} />
              <strong>Contato</strong>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              Dúvidas, solicitações de privacidade e suporte:{" "}
              <a href={`mailto:${supportEmail}`} className="font-black text-aqua-800 underline">
                {supportEmail}
              </a>
              .
            </p>
          </div>
          <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-5">
            <div className="flex items-center gap-2 text-aqua-800">
              <Trash2 size={18} />
              <strong>Exclusão de conta</strong>
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              Você pode excluir sua conta pela opção de exclusão dentro do aplicativo ou enviando o pedido para{" "}
              <a href={`mailto:${supportEmail}`} className="font-black text-aqua-800 underline">
                {supportEmail}
              </a>
              . A exclusão é processada em até 30 dias.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-white">
            <FileText size={18} />
            <strong>Identificação do responsável</strong>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            PONT — plataforma para turnos, diárias e eventos. Serviço operado por {operator.name} (pessoa
            física). Contato: {supportEmail}.
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
