const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = 8080;

app.use(cors());

app.use(express.json());

app.post("/create-web-call", async (req, res) => {
  const { mode } = req.query;
  const { agentId } = req.body;

  const payload = { agentId };

  try {
    console.log(req.query.mode);
    const response = await axios.post(
      `https://atoms-api.smallest.ai/api/v1/conversation/${mode}`,
      payload,
      {
        headers: {
          Authorization: "Bearer your-api-key",
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
