const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = 8089;

app.use(cors());

app.use(express.json());

app.post("/create-web-call", async (req, res) => {
  const { mode } = req.query;
  const { agentId, apiKey } = req.body;

  // Validate agentId
  if (!agentId || typeof agentId !== "string" || agentId.trim() === "") {
    return res
      .status(400)
      .json({
        error:
          "agentId is required and must be a non-empty string",
      });
  }
  // Validate apiKey
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return res
      .status(400)
      .json({
        error:
          "apiKey is required and must be a non-empty string",
      });
  }

  const payload = { agentId };

  try {
    console.log(`Requested mode: ${mode}, agentId: ${agentId}, apiKey: ${apiKey}`);
    const response = await axios.post(
      `https://atoms-api.smallest.ai/api/v1/conversation/${mode}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);
    res.status(201).json(response.data);
  } catch (error) {
    console.error(
      `Error creating ${mode}:`,
      error.response?.data || error.message
    );
    res.status(500).json({ error: `Failed to create ${mode}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
