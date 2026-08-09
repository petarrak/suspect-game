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
    },
  }
);

export async function ensureAnonSession(): Promise<string> {
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error(
      "Supabase getSession error:",
      sessionError
    );
  }

  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data, error } =
    await supabase.auth.signInAnonymously();

  if (error) {
    console.error(
      "Supabase anonymous sign-in error:",
      error
    );

    throw new Error(
      `Anonymous sign-in failed: ${error.message}`
    );
  }

  if (!data.user) {
    throw new Error(
      "Anonymous sign-in failed: Supabase returned no user."
    );
  }

  return data.user.id;
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