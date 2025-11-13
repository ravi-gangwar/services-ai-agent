const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

const geocodeCity = async (city: string) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY environment variable.");
  }

  const url = `${GOOGLE_GEOCODE_ENDPOINT}?address=${encodeURIComponent(city)}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: Array<{
      geometry?: { location?: { lat: number; lng: number } };
      formatted_address?: string;
    }>;
    status?: string;
    error_message?: string;
  };

  if (payload.status !== "OK" || !payload.results?.length) {
    throw new Error(
      `Geocoding error (${payload.status ?? "UNKNOWN"}): ${
        payload.error_message ?? "No results found."
      }`
    );
  }

  const location = payload.results[0]?.geometry?.location;
  if (!location) {
    throw new Error("Geocoding response did not include coordinates.");
  }

  return JSON.stringify({ latitude: location.lat, longitude: location.lng });
};

export default geocodeCity;
