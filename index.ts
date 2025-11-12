import express from "express";
import chat from "./src/controller/agent";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/chat", (req, res) => chat);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});