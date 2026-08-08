"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "en" | "hr";

type TranslationKey =
  | "tagline"
  | "createGame"
  | "joinGame"
  | "homeFooter"
  | "back"
  | "createTitle"
  | "createSubtitle"
  | "nickname"
  | "creatingRoom"
  | "enterNickname"
  | "nicknameTooLong"
  | "roomCreateError"
  | "roomCode"
  | "copyCode"
  | "players"
  | "host"
  | "startGame"
  | "question"
  | "answerTime"
  | "answerOutLoud"
  | "imReady"
  | "youreReady"
  | "startVoting"
  | "voting"
  | "whoSuspect"
  | "choosePlayer"
  | "vote"
  | "votesSubmitted"
  | "voteSubmitted"
  | "waitingPlayers"
  | "everyoneVoted"
  | "waitingHost"
  | "reveal"
  | "suspectWas"
  | "normalQuestion"
  | "suspectQuestion"
  | "votes"
  | "correct"
  | "suspectCaught"
  | "suspectEscaped"
  | "leaderboard"
  | "currentStandings"
  | "finalResults"
  | "nextRound"
  | "gameFinished"
  | "winner"
  | "playAgain"
  | "backHome"
  | "waitingHostNext"
  | "round"
  | "rounds"
  | "intensity"
  | "friendly"
  | "chaotic"
  | "savage"
  | "kick";

const translations: Record<
  Language,
  Record<TranslationKey, string>
