import { useState } from "react";
import { Edit3, Save, Star } from "lucide-react";
import { Modal } from "../components/Modal";
import { SectionHeader } from "../components/SectionHeader";
import { neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
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
  const { currentCompany, updateCompanyProfile } = useAppStore();
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <SectionHeader
        eyebrow="Perfil"
        title="Perfil da empresa"
        action={<button type="button" onClick={() => setEditing(true)} className="primary"><Edit3 size={17} /> Editar perfil</button>}
      />
      <section className="card overflow-hidden">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="p-5">
          <div className="-mt-16 flex flex-col gap-4 md:flex-row md:items-end">
            <img src={currentCompany.logoUrl} alt="" className="h-28 w-28 rounded-lg border-4 border-white object-cover shadow-soft" />
            <div>
              <h2 className="text-2xl font-black text-navy-950">{currentCompany.establishmentName}</h2>
              <p className="text-sm font-semibold text-slate-600">{currentCompany.category} - {currentCompany.neighborhood}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Star size={15} /> {currentCompany.rating.toFixed(1)} de avaliação</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Info label="Responsável" value={currentCompany.responsibleName} />
            <Info label="CNPJ" value={currentCompany.cnpj} />
            <Info label="Telefone protegido" value={currentCompany.phone} />
            <Info label="E-mail" value={currentCompany.email} />
            <Info label="Endereço" value={currentCompany.address} />
            <Info label="Bairro" value={currentCompany.neighborhood} />
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">{currentCompany.description}</p>
        </div>
      </section>

      {editing && (
        <Modal title="Editar perfil da empresa" onClose={() => setEditing(false)}>
          <CompanyProfileForm
            company={currentCompany}
            onSubmit={(input) => {
              updateCompanyProfile(input);
              setEditing(false);
              alert("Perfil da empresa atualizado.");
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
          address,
          description
        });
      }}
    >
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">Nome do estabelecimento<input name="establishmentName" className="input" defaultValue={company.establishmentName} required /></label>
        <label className="label">Responsável<input name="responsibleName" className="input" defaultValue={company.responsibleName} required /></label>
        <label className="label">CNPJ<input name="cnpj" className="input" defaultValue={company.cnpj} required /></label>
        <label className="label">Telefone<input name="phone" className="input" defaultValue={company.phone} required /></label>
        <label className="label">E-mail<input name="email" className="input" type="email" defaultValue={company.email} required /></label>
        <label className="label">Categoria<select name="category" className="input" defaultValue={company.category} required>{companyCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="label md:col-span-2">Bairro<select name="neighborhood" className="input" defaultValue={company.neighborhood} required>{neighborhoods.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
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
    <div className="rounded-lg bg-slate-50 p-3">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm text-navy-950">{value}</strong>
    </div>
  );
}
