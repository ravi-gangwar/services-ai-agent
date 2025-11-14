import express from "express"; // Import Express to create the HTTP server
import chat from "./src/agent"; // Import the chat controller that hosts the LangGraph agent
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/chat", chat); // Attach the chat controller directly as the POST handler

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});