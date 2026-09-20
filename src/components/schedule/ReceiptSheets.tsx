import type { CSSProperties } from "react";
import { formatCurrency, formatDate } from "../../lib/format";
import type { ReceiptCompany, ReceiptDoc } from "../../lib/receipts";
import { formatCPF } from "../../lib/validation";
import { valorPorExtenso } from "../../lib/valorPorExtenso";

// Recibos para imprimir: dois por folha A4 (meia página cada, com linha de
// corte). Sempre preto sobre branco, com estilos inline, independente do tema
// escuro do app.

const INK = "#000";
const BLOCK_HEIGHT = "134mm";

const blockStyle: CSSProperties = {
  boxSizing: "border-box",
  height: BLOCK_HEIGHT,
  padding: "6mm 4mm 4mm",
  color: INK,
  background: "#fff",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 13,
  lineHeight: 1.5,
  display: "flex",
  flexDirection: "column"
};

const blankLine = (width: string): CSSProperties => ({
  display: "inline-block",
  width,
  borderBottom: `1px solid ${INK}`,
  verticalAlign: "bottom"
});

function Blank({ width = "40mm" }: { width?: string }) {
  return <span style={blankLine(width)}>&nbsp;</span>;
}

function valueText(value: number) {
  return value > 0 ? formatCurrency(value) : "R$ ______________";
}

function dateOrBlank(iso: string) {
  return iso ? formatDate(iso) : "____/____/________";
}

function Signatures({ profissional, pagador }: { profissional: string; pagador: string }) {
  const line: CSSProperties = { borderTop: `1px solid ${INK}`, paddingTop: 3, textAlign: "center", fontSize: 11 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14mm", marginTop: "auto", paddingTop: "12mm" }}>
      <div style={line}>
        Assinatura do profissional
        <br />
        <strong>{profissional}</strong>
      </div>
      <div style={line}>
        Pelo pagador
        <br />
        <strong>{pagador}</strong>
      </div>
    </div>
  );
}

function Footer() {
  return <div style={{ marginTop: 6, fontSize: 9, color: "#555" }}>Emitido pelo PONT em {new Date().toLocaleDateString("pt-BR")}</div>;
}

function CompanyId({ company }: { company: ReceiptCompany }) {
  return (
    <>
      <strong>{company.name}</strong>
      {company.document ? `, ${company.documentLabel} ${company.document}` : ""}
    </>
  );
}

function PaymentReceipt({ doc, company }: { doc: ReceiptDoc; company: ReceiptCompany }) {
  const { person } = doc;
  const cpf = formatCPF(doc.cpf);
  const where = [person.eventTitle, person.place].filter(Boolean).join(" - ");

  return (
    <div style={blockStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{company.name}</div>
          <h2 style={{ margin: "2px 0 0", fontSize: 20 }}>RECIBO DE PAGAMENTO</h2>
        </div>
        <div style={{ border: `2px solid ${INK}`, padding: "4px 12px", textAlign: "right", minWidth: "38mm" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase" }}>Valor</div>
          <strong style={{ fontSize: 18 }}>{valueText(doc.value)}</strong>
        </div>
      </div>

      <p style={{ margin: "14px 0 6px" }}>
        Recebi de <CompanyId company={company} />, a quantia de <strong>{valueText(doc.value)}</strong> (
        {doc.value > 0 ? <em>{valorPorExtenso(doc.value)}</em> : <Blank width="70mm" />}), referente ao pagamento da diária de{" "}
        <strong>{person.functionName}</strong>, realizada em <strong>{dateOrBlank(person.date)}</strong>, das {person.startsAt} às{" "}
        {person.endsAt}
        {where ? `, em ${where}` : ""}.
      </p>

      <p style={{ margin: "0 0 10px" }}>
        Forma de pagamento: <strong>{doc.method === "A combinar" ? "________________" : doc.method}</strong>
        &nbsp;&nbsp;•&nbsp;&nbsp;Data do pagamento: <strong>{dateOrBlank(doc.payDate)}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 10 }}>
        <div>
          Nome: <strong>{person.name}</strong>
        </div>
        <div>CPF: {cpf ? <strong>{cpf}</strong> : <Blank width="34mm" />}</div>
      </div>

      <Signatures profissional={person.name} pagador={company.responsible || company.name} />
      <Footer />
    </div>
  );
}

function ShiftVoucher({ doc, company }: { doc: ReceiptDoc; company: ReceiptCompany }) {
  const { person } = doc;
  const cpf = formatCPF(doc.cpf);
  const row: CSSProperties = { display: "grid", gridTemplateColumns: "32mm 1fr", gap: 8, padding: "2px 0", borderBottom: "1px solid #ccc" };

  return (
    <div style={blockStyle}>
      <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>{company.name}</div>
      <h2 style={{ margin: "2px 0 8px", fontSize: 20 }}>COMPROVANTE DE TURNO</h2>

      <div style={row}>
        <strong>Profissional</strong>
        <span>{person.name}</span>
      </div>
      <div style={row}>
        <strong>CPF</strong>
        <span>{cpf || <Blank width="34mm" />}</span>
      </div>
      <div style={row}>
        <strong>Função</strong>
        <span>{person.functionName}</span>
      </div>
      <div style={row}>
        <strong>Evento</strong>
        <span>{person.eventTitle}</span>
      </div>
      <div style={row}>
        <strong>Data e horário</strong>
        <span>
          {dateOrBlank(person.date)}, das {person.startsAt} às {person.endsAt}
        </span>
      </div>
      {person.place && (
        <div style={row}>
          <strong>Local</strong>
          <span>{person.place}</span>
        </div>
      )}
      <div style={row}>
        <strong>Valor da diária</strong>
        <span>{valueText(doc.value)}</span>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12 }}>Registro da participação do profissional no turno descrito acima.</p>

      <Signatures profissional={person.name} pagador={company.responsible || company.name} />
      <Footer />
    </div>
  );
}

function Block({ doc, company }: { doc: ReceiptDoc; company: ReceiptCompany }) {
  return doc.kind === "recibo" ? <PaymentReceipt doc={doc} company={company} /> : <ShiftVoucher doc={doc} company={company} />;
}

/** Dois documentos por folha A4, separados por linha de corte; folha nova a cada par. */
export function ReceiptPages({ docs, company }: { docs: ReceiptDoc[]; company: ReceiptCompany }) {
  const pages: ReceiptDoc[][] = [];
  for (let index = 0; index < docs.length; index += 2) pages.push(docs.slice(index, index + 2));

  return (
    <div>
      {pages.map((pair, pageIndex) => (
        <div
          key={pageIndex}
          style={pageIndex < pages.length - 1 ? { pageBreakAfter: "always", breakAfter: "page" } : undefined}
        >
          <Block doc={pair[0]} company={company} />
          {pair[1] && (
            <>
              <div style={{ borderTop: "1px dashed #000", margin: "0 0 0", textAlign: "center", fontSize: 9, color: "#555", lineHeight: "8px" }}>
                <span style={{ background: "#fff", padding: "0 6px", position: "relative", top: -5 }}>✂ corte aqui</span>
              </div>
              <Block doc={pair[1]} company={company} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
