"use client";

"use client";

import { motion, AnimatePresence } from "framer-motion";

type ContactRecord = {
  id: string;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
};

type NewMessageDrawerProps = {
  open: boolean;
  contacts: ContactRecord[];
  onSelect: (contactId: string) => void;
};

export function NewMessageDrawer({
  open,
  contacts,
  onSelect,
}: NewMessageDrawerProps) {

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="rounded-3xl border border-white/12 bg-white/5 p-4 text-white shadow-[inset_0_1px_15px_rgba(255,255,255,0.08)] backdrop-blur"
        >
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelect(contact.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:border-white/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xs uppercase tracking-[0.3em]">
                  {contact.name.slice(0, 2)}
                </div>
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
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NewMessageDrawer;
