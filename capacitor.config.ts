import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.freefloripa.app",
  appName: "Free Floripa",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  ios: {
    scheme: "Free Floripa"
  }
};

export default config;
