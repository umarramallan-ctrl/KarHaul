import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Budget suggestion for CreateShipment
router.post("/ai/budget-suggest", async (req: Request, res: Response) => {
  const { vehicleYear, vehicleMake, vehicleModel, vehicleType, vehicleCondition, transportType, originCity, originState, destinationCity, destinationState } = req.body;
  if (!vehicleMake || !originState || !destinationState) {
    res.status(400).json({ error: "Vehicle and route info required" });
    return;
  }
  try {
    const client = getClient();
    const prompt = `You are an auto transport pricing expert. Estimate a realistic transport budget range for this shipment.

Vehicle: ${vehicleYear || ""} ${vehicleMake} ${vehicleModel || ""} (${vehicleType || "sedan"}, ${vehicleCondition || "running"})
Transport: ${transportType || "open"} carrier
Route: ${originCity || ""}, ${originState} → ${destinationCity || ""}, ${destinationState}

Respond with ONLY a JSON object like: {"min": 750, "max": 1100, "note": "one sentence explanation"}
No other text.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as any).text?.trim() || "";
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) { res.json({ min: null, max: null, note: null }); return; }
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ min: parsed.min, max: parsed.max, note: parsed.note });
  } catch (err) {
    res.status(500).json({ error: "AI suggestion unavailable" });
  }
});

// Support chatbot
router.post("/ai/chat", async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: Array<{ role: "user" | "assistant"; content: string }> };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages required" });
    return;
  }
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are KarHaul's friendly support assistant. KarHaul is a vehicle transport marketplace connecting shippers (who need vehicles transported) and drivers (carriers who transport vehicles).

Help users with questions about: posting loads, bidding on loads, booking process, escrow/fees (5% shipper fee, 3% driver fee), cancellation policy (1 hour penalty-free), BOL (Bill of Lading), tracking, messaging, profile setup, and general platform use.

Keep responses concise and helpful. If a question is outside KarHaul's scope, politely redirect. Do not share contact info or provide legal/financial advice.`,
      messages,
    });
    const reply = (response.content[0] as any).text || "";
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: "Support chat unavailable" });
  }
});

export default router;
