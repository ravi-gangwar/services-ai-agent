import createDbClient from "../db/dbClient";

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

const callDB = async (query: string) => {
  const client = createDbClient();
  await client.connect();

  try {
    console.log("Executing query:", query);
    
    if (query.includes("?")) {
      return JSON.stringify({ 
        error: "SQL queries must use actual values, not placeholders. Replace ? with actual numbers or strings." 
      });
    }
    
    let modifiedQuery = query;
    if (!query.toUpperCase().includes("LIMIT")) {
      modifiedQuery = query.replace(/;?\s*$/, "") + " LIMIT 10";
    }
    
    const result = await client.query(modifiedQuery);
    const rows = result.rows || [];
    
    if (rows.length === 0) {
      return JSON.stringify({ message: "No restaurants found. Try adjusting the search area or check if coordinates are correct." });
    }
    
    const essentialFields = rows.map((row: any) => ({
      store_name: row.store_name,
      city: row.city,
      vendor_rating: row.vendor_rating,
      online: row.online,
    }));
    
    const resultStr = JSON.stringify(essentialFields);
    
    if (resultStr.length > 2000) {
      const truncated = essentialFields.slice(0, 5);
      return JSON.stringify({
        restaurants: truncated,
        total_found: rows.length,
        message: `Found ${rows.length} restaurants. Showing first 5.`
      });
    }
    
    return resultStr;
  } catch (error: any) {
    return JSON.stringify({ 
      error: `Database error: ${error.message}. Make sure SQL syntax is correct and uses actual values.` 
    });
  } finally {
    await client.end();
  }
};

export { callDB, geocodeCity };

