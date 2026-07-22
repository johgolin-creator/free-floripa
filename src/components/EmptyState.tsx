export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="card grid place-items-center p-8 text-center">
      <h3 className="text-lg font-black text-navy-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
