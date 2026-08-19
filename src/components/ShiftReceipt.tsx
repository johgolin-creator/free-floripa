import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ClipboardCheck, Copy, MapPin, Star, WalletCards } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/format";
import type { Application, CompanyProfile, Job, Review, WorkerProfile } from "../lib/types";

export function ShiftReceipt({
  application,
  job,
  worker,
  company,
  review
}: {
  application: Application;
  job: Job;
  worker: WorkerProfile;
  company: CompanyProfile;
  review?: Review;
}) {
  const [copied, setCopied] = useState(false);
  const receiptText = useMemo(
    () =>
      [
        "COMPROVANTE FREE FLORIPA",
        `Empresa: ${company.establishmentName}`,
        `Profissional: ${worker.name}`,
        `Vaga: ${job.title}`,
        `Função: ${job.function}`,
        `Data: ${formatDate(job.date)}`,
        `Horário: ${job.startsAt} às ${job.endsAt}`,
        `Local: ${job.fullAddress || job.approximateAddress}`,
        `Valor da diária: ${formatCurrency(job.dailyValue)}`,
        `Status: ${application.status}`,
        review ? `Avaliação: ${review.rating} estrelas - ${review.comment}` : "Avaliação: pendente"
      ]
        .filter(Boolean)
        .join("\n"),
    [application.status, company.establishmentName, job, review, worker.name]
  );

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-lg border border-aqua-100 bg-aqua-50 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-aqua-700">
          <ClipboardCheck size={18} /> Comprovante do turno
        </div>
        <h3 className="mt-2 text-xl font-black text-white">{job.title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {company.establishmentName} confirmou o registro do trabalho de {worker.name}.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <ReceiptItem icon={<CalendarDays size={16} />} label="Data e horário" value={`${formatDate(job.date)} - ${job.startsAt} às ${job.endsAt}`} />
        <ReceiptItem icon={<WalletCards size={16} />} label="Valor" value={formatCurrency(job.dailyValue)} />
        <ReceiptItem icon={<MapPin size={16} />} label="Local" value={job.fullAddress || job.approximateAddress} />
        <ReceiptItem icon={<ClipboardCheck size={16} />} label="Status" value={application.status} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
          <Star size={15} /> Avaliação
        </span>
        <strong className="mt-1 block text-sm text-white">
          {review ? `${review.rating} estrelas - ${review.authorName}` : "Avaliação ainda pendente"}
        </strong>
        {review && <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{review.comment}</p>}
      </div>

      <button type="button" onClick={copyReceipt} className="primary">
        <Copy size={17} /> {copied ? "Comprovante copiado" : "Copiar comprovante"}
      </button>
    </div>
  );
}

function ReceiptItem({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-brand-charcoal p-3 shadow-sm">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
        {icon} {label}
      </span>
      <strong className="mt-1 block text-sm text-white">{value}</strong>
    </div>
  );
}
