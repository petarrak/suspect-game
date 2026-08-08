"use client";

export type SoundName =
  | "click"
  | "vote"
  | "tick"
  | "reveal"
  | "winner";

const audioCache: Partial<
  Record<SoundName, HTMLAudioElement>
> = {};

function getAudio(
  name: SoundName
): HTMLAudioElement | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioCache[name]) {
    const audio = new Audio(
      `/sounds/${name}.mp3`
    );

    audio.preload = "auto";

    audioCache[name] = audio;
  }

  return audioCache[name] ?? null;
}

export function playSound(
  name: SoundName
) {
  const audio = getAudio(name);

  if (!audio) return;

  // Stop the previous playback first.
  audio.pause();
  audio.currentTime = 0;

  if (name === "click") {
    audio.volume = 0.55;
  } else if (name === "tick") {
    audio.volume = 0.45;
  } else if (name === "vote") {
    audio.volume = 0.7;
  } else if (name === "reveal") {
    audio.volume = 0.8;
  } else if (name === "winner") {
    audio.volume = 0.8;
  }

  audio.play().catch((error) => {
    console.error(
      `Sound "${name}" failed:`,
      error
    );
  });
}

export function stopSound(
  name: SoundName
) {
  const audio = getAudio(name);

  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

export function stopAllSounds() {
  (
    Object.keys(audioCache) as SoundName[]
  ).forEach((name) => {
    const audio = audioCache[name];

    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
  });
}