export const clickSound = new Audio("/sounds/click.mp3");

export const voteSound = new Audio("/sounds/vote.mp3");

export const revealSound = new Audio("/sounds/reveal.mp3");

export const winnerSound = new Audio("/sounds/winner.mp3");

export const tickSound = new Audio("/sounds/tick.mp3");

export function play(sound: HTMLAudioElement) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}