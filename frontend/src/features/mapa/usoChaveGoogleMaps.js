import { useEffect, useState } from "react";
import api from "../../services/api";

export function useChaveGoogleMaps() {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function carregarChave() {
      try {
        const response = await api.get("/config/mapa");

        setApiKey(response.data?.data?.googleMapsApiKey ?? null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    carregarChave();
  }, []);

  return {
    apiKey,
    loading,
    error,
  };
}
