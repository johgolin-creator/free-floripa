import { useState, type ReactNode } from "react";
import { AlertTriangle, BadgeCheck, Building2, Edit3, ImageUp, Save, ShieldCheck, Star } from "lucide-react";
import { Modal } from "../components/Modal";
import { ProfileImageUploader } from "../components/ProfileImageUploader";
import { ProfileCompletionAlert } from "../components/ProfileCompletionAlert";
import { SafetyNotice } from "../components/SafetyNotice";
import { SectionHeader } from "../components/SectionHeader";
import { neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { getCompanyProfileCompletion } from "../lib/profileCompletion";
import type { CompanyProfile } from "../lib/types";

const companyCategories: CompanyProfile["category"][] = [
  "Restaurante",
  "Bar",
  "Beach club",
  "Hotel",
  "Casa noturna",
  "Buffet",
  "Agência de eventos",
  "Outro"
];

export function CompanyProfilePage() {
  const { state, currentCompany, updateCompanyProfile } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const completion = getCompanyProfileCompletion(currentCompany);
  const blocked = state.adminModeration.blockedCompanyIds.includes(currentCompany.id);
  const companyReviews = state.companyReviews.filter((review) => review.companyId === currentCompany.id);

  return (
    <div>
      <SectionHeader
        eyebrow="Perfil"
        title="Perfil da empresa"
        action={<button type="button" onClick={() => setEditing(true)} className="primary"><Edit3 size={17} /> Editar perfil</button>}
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      <ProfileCompletionAlert complete={completion.complete} missing={completion.missing} onEdit={() => setEditing(true)} />
      {blocked && (
        <SafetyNotice title="Empresa em revisão pela administração" tone="warning">
          Publicações, aprovações, chat e ações sensíveis podem ficar pausadas até a liberação.
        </SafetyNotice>
      )}
      <section className="profile-card">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="p-5">
          <div className="profile-main-row">
            <img src={currentCompany.logoUrl} alt="" className="h-28 w-28 rounded-lg border-4 border-white object-cover shadow-soft" />
            <div className="flex-1">
              <h2 className="text-2xl font-black text-navy-950">{currentCompany.establishmentName}</h2>
              <p className="text-sm font-semibold text-slate-600">{currentCompany.category} - {currentCompany.neighborhood}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Star size={15} /> {currentCompany.rating.toFixed(1)} de avaliação</p>
              <div className="profile-quick-actions">
                <button type="button" onClick={() => setEditing(true)} className="company-action company-action-primary">
                  <Edit3 size={17} /> Alterar dados
                </button>
                <button type="button" onClick={() => setEditing(true)} className="company-action">
                  <ImageUp size={17} /> Trocar logo
                </button>
              </div>
            </div>
          </div>
          <div className="profile-info-grid company-profile-info-grid">
            <Info label="Responsável" value={currentCompany.responsibleName} />
            <Info label="CNPJ" value={currentCompany.cnpj} />
            <Info label="Telefone protegido" value={currentCompany.phone} />
            <Info label="E-mail" value={currentCompany.email} />
            <Info label="Endereço" value={currentCompany.address} />
            <Info label="Bairro" value={currentCompany.neighborhood} />
          </div>
          <div className="profile-section-grid">
            <div className="profile-panel">
              <h3 className="font-black text-navy-950">Sobre a empresa</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{currentCompany.description}</p>
            </div>
            <div className="profile-panel">
              <h3 className="font-black text-navy-950">Validação e segurança</h3>
              <div className="mt-3 grid gap-2">
                <ValidationRow
                  icon={blocked ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                  title={blocked ? "Conta em revisão" : completion.complete ? "Cadastro operacional completo" : "Cadastro pendente"}
                  text={blocked ? "A administração pausou ações sensíveis desta empresa." : completion.complete ? "Dados principais preenchidos para publicar vagas com mais confiança." : "Complete os dados obrigatórios para transmitir mais segurança."}
                  tone={blocked ? "warning" : completion.complete ? "success" : "neutral"}
                />
                <ValidationRow
                  icon={<BadgeCheck size={16} />}
                  title="Reputação da empresa"
                  text={`${currentCompany.rating.toFixed(1)} de avaliação. Mantenha informações de vaga, horário e pagamento sempre atualizadas.`}
                  tone={currentCompany.rating >= 4.5 ? "success" : "neutral"}
                />
              </div>
            </div>
            <div className="profile-panel">
              <h3 className="font-black text-navy-950">Avaliações dos trabalhadores</h3>
              {companyReviews.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">Nenhum trabalhador avaliou esta empresa ainda.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {companyReviews.slice(0, 4).map((review) => (
                    <div key={review.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <strong className="flex items-center gap-1 text-sm text-navy-950">
                        <Star size={15} /> {review.rating} estrelas - {review.workerName}
                      </strong>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {editing && (
        <Modal title="Editar perfil da empresa" onClose={() => setEditing(false)}>
          <CompanyProfileForm
            company={currentCompany}
            onSubmit={(input) => {
              updateCompanyProfile(input);
              setEditing(false);
              setMessage("Perfil da empresa atualizado.");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CompanyProfileForm({
  company,
  onSubmit
}: {
  company: CompanyProfile;
  onSubmit: (input: Partial<CompanyProfile>) => void;
}) {
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);

  return (
    <form
      className="grid max-h-[72vh] gap-3 overflow-auto pr-1"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const establishmentName = String(form.get("establishmentName") || "").trim();
        const responsibleName = String(form.get("responsibleName") || "").trim();
        const cnpj = String(form.get("cnpj") || "").trim();
        const phone = String(form.get("phone") || "").trim();
        const email = String(form.get("email") || "").trim();
        const address = String(form.get("address") || "").trim();
        const description = String(form.get("description") || "").trim();

        if (!establishmentName || !responsibleName || !cnpj || !phone || !email || !address || !description) {
          setError("Preencha todos os dados obrigatórios da empresa.");
          return;
        }

        setError("");
        onSubmit({
          establishmentName,
          responsibleName,
          cnpj,
          phone,
          email,
          category: form.get("category") as CompanyProfile["category"],
          neighborhood: form.get("neighborhood") as CompanyProfile["neighborhood"],
          logoUrl: logoUrl.trim() || company.logoUrl,
          address,
          description
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="profile-edit-note">
        <Building2 size={18} />
        <div>
          <strong>Atualize nome, responsável, telefone, endereço e logotipo.</strong>
          <p>Esses dados aparecem para freelancers depois da confirmação da vaga.</p>
        </div>
      </div>
      <SignupLikeTitle number="1" title="Identificação e contato" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Nome do estabelecimento<input name="establishmentName" className="input" defaultValue={company.establishmentName} required /></label>
        <label className="label">Responsável<input name="responsibleName" className="input" defaultValue={company.responsibleName} required /></label>
        <label className="label">CNPJ<input name="cnpj" className="input" defaultValue={company.cnpj} required /></label>
        <label className="label">Telefone<input name="phone" className="input" defaultValue={company.phone} required /></label>
        <label className="label">E-mail<input name="email" className="input" type="email" defaultValue={company.email} required /></label>
        <label className="label">Categoria<select name="category" className="input" defaultValue={company.category} required>{companyCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label md:col-span-2">Bairro<select name="neighborhood" className="input" defaultValue={company.neighborhood} required>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <SignupLikeTitle number="2" title="Imagem da empresa" />
      <ProfileImageUploader
        label="Foto ou logotipo"
        value={logoUrl}
        kind="empresas"
        previewAlt="Foto da empresa"
        onChange={setLogoUrl}
      />
      <SignupLikeTitle number="3" title="Endereço e apresentação" />
      <label className="label">Endereço<input name="address" className="input" defaultValue={company.address} required /></label>
      <label className="label">Descrição<textarea name="description" className="input min-h-24 py-3" defaultValue={company.description} required /></label>
      <button type="submit" className="primary">
        <Save size={17} /> Salvar alterações
      </button>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-info-tile">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}

function ValidationRow({
  icon,
  title,
  text,
  tone
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-aqua-100 bg-aqua-50 text-aqua-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr] ${toneClass}`}>
      <span className="mt-0.5">{icon}</span>
      <div>
        <strong className="block text-sm text-navy-950">{title}</strong>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function SignupLikeTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="signup-step flex items-center gap-2 rounded-lg border border-aqua-100 bg-aqua-50 px-3 py-2 md:col-span-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-950 text-xs font-black text-aqua-300">{number}</span>
      <strong className="text-sm text-navy-950">{title}</strong>
    </div>
  );
}
