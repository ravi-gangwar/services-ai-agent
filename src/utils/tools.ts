import { tool } from "langchain";
import z from "zod";
import { callDB, geocodeCity } from "./nodes";

const databaseTool = tool(
  async ({ query }: { query: string }) => {
    return await callDB(query);
  },
  {
    name: "interact_with_database",
    description:
      "Use this to fetch nearby restaurants. Provide a complete SQL query with actual numeric values (not placeholders). Calculate latitude/longitude ranges around the target coordinates (e.g., ±0.1 degrees for ~11km radius).",
    schema: z.object({
      query: z.string(),
    }),
  }
);


const geocodeCityTool = tool(
  async ({ city }: { city: string }) => {
    return await geocodeCity(city);
  },
  {
    name: "get_city_coordinates",
    description:
      "Use this to convert a city name into latitude and longitude coordinates via the Google Maps Geocoding API.",
    schema: z.object({
      city: z.string(),
    }),
  }
);

const noLocationTool = tool(
  async () => {
    return JSON.stringify({
      message: "I need your location to find nearby restaurants. Please provide either: 1) Your city name, or 2) Your current place name, or 3) Your latitude and longitude coordinates.",
      requires_location: true
    });
  },
  {
    name: "request_location",
    description:
      "Use this when the user asks about nearby restaurants but hasn't provided any location information (no city name, no latitude/longitude, no place name). This tool will instruct you to ask the user for their location.",
    schema: z.object({}),
  }
);

export { databaseTool, geocodeCityTool, noLocationTool };

