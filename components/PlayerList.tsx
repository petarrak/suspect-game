"use client";

import { Player } from "@/lib/types";

interface Props {
  players: Player[];
  showBadge?: (p: Player) => string | null;
  meId?: string | null;
}

export default function PlayerList({
  players,
  showBadge,
  meId,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {players.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between rounded-2xl bg-panel2 border border-white/10 px-4 py-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl leading-none">
              {p.avatar || "🙂"}
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold truncate">
                {p.nickname}

                {p.id === meId && (
                  <span className="text-white/40">
                    {" "}
                    (you)
                  </span>
                )}
              </span>

              {p.is_host && (
                <span className="rounded-full bg-yellow-500/20 text-yellow-300 px-2 py-1 text-[10px] font-bold uppercase">
                  HOST
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showBadge && showBadge(p) && (
              <span className="text-sm text-white/60">
                {showBadge(p)}
              </span>
            )}

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                p.is_connected
                  ? "bg-good"
                  : "bg-white/20"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}