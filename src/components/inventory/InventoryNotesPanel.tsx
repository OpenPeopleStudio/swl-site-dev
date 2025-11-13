type InventoryNote = {
  id: string;
  author: string;
  body: string;
  timestamp: string;
  tags?: string[];
};

type InventoryNotesPanelProps = {
  notes: InventoryNote[];
  onCreate?: () => void;
};

export function InventoryNotesPanel({ notes, onCreate }: InventoryNotesPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Notes & Media
          </p>
          <h2 className="text-xl font-light">Inventory Log</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-2xl border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 hover:border-white/60"
        >
          Add Note
        </button>
      </header>

      <div className="space-y-3">
        {notes.map((note) => (
          <article
            key={note.id}
            className="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <div className="flex flex-wrap items-center justify-between text-xs text-white/50">
              <span>{note.author}</span>
              <span>{note.timestamp}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{note.body}</p>
            {note.tags && note.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-white/60">
            No notes captured today. Add delivery photos, spoilage reports, or vendor updates.
          </p>
        )}
      </div>
    </section>
  );
}
