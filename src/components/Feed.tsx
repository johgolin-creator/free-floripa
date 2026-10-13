import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Award, BadgeCheck, CalendarDays, Clock, MapPin, Share2, Star, Users, UsersRound } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { UrgentBadge } from "./UrgentBadge";
import { formatCurrency, formatDate, pluralize } from "../lib/format";
import { functionLabel } from "../lib/functionInfo";
import { getOpenSlots, isWorkerVerified } from "../lib/rules";
import { timeAgo, type FeedItem, type FeedTab } from "../lib/feed";
import type { Job } from "../lib/types";

const PAGE_SIZE = 8;

export function Feed({
  tabs,
  buildItems,
  emptyText
}: {
  tabs: FeedTab[];
  buildItems: (tab: FeedTab) => FeedItem[];
  emptyText: Partial<Record<FeedTab, string>>;
}) {
  const [tab, setTab] = useState<FeedTab>(tabs[0]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const items = useMemo(() => buildItems(tab), [buildItems, tab]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visible < items.length;

  useEffect(() => setVisible(PAGE_SIZE), [tab]);

  // Rolagem infinita: carrega a próxima página quando o fim do feed aparece.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible((current) => current + PAGE_SIZE);
    }, { rootMargin: "400px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

  return (
    <section className="feed" aria-label="Feed">
      <div className="feed-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "is-active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nada por aqui ainda" text={emptyText[tab] ?? "Volte daqui a pouco para ver novidades."} />
      ) : (
        <div className="feed-list stagger-list">
          {items.slice(0, visible).map((item) => (
            <FeedPost key={item.id} item={item} />
          ))}
          {hasMore && (
            <div ref={sentinelRef}>
              <button type="button" className="secondary w-full" onClick={() => setVisible((current) => current + PAGE_SIZE)}>
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FeedPost({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "job":
      return <JobPost job={item.job} companyName={item.company?.establishmentName} logoUrl={item.company?.logoUrl} coverUrl={item.company?.coverUrl} matchScore={item.matchScore} />;
    case "application":
      return (
        <PostShell
          avatar={item.worker.avatarUrl}
          name={item.worker.name}
          subtitle={`se candidatou · ${timeAgo(item.createdAt)}`}
          verified={isWorkerVerified(item.worker)}
        >
          <p className="feed-post-text">
            Quer trabalhar em <strong>{item.job.title}</strong> ({formatDate(item.job.date)}, {item.job.startsAt}).
          </p>
          <WorkerStats completedJobs={item.worker.completedJobs} rating={item.worker.rating} />
          <PostActions>
            <Link to={`/app/candidatos?vaga=${item.job.id}`} className="primary">Ver candidato</Link>
            <span className="feed-post-meta">Status: {item.application.status}</span>
          </PostActions>
        </PostShell>
      );
    case "companyReview":
      return (
        <PostShell
          avatar={item.authorAvatar}
          name={item.review.workerName}
          subtitle={`avaliou ${item.company?.establishmentName ?? "uma empresa"} · ${timeAgo(item.createdAt)}`}
        >
          <Stars value={item.review.rating} />
          {item.review.comment && <p className="feed-post-quote">“{item.review.comment}”</p>}
        </PostShell>
      );
    case "workerReview":
      return (
        <PostShell avatar={item.authorAvatar} name={item.review.authorName} subtitle={`avaliou você${item.createdAt ? ` · ${timeAgo(item.createdAt)}` : ""}`}>
          <Stars value={item.review.rating} />
          {item.review.comment && <p className="feed-post-quote">“{item.review.comment}”</p>}
        </PostShell>
      );
    case "milestone":
      return (
        <PostShell avatar={item.worker.avatarUrl} name={item.worker.name} subtitle="conquista">
          <div className="feed-milestone">
            <Award size={28} />
            <div>
              <strong>{item.turns}+ turnos concluídos</strong>
              <span>Mais um profissional de confiança no PONT. Parabéns! 🎉</span>
            </div>
          </div>
        </PostShell>
      );
    case "spotlight":
      return (
        <PostShell avatar={item.worker.avatarUrl} name={item.worker.name} subtitle={`profissional em destaque · ${item.worker.neighborhood}`} verified>
          {item.worker.photos.length > 0 && (
            <div className="feed-gallery">
              {item.worker.photos.slice(0, 3).map((photo) => (
                <img key={photo} src={photo} alt="" loading="lazy" decoding="async" />
              ))}
            </div>
          )}
          {item.worker.description && <p className="feed-post-text line-clamp-3">{item.worker.description}</p>}
          <WorkerStats completedJobs={item.worker.completedJobs} rating={item.worker.rating} />
          <PostActions>
            <Link to="/app/profissionais" className="secondary">Ver no banco de profissionais</Link>
          </PostActions>
        </PostShell>
      );
  }
}

function JobPost({
  job,
  companyName,
  logoUrl,
  coverUrl,
  matchScore
}: {
  job: Job;
  companyName?: string;
  logoUrl?: string;
  coverUrl?: string;
  matchScore?: number;
}) {
  const [shared, setShared] = useState(false);
  const openSlots = getOpenSlots(job);

  async function share() {
    const url = `${window.location.origin}/app/vagas/${job.id}`;
    const text = `${job.title} - ${formatCurrency(job.dailyValue)} - ${formatDate(job.date)} no PONT`;
    try {
      if (navigator.share) {
        await navigator.share({ title: job.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Compartilhamento cancelado pela pessoa: nada a fazer.
    }
  }

  return (
    <PostShell
      avatar={logoUrl}
      name={companyName ?? "Empresa"}
      subtitle={`${job.neighborhood} · ${functionLabel(job.function)}`}
      badge={job.urgent ? <UrgentBadge /> : undefined}
    >
      <Link to={`/app/vagas/${job.id}`} className={`feed-job-media ${coverUrl ? "" : "is-plain"}`} style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}>
        <span className="feed-job-media-label">{functionLabel(job.function)}</span>
        <strong>{formatCurrency(job.dailyValue)}</strong>
        <span>diária</span>
      </Link>
      <h3 className="feed-post-title">{job.title}</h3>
      {job.description && <p className="feed-post-text line-clamp-3">{job.description}</p>}
      <div className="feed-pills">
        <span className="meta-pill"><CalendarDays size={15} /> {formatDate(job.date)}</span>
        <span className="meta-pill"><Clock size={15} /> {job.startsAt} às {job.endsAt}</span>
        <span className="meta-pill"><MapPin size={15} /> {job.neighborhood}</span>
        <span className="meta-pill"><Users size={15} /> {pluralize(openSlots, "vaga", "vagas")}</span>
      </div>
      <PostActions>
        <Link to={`/app/vagas/${job.id}`} className="primary">Quero essa vaga</Link>
        <button type="button" className="secondary" onClick={share}>
          <Share2 size={16} /> {shared ? "Link copiado" : "Compartilhar"}
        </button>
        <span className="feed-post-meta">
          <UsersRound size={14} /> {job.candidates} candidato{job.candidates === 1 ? "" : "s"}
          {typeof matchScore === "number" && matchScore >= 55 && <> · {matchScore >= 75 ? "Ótima" : "Boa"} combinação</>}
        </span>
      </PostActions>
    </PostShell>
  );
}

function PostShell({
  avatar,
  name,
  subtitle,
  verified = false,
  badge,
  children
}: {
  avatar?: string;
  name: string;
  subtitle: string;
  verified?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="feed-post fade-up">
      <header className="feed-post-head">
        {avatar ? <img src={avatar} alt="" loading="lazy" decoding="async" /> : <span className="feed-avatar-fallback">{name.charAt(0)}</span>}
        <div className="min-w-0">
          <strong>
            {name} {verified && <BadgeCheck size={15} aria-label="Verificado" />}
          </strong>
          <span>{subtitle}</span>
        </div>
        {badge && <div className="ml-auto shrink-0">{badge}</div>}
      </header>
      {children}
    </article>
  );
}

function PostActions({ children }: { children: ReactNode }) {
  return <div className="feed-post-actions">{children}</div>;
}

function WorkerStats({ completedJobs, rating }: { completedJobs: number; rating: number }) {
  return (
    <div className="feed-pills">
      <span className="meta-pill"><Star size={15} /> {rating.toFixed(1)}</span>
      <span className="meta-pill"><Award size={15} /> {pluralize(completedJobs, "turno", "turnos")}</span>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <div className="feed-stars" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={18} className={n <= rounded ? "is-on" : ""} />
      ))}
    </div>
  );
}
