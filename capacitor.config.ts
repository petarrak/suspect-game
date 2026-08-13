import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.partygames.app",
  appName: "Party Games",
  webDir: "www",

  server: {
    url: "https://suspect-game-tau.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;