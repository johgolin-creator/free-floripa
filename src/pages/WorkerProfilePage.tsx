import { useState } from "react";
import { BadgeCheck, Edit3, Save, Star } from "lucide-react";
import { Modal } from "../components/Modal";
import { ProfileImageUploader } from "../components/ProfileImageUploader";
import { SectionHeader } from "../components/SectionHeader";
import { experienceLevels, functions, neighborhoods } from "../data/demoData";
import { useAppStore } from "../lib/store";
import { calculateReliability, getExperienceLabel, getFunctionExperience } from "../lib/rules";
import type { JobFunction } from "../lib/types";

export function WorkerProfilePage() {
  const { currentWorker, updateWorkerProfile } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFunctions, setSelectedFunctions] = useState<JobFunction[]>(currentWorker.functions);
  const [avatarUrl, setAvatarUrl] = useState(currentWorker.avatarUrl);
  const reliability = calculateReliability(currentWorker);
  const functionExperiences = currentWorker.functions
    .map((item) => getFunctionExperience(currentWorker, item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div>
      <SectionHeader
        eyebrow="Perfil"
        title="Perfil do trabalhador"
        action={
          <button
            type="button"
            onClick={() => {
              setSelectedFunctions(currentWorker.functions);
              setAvatarUrl(currentWorker.avatarUrl);
              setError("");
              setEditing(true);
            }}
            className="primary"
          >
            <Edit3 size={17} /> Editar perfil
          </button>
        }
      />
      {message && <div className="mb-4 rounded-lg bg-navy-950 p-3 text-sm font-bold text-white">{message}</div>}
      <section className="card overflow-hidden">
        <div className="h-36 bg-[url('https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="p-5">
          <div className="-mt-16 flex flex-col gap-4 md:flex-row md:items-end">
            <img src={currentWorker.avatarUrl} alt="" className="h-28 w-28 rounded-lg border-4 border-white object-cover shadow-soft" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-navy-950">{currentWorker.name}</h2>
                {currentWorker.verified && <span className="badge bg-aqua-100 text-aqua-700"><BadgeCheck size={15} /> Perfil verificado</span>}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{currentWorker.functions.join(", ")}</p>
            </div>
            <div className="rounded-lg bg-aqua-100 p-4 text-center">
              <strong className="block text-3xl font-black text-navy-950">{reliability}%</strong>
              <span className="text-sm font-bold text-slate-600">Índice de Confiabilidade</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Info label="Bairro" value={currentWorker.neighborhood} />
            <Info label="Distância" value={`até ${currentWorker.maxDistanceKm} km`} />
            <Info label="Nota" value={`${currentWorker.rating.toFixed(1)} estrelas`} />
            <Info label="Trabalhos concluídos" value={String(currentWorker.completedJobs)} />
            <Info label="Comparecimento" value={`${currentWorker.attendanceRate}%`} />
            <Info label="Pontualidade" value={`${currentWorker.punctualityRate}%`} />
            <Info label="Cancelamentos" value={String(currentWorker.cancellations)} />
            <Info label="Transporte próprio" value={currentWorker.hasTransport ? "Sim" : "Não"} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="font-black text-navy-950">Descrição</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{currentWorker.description}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Disponibilidade: {currentWorker.availability}</p>
              <h3 className="mt-5 font-black text-navy-950">Nível por profissão</h3>
              <div className="mt-2 grid gap-2">
                {functionExperiences.map((experience) => (
                  <div key={experience.function} className="rounded-lg bg-slate-50 p-3">
                    <span className="text-xs font-black uppercase text-slate-500">{experience.function}</span>
                    <strong className="mt-1 block text-sm text-navy-950">{getExperienceLabel(experience.level)}</strong>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {experience.months} meses informados
                      {experience.acceptsAssistant ? " - aceita auxiliar" : ""}
                      {experience.verified ? " - verificado" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-black text-navy-950">Avaliações recebidas</h3>
              <div className="mt-2 grid gap-2">
                {currentWorker.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg bg-slate-50 p-3">
                    <span className="flex items-center gap-1 text-sm font-bold text-navy-950"><Star size={15} /> {review.rating} - {review.authorName}</span>
                    <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {editing && (
        <Modal title="Editar perfil do trabalhador" onClose={() => setEditing(false)}>
          <form
            className="grid max-h-[72vh] gap-3 overflow-auto pr-1"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const name = String(form.get("name") || "").trim();
              const phone = String(form.get("phone") || "").trim();
              const email = String(form.get("email") || "").trim();
              const birthDate = String(form.get("birthDate") || "").trim();
              const city = String(form.get("city") || "").trim();
              const neighborhood = String(form.get("neighborhood") || "").trim();
              const experience = String(form.get("experience") || "").trim();
              const description = String(form.get("description") || "").trim();
              const availability = String(form.get("availability") || "").trim();
              const maxDistanceKm = Number(form.get("maxDistanceKm"));

              if (!name || !phone || !email || !birthDate || !city || !neighborhood || !description || !availability || maxDistanceKm <= 0) {
                setError("Preencha nome, contato, localização, descrição, disponibilidade e distância máxima.");
                return;
              }
              if (selectedFunctions.length === 0) {
                setError("Selecione pelo menos uma profissão.");
                return;
              }

              updateWorkerProfile({
                name,
                phone,
                email,
                avatarUrl: avatarUrl.trim() || currentWorker.avatarUrl,
                birthDate,
                city,
                neighborhood: neighborhood as typeof currentWorker.neighborhood,
                functions: selectedFunctions,
                functionExperience: selectedFunctions.map((functionName) => {
                  const existing = currentWorker.functionExperience.find((item) => item.function === functionName);
                  return {
                    function: functionName,
                    level: String(form.get(`level-${functionName}`) || existing?.level || "Iniciante") as NonNullable<typeof existing>["level"],
                    months: Math.max(0, Number(form.get(`months-${functionName}`) || existing?.months || 0)),
                    acceptsAssistant: form.get(`assistant-${functionName}`) === "on",
                    verified: existing?.verified ?? false
                  };
                }),
                experience,
                description,
                availability,
                maxDistanceKm,
                hasTransport: form.get("hasTransport") === "on"
              });
              setError("");
              setEditing(false);
              setMessage("Perfil atualizado com sucesso.");
            }}
          >
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-alert">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="label">
                Nome completo
                <input name="name" className="input" required defaultValue={currentWorker.name} />
              </label>
              <label className="label">
                Telefone
                <input name="phone" className="input" required defaultValue={currentWorker.phone} />
              </label>
              <label className="label">
                E-mail de contato
                <input name="email" type="email" className="input" required defaultValue={currentWorker.email} />
              </label>
              <label className="label">
                Data de nascimento
                <input name="birthDate" type="date" className="input" required defaultValue={currentWorker.birthDate} />
              </label>
              <ProfileImageUploader
                label="Foto do perfil"
                value={avatarUrl}
                kind="trabalhadores"
                previewAlt="Foto do trabalhador"
                onChange={setAvatarUrl}
              />
              <label className="label">
                Cidade
                <input name="city" className="input" required defaultValue={currentWorker.city} />
              </label>
              <label className="label">
                Bairro
                <select name="neighborhood" className="input" required defaultValue={currentWorker.neighborhood}>
                  {neighborhoods.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-black text-slate-600">Profissões e experiência</legend>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {functions.map((functionName) => {
                  const selected = selectedFunctions.includes(functionName);
                  const existing = currentWorker.functionExperience.find((item) => item.function === functionName);
                  return (
                    <div key={functionName} className="rounded-lg border border-slate-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            setSelectedFunctions((current) =>
                              event.target.checked
                                ? [...current, functionName]
                                : current.filter((item) => item !== functionName)
                            );
                          }}
                          className="h-4 w-4 accent-aqua-500"
                        />
                        {functionName}
                      </label>
                      {selected && (
                        <div className="mt-3 grid gap-2">
                          <label className="label">
                            Nível
                            <select name={`level-${functionName}`} className="input" defaultValue={existing?.level ?? "Iniciante"}>
                              {experienceLevels.map((level) => (
                                <option key={level.value} value={level.value}>{level.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="label">
                            Meses de experiência
                            <input name={`months-${functionName}`} type="number" min="0" className="input" defaultValue={existing?.months ?? 0} />
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input name={`assistant-${functionName}`} type="checkbox" defaultChecked={existing?.acceptsAssistant ?? true} className="h-4 w-4 accent-aqua-500" />
                            Aceito começar como auxiliar
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <label className="label">
              Experiência profissional
              <textarea name="experience" className="input min-h-24 py-3" defaultValue={currentWorker.experience} />
            </label>
            <label className="label">
              Pequena descrição
              <textarea name="description" className="input min-h-24 py-3" required defaultValue={currentWorker.description} />
            </label>
            <label className="label">
              Disponibilidade
              <input name="availability" className="input" required defaultValue={currentWorker.availability} />
            </label>
            <label className="label">
              Distância máxima
              <input name="maxDistanceKm" type="number" min="1" className="input" required defaultValue={currentWorker.maxDistanceKm} />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input name="hasTransport" type="checkbox" defaultChecked={currentWorker.hasTransport} className="h-5 w-5 accent-aqua-500" />
              Tenho transporte próprio
            </label>
            <button type="submit" className="primary"><Save size={17} /> Salvar perfil</button>
          </form>
        </Modal>
      )}
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
