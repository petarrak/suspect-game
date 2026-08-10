export type SoundName =
  | "click"
  | "join"
  | "start"
  | "vote"
  | "reveal"
  | "winner"
  | "tick"
  | "new-round"
  | "score"
  | "escaped"
  | "caught"
  | "combat";

const SOUND_FILES: Record<SoundName, string> = {
  click: "/sounds/click.mp3",
  join: "/sounds/join.mp3",
  start: "/sounds/start.mp3",
  vote: "/sounds/vote.mp3",
  reveal: "/sounds/reveal.mp3",
  winner: "/sounds/winner.mp3",
  tick: "/sounds/tick.mp3",
  "new-round": "/sounds/new-round.mp3",
  score: "/sounds/score.mp3",
  escaped: "/sounds/escaped.mp3",
  caught: "/sounds/caught.mp3",
  combat: "/sounds/combat.mp3",
};

const audioCache = new Map<
  SoundName,
  HTMLAudioElement
>();

function getAudio(
  sound: SoundName
): HTMLAudioElement | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing =
    audioCache.get(sound);

  if (existing) {
    return existing;
  }

  const audio = new Audio(
    SOUND_FILES[sound]
  );

  audio.preload = "auto";

  audioCache.set(
    sound,
    audio
  );

  return audio;
}

export function playSound(
  sound: SoundName,
  volume = 0.7
) {
  try {
    const audio =
      getAudio(sound);

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;

    audio.volume = Math.max(
      0,
      Math.min(1, volume)
    );

    void audio
      .play()
      .catch(() => {
        // Browser may block autoplay
        // until user interaction.
      });
  } catch (error) {
    console.warn(
      `Could not play sound "${sound}"`,
      error
    );
  }
}

export function stopSound(
  sound: SoundName
) {
  const audio =
    audioCache.get(sound);

  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

export function preloadSounds() {
  if (typeof window === "undefined") {
    return;
  }

  (
    Object.keys(
      SOUND_FILES
    ) as SoundName[]
  ).forEach((sound) => {
    getAudio(sound);
  });
}