import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend running" });
});

// GET /api/search?q=94103&radius=7000
app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const radius = Number(req.query.radius || 7000);

    if (!q) return res.status(400).json({ error: "Missing q" });
    if (!GOOGLE_KEY) return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY in server/.env" });

    // 1) Geocode query -> lat/lng
    const geoUrl =
      "https://maps.googleapis.com/maps/api/geocode/json?" +
      new URLSearchParams({ address: q, key: GOOGLE_KEY }).toString();

    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return res.status(404).json({
        error: "Location not found",
        status: geoData.status,
        message: geoData.error_message || null,
      });
    }

    const center = geoData.results[0].geometry.location; // { lat, lng }

    // 2) Use Places API (New) searchText around that center (keyword-based)
    const searches = [
      { text: "thrift store", category: "Thrift Store" },
      { text: "donation center", category: "Donation Center" },
      { text: "clothing donation", category: "Donation Center" },
      { text: "clothing swap", category: "Exchange Event" },
    ];

    const seen = new Set();
    const out = [];

    for (const s of searches) {
      const textUrl = "https://places.googleapis.com/v1/places:searchText";
      const body = {
        textQuery: `${s.text} near ${q}`,
        maxResultCount: 20,
        languageCode: "en",
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: Math.max(1000, Math.min(50000, radius)),
          },
        },
      };

      const resp = await fetch(textUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount",
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      const places = data.places || [];

      for (const p of places) {
        const id = p.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);

        out.push({
          id,
          name: p.displayName?.text || "Unknown",
          address: p.formattedAddress || "",
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          types: p.types || [],
          rating: p.rating ?? null,
          ratingCount: p.userRatingCount ?? null,
          mapsUrl: p.googleMapsUri || null,
          website: p.websiteUri || null,
          phone: p.nationalPhoneNumber || null,
          category: s.category,
        });
      }
    }

    res.json({ center, places: out.filter(p => typeof p.lat === "number" && typeof p.lng === "number") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: err?.message || String(err) });
  }
});

// POST /api/summarize
// Body: { name, address, category, rating, website, phone }
app.post("/api/summarize", async (req, res) => {
  try {
    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const { name, address, category, rating, website, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing store name" });
    }

    console.log(`[Gemini] Generating summary for: ${name}`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Provide a concise, engaging summary (2-3 sentences) about this thrift store:

Name: ${name}
Address: ${address || "Not provided"}
Category: ${category || "Thrift Store"}
Rating: ${rating ? `${rating}/5` : "No rating"}
Website: ${website || "Not available"}
Phone: ${phone || "Not available"}

Focus on what makes this store unique, its vibe, and why someone should visit. Be friendly and encouraging about thrifting.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log(`[Gemini] Summary generated successfully`);
    res.json({ name, summary });
  } catch (err) {
    console.error("[Gemini Error]", err?.message || String(err));
    res.status(500).json({ error: "Failed to generate summary", detail: err?.message || String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
