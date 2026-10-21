// // import readline from "readline";
// // import { model } from "./ai.js";


// // // Readline interface setup for terminal input/output
// // const rl = readline.createInterface({
// //   input: process.stdin,
// //   output: process.stdout,
// // });

// // async function chat() {
// //   console.log("--- AI Chat Started (Type 'exit' to quit) ---");

// //   while (true) {
// //     // User se input mangna
// //     const userInput = await new Promise((resolve) => {
// //       rl.question("\nYou: ", (answer) => resolve(answer));
// //     });

// //     // Exit condition
// //     if (userInput.toLowerCase() === "exit") {
// //       console.log("Exiting chat... Allah Hafiz!");
// //       rl.close();
// //       break;
// //     }

// //     try {
// //       // System and User roles define karna
// //       const messages = [
// //         ["system", "You are a helpful coding teacher. Explain concepts simply, use examples, and encourage the student."],
// //         ["user", userInput],
// //       ];

// //       // AI se response lena (messages array pass karna)
// //       const response = await model.invoke(messages);
// //       console.log(`\nAI: ${response.content}`);
// //     } catch (error) {
// //       console.error("\nError occurred:", error.message);
// //     }
// //   }
//  }

//  chat();



