import { Link, useNavigate } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, ClipboardList, KeyRound, LogIn, Mail, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { experienceLevels, functions, neighborhoods } from "../data/demoData";
import { useAuth } from "../lib/auth";
import { useAppStore } from "../lib/store";
import type { JobFunction, UserRole } from "../lib/types";

const workerRequiredFields = [
  "Nome completo",
  "Telefone",
  "E-mail",
  "Senha",
  "Data de nascimento",
  "Cidade",
  "Bairro",
  "Profissões",
  "Nível de experiência",
  "Experiência profissional",
  "Descrição",
  "Disponibilidade",
  "Distância máxima"
];

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
    <AuthShell title="Entrar no PONT" description="Acesse com e-mail e senha para entrar na sua área.">
      <form
        className="auth-form"
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
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {!authEnabled && <div className="auth-alert auth-alert-info">Modo demonstração: dados salvos apenas neste aparelho.</div>}
        <label className="label">E-mail<input name="email" className="input" type="email" required placeholder="seu@email.com" /></label>
        <div className="grid gap-1">
          <label className="label">Senha<input name="password" className="input" type="password" required placeholder="••••••••" /></label>
          <Link to="/recuperar-senha" className="justify-self-start text-sm font-black text-aqua-700 hover:text-aqua-800">
            Esqueci minha senha
          </Link>
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-bold text-slate-600">Tipo de acesso</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="role-choice">
              <input type="radio" name="role" value="trabalhador" defaultChecked />
              <span><UserRound size={18} /> Trabalhador</span>
            </label>
            <label className="role-choice">
              <input type="radio" name="role" value="empresa" />
              <span><Building2 size={18} /> Empresa</span>
            </label>
          </div>
        </fieldset>
        <button type="submit" disabled={pending} className="primary"><LogIn size={17} /> {pending ? "Entrando..." : "Entrar"}</button>
        <div className="grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
          <Link to="/cadastro-trabalhador" className="secondary">Criar conta trabalhador</Link>
          <Link to="/cadastro-empresa" className="secondary">Criar conta empresa</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { authEnabled, loading, user, role, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const canSetNewPassword = authEnabled && Boolean(user);
  const isOpeningRecoveryLink = authEnabled && loading && (window.location.search.includes("code=") || window.location.hash.includes("access_token"));

  return (
    <AuthShell
      title={canSetNewPassword ? "Criar nova senha" : "Recuperar senha"}
      description={canSetNewPassword ? "Digite uma nova senha para voltar a acessar sua conta." : "Informe seu e-mail para receber o link de recuperação."}
    >
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);

          try {
            setPending(true);
            setError("");
            setMessage("");

            if (canSetNewPassword) {
              const password = String(form.get("password") || "");
              const confirmPassword = String(form.get("confirmPassword") || "");

              if (password.length < 6) {
                setError("A nova senha precisa ter pelo menos 6 caracteres.");
                return;
              }
              if (password !== confirmPassword) {
                setError("As senhas não conferem.");
                return;
              }

              await updatePassword({ password });
              setMessage("Senha atualizada com sucesso.");
              return;
            }

            const email = String(form.get("email") || "").trim();
            await resetPassword({ email });
            setMessage("Enviamos um link para seu e-mail. Abra esse link para criar uma nova senha.");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível recuperar a senha.");
          } finally {
            setPending(false);
          }
        }}
      >
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-info">{message}</div>}
        {isOpeningRecoveryLink && (
          <div className="auth-alert auth-alert-info">
            Validando o link de recuperação. Aguarde um instante.
          </div>
        )}
        {!authEnabled && (
          <div className="auth-alert auth-alert-info">
            No modo demonstração, a recuperação por e-mail fica disponível apenas no site online.
          </div>
        )}

        {canSetNewPassword ? (
          <>
            <label className="label">
              Nova senha
              <input name="password" className="input" type="password" required placeholder="Digite a nova senha" />
            </label>
            <label className="label">
              Confirmar nova senha
              <input name="confirmPassword" className="input" type="password" required placeholder="Repita a nova senha" />
            </label>
            <button type="submit" disabled={pending} className="primary">
              <KeyRound size={17} /> {pending ? "Salvando..." : "Salvar nova senha"}
            </button>
            {message && (
              <button
                type="button"
                className="secondary"
                onClick={() => navigate(role === "empresa" ? "/app/empresa" : "/app/trabalhador")}
              >
                Entrar no app
              </button>
            )}
          </>
        ) : (
          <>
            <label className="label">
              E-mail cadastrado
              <input name="email" className="input" type="email" required placeholder="seu@email.com" />
            </label>
            <button type="submit" disabled={pending || !authEnabled || isOpeningRecoveryLink} className="primary">
              <Mail size={17} /> {pending ? "Enviando..." : "Enviar link de recuperação"}
            </button>
            <Link to="/login" className="secondary">Voltar para o login</Link>
          </>
        )}
      </form>
    </AuthShell>
  );
}

