"use client";

import { ButtonHTMLAttributes } from "react";
import { playSound } from "@/lib/sounds";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  onClick,
  ...rest
}: Props) {
  const base =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
      ? "btn-secondary"
      : "btn-ghost";

  return (
    <button
      className={`${base} disabled:opacity-40 disabled:pointer-events-none w-full ${className}`}
      onClick={(e) => {
        playSound("click");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}