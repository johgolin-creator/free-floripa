import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "../Modal";
import {
  fillTemplate,
  loadReceiptCustomText,
  loadReceiptDrafts,
  MAX_CUSTOM_TEXT,
  parseMoney,
  saveReceiptCustomText,
  saveReceiptDraft,
  TEMPLATE_TOKENS,
  type ReceiptCompany,
  type ReceiptCustomText,
  type ReceiptDoc,
  type ReceiptFields,
  type ReceiptKind,
  type ReceiptPerson,
  type ReceiptTextMode
} from "../../lib/receipts";
import type { PaymentMethod } from "../../lib/types";
import { formatCPF, isValidCPF, onlyDigits } from "../../lib/validation";

const METHODS: PaymentMethod[] = ["Pix", "Dinheiro", "Transferência", "A combinar"];

const KINDS: Array<{ kind: ReceiptKind; label: string; hint: string }> = [
  { kind: "recibo", label: "Recibo de pagamento", hint: "Valor por extenso, forma e data do pagamento" },
  { kind: "comprovante", label: "Comprovante do turno", hint: "Dados do turno para assinatura" }
];

function initialFields(people: ReceiptPerson[]): Record<string, ReceiptFields> {
  const drafts = loadReceiptDrafts();
  const fields: Record<string, ReceiptFields> = {};
  for (const person of people) {
    const draft = drafts[person.key] ?? {};
    fields[person.key] = {
      cpf: formatCPF(draft.cpf ?? person.cpf ?? ""),
      value: draft.value ?? (person.value > 0 ? String(person.value).replace(".", ",") : ""),
      method: draft.method ?? person.method,
      payDate: draft.payDate ?? person.date
    };
  }
  return fields;
}

/** A empresa preenche CPF, valor, forma e data de cada profissional, escolhe quais
 *  documentos imprimir (marcando as caixinhas) e imprime. */