> = {
  en: {
    tagline: "Everyone has a secret.",
    createGame: "CREATE GAME",
    joinGame: "JOIN GAME",
    homeFooter:
      "Party games for people who trust their friends too much.",

    back: "Back",

    createTitle: "Create a game",
    createSubtitle:
      "Pick a nickname. You'll be the host.",
    nickname: "Your nickname",
    creatingRoom: "Creating room...",
    enterNickname: "Enter a nickname first.",
    nicknameTooLong:
      "Keep your nickname under 20 characters.",
    roomCreateError:
      "Something went wrong creating the room.",

    roomCode: "ROOM CODE",
    copyCode: "Copy Code",
    players: "PLAYERS",
    host: "HOST",
    startGame: "START GAME",

    question: "QUESTION",

    answerTime: "ANSWER TIME",
    answerOutLoud:
      "Answer your question out loud.",
    imReady: "I'M READY",
    youreReady: "YOU'RE READY",
    startVoting: "START VOTING",

    voting: "VOTING",
    whoSuspect: "WHO IS THE SUSPECT?",
    choosePlayer: "Choose one player.",
    vote: "VOTE",
    votesSubmitted: "VOTES SUBMITTED",
    voteSubmitted: "VOTE SUBMITTED",
    waitingPlayers:
      "Waiting for other players...",
    everyoneVoted: "EVERYONE VOTED",
    waitingHost: "Waiting for host...",

    reveal: "REVEAL",
    suspectWas: "THE SUSPECT WAS",
    normalQuestion: "NORMAL QUESTION",
    suspectQuestion: "SUSPECT QUESTION",
    votes: "Votes",
    correct: "correct",
    suspectCaught: "SUSPECT CAUGHT!",
    suspectEscaped: "SUSPECT ESCAPED!",

    leaderboard: "LEADERBOARD",
    currentStandings: "CURRENT STANDINGS",
    finalResults: "FINAL RESULTS",
    nextRound: "NEXT ROUND",
    gameFinished: "GAME FINISHED",
    winner: "Winner",
    playAgain: "PLAY AGAIN",
    backHome: "BACK TO HOME",
    waitingHostNext:
      "Waiting for host to start the next round...",

    round: "ROUND",
    rounds: "ROUNDS",

    intensity: "INTENSITY",
    friendly: "FRIENDLY",
    chaotic: "CHAOTIC",
    savage: "SAVAGE",

    kick: "KICK",
  },

  hr: {
    tagline: "Svatko ima tajnu.",
    createGame: "KREIRAJ IGRU",
    joinGame: "PRIDRUŽI SE",
    homeFooter:
      "Party igra za ljude koji možda malo previše vjeruju svojim prijateljima.",

    back: "Natrag",

    createTitle: "Kreiraj igru",
    createSubtitle:
      "Odaberi nadimak. Ti ćeš biti host.",
    nickname: "Tvoj nadimak",
    creatingRoom: "Kreiranje sobe...",
    enterNickname: "Prvo upiši nadimak.",
    nicknameTooLong:
      "Nadimak može imati najviše 20 znakova.",
    roomCreateError:
      "Došlo je do greške pri kreiranju sobe.",

    roomCode: "KOD SOBE",
    copyCode: "Kopiraj kod",
    players: "IGRAČI",
    host: "HOST",
    startGame: "POKRENI IGRU",

    question: "PITANJE",

    answerTime: "VRIJEME ZA ODGOVOR",
    answerOutLoud:
      "Odgovori na svoje pitanje naglas.",
    imReady: "SPREMAN SAM",
    youreReady: "SPREMAN SI",
    startVoting: "POKRENI GLASANJE",

    voting: "GLASANJE",
    whoSuspect: "TKO JE SUMNJIVAC?",
    choosePlayer: "Odaberi jednog igrača.",
    vote: "GLASAJ",
    votesSubmitted: "PREDANI GLASOVI",
    voteSubmitted: "GLAS PREDAN",
    waitingPlayers:
      "Čekamo ostale igrače...",
    everyoneVoted: "SVI SU GLASALI",
    waitingHost: "Čekamo hosta...",

    reveal: "OTKRIVANJE",
    suspectWas: "SUMNJIVAC JE BIO",
    normalQuestion: "NORMALNO PITANJE",
    suspectQuestion: "PITANJE SUMNJIVCA",
    votes: "Glasovi",
    correct: "točno",
    suspectCaught:
      "SUMNJIVAC JE UHVAĆEN!",
    suspectEscaped:
      "SUMNJIVAC JE POBJEGAO!",

    leaderboard: "LJESTVICA",
    currentStandings: "TRENUTNI POREDAK",
    finalResults: "KONAČNI REZULTATI",
    nextRound: "SLJEDEĆA RUNDA",
    gameFinished: "IGRA JE ZAVRŠENA",
    winner: "Pobjednik",
    playAgain: "IGRAJ PONOVNO",
    backHome: "NA POČETNU",
    waitingHostNext:
      "Čekamo hosta da pokrene sljedeću rundu...",

    round: "RUNDA",
    rounds: "RUNDE",

    intensity: "INTENZITET",
    friendly: "PRIJATELJSKI",
    chaotic: "KAOTIČNO",
    savage: "BRUTALNO",

    kick: "IZBACI",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] =
    useState<Language>("en");

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "suspect-language"
      );

    if (
      saved === "en" ||
      saved === "hr"
    ) {
      setLanguageState(saved);
      document.documentElement.lang =
        saved;
    }
  }, []);

  function setLanguage(
    newLanguage: Language
  ) {
    setLanguageState(newLanguage);

    localStorage.setItem(
      "suspect-language",
      newLanguage
    );

    document.documentElement.lang =
      newLanguage;
  }

  function t(key: TranslationKey) {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      <div className="fixed top-4 right-4 z-[9999]">
        <div className="flex rounded-xl border border-white/10 bg-[#171724]/90 p-1 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() =>
              setLanguage("en")
            }
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              language === "en"
                ? "bg-accent text-white"
                : "text-white/40 hover:text-white"
            }`}
          >
            EN
          </button>

          <button
            type="button"
            onClick={() =>
              setLanguage("hr")
            }
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              language === "hr"
                ? "bg-accent text-white"
                : "text-white/40 hover:text-white"
            }`}
          >
            HR
          </button>
        </div>
      </div>

      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}