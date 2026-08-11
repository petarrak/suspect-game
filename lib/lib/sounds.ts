export type SoundName =
  | "click"
  | "vote"
  | "reveal"
  | "winner"
  | "tick"
  | "explosion";


export const clickSound =
  new Audio("/sounds/click.mp3");

export const voteSound =
  new Audio("/sounds/vote.mp3");

export const revealSound =
  new Audio("/sounds/reveal.mp3");

export const winnerSound =
  new Audio("/sounds/winner.mp3");

export const tickSound =
  new Audio("/sounds/tick.mp3");

export const explosionSound =
  new Audio("/sounds/explosion.mp3");


const sounds: Record<
  SoundName,
  HTMLAudioElement
> = {
  click: clickSound,
  vote: voteSound,
  reveal: revealSound,
  winner: winnerSound,
  tick: tickSound,
  explosion: explosionSound,
};


export function play(
  sound: HTMLAudioElement
) {
  sound.pause();
  sound.currentTime = 0;

  sound
    .play()
    .catch(() => {});
}


export function playSound(
  name: SoundName,
  volume = 1
) {
  const sound =
    sounds[name];

  sound.pause();
  sound.currentTime = 0;

  sound.volume =
    Math.max(
      0,
      Math.min(
        volume,
        1
      )
    );

  sound
    .play()
    .catch(() => {});
}


export function stopSound(
  name: SoundName
) {
  const sound =
    sounds[name];

  sound.pause();
  sound.currentTime = 0;
}


/* =========================
   BOMB TICK
========================= */

export function playBombTick(
  speed = 1
) {
  tickSound.pause();
  tickSound.currentTime = 0;

  tickSound.playbackRate =
    Math.max(
      0.5,
      Math.min(
        speed,
        3
      )
    );

  tickSound.volume = 0.55;

  tickSound
    .play()
    .catch(() => {});
}


/* =========================
   STOP BOMB TICK
========================= */

export function stopBombTick() {
  tickSound.pause();
  tickSound.currentTime = 0;
  tickSound.playbackRate = 1;
}


/* =========================
   EXPLOSION
========================= */

export function playExplosion() {
  stopBombTick();

  explosionSound.pause();
  explosionSound.currentTime = 0;
  explosionSound.volume = 1;

  explosionSound
    .play()
    .catch(() => {});
}