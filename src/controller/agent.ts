import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import type { Request, Response } from "express";
import z from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import dbSchema from "../constants/prompts/dbAgent";
import geocodeCityTool from "../tools/geocodeCityTool";
import databaseTool from "../tools/databaseTool";

const tools = [geocodeCityTool, databaseTool];
const toolNode = new ToolNode(tools);

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
}).bindTools(tools);

const responseSchema = z.object({
  ai_voice: z
    .string()
    .describe(
      "Friendly response with simple wording and no special symbols so text-to-speech can read it clearly."
    ),
  markdown_text: z
    .string()
    .describe(
      "Markdown formatted response suitable for rendering in the frontend chat window."
    ),
});

const responseFormatter = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
}).withStructuredOutput(responseSchema);

const agentCallback = async (state: any) => {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
};

const shouldContinue = (state: any) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage?.tool_calls?.length) {
    return "tools";
  }
  return "end";
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentCallback)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    end: "__end__",
  });

const compiledWorkflow = workflow.compile();

const systemMessage = {
  role: "system",
  content:
    "You are a food ordering assistant. When users do not provide latitude and longitude, ask for the city name and call the get_city_coordinates tool to obtain coordinates. Afterwards, generate SQL queries that filter using the retrieved coordinates via the interact_with_database tool. Always return a helpful plain-language summary of the results.",
} as const;

const schemaMessage = {
  role: "system",
  content: `Database schema:\n${dbSchema}`,
} as const;

const chat = async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message) {
    res.status(400).json({ error: "Missing message in request body." });
    return;
  }

  try {
    const initialState = {
      messages: [
        systemMessage,
        schemaMessage,
        { role: "user", content: message },
      ],
    };

    const finalState = await compiledWorkflow.invoke(initialState);
    const messages = (finalState as { messages: Array<any> }).messages;
    const agentMessages = messages.filter(
      (msg: any) => msg.role === "assistant"
    );
    const lastAgentMessage =
      agentMessages[agentMessages.length - 1] ?? messages.at(-1);

    const assistantText =
      typeof lastAgentMessage?.content === "string"
        ? lastAgentMessage.content
        : JSON.stringify(lastAgentMessage?.content ?? "");

    const structuredOutput = await responseFormatter.invoke([
      {
        role: "system",
        content:
          "Transform the provided assistant answer into both a plain voice-friendly sentence and a markdown-formatted response. Avoid adding extra commentary.",
      },
      { role: "user", content: assistantText },
    ]);

    res.status(200).json({
      ai_voice: structuredOutput.ai_voice,
      markdown_text: structuredOutput.markdown_text,
      raw_response: assistantText,
    });
  } catch (error) {
    console.error("Agent execution failed:", error);
    res
      .status(500)
      .json({ error: "Unable to complete the request at this time." });
  }
};

export default chat;
