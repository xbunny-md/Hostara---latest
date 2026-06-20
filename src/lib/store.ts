import { create } from 'zustand';

interface HostaraConfig {
  app_name: string;
  app_tagline: string;
  primary_color: string;
  guest_mode_enabled: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  broadcast_message: string;
  plans: any;
  logo_url: string;
  favicon_url: string;
  currency_symbol: string;
  auth_mode: 'clerk' | 'normal' | 'supabase';
}

interface ConfigStore {
  config: HostaraConfig;
  setConfig: (config: HostaraConfig) => void;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: {
    app_name: "Hostara",
    app_tagline: "powered by SwiftCloud",
    primary_color: "#8B5CF6",
    guest_mode_enabled: true,
    maintenance_mode: false,
    maintenance_message: "",
    broadcast_message: "",
    plans: {},
    logo_url: "",
    favicon_url: "",
    currency_symbol: "$",
    auth_mode: "supabase",
  },
  setConfig: (config) => set({ config }),
  fetchConfig: async () => {
    try {
      const res = await fetch("/api/config/public");
      const data = await res.json();
      set({ config: data });
    } catch(e) {
      console.error("Failed to fetch public config", e);
    }
  }
}));
