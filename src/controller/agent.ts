import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import type { Request, Response } from "express";


async function agentCallback(state: any) {
    return "hello";
}

const chat = (req: Request, res: Response) => {
  const { message } = req.body;


  const workflow = new StateGraph(MessagesAnnotation)
  .addNode("Agent", agentCallback)

  res.send(`You said: ${message}`);
};

export default chat;