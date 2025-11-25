type StorageLocation = {
  id: string;
  zone: string;
  shelf?: string | null;
  bin?: string | null;
  capacity?: number | null;
  items: Array<{ name: string; quantity?: number | null }>;
};

export function FoodStorageMapViewer({ locations }: { locations: StorageLocation[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Storage Map
        </p>
        <h2 className="text-xl font-light">Cold + Dry Zones</h2>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((location) => (
          <article
            key={location.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex items-center justify-between text-sm text-white/80">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {location.zone}
                </p>
                <p className="text-base">{location.shelf ?? "Shelf A"}</p>
              </div>
              {typeof location.capacity === "number" && (
                <span className="text-xs text-white/60">
                  Capacity {location.capacity}
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              {location.items.map((item) => (
                <li key={item.name} className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <span className="text-white/50">
                    {item.quantity ?? "—"}
                  </span>
                </li>
              ))}
              {location.items.length === 0 && (
                <li className="text-white/50">No mapped items.</li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
