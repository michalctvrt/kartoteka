"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { FULL, type WidgetSize } from "@/components/dashboard/size";

type Message = {
  id: number;
  text: string;
  author: string;
  created: string;
};

/**
 * `size`: S – poslední zpráva od vedení, M – zprávy od vedení,
 * L – zprávy + vzkazy pro další směnu.
 */
export default function ReceptionMessagesBlock({ size = FULL }: { size?: WidgetSize } = {}) {
  const [adminMessages, setAdminMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<Message[]>([]);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // simulace fetchování admin zpráv (zatím mock data)
  useEffect(() => {
    setAdminMessages([
      {
        id: 1,
        text: "Dnes nechte po směně všechny počítače zapnuté, díky!",
        author: "Admin",
        created: "08:00",
      },
      {
        id: 2,
        text: "Prosím všechny vedoucí, aby dnes odeslali nákupní seznam spotřebního materiálu.",
        author: "Admin",
        created: "08:15",
      },
    ]);
  }, []);

  function addNote() {
    if (!newNote.trim()) {
      setError("Vzkaz nesmí být prázdný.");
      return;
    }

    const note: Message = {
      id: Date.now(),
      text: newNote.trim(),
      author: "Recepce",
      created: new Date().toLocaleTimeString("cs-CZ", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setNotes((prev) => [note, ...prev]);
    setNewNote("");
    setError(null);
  }

  function removeNote(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  // ── S: jen nejnovější zpráva ──
  if (size.size === "S") {
    const last = adminMessages[adminMessages.length - 1];
    return (
      <div className="h-full flex flex-col justify-center text-sm">
        {last ? (
          <>
            <p className="line-clamp-3">{last.text}</p>
            <span className="text-xs text-ui-faint mt-1">
              — {last.author}, {last.created}
              {adminMessages.length > 1 && ` · +${adminMessages.length - 1} další`}
            </span>
          </>
        ) : (
          <p className="text-ui-faint">Na dnešek nejsou žádné zprávy.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 🔸 Admin zprávy */}
      <div>
        <h4 className="font-medium text-sm text-ui-ink mb-2">
          Denní zprávy od vedení
        </h4>

        {adminMessages.length === 0 ? (
          <p className="text-ui-faint text-sm">
            Na dnešek nejsou žádné zprávy.
          </p>
        ) : (
          <ul className="space-y-2">
            {adminMessages.map((m) => (
              <li
                key={m.id}
                className="p-3 bg-ui-raised border border-ui-line rounded-lg text-sm"
              >
                <p>{m.text}</p>
                <span className="text-xs text-ui-faint">
                  — {m.author}, {m.created}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {size.size === "L" && (<>
      <hr />

      {/* ✏️ Vzkazy pro další směnu */}
      <div>
        <h4 className="font-medium text-sm text-ui-ink mb-2">
          Vzkazy pro zítřejší směnu
        </h4>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          className="w-full border rounded-lg p-2 text-sm focus:ring focus:ring-brand-100"
          placeholder="Např. 'Dnes jsme nestihli uklidit na RTG, prosím, udělejte to hned ráno.'"
        />

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        <div className="flex justify-end mt-2">
          <button
            onClick={addNote}
            className="bg-brand-600 text-white text-xs px-3 py-1 rounded-md hover:bg-brand-700 transition"
          >
            Přidat vzkaz
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <AnimatePresence>
            {notes.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <button
                  onClick={() => removeNote(n.id)}
                  className="absolute top-1 right-1 text-ui-faint hover:text-red-500 text-xs"
                  title="Smazat vzkaz"
                  aria-label="Smazat vzkaz"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm">{n.text}</p>
                <span className="text-xs text-ui-faint block mt-1">
                  — {n.author}, {n.created}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <p className="text-sm text-ui-faint">
              Zatím žádné vzkazy pro zítřejší směnu.
            </p>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
}
