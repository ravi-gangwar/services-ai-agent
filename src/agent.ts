import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import type { Request, Response } from "express";
import z from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import dbSchema from "./constants/prompts/dbAgent";
import { geocodeCityTool, databaseTool, noLocationTool } from "./utils/tools";
import { initialPrompt, getFormatPrompt } from "./constants/prompts/response";

const tools = [geocodeCityTool, databaseTool, noLocationTool];
const toolNode = new ToolNode(tools);

const llm = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
}).bindTools(tools);

const responseFormatter = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GROQ_API_KEY,
});

const agentCallback = async (state: any) => {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
};

const shouldContinue = (state: any) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const messageCount = state.messages.length;
  
  if (messageCount > 20) {
    return "end";
  }
  
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
  content: `${initialPrompt}\n\nDatabase schema:\n${dbSchema}`,
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

    const formatResponse = await responseFormatter.invoke([
      { role: "user", content: getFormatPrompt(assistantText) },
    ]);

    const formatText =
      typeof formatResponse.content === "string"
        ? formatResponse.content
        : JSON.stringify(formatResponse.content ?? "");

    let structuredOutput;
    try {
      const jsonMatch = formatText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredOutput = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      structuredOutput = {
        ai_voice: assistantText.substring(0, 200),
        markdown_text: assistantText,
      };
    }

    res.status(200).json({
      ai_voice: structuredOutput.ai_voice || assistantText.substring(0, 200),
      markdown_text: structuredOutput.markdown_text || assistantText,
    });
  } catch (error) {
    console.error("Agent execution failed:", error);
    res
      .status(500)
      .json({ error: "Unable to complete the request at this time." });
  }
};

export default chat;
