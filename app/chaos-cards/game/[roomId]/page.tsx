"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import {
  drawChaosCard, finishChaosTurn, getChaosPlayers, getChaosRoom,
  getChaosRule, getMyChaosPlayer,
  restartChaosGame,
  type ChaosPlayer, type ChaosRoom, type ChaosRule, type ChaosSuit,
} from "@/lib/chaosCards";

const SUITS: Record<ChaosSuit, { symbol: string; color: string }> = {
  HEARTS: { symbol: "♥", color: "text-red-500" }, DIAMONDS: { symbol: "♦", color: "text-red-500" },
  CLUBS: { symbol: "♣", color: "text-black" }, SPADES: { symbol: "♠", color: "text-black" },
  JOKER: { symbol: "★", color: "text-purple-600" },
};

export default function ChaosCardsGamePage() {
  const { roomId: raw } = useParams();
  const roomId = Array.isArray(raw) ? raw[0] : raw;
  const router = useRouter();
  const { language } = useLanguage();
  const [room,setRoom]=useState<ChaosRoom|null>(null);
  const [players,setPlayers]=useState<ChaosPlayer[]>([]);
  const [me,setMe]=useState<ChaosPlayer|null>(null);
  const [rule,setRule]=useState<ChaosRule|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async()=>{
    if(!roomId)return;
    const next=await getChaosRoom(roomId);
    const [list,mine,nextRule]=await Promise.all([getChaosPlayers(roomId),getMyChaosPlayer(roomId),next.current_rule_id?getChaosRule(next.current_rule_id):Promise.resolve(null)]);
    setRoom(next);setPlayers(list);setMe(mine);setRule(nextRule);
    if(next.status==="waiting")router.replace(`/chaos-cards/room/${next.code}`);
  },[roomId,router]);
  useEffect(()=>{void load().catch(e=>setError(e?.message));},[load]);
  useEffect(()=>{if(!roomId)return;const c=supabase.channel(`chaos-game-${roomId}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"chaos_card_rooms",filter:`id=eq.${roomId}`},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c);};},[roomId,load]);

  async function draw(){if(!roomId||busy)return;setBusy(true);setError(null);try{const x=await drawChaosCard(roomId);setRule({id:x.rule_id,card_rank:x.rank,title_hr:x.title_hr,title_en:x.title_en,rule_hr:x.rule_hr,rule_en:x.rule_en});await load();}catch(e:any){setError(e?.message);}finally{setBusy(false);}}
  async function done(){if(!roomId||busy)return;setBusy(true);setError(null);try{await finishChaosTurn(roomId);setRule(null);await load();}catch(e:any){setError(e?.message);}finally{setBusy(false);}}
  async function restart(){if(!roomId||busy||!me?.is_host)return;setBusy(true);setError(null);try{const result=await restartChaosGame(roomId);router.replace(`/chaos-cards/room/${result.code}`);}catch(e:any){setError(e?.message);setBusy(false);}}

  if(!room)return <main className="min-h-screen flex items-center justify-center text-white/45">Loading...</main>;
  const current=players.find(p=>p.id===room.current_player_id);const myTurn=me?.id===room.current_player_id;const suit=SUITS[room.current_suit??"JOKER"];
  if(room.status==="ended")return <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-6 p-6 text-center"><div className="text-8xl">🏁</div><h1 className="text-4xl font-black">{language==="hr"?"KAOS JE GOTOV":"CHAOS COMPLETE"}</h1>{me?.is_host?<Button disabled={busy} onClick={()=>void restart()}>🔄 {language==="hr"?"IGRAJ PONOVNO":"PLAY AGAIN"}</Button>:<p className="rounded-2xl bg-panel2 p-4 text-white/45">{language==="hr"?"Čekamo hosta da pokrene novu igru...":"Waiting for the host to start a new game..."}</p>}<Button variant="secondary" onClick={()=>router.push("/")}>🏠 PARTY GAMES</Button></main>;

  return <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
    <header className="pt-3 text-center"><p className="text-xs font-black tracking-[0.3em] text-yellow-300">🃏 CHAOS CARDS</p><p className="mt-2 text-white/40">{language==="hr"?"KARTA":"CARD"} {room.current_turn}/{room.max_turns} · {room.mode}</p></header>
    <section className="rounded-3xl border border-white/10 bg-panel p-4 text-center"><p className="text-xs font-black text-white/35">{language==="hr"?"NA REDU":"CURRENT PLAYER"}</p><div className="mt-2 text-5xl">{current?.avatar}</div><h2 className="mt-2 text-2xl font-black">{current?.nickname}</h2></section>
    <div className="flex flex-1 items-center justify-center py-2"><AnimatePresence mode="wait">{!rule?<motion.button key="deck" disabled={!myTurn||busy} onClick={()=>void draw()} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} whileTap={{scale:.95}} className="relative h-[390px] w-[260px] rounded-[28px] border-4 border-purple-400 bg-gradient-to-br from-[#171129] to-[#05030a] shadow-2xl shadow-purple-500/30 disabled:opacity-70"><div className="absolute inset-3 rounded-[20px] border border-purple-300/30"/><div className="flex h-full flex-col items-center justify-center"><span className="text-8xl">🃏</span><span className="mt-5 text-2xl font-black">{myTurn?(language==="hr"?"IZVUCI KARTU":"DRAW CARD"):(language==="hr"?"ČEKAJ POTEZ":"WAIT YOUR TURN")}</span></div></motion.button>:<motion.div key={rule.id} initial={{rotateY:90,scale:.85}} animate={{rotateY:0,scale:1}} transition={{type:"spring",stiffness:160,damping:17}} className="relative min-h-[430px] w-[280px] rounded-[28px] border-4 border-white bg-white p-6 text-[#111] shadow-2xl"><div className={`absolute left-5 top-4 text-4xl font-black ${suit.color}`}>{rule.card_rank}<span className="block text-3xl">{suit.symbol}</span></div><div className={`absolute bottom-4 right-5 rotate-180 text-4xl font-black ${suit.color}`}>{rule.card_rank}<span className="block text-3xl">{suit.symbol}</span></div><div className="flex min-h-[370px] flex-col items-center justify-center text-center"><div className={`text-7xl ${suit.color}`}>{suit.symbol}</div><p className="mt-5 text-sm font-black uppercase tracking-widest text-purple-700">{language==="hr"?rule.title_hr:rule.title_en}</p><p className="mt-5 text-xl font-black leading-relaxed">{language==="hr"?rule.rule_hr:rule.rule_en}</p></div></motion.div>}</AnimatePresence></div>
    {error&&<p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
    {rule&&myTurn&&<Button disabled={busy} onClick={()=>void done()}>✅ {language==="hr"?"IZVRŠENO":"DONE"}</Button>}
  </main>;
}