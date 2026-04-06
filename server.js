const express = require("express");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: ["https://onkron.de", "https://www.onkron.de"],
  }),
);

const cache = new Map();
const TTL = 1000 * 60 * 30; // 30 минут

app.get("/cargo", async (req, res) => {
  try {
    const model = (req.query.model || "").trim();

    if (!model) {
      return res.status(400).json({ error: "model is required" });
    }

    const cacheKey = model.toUpperCase();
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    const response = await fetch(
      `https://shop.onkron.ru/get_cargo_data.php?model=${encodeURIComponent(model)}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream returned ${response.status}`,
      });
    }

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({
        error: "Upstream did not return valid JSON",
      });
    }

    cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + TTL,
    });

    return res.json(data);
  } catch (error) {
    console.error("Cargo proxy error:", error);
    return res.status(500).json({ error: "Internal proxy error" });
  }
});

app.listen(3000, () => {
  console.log("Proxy server started on port 3000");
});
