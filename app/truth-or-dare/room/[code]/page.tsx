"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { usePremiumStatus } from "@/lib/premium";
import { supabase } from "@/lib/supabase";
import {
  configureTruthDareRoom,
  getMyTruthDarePlayer,
  getTruthDarePlayers,
  getTruthDareRoomByCode,
  kickTruthDarePlayer,
  startTruthDareGame,
  type TruthDarePack,
  type TruthDarePlayer,
  type TruthDareRoom,
} from "@/lib/truthDare";

const PACKS: Array<{ id: TruthDarePack; emoji: string; name: string; premium: boolean }> = [
  { id: "CLASSIC", emoji: "🙂", name: "Classic", premium: false },
  { id: "FUNNY", emoji: "😂", name: "Funny", premium: false },
  { id: "PARTY", emoji: "🎉", name: "Party", premium: false },
  { id: "AFTER_DARK", emoji: "🔞", name: "After Dark", premium: true },
  { id: "BRUTAL", emoji: "😈", name: "Brutal", premium: true },
  { id: "HOT", emoji: "🔥", name: "Hot", premium: true },
  { id: "DRINKING", emoji: "🍻", name: "Drinking", premium: true },
  { id: "SECRETS", emoji: "🤫", name: "Secrets", premium: true },
  { id: "RED_FLAGS", emoji: "🚩", name: "Red Flags", premium: true },
];

const ADULT_PACKS: TruthDarePack[] = ["AFTER_DARK", "HOT", "DRINKING"];

