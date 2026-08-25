import { Preferences } from "@capacitor/preferences";

export const capacitorAuthStorage = {
  async getItem(key: string) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string) {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string) {
    await Preferences.remove({ key });
  }
};
