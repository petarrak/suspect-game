"use client";

const AVATARS = [
  "🐱",
  "🐶",
  "🦊",
  "🐼",
  "🐸",
  "🐵",
  "🐯",
  "🦁",
  "🐨",
  "🐰",
  "🐻",
  "🐙",
  "🐧",
  "🦄",
  "🐢",
  "🦉",
  "🦋",
  "🐺",
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">
          {language === "hr"
            ? "ODABERI AVATAR"
            : "CHOOSE AVATAR"}
        </span>

        <span className="text-3xl">
          {value}
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {AVATARS.map((avatar) => {
          const selected =
            value === avatar;

          return (
            <button
              key={avatar}
              type="button"
              onClick={() =>
                onChange(avatar)
              }
              className={`aspect-square rounded-xl border text-2xl transition active:scale-90 ${
                selected
                  ? "border-accent bg-accent/20 scale-105 shadow-lg shadow-accent/20"
                  : "border-white/10 bg-panel2 hover:border-white/20"
              }`}
            >
              {avatar}
            </button>
          );
        })}
      </div>
    </div>
  );
}