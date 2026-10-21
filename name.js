// import express from "express";
// import "dotenv/config";
// import { model } from "./ai.js";
// import { TavilySearch } from "@langchain/tavily";
// import { tool } from "@langchain/core/tools";
// import { z } from "zod";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";

// const app = express();

// app.use(express.json());

// const PORT = process.env.PORT || 4000;

// // 1. Tavily Search Tool
// const searchTool = new TavilySearch({
//   maxResults: 5,
//   topic: "general",
// });

// // 2. Custom Addition Tool
// const additionTool = tool(
//   ({ a, b }) => {
//     return `Addition of ${a} and ${b} is ${a + b}`;
//   },
//   {
//     name: "addition",
//     description: "This tool adds two numbers and returns the result.",
//     schema: z.object({
//       a: z.number().describe("The first number to add."),
//       b: z.number().describe("The second number to add."),
//     }),
//   }
// );

// const tools = [searchTool, additionTool];

// // 3. Bind Tools to Model
// const modelWithTools = model.bindTools(tools);

// // 4. Tool Node
// const toolNode = new ToolNode(tools);

// // 5. Agent Node
// const agent = async (state) => {
//   const result = await modelWithTools.invoke(state.messages);

//   return {
//     messages: [result],
//   };
// };

// // 6. Decide whether to call a tool or finish
// const shouldContinue = (state) => {
//   console.log("Current State:", state);
//   const lastMessage =
//     state.messages[state.messages.length - 1];

//   if (lastMessage?.tool_calls?.length > 0) {
//     return "tool_node";
//   }

//   return "__end__";
// };

// // 7. Build Graph
// const graph = new StateGraph(MessagesAnnotation)
//   .addNode("agent", agent)
//   .addNode("tool_node", toolNode)
//   .addEdge("__start__", "agent")
//   .addConditionalEdges("agent", shouldContinue)
//   .addEdge("tool_node", "agent")
//   .compile();

// // 8. API Route
// app.post("/", async (req, res) => {
//   const { prompt } = req.body ?? {};

//   if (typeof prompt !== "string" || !prompt.trim()) {
//     return res.status(400).json({
//       error: '"prompt" must be a non-empty string.',
//     });
//   }

//   try {
//     const result = await graph.invoke({
//       messages: [
//         {
//           role: "user",
//           content: prompt.trim(),
//         },
//       ],
//     });

//     const lastMessage =
//       result.messages[result.messages.length - 1];

//     return res.json({
//       answer: lastMessage?.content ?? "",
//     });
//   } catch (error) {
//     console.error("Chat API error:", error);

//     return res.status(500).json({
//       error: "An internal server error occurred.",
//     });
//   }
// });

// // 9. Start Server
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`Visit http://localhost:${PORT}`);
// });

import express from "express";
import "dotenv/config";
import { model } from "./ai.js";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 4000;

// 1. Tavily Search Tool
const searchTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

// 2. Custom Addition Tool
const additionTool = tool(
  ({ a, b }) => {
    return `Addition of ${a} and ${b} is ${a + b}`;
  },
  {
    name: "addition",
    description: "This tool adds two numbers and returns the result.",
    schema: z.object({
      a: z.number().describe("The first number to add."),
      b: z.number().describe("The second number to add."),
    }),
  }
);

const tools = [searchTool, additionTool];

// 3. Prompt Template
// LangChain ka tool-calling agent ek "prompt" maangta hai jis mein
// {input} aur {agent_scratchpad} placeholders zaroori hain.
// agent_scratchpad wo jagah hai jahan model ke tool calls aur unke
// results ki history temporarily store hoti hai har step pe.
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant. Use the available tools whenever they are needed to answer accurately."],
  ["placeholder", "{chat_history}"],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

// 4. Agent banayein — LangChain ka built-in tool-calling agent
const agent = await createToolCallingAgent({
  llm: model,
  tools,
  prompt,
});

// 5. Agent Executor — ye wahi kaam karta hai jo pehle tumhara
// StateGraph (agent -> tool_node -> agent loop) manually kar raha tha.
// Ab ye loop AgentExecutor khud internally handle karta hai.
const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true, // terminal mein har step dekhne ke liye; production mein false kar dena
});

// 6. API Route
app.post("/", async (req, res) => {
  const { prompt: userPrompt } = req.body ?? {};

  if (typeof userPrompt !== "string" || !userPrompt.trim()) {
    return res.status(400).json({
      error: '"prompt" must be a non-empty string.',
    });
  }

  try {
    const result = await agentExecutor.invoke({
      input: userPrompt.trim(),
    });

    return res.json({
      answer: result?.output ?? "",
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      error: "An internal server error occurred.",
    });
  }
});

// 7. Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}`);
});