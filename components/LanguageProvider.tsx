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
  | "howToPlay"
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
  | "kick"
  | "rulesTitle"
  | "rulesSubtitle"
  | "rulesGoalTitle"
  | "rulesGoalText"
  | "rulesRoundTitle"
  | "rulesStep1Title"
  | "rulesStep1Text"
  | "rulesStep2Title"
  | "rulesStep2Text"
  | "rulesStep3Title"
  | "rulesStep3Text"
  | "rulesStep4Title"
  | "rulesStep4Text"
  | "rulesScoringTitle"
  | "rulesScoringGroup"
  | "rulesScoringSuspect"
  | "rulesTipsTitle"
  | "rulesTip1"
  | "rulesTip2"
  | "rulesTip3"
  | "rulesTip4"
  | "rulesBestWithTitle"
  | "rulesPlayers"
  | "rulesPhones"
  | "rulesPerfectFor"
  | "rulesImportantTitle"
  | "rulesImportantText";

const translations: Record<
  Language,
  Record<TranslationKey, string>
> = {
  en: {
    tagline: "Everyone has a secret.",
    createGame: "CREATE GAME",
    joinGame: "JOIN GAME",
    howToPlay: "HOW TO PLAY",
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

    rulesTitle: "HOW TO PLAY",
    rulesSubtitle:
      "Learn the rules in under a minute.",

    rulesGoalTitle: "GOAL",
    rulesGoalText:
      "One player is secretly the Suspect. Everyone else gets the same question, while the Suspect gets a slightly different one. Answer naturally, listen carefully and figure out who received the different question.",

    rulesRoundTitle: "HOW A ROUND WORKS",

    rulesStep1Title: "Read your question",
    rulesStep1Text:
      "Every player receives a private question. Never show your screen to anyone.",

    rulesStep2Title: "Answer out loud",
    rulesStep2Text:
      "Everyone answers their question out loud. Listen carefully because one player's answer might not quite fit.",

    rulesStep3Title: "Vote",
    rulesStep3Text:
      "After everyone has answered, secretly vote for the player you think is the Suspect.",

    rulesStep4Title: "Reveal",
    rulesStep4Text:
      "The game reveals the Suspect, both questions and how everyone voted.",

    rulesScoringTitle: "SCORING",
    rulesScoringGroup:
      "Players who correctly identify the Suspect can earn points.",
    rulesScoringSuspect:
      "The Suspect can earn points by avoiding detection.",

    rulesTipsTitle: "TIPS",
    rulesTip1:
      "Don't give an answer that is too vague.",
    rulesTip2:
      "Don't be so specific that you reveal your question.",
    rulesTip3:
      "Listen for answers that feel slightly out of place.",
    rulesTip4:
      "If you're the Suspect, stay calm and bluff confidently.",

    rulesBestWithTitle: "BEST WITH",
    rulesPlayers: "3–12 players",
    rulesPhones: "One phone per player",
    rulesPerfectFor:
      "Friends, parties and game nights",

    rulesImportantTitle: "IMPORTANT",
    rulesImportantText:
      "Keep your phone hidden. Seeing another player's question can ruin the round.",
  },

  hr: {
    tagline: "Svatko ima tajnu.",
    createGame: "KREIRAJ IGRU",
    joinGame: "PRIDRUŽI SE",
    howToPlay: "KAKO IGRATI",
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

    rulesTitle: "KAKO IGRATI",
    rulesSubtitle:
      "Nauči pravila za manje od minute.",

    rulesGoalTitle: "CILJ",
    rulesGoalText:
      "Jedan igrač je potajno Sumnjivac. Svi ostali dobiju isto pitanje, dok Sumnjivac dobije malo drugačije pitanje. Odgovaraj prirodno, pažljivo slušaj ostale i pokušaj otkriti tko je dobio drugačije pitanje.",

    rulesRoundTitle: "KAKO IZGLEDA RUNDA",

    rulesStep1Title: "Pročitaj svoje pitanje",
    rulesStep1Text:
      "Svaki igrač dobiva privatno pitanje. Nikome nemoj pokazivati svoj ekran.",

    rulesStep2Title: "Odgovori naglas",
    rulesStep2Text:
      "Svi igrači naglas odgovaraju na svoje pitanje. Pažljivo slušaj jer odgovor jednog igrača možda neće potpuno odgovarati ostalima.",

    rulesStep3Title: "Glasaj",
    rulesStep3Text:
      "Nakon što svi odgovore, potajno glasaj za igrača za kojeg misliš da je Sumnjivac.",

    rulesStep4Title: "Otkrivanje",
    rulesStep4Text:
      "Igra otkriva tko je bio Sumnjivac, oba pitanja i kako je svaki igrač glasao.",

    rulesScoringTitle: "BODOVANJE",
    rulesScoringGroup:
      "Igrači koji točno otkriju Sumnjivca mogu osvojiti bodove.",
    rulesScoringSuspect:
      "Sumnjivac može osvojiti bodove ako uspije izbjeći otkrivanje.",

    rulesTipsTitle: "SAVJETI",
    rulesTip1:
      "Nemoj dati odgovor koji je previše neodređen.",
    rulesTip2:
      "Nemoj biti toliko precizan da otkriješ svoje pitanje.",
    rulesTip3:
      "Slušaj odgovore koji zvuče kao da se malo ne uklapaju.",
    rulesTip4:
      "Ako si Sumnjivac, ostani miran i uvjerljivo blefiraj.",

    rulesBestWithTitle: "NAJBOLJE ZA",
    rulesPlayers: "3–12 igrača",
    rulesPhones: "Jedan mobitel po igraču",
    rulesPerfectFor:
      "Prijatelje, zabave i večeri društvenih igara",

    rulesImportantTitle: "VAŽNO",
    rulesImportantText:
      "Drži svoj mobitel skrivenim. Ako vidiš pitanje drugog igrača, možeš pokvariti cijelu rundu.",
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (
    language: Language
  ) => void;
  t: (
    key: TranslationKey
  ) => string;
};

const LanguageContext =
  createContext<LanguageContextType | null>(
    null
  );

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    language,
    setLanguageState,
  ] = useState<Language>("en");

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
    setLanguageState(
      newLanguage
    );

    localStorage.setItem(
      "suspect-language",
      newLanguage
    );

    document.documentElement.lang =
      newLanguage;
  }

  function t(
    key: TranslationKey
  ) {
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
      <div className="fixed top-3 right-3 z-50">
        <div className="flex rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
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