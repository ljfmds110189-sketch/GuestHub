"use client";

import { useEffect, useState } from "react";

type Props = { lang: "ar" | "en" };

export function LiveClock({ lang }: Props) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const locale = lang === "ar" ? "ar" : "en-US";

    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
      setDate(
        now.toLocaleDateString(locale, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      );
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lang]);

  if (!time) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-white/85">
      <span>{date}</span>
      <span className="font-mono tabular-nums tracking-tight text-white">{time}</span>
    </div>
  );
}