export function ReceiptsModal({
  title,
  people,
  company,
  onClose,
  onPrint
}: {
  title: string;
  people: ReceiptPerson[];
  company: ReceiptCompany;
  onClose: () => void;
  onPrint: (docs: ReceiptDoc[], company: ReceiptCompany, custom: ReceiptCustomText) => void;
}) {
  const [fields, setFields] = useState(() => initialFields(people));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(people.map((person) => person.key)));
  const [kinds, setKinds] = useState<Set<ReceiptKind>>(() => new Set<ReceiptKind>(["recibo"]));
  const [responsible, setResponsible] = useState(company.responsible);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMethod, setBulkMethod] = useState<PaymentMethod>("Pix");
  const [custom, setCustom] = useState<ReceiptCustomText>(() => loadReceiptCustomText());
  const textRef = useRef<HTMLTextAreaElement>(null);

  const allSelected = people.length > 0 && selected.size === people.length;
  const documentCount = selected.size * kinds.size;
  const canPrint = documentCount > 0;

  const invalidCpf = useMemo(() => {
    const invalid = new Set<string>();
    for (const [key, field] of Object.entries(fields)) {
      const digits = onlyDigits(field.cpf);
      if (digits.length > 0 && !isValidCPF(digits)) invalid.add(key);
    }
    return invalid;
  }, [fields]);

  function update(key: string, patch: Partial<ReceiptFields>) {
    setFields((current) => {
      const next = { ...current[key], ...patch };
      saveReceiptDraft(key, next);
      return { ...current, [key]: next };
    });
  }

  function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function changeCustom(next: ReceiptCustomText) {
    setCustom(next);
    saveReceiptCustomText(next);
  }

  /** Insere o marcador na posição do cursor (ou no fim) e devolve o cursor para depois dele. */
  function insertToken(token: string) {
    const area = textRef.current;
    const start = area?.selectionStart ?? custom.text.length;
    const end = area?.selectionEnd ?? custom.text.length;
    const text = (custom.text.slice(0, start) + token + custom.text.slice(end)).slice(0, MAX_CUSTOM_TEXT);
    changeCustom({ ...custom, text });
    window.requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function buildDoc(person: ReceiptPerson, kind: ReceiptKind): ReceiptDoc {
    const field = fields[person.key];
    return { kind, person, cpf: onlyDigits(field.cpf), value: parseMoney(field.value), method: field.method, payDate: field.payDate };
  }

  const previewPerson = people.find((person) => selected.has(person.key));
  const previewText =
    custom.text.trim() && previewPerson
      ? fillTemplate(custom.text, buildDoc(previewPerson, "recibo"), { ...company, responsible })
      : "";

  function applyToSelected() {
    setFields((current) => {
      const next = { ...current };
      for (const key of selected) {
        const merged = { ...next[key], method: bulkMethod, ...(bulkValue.trim() ? { value: bulkValue.trim() } : {}) };
        saveReceiptDraft(key, merged);
        next[key] = merged;
      }
      return next;
    });
  }

  function print() {
    const docs: ReceiptDoc[] = [];
    for (const person of people) {
      if (!selected.has(person.key)) continue;
      for (const { kind } of KINDS) {
        if (kinds.has(kind)) docs.push(buildDoc(person, kind));
      }
    }
    onPrint(docs, { ...company, responsible: responsible.trim() || company.responsible }, custom);
  }

  return (
    <Modal title={`Recibos - ${title}`} onClose={onClose} size="lg">
      <div className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-black uppercase text-slate-500">O que imprimir</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {KINDS.map(({ kind, label, hint }) => (
              <label
                key={kind}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  kinds.has(kind) ? "border-aqua-300/60 bg-aqua-300/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-aqua-500"
                  checked={kinds.has(kind)}
                  onChange={() => setKinds((current) => toggle(current, kind))}
                />
                <span>
                  <strong className="block text-sm text-white">{label}</strong>
                  <span className="text-xs font-semibold text-slate-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <label className="label">
            Responsável pelo pagamento (assina pela empresa)
            <input className="input !min-h-10" value={responsible} onChange={(event) => setResponsible(event.target.value)} maxLength={80} />
          </label>
          <label className="label">
            Valor p/ selecionados
            <input
              className="input !min-h-10 md:w-32"
              inputMode="decimal"
              placeholder="180,00"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
            />
          </label>
          <label className="label">
            Forma
            <select className="input !min-h-10" value={bulkMethod} onChange={(event) => setBulkMethod(event.target.value as PaymentMethod)}>
              {METHODS.map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary min-h-10 px-4 text-sm" onClick={applyToSelected} disabled={selected.size === 0}>
            Aplicar
          </button>
        </div>

        <section className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <strong className="text-sm text-white">Texto do recibo (opcional)</strong>
            <span className="text-xs font-semibold text-slate-500">
              {custom.text.length}/{MAX_CUSTOM_TEXT}
            </span>
          </div>
          <textarea
            ref={textRef}
            className="input min-h-24 py-3"
            rows={4}
            maxLength={MAX_CUSTOM_TEXT}
            value={custom.text}
            onChange={(event) => changeCustom({ ...custom, text: event.target.value })}
            placeholder="Cole ou escreva aqui o texto que deve sair no recibo. Ex.: Declaro que recebi de {empresa} a quantia de {valor} ({extenso}), referente à diária de {funcao} em {data}."
            aria-label="Texto do recibo"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black uppercase text-slate-500">Preencher sozinho:</span>
            {TEMPLATE_TOKENS.map(({ token, label }) => (
              <button
                key={token}
                type="button"
                title={label}
                onClick={() => insertToken(token)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-black text-aqua-300 transition hover:bg-white/10"
              >
                {token}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {(
              [
                ["append", "Acrescentar ao texto padrão"],
                ["replace", "Usar só o meu texto (no lugar do texto padrão)"]
              ] as Array<[ReceiptTextMode, string]>
            ).map(([mode, label]) => (
              <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-300">
                <input
                  type="radio"
                  name="receipt-text-mode"
                  className="h-4 w-4 accent-aqua-500"
                  checked={custom.mode === mode}
                  onChange={() => changeCustom({ ...custom, mode })}
                />
                {label}
              </label>
            ))}
          </div>
          {previewText && previewPerson && (
            <div className="rounded-lg bg-white p-3 text-black">
              <span className="block text-[0.68rem] font-black uppercase text-slate-500">Como vai sair para {previewPerson.name}</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{previewText}</p>
            </div>
          )}
        </section>

        <div className="grid gap-2">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-black text-white">
            <input
              type="checkbox"
              className="h-5 w-5 accent-aqua-500"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(people.map((person) => person.key)))}
            />
            Selecionar todos ({selected.size}/{people.length})
          </label>

          {people.length === 0 ? (
            <p className="rounded-lg bg-white/5 p-4 text-sm font-semibold text-slate-400">
              Ninguém confirmado para gerar recibos ainda. Aprove profissionais na vaga, ou adicione nomes na equipe prevista da escala.
            </p>
          ) : (
            <ul className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1">
              {people.map((person) => {
                const field = fields[person.key];
                const isSelected = selected.has(person.key);
                return (
                  <li
                    key={person.key}
                    className={`grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1.3fr)_1fr_0.7fr_0.8fr_0.9fr] md:items-end ${
                      isSelected ? "border-white/15 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <label className="flex min-w-0 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-aqua-500"
                        checked={isSelected}
                        onChange={() => setSelected((current) => toggle(current, person.key))}
                        aria-label={`Incluir ${person.name}`}
                      />
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-white">{person.name}</strong>
                        <span className="block truncate text-xs font-semibold text-slate-400">{person.functionName}</span>
                      </span>
                    </label>
                    <label className="label text-xs">
                      CPF
                      <input
                        className="input !min-h-10"
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        value={field.cpf}
                        onChange={(event) => update(person.key, { cpf: formatCPF(event.target.value) })}
                        aria-invalid={invalidCpf.has(person.key)}
                      />
                      {invalidCpf.has(person.key) && <span className="text-[0.68rem] font-black text-alert">CPF inválido — confira</span>}
                    </label>
                    <label className="label text-xs">
                      Valor (R$)
                      <input
                        className="input !min-h-10"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={field.value}
                        onChange={(event) => update(person.key, { value: event.target.value })}
                      />
                    </label>
                    <label className="label text-xs">
                      Forma
                      <select
                        className="input !min-h-10"
                        value={field.method}
                        onChange={(event) => update(person.key, { method: event.target.value as PaymentMethod })}
                      >
                        {METHODS.map((method) => (
                          <option key={method}>{method}</option>
                        ))}
                      </select>
                    </label>
                    <label className="label text-xs">
                      Data do pagamento
                      <input
                        className="input !min-h-10"
                        type="date"
                        value={field.payDate}
                        onChange={(event) => update(person.key, { payDate: event.target.value })}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-500">
          O CPF que você digita fica só neste navegador, para não precisar digitar de novo. Campos em branco saem como linha para preencher à mão.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-300">
            {documentCount} documento{documentCount === 1 ? "" : "s"} (2 por folha)
          </span>
          <div className="flex gap-2">
            <button type="button" className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="primary" disabled={!canPrint} onClick={print}>
              <Printer size={17} /> Imprimir recibos
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
