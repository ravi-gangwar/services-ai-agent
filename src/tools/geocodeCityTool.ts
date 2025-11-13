import { tool } from "langchain";
import z from "zod";
import geocodeCity from "../utils/geocodeCity";

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

export default geocodeCityTool;

