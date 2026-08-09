"use client";

import { motion, AnimatePresence } from "motion/react";
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
      <AnimatePresence>
        {players.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -20,
              scale: 0.95,
            }}
            transition={{
              duration: 0.25,
            }}
            whileHover={{
              scale: 1.02,
              y: -2,
            }}
            className="card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{
                  rotate: 8,
                  scale: 1.15,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                }}
                className="text-3xl"
              >
                {p.avatar || "🙂"}
              </motion.div>

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
                  <motion.span
                    initial={{
                      scale: 0,
                    }}
                    animate={{
                      scale: 1,
                    }}
                    className="rounded-full bg-yellow-500/20 text-yellow-300 px-2 py-1 text-[10px] font-bold uppercase"
                  >
                    HOST
                  </motion.span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {showBadge && showBadge(p) && (
                <motion.span
                  key={showBadge(p)}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  className="text-sm text-white/60"
                >
                  {showBadge(p)}
                </motion.span>
              )}

              <motion.span
                animate={
                  p.is_connected
                    ? {
                        scale: [1, 1.4, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className={`h-3 w-3 rounded-full ${
                  p.is_connected
                    ? "bg-good"
                    : "bg-white/20"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}