export function WorkerSignupPage() {
  const { setRole } = useAppStore();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [selectedFunctions, setSelectedFunctions] = useState<JobFunction[]>(["Garçom"]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <AuthShell title="Cadastro do trabalhador" description="Crie seu perfil para receber vagas de turnos, diárias e eventos.">
      <form
        className="auth-form"
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
          const avatarUrl = String(form.get("avatarUrl") || "").trim();
          const experience = String(form.get("experience") || "").trim();
          const description = String(form.get("description") || "").trim();
          const availability = String(form.get("availability") || "").trim();
          const maxDistanceKm = Number(form.get("maxDistanceKm") || 0);
          const functionLevels = selectedFunctions.map((item) => ({
            function: item,
            level: String(form.get(`level-${item}`) || "Iniciante"),
            months: Math.max(0, Number(form.get(`months-${item}`) || 0)),
            acceptsAssistant: false
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
                avatarUrl,
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
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-info">{message}</div>}
        <section className="auth-required-panel">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <ClipboardList size={17} /> Dados obrigatórios do cadastro
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{workerRequiredFields.join(", ")}.</p>
        </section>
        <SignupStep number="1" title="Acesso e contato" />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Nome completo<input name="name" className="input" required /></label>
          <label className="label">Telefone<input name="phone" className="input" required placeholder="(48) 99999-9999" /></label>
          <label className="label">E-mail<input name="email" className="input" type="email" required /></label>
          <label className="label">Senha<input name="password" className="input" type="password" required /></label>
        </div>
        <SignupStep number="2" title="Localização e foto" />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Foto de perfil<input name="avatarUrl" className="input" placeholder="Cole um link da foto ou envie depois no perfil" /></label>
          <label className="label">Data de nascimento<input name="birthDate" className="input" type="date" required /></label>
          <label className="label">Cidade<input name="city" className="input" defaultValue="Florianópolis" required /></label>
          <label className="label">
            Bairro
            <select name="neighborhood" className="input" required defaultValue="Centro">
              {neighborhoods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <SignupStep number="3" title="Profissões e experiência" />
        <fieldset className="rounded-lg border border-slate-200 bg-brand-charcoal/70 p-3">
          <legend className="px-1 text-sm font-black text-slate-600">Profissões e nível de experiência</legend>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {functions.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-brand-charcoal p-3 shadow-sm">
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
                    <label className="label">
                      Meses de experiência
                      <input name={`months-${item}`} type="number" min="0" className="input" defaultValue={0} />
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
        <SignupStep number="4" title="Disponibilidade" />
        <label className="label">Experiência profissional<textarea name="experience" className="input min-h-20 py-3" required /></label>
        <label className="label">Pequena descrição<textarea name="description" className="input min-h-20 py-3" required /></label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="label">Disponibilidade<input name="availability" className="input" required placeholder="Noites e fins de semana" /></label>
          <label className="label">Transporte próprio<select name="hasTransport" className="input"><option>Sim</option><option>Não</option></select></label>
          <label className="label">Distância máxima<input name="maxDistanceKm" className="input" type="number" min="1" required placeholder="20 km" /></label>
        </div>
        <LegalConsentText />
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
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") || "").trim();
          const password = String(form.get("password") || "");
          const logoUrl = String(form.get("logoUrl") || "").trim();

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
                description: String(form.get("description") || "").trim(),
                logoUrl
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
        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-info">{message}</div>}
        <section className="auth-required-panel">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <ClipboardList size={17} /> Dados obrigatórios da empresa
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{companyRequiredFields.join(", ")}.</p>
        </section>
        <SignupStep number="1" title="Acesso e responsável" />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Nome do estabelecimento<input name="establishmentName" className="input" required /></label>
          <label className="label">Nome do responsável<input name="responsibleName" className="input" required /></label>
          <label className="label">CNPJ<input name="cnpj" className="input" required placeholder="00.000.000/0000-00" /></label>
          <label className="label">Telefone<input name="phone" className="input" required placeholder="(48) 99999-9999" /></label>
          <label className="label">E-mail<input name="email" className="input" type="email" required /></label>
          <label className="label">Senha<input name="password" className="input" type="password" required /></label>
        </div>
        <SignupStep number="2" title="Estabelecimento" />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Categoria<select name="category" className="input" required><option>Restaurante</option><option>Bar</option><option>Beach club</option><option>Hotel</option><option>Casa noturna</option><option>Buffet</option><option>Agência de eventos</option><option>Outro</option></select></label>
          <label className="label">
            Bairro
            <select name="neighborhood" className="input" required defaultValue="Centro">
              {neighborhoods.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <label className="label">Endereço<input name="address" className="input" required /></label>
        <label className="label">Descrição<textarea name="description" className="input min-h-20 py-3" required /></label>
        <SignupStep number="3" title="Imagem da empresa" />
        <label className="label">Foto ou logotipo<input name="logoUrl" className="input" placeholder="Cole um link do logotipo ou envie depois no perfil" /></label>
        <LegalConsentText />
        <button type="submit" disabled={pending} className="primary"><Building2 size={17} /> {pending ? "Criando..." : "Criar conta da empresa"}</button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="auth-bg min-h-screen px-4 py-6">
      <main className="mx-auto max-w-6xl">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-charcoal px-3 py-2 text-sm font-black text-white shadow-sm transition hover:bg-aqua-50">
          <ArrowLeft size={17} /> Voltar
        </Link>
        <section className="auth-card card overflow-hidden p-0">
          <div className="color-strip h-2" />
          <div className="auth-shell-grid">
            <aside className="auth-side-panel">
              <BrandLogo inverted />
              <div>
                <p className="text-xs font-black uppercase text-aqua-300">PONT</p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-white">Acesse, publique e acompanhe turnos com mais controle.</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                  Uma entrada mais simples para empresas e trabalhadores seguirem para a área certa.
                </p>
              </div>
              <div className="auth-side-list">
                <span><ShieldCheck size={17} /> Acesso seguro por e-mail e senha</span>
                <span><BriefcaseBusiness size={17} /> Vagas e escalas organizadas</span>
                <span><UsersRound size={17} /> Perfis com experiência por função</span>
              </div>
            </aside>
            <div className="auth-content-panel">
              <div className="mb-5">
                <div className="mb-4 md:hidden">
                  <BrandLogo />
                </div>
                <h1 className="text-2xl font-black text-white">{title}</h1>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-aqua-700">
                  <CheckCircle2 size={17} /> Conta protegida para trabalhador e empresa.
                </p>
              </div>
              {children}
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-black text-slate-500">
                <Link to="/termos" className="hover:text-aqua-700">Termos de Uso</Link>
                <Link to="/privacidade" className="hover:text-aqua-700">Política de Privacidade</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LegalConsentText() {
  return (
    <p className="rounded-lg border border-slate-200 bg-brand-charcoal/80 p-3 text-xs font-semibold leading-5 text-slate-600">
      Ao criar a conta, você concorda com os{" "}
      <Link to="/termos" className="font-black text-aqua-700 hover:text-aqua-800">Termos de Uso</Link>
      {" "}e com a{" "}
      <Link to="/privacidade" className="font-black text-aqua-700 hover:text-aqua-800">Política de Privacidade</Link>
      {" "}do PONT.
    </p>
  );
}

function SignupStep({ number, title }: { number: string; title: string }) {
  return (
    <div className="signup-step mt-2 flex items-center gap-2 rounded-lg border border-aqua-100 bg-aqua-50 px-3 py-2">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-950 text-xs font-black text-aqua-300">{number}</span>
      <strong className="text-sm text-white">{title}</strong>
    </div>
  );
}
