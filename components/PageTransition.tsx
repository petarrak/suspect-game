"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{
        opacity: 0,
        y: 10,
        scale: 0.995,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.22,
        ease: "easeOut",
      }}
      className="min-h-[100dvh] w-full"
    >
      {children}
    </motion.div>
  );
}