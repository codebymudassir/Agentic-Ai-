import express from "express";
import "dotenv/config";
import { randomUUID } from "node:crypto";

import { model } from "./ai.js";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ---- Tools ----
const searchTool = new TavilySearch({ maxResults: 5, topic: "general" });

const additionTool = tool(
  ({ a, b }) => `Addition of ${a} and ${b} is ${a + b}`,
  {
    name: "addition",
    description: "Adds two numbers and returns the result.",
    schema: z.object({
      a: z.number().describe("The first number to add."),
      b: z.number().describe("The second number to add."),
    }),
  }
);

const tools = [searchTool, additionTool];
const modelWithTools = model.bindTools(tools);
const toolNode = new ToolNode(tools);

// ---- Agent ----
const agent = async (state) => {
  const result = await modelWithTools.invoke(state.messages);
  return { messages: [result] };
};

const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage?.tool_calls?.length ? "tool_node" : "__end__";
};

// ---- Graph with short-term (thread-scoped) memory ----
const checkpointer = new MemorySaver();

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent)
  .addNode("tool_node", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tool_node", "agent")
  .compile({ checkpointer });

// ---- API ----
app.post("/", async (req, res) => {
  const { prompt, sessionId } = req.body ?? {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({
      error: '"prompt" must be a non-empty string.',
    });
  }

  // Reuse provided session or start a new one (per-conversation memory)
  const threadId = typeof sessionId === "string" && sessionId.trim()
    ? sessionId.trim()
    : randomUUID();

  try {
    const result = await graph.invoke(
      { messages: [{ role: "user", content: prompt.trim() }] },
      { configurable: { thread_id: threadId } }
    );

    const lastMessage = result.messages[result.messages.length - 1];

    return res.json({
      answer: lastMessage?.content ?? "",
      sessionId: threadId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "An internal server error occurred.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});