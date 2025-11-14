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
      "Use this to fetch nearby restaurants. Provide a SQL query that filters by latitude and longitude columns.",
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

export { databaseTool, geocodeCityTool };

