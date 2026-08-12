"use client";

import { useRouter } from "next/navigation";
import { usePremiumStatus } from "@/lib/premium";

const FREE_AVATARS = [
  "🐱", "🐶", "🦊", "🐼", "🐸", "🐵", "🐯", "🦁", "🐨",
  "🐰", "🐻", "🐙", "🐧", "🦄", "🐢", "🦉", "🦋", "🐺",
];

const PREMIUM_AVATARS = [
  "👑", "🤖", "👽", "🥷", "🧛",
  "🦖", "🐲", "🦹", "🧙", "🧟",
  "👻", "💀", "🎃", "🤡", "👾",
  "🧚", "🧞", "🧜", "🦸", "🎅",
];

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  language?: "hr" | "en";
}

export default function AvatarPicker({
  value,
  onChange,
  language = "hr",
}: AvatarPickerProps) {
  const router = useRouter();
  const premium = usePremiumStatus();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">
          {language === "hr" ? "ODABERI AVATAR" : "CHOOSE AVATAR"}
        </span>
        <span className="text-3xl">{value}</span>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {FREE_AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            className={`aspect-square rounded-xl border text-2xl transition active:scale-90 ${
              value === avatar
                ? "scale-105 border-accent bg-accent/20 shadow-lg shadow-accent/20"
                : "border-white/10 bg-panel2 hover:border-white/20"
            }`}
          >
            {avatar}
          </button>
        ))}

        {PREMIUM_AVATARS.map((avatar) => {
          const locked = !premium.is_premium;

          return (
            <button
              key={avatar}
              type="button"
              onClick={() => {
                if (premium.loading) return;

                if (locked) {
                  router.push("/premium");
                  return;
                }

                onChange(avatar);
              }}
              className={`relative aspect-square rounded-xl border text-2xl transition active:scale-90 ${
                value === avatar
                  ? "scale-105 border-yellow-300 bg-yellow-300/15"
                  : "border-yellow-300/25 bg-yellow-300/5"
              }`}
            >
              <span className={locked ? "opacity-35" : ""}>{avatar}</span>
              {locked && <span className="absolute right-0.5 top-0 text-[10px]">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}