export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      <div className="h-40 rounded-2xl bg-neutral-900/60 shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-900/60 shimmer" />
        ))}
      </div>
    </div>
  );
}
