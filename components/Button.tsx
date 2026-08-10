"use client";

import {
  ButtonHTMLAttributes,
  MouseEvent,
} from "react";

import { playSound } from "@/lib/sounds";

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  onClick,
  disabled,
  type = "button",
  ...rest
}: Props) {
  const base =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
      ? "btn-secondary"
      : "btn-ghost";

  function handleClick(
    event: MouseEvent<HTMLButtonElement>
  ) {
    if (disabled) {
      return;
    }

    playSound(
      "click",
      0.5
    );

    onClick?.(event);
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={`
        ${base}
        w-full
        min-h-[52px]
        px-5
        touch-manipulation
        disabled:pointer-events-none
        disabled:opacity-40
        active:scale-[0.97]
        transition-transform
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}