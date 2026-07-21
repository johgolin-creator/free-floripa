import { Edit3, Star } from "lucide-react";
import { SectionHeader } from "../components/SectionHeader";
import { useAppStore } from "../lib/store";

export function CompanyProfilePage() {
  const { currentCompany } = useAppStore();

  return (
    <div>
      <SectionHeader eyebrow="Perfil" title="Perfil da empresa" action={<button type="button" onClick={() => alert("Edição simulada da empresa aberta.")} className="primary"><Edit3 size={17} /> Editar perfil</button>} />
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
            <Info label="Telefone protegido" value="Liberado conforme regra de contratação" />
            <Info label="E-mail" value={currentCompany.email} />
            <Info label="Endereço" value={currentCompany.address} />
            <Info label="Bairro" value={currentCompany.neighborhood} />
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">{currentCompany.description}</p>
        </div>
      </section>
    </div>
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