export default function TruthDareRoomPage() {
  const { code: rawCode } = useParams();
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.toUpperCase();
  const router = useRouter();
  const { language } = useLanguage();
  const premium = usePremiumStatus();
  const [room, setRoom] = useState<TruthDareRoom | null>(null);
  const [players, setPlayers] = useState<TruthDarePlayer[]>([]);
  const [me, setMe] = useState<TruthDarePlayer | null>(null);
  const [packs, setPacks] = useState<TruthDarePack[]>(["CLASSIC"]);
  const [turns, setTurns] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [kickingId, setKickingId] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    if (!code) return;
    const nextRoom = await getTruthDareRoomByCode(code);
    const [nextPlayers, nextMe] = await Promise.all([
      getTruthDarePlayers(nextRoom.id),
      getMyTruthDarePlayer(nextRoom.id),
    ]);
    setRoom(nextRoom);
    setPlayers(nextPlayers);
    setMe(nextMe);
    setPacks(nextRoom.selected_packs);
    setTurns(nextRoom.max_turns);
    if (nextRoom.status === "playing") router.replace(`/truth-or-dare/game/${nextRoom.id}`);
  }, [code, router]);

  useEffect(() => {
    void load().catch((e) => setError(e?.message ?? "Could not load room."));
  }, [load]);

  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase
      .channel(`truth-dare-lobby-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "truth_dare_rooms", filter: `id=eq.${room.id}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "truth_dare_players", filter: `room_id=eq.${room.id}` }, (payload) => {
        const removed = payload.eventType === "DELETE" ? payload.old as { id?: string } : null;
        if (removed?.id && removed.id === me?.id) {
          router.replace("/truth-or-dare");
          return;
        }
        void load();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [room?.id, me?.id, load, router]);

  useEffect(() => {
    if (!room?.id || !me?.id || me.is_host) return;

    let checking = false;
    const checkMembership = async () => {
      if (checking) return;
      checking = true;
      try {
        const currentPlayer = await getMyTruthDarePlayer(room.id);
        if (!currentPlayer) router.replace("/truth-or-dare");
      } catch {
        // Sljedeća provjera će pokušati ponovno ako je mreža kratko prekinuta.
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(checkMembership, 1000);
    return () => window.clearInterval(interval);
  }, [room?.id, me?.id, me?.is_host, router]);

  async function kickPlayer(player: TruthDarePlayer) {
    if (!room || !me?.is_host || player.is_host || kickingId) return;
    const confirmed = window.confirm(
      language === "hr"
        ? `Izbaciti igrača ${player.nickname} iz sobe?`
        : `Remove ${player.nickname} from the room?`
    );
    if (!confirmed) return;
    setKickingId(player.id);
    setError(null);
    try {
      await kickTruthDarePlayer(room.id, player.id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not remove player.");
    } finally {
      setKickingId(null);
    }
  }

  async function togglePack(item: (typeof PACKS)[number]) {
    if (!room || !me?.is_host || busy) return;
    if (item.premium && !premium.is_premium) {
      router.push("/premium");
      return;
    }

    if (
      ADULT_PACKS.includes(item.id) &&
      !packs.includes(item.id)
    ) {
      const confirmed = window.confirm(
        language === "hr"
          ? "Ovaj paket namijenjen je osobama od 18 godina. Potvrđuješ li da svi igrači imaju 18+ godina?"
          : "This pack is intended for adults aged 18+. Do you confirm that all players are 18 or older?"
      );

      if (!confirmed) return;
    }
    const next = packs.includes(item.id)
      ? packs.filter((pack) => pack !== item.id)
      : [...packs, item.id];
    if (next.length === 0) return;
    setBusy(true);
    try {
      await configureTruthDareRoom(room.id, next, turns);
      setPacks(next);
    } catch (e: any) { setError(e?.message); }
    finally { setBusy(false); }
  }

  async function changeTurns(value: number) {
    if (!room || !me?.is_host || busy) return;
    setBusy(true);
    try {
      await configureTruthDareRoom(room.id, packs, value);
      setTurns(value);
    } catch (e: any) { setError(e?.message); }
    finally { setBusy(false); }
  }

  async function start() {
    if (!room || busy) return;
    setBusy(true);
    setError(null);
    try { await startTruthDareGame(room.id); }
    catch (e: any) { setError(e?.message); setBusy(false); }
  }

  if (!room) return <main className="min-h-screen flex items-center justify-center text-white/45">Loading...</main>;

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <header className="text-center pt-4">
        <p className="text-xs font-black tracking-[0.3em] text-accent">😇 TRUTH OR DARE 😈</p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-panel p-5 text-center">
        <p className="text-xs font-black tracking-widest text-white/35">
          {language === "hr" ? "KOD SOBE" : "ROOM CODE"}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[0.18em]">{room.code}</h1>
        {origin && (
          <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4 shadow-xl shadow-black/30">
            <QRCode value={`${origin}/truth-or-dare?code=${room.code}`} size={168} />
          </div>
        )}
        <p className="mt-3 text-sm text-white/40">
          📱 {language === "hr" ? "Skeniraj za pridruživanje" : "Scan to join"}
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-panel p-5">
        <p className="text-xs font-black tracking-widest text-white/35">{language === "hr" ? "IGRAČI" : "PLAYERS"} · {players.length}</p>
        <div className="mt-4 flex flex-col gap-3">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-panel2 p-3">
              <span className="text-3xl">{player.avatar}</span>
              <span className="flex-1 font-black">{player.nickname}</span>
              {player.is_host && <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-[9px] font-black text-yellow-300">HOST</span>}
              {me?.is_host && !player.is_host && (
                <button
                  type="button"
                  disabled={kickingId === player.id}
                  onClick={() => void kickPlayer(player)}
                  className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40"
                >
                  {kickingId === player.id ? "..." : `👢 ${language === "hr" ? "IZBACI" : "KICK"}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {me?.is_host && (
        <section className="rounded-3xl border border-white/10 bg-panel p-5">
          <p className="text-xs font-black tracking-[0.22em] text-accent">HOST</p>
          <h2 className="mt-1 text-xl font-black">{language === "hr" ? "POSTAVKE IGRE" : "GAME SETTINGS"}</h2>
          <p className="mt-5 text-sm font-black">{language === "hr" ? "PAKETI" : "PACKS"}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {PACKS.map((item) => {
              const selected = packs.includes(item.id);
              const locked = item.premium && !premium.is_premium;
              return (
                <button
                  key={item.id}
                  disabled={busy || premium.loading}
                  onClick={() => void togglePack(item)}
                  className={`relative rounded-2xl border px-2 py-3 text-xs font-black ${selected ? "border-accent bg-accent/20" : locked ? "border-yellow-300/25 bg-yellow-300/5 text-white/40" : "border-white/10 bg-panel2 text-white/55"}`}
                >
                  <span className="block text-2xl">{item.emoji}</span>
                  <span className="mt-1 block">{item.name}</span>
                  {locked && <span className="absolute right-1 top-1 text-[9px]">🔒</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-sm font-black">{language === "hr" ? "BROJ POTEZA" : "TURNS"}</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[10, 20, 30, 50].map((value) => (
              <button key={value} onClick={() => void changeTurns(value)} className={`rounded-xl border py-3 font-black ${turns === value ? "border-accent bg-accent/20" : "border-white/10 bg-panel2 text-white/45"}`}>{value}</button>
            ))}
          </div>
        </section>
      )}

      {error && <p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
      <div className="mt-auto">
        {me?.is_host ? <Button disabled={busy || players.length < 2} onClick={() => void start()}>🚀 {language === "hr" ? "POKRENI IGRU" : "START GAME"}</Button> : <p className="rounded-2xl bg-panel2 p-4 text-center text-sm text-white/45">{language === "hr" ? "Čekamo hosta..." : "Waiting for the host..."}</p>}
      </div>
    </main>
  );
}