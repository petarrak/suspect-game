import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL as string;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Svi paralelni pozivi koriste istu prijavu.
// Bez ove brave više komponenti može istodobno napraviti
// različite anonimne korisnike i prepisati spremljenu sesiju.
let anonSessionPromise: Promise<string> | null = null;

async function createOrGetAnonSession(): Promise<string> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Supabase getSession error:", sessionError);
  }

  const existingUserId = sessionData.session?.user?.id;

  if (existingUserId) {
    return existingUserId;
  }

  const { data, error } =
    await supabase.auth.signInAnonymously();

  if (error) {
    console.error("Supabase anonymous sign-in error:", error);
    throw new Error(
      `Anonymous sign-in failed: ${error.message}`
    );
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new Error(
      "Anonymous sign-in failed: Supabase returned no user."
    );
  }

  return userId;
}

export async function ensureAnonSession(): Promise<string> {
  if (anonSessionPromise) {
    return anonSessionPromise;
  }

  anonSessionPromise = createOrGetAnonSession();

  try {
    return await anonSessionPromise;
  } finally {
    // Nakon završetka budući poziv ponovno provjerava spremljenu sesiju.
    // Paralelni pozivi tijekom prijave i dalje čekaju isti Promise.
    anonSessionPromise = null;
  }
}

export function generateRoomCode(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return code;
}