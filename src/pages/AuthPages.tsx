import { Link, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Building2, Camera, CheckCircle2, ClipboardList, LogIn, UserRound } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { experienceLevels, functions } from "../data/demoData";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";
import type { UserRole } from "../lib/types";

const companyRequiredFields = [
  "Nome do estabelecimento",
  "Responsável",
  "CNPJ",
  "Telefone",
  "E-mail",
  "Senha",
  "Categoria",
  "Bairro",
  "Endereço",
  "Descrição"
];

export function LoginPage() {
  const { setRole } = useAppStore();
  const { authEnabled, signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <AuthShell title="Entrar no Free Floripa" description="Acesse com e-mail e senha para entrar na sua área.">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const fallbackRole: UserRole = form.get("role") === "empresa" ? "empresa" : "trabalhador";
          const email = String(form.get("email") || "").trim();
          const password = String(form.get("password") || "");

          try {
            setPending(true);
            setError("");
            const result = await signIn({ email, password, fallbackRole });
            setRole(result.role);
            navigate(result.role === "empresa" ? "/app/empresa" : "/app/trabalhador");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível entrar.");
          } finally {
            setPending(false);
          }
        }}
      >
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
        {!authEnabled && <div className="rounded-lg bg-aqua-100 p-3 text-sm font-bold text-navy-950">Modo local: Supabase não configurado neste ambiente.</div>}
        <label className="label">E-mail<input name="email" className="input" type="email" required placeholder="seu@email.com" /></label>
        <label className="label">Senha<input name="password" className="input" type="password" required placeholder="••••••••" /></label>
        <label className="label">Tipo de acesso<select name="role" className="input"><option value="trabalhador">Trabalhador</option><option value="empresa">Empresa</option></select></label>
        <button type="submit" disabled={pending} className="primary"><LogIn size={17} /> {pending ? "Entrando..." : "Entrar"}</button>
        <div className="grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
          <Link to="/cadastro-trabalhador" className="secondary">Criar conta trabalhador</Link>
          <Link to="/cadastro-empresa" className="secondary">Criar conta empresa</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function WorkerSignupPage() {
  const { setRole } = useAppStore();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>(["Garçom"]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <AuthShell title="Cadastro do trabalhador" description="Crie seu perfil para receber vagas de turnos, diárias e eventos.">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") || "").trim();
          const password = String(form.get("password") || "");
          const name = String(form.get("name") || "").trim();
          const phone = String(form.get("phone") || "").trim();
          const city = String(form.get("city") || "").trim();
          const neighborhood = String(form.get("neighborhood") || "").trim();
          const birthDate = String(form.get("birthDate") || "").trim();
          const experience = String(form.get("experience") || "").trim();
          const description = String(form.get("description") || "").trim();
          const availability = String(form.get("availability") || "").trim();
          const maxDistanceKm = Number(form.get("maxDistanceKm") || 0);
          const functionLevels = selectedFunctions.map((item) => ({
            function: item,
            level: String(form.get(`level-${item}`) || "Iniciante")
          }));

          if (selectedFunctions.length === 0) {
            setError("Selecione pelo menos uma profissão.");
            return;
          }

          try {
            setPending(true);
            setError("");
            setMessage("");
            const result = await signUp({
              email,
              password,
              fallbackRole: "trabalhador",
              metadata: {
                name,
                phone,
                city,
                neighborhood,
                birthDate,
                experience,
                description,
                availability,
                hasTransport: form.get("hasTransport") === "Sim",
                maxDistanceKm,
                functions: selectedFunctions,
                functionLevels
              }
            });
            setRole("trabalhador");
            if (result.needsEmailConfirmation) {
              setMessage("Conta criada. Confirme o e-mail antes de fazer login.");
            } else {
              navigate("/app/trabalhador");
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível criar o cadastro.");
          } finally {
            setPending(false);
          }
        }}
      >
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
        {message && <div className="rounded-lg bg-aqua-100 p-3 text-sm font-bold text-navy-950">{message}</div>}
        <section className="rounded-lg border border-aqua-100 bg-aqua-100 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-navy-950">
            <ClipboardList size={17} /> Dados obrigatórios do cadastro
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{companyRequiredFields.join(", ")}.</p>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Nome completo<input name="name" className="input" required /></label>
          <label className="label">Telefone<input name="phone" className="input" required placeholder="(48) 99999-9999" /></label>
          <label className="label">E-mail<input name="email" className="input" type="email" required /></label>
          <label className="label">Senha<input name="password" className="input" type="password" required /></label>
          <label className="label">Foto de perfil<span className="secondary justify-start"><Camera size={17} /> Selecionar foto</span></label>
          <label className="label">Data de nascimento<input name="birthDate" className="input" type="date" required /></label>
          <label className="label">Cidade<input name="city" className="input" defaultValue="Florianópolis" required /></label>
          <label className="label">Bairro<input name="neighborhood" className="input" required placeholder="Campeche" /></label>
        </div>
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-black text-slate-600">Profissões e nível de experiência</legend>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {functions.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    name="functions"
                    value={item}
                    checked={selectedFunctions.includes(item)}
                    onChange={(event) => {
                      setSelectedFunctions((current) =>
                        event.target.checked ? [...current, item] : current.filter((value) => value !== item)
                      );
                    }}
                    className="h-4 w-4 accent-aqua-500"
                  />
                  {item}
                </label>
                {selectedFunctions.includes(item) && (
                  <div className="mt-3 grid gap-2">
                    <label className="label">
                      Nível nesta função
                      <select name={`level-${item}`} className="input">
                        {experienceLevels.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" defaultChecked className="h-4 w-4 accent-aqua-500" />
                      Aceito começar como auxiliar nessa função
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Informe com sinceridade. Avaliações ruins podem limitar novas vagas nessa função.
          </p>
        </fieldset>
        <label className="label">Experiência profissional<textarea name="experience" className="input min-h-20 py-3" required /></label>
        <label className="label">Pequena descrição<textarea name="description" className="input min-h-20 py-3" required /></label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="label">Disponibilidade<input name="availability" className="input" placeholder="Noites e fins de semana" /></label>
          <label className="label">Transporte próprio<select name="hasTransport" className="input"><option>Sim</option><option>Não</option></select></label>
          <label className="label">Distância máxima<input name="maxDistanceKm" className="input" type="number" min="1" placeholder="20 km" /></label>
        </div>
        <button type="submit" disabled={pending} className="primary"><UserRound size={17} /> {pending ? "Criando..." : "Criar perfil"}</button>
      </form>
    </AuthShell>
  );
}

export function CompanySignupPage() {
  const { setRole } = useAppStore();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <AuthShell title="Cadastro da empresa" description="Cadastre seu estabelecimento para publicar vagas temporárias em poucos minutos.">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") || "").trim();
          const password = String(form.get("password") || "");

          try {
            setPending(true);
            setError("");
            setMessage("");
            const result = await signUp({
              email,
              password,
              fallbackRole: "empresa",
              metadata: {
                establishmentName: String(form.get("establishmentName") || "").trim(),
                responsibleName: String(form.get("responsibleName") || "").trim(),
                cnpj: String(form.get("cnpj") || "").trim(),
                phone: String(form.get("phone") || "").trim(),
                category: String(form.get("category") || "").trim(),
                neighborhood: String(form.get("neighborhood") || "").trim(),
                address: String(form.get("address") || "").trim(),
                description: String(form.get("description") || "").trim()
              }
            });
            setRole("empresa");
            if (result.needsEmailConfirmation) {
              setMessage("Conta criada. Confirme o e-mail antes de fazer login.");
            } else {
              navigate("/app/empresa");
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível criar a conta da empresa.");
          } finally {
            setPending(false);
          }
        }}
      >
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
        {message && <div className="rounded-lg bg-aqua-100 p-3 text-sm font-bold text-navy-950">{message}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Nome do estabelecimento<input name="establishmentName" className="input" required /></label>
          <label className="label">Nome do responsável<input name="responsibleName" className="input" required /></label>
          <label className="label">CNPJ<input name="cnpj" className="input" required placeholder="00.000.000/0000-00" /></label>
          <label className="label">Telefone<input name="phone" className="input" required placeholder="(48) 99999-9999" /></label>
          <label className="label">E-mail<input name="email" className="input" type="email" required /></label>
          <label className="label">Senha<input name="password" className="input" type="password" required /></label>
          <label className="label">Categoria<select name="category" className="input" required><option>Restaurante</option><option>Bar</option><option>Beach club</option><option>Hotel</option><option>Casa noturna</option><option>Buffet</option><option>Agência de eventos</option><option>Outro</option></select></label>
          <label className="label">Bairro<input name="neighborhood" className="input" required placeholder="Jurerê" /></label>
        </div>
        <label className="label">Endereço<input name="address" className="input" required /></label>
        <label className="label">Descrição<textarea name="description" className="input min-h-20 py-3" required /></label>
        <label className="label">Foto ou logotipo<span className="secondary justify-start"><Camera size={17} /> Selecionar arquivo</span></label>
        <button type="submit" disabled={pending} className="primary"><Building2 size={17} /> {pending ? "Criando..." : "Criar conta da empresa"}</button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <main className="mx-auto max-w-3xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-navy-900">
          <ArrowLeft size={17} /> Voltar
        </Link>
        <section className="card p-5">
          <div className="mb-5">
            <div className="mb-4">
              <BrandLogo />
            </div>
            <h1 className="text-2xl font-black text-navy-950">{title}</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-aqua-700">
              <CheckCircle2 size={17} /> Login real com Supabase Auth quando configurado.
            </p>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
