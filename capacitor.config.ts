import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.freefloripa.app",
  appName: "PONT",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  ios: {
    scheme: "PONT"
  }
};

export default config;
