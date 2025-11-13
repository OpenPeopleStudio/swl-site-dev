"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type ContactRecord = {
  id: string;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
};

type NewMessageDrawerProps = {
  open: boolean;
  query: string;
  contacts: ContactRecord[];
  onQueryChange: (value: string) => void;
  onSelect: (contactId: string) => void;
};

export function NewMessageDrawer({
  open,
  query,
  contacts,
  onQueryChange,
  onSelect,
}: NewMessageDrawerProps) {
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return contacts;
    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(value),
    );
  }, [contacts, query]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -24, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-[inset_0_1px_12px_rgba(255,255,255,0.08)] backdrop-blur-xl"
    >
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search contacts…"
        className="mb-3 w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
      />
      <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filtered.map((contact) => (
          <li key={contact.id}>
            <button
              type="button"
              onClick={() => onSelect(contact.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/40"
            >
              {contact.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={contact.avatarUrl}
                  alt={contact.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-xs uppercase tracking-[0.3em]">
                  {contact.name.slice(0, 2)}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-white">
                  {contact.name}
                </p>
                {contact.role && (
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {contact.role}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default NewMessageDrawer;
