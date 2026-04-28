"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  Event,
  Views,
  View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay, isToday } from "date-fns";
import { cs } from "date-fns/locale/cs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarEvent extends Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: "booked" | "free";
  details?: Record<string, string | number | boolean | null>;
}

interface ReceptionCalendarProps {
  compact?: boolean;
  initialView?: View;
  onlyToday?: boolean;
}

const locales = { cs };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function ReceptionCalendar({
  compact = false,
  initialView = Views.WEEK,
  onlyToday = false,
}: ReceptionCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/supersaas/booking?schedule_id=268518", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;

        const parsed: CalendarEvent[] = data.map((e) => ({
          id: Number(e.id ?? Date.now()),
          title: e.title,
          start: new Date(e.start),
          end: new Date(e.end),
          allDay: false,
          type: e.type,
          details: e.details || {},
        }));

        // pokud zobrazujeme pouze dnešní den, vyfiltrujeme jen dnešní eventy
        const filtered = onlyToday
          ? parsed.filter((ev) => isToday(ev.start))
          : parsed;

        setEvents(filtered);
      } catch (err) {
        console.error("❌ Chyba při načítání kalendáře:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [onlyToday]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mb-3"></div>
        <p>Načítám kalendář…</p>
      </div>
    );
  }

  const minTime = new Date();
  minTime.setHours(6, 40, 0);
  const maxTime = new Date();
  maxTime.setHours(17, 0, 0);

  return (
    <div className={compact ? "scale-90 origin-top" : "p-6"}>
      {!compact && (
        <h2 className="text-xl font-semibold mb-4">
          📅 Kalendář – UZ Vídeňská
        </h2>
      )}

      <div className="relative border rounded-lg shadow-sm bg-white overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          date={currentDate}
          onView={(v) => {
            if (onlyToday) return;
            setCurrentView(v);
          }}
          onNavigate={(newDate: Date, action: string) => {
            if (onlyToday) return;
            if (action === "TODAY") setCurrentDate(new Date());
            else setCurrentDate(newDate);
          }}
          defaultView={initialView}
          views={onlyToday ? [Views.DAY] : [Views.DAY, Views.WEEK, Views.MONTH]}
          step={20}
          timeslots={1}
          style={{ height: compact ? "50vh" : "80vh" }}
          culture="cs"
          min={minTime}
          max={maxTime}
          formats={{
            timeGutterFormat: (date) => format(date, "HH:mm"),
            dayFormat: (date) => format(date, "EEE d.M."),
            monthHeaderFormat: (date) => format(date, "LLLL yyyy"),
          }}
          messages={{
            today: "Dnes",
            previous: "Zpět",
            next: "Další",
            month: "Měsíc",
            week: "Týden",
            day: "Den",
          }}
          onSelectEvent={(event) => {
            if (onlyToday) return;
            setSelectedEvent(event);
            setTimeout(() => {
              const detail = document.getElementById("event-detail");
              if (detail)
                detail.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
          }}
        />
      </div>

      {/* 🧾 Detail události pouze pokud není režim onlyToday */}
      <AnimatePresence>
        {!compact && !onlyToday && selectedEvent && (
          <motion.div
            id="event-detail"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <Card className="shadow-md border border-gray-200">
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                  {selectedEvent.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedEvent(null)}
                >
                  Zavřít ✕
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium text-gray-800">Datum:</span>{" "}
                  {format(selectedEvent.start, "d.M.yyyy HH:mm")} –{" "}
                  {format(selectedEvent.end, "HH:mm")}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  {Object.entries(selectedEvent.details || {}).map(
                    ([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-gray-500 text-xs uppercase tracking-wide">
                          {key}
                        </span>
                        <span className="font-medium text-gray-800">
                          {String(value) || "—"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💅 Globalní úprava CSS pro hover efekt a fix scrollu */}
      <style jsx global>{`
        .rbc-time-content,
        .rbc-row-content {
          overflow: visible !important;
        }

        .rbc-event {
          transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
          transform-origin: center;
          z-index: 1;
        }

        .rbc-event:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }

        .rbc-day-slot,
        .rbc-timeslot-group {
          padding: 2px 4px;
        }

        .rbc-time-view,
        .rbc-time-content {
          overflow-x: hidden !important;
        }

        /* Jemné vyhlazení přechodu pro kompaktní verzi */
        .rbc-time-view {
          background-color: white;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
