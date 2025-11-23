import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://localhost:4000";

export function useApiKey(deviceLabel: string) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const stored = await AsyncStorage.getItem("nc_api_key");
        if (stored) {
          setApiKey(stored);
          setLoading(false);
          return;
        }

        const resp = await fetch(`${API_BASE}/api/auth/device`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceLabel })
        });
        if (!resp.ok) throw new Error("Failed to create device user");
        const data = await resp.json();
        await AsyncStorage.setItem("nc_api_key", data.apiKey);
        setApiKey(data.apiKey);
      } catch (e) {
        console.log("useApiKey error", e);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [deviceLabel]);

  return { apiKey, loading };
}
