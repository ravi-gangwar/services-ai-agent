import { tool } from "langchain";
import z from "zod";
import callDB from "../utils/callDB";

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

export default databaseTool;

