"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import type { PlayerProfile } from "@/lib/types";

interface Props {
  userId: string | null;
  onClose: () => void;
}

export default function PlayerProfileModal({
  userId,
  onClose,
}: Props) {
  const { language } = useLanguage();

  const [profile, setProfile] =
    useState<PlayerProfile | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setProfile(null);
      } else {
        setProfile(
          (data as PlayerProfile | null) ?? null
        );
      }

      setLoading(false);
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const accuracy = useMemo(() => {
    if (!profile) return 0;

    const total =
      profile.correct_votes +
      profile.wrong_votes;

    if (total === 0) return 0;

    return Math.round(
      (profile.correct_votes / total) * 100
    );
  }, [profile]);

  const winRate = useMemo(() => {
    if (
      !profile ||
      profile.games_played === 0
    ) {
      return 0;
    }

    return Math.round(
      (profile.wins /
        profile.games_played) *
        100
    );
  }, [profile]);

  return (
    <AnimatePresence>
      {userId && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#151521] p-5 shadow-2xl"
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.94,
              y: 12,
            }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                {language === "hr"
                  ? "PROFIL IGRAČA"
                  : "PLAYER PROFILE"}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 active:scale-95"
              >
                ✕
              </button>
            </div>

            {loading ? (
              <p className="py-12 text-center text-white/40">
                {language === "hr"
                  ? "Učitavanje profila..."
                  : "Loading profile..."}
              </p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-accent">
                {error}
              </p>
            ) : !profile ? (
              <div className="py-10 text-center">
                <div className="text-4xl">
                  👤
                </div>

                <p className="mt-3 font-bold">
                  {language === "hr"
                    ? "Još nema lifetime statistike."
                    : "No lifetime stats yet."}
                </p>

                <p className="mt-2 text-sm text-white/40">
                  {language === "hr"
                    ? "Profil će se spremiti nakon prve završene igre."
                    : "The profile will be saved after the first completed game."}
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-col items-center text-center">
                  <motion.div
                    className="text-6xl"
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                    }}
                  >
                    {profile.avatar || "🙂"}
                  </motion.div>

                  <h2 className="mt-3 text-2xl font-black">
                    {profile.nickname}
                  </h2>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <Stat
                    label={
                      language === "hr"
                        ? "Odigrane igre"
                        : "Games played"
                    }
                    value={profile.games_played}
                    icon="🎮"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Pobjede"
                        : "Wins"
                    }
                    value={profile.wins}
                    icon="🏆"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Bio sumnjivac"
                        : "Times suspect"
                    }
                    value={profile.times_suspect}
                    icon="🕵️"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Uhvaćen"
                        : "Caught"
                    }
                    value={profile.times_caught}
                    icon="🚨"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Pobjegao"
                        : "Escaped"
                    }
                    value={profile.times_escaped}
                    icon="🏃"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Najbolji score"
                        : "Best score"
                    }
                    value={profile.best_score}
                    icon="🥇"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Točnost glasanja"
                        : "Vote accuracy"
                    }
                    value={`${accuracy}%`}
                    icon="🎯"
                  />

                  <Stat
                    label={
                      language === "hr"
                        ? "Win rate"
                        : "Win rate"
                    }
                    value={`${winRate}%`}
                    icon="⭐"
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">
                      ✅{" "}
                      {language === "hr"
                        ? "Točni glasovi"
                        : "Correct votes"}
                    </span>
                    <span className="font-black">
                      {profile.correct_votes}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-white/40">
                      ❌{" "}
                      {language === "hr"
                        ? "Krivi glasovi"
                        : "Wrong votes"}
                    </span>
                    <span className="font-black">
                      {profile.wrong_votes}
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-white/40">
        {icon} {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {value}
      </p>
    </div>
  );
}