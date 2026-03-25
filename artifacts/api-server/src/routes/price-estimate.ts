import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const STATE_COORDS: Record<string, [number, number]> = {
  AL: [32.8, -86.9], AK: [64.2, -153.4], AZ: [34.3, -111.6], AR: [34.9, -92.4],
  CA: [36.8, -119.4], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [38.9, -75.5],
  FL: [28.7, -82.5], GA: [32.7, -83.4], HI: [20.5, -157.0], ID: [44.4, -114.6],
  IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.1, -93.6], KS: [38.5, -98.4],
  KY: [37.7, -84.9], LA: [31.2, -91.8], ME: [45.4, -69.2], MD: [39.0, -76.7],
  MA: [42.3, -71.8], MI: [44.3, -85.4], MN: [46.4, -93.1], MS: [32.7, -89.7],
  MO: [38.4, -92.5], MT: [47.0, -110.5], NE: [41.5, -99.7], NV: [39.3, -116.6],
  NH: [43.7, -71.6], NJ: [40.1, -74.3], NM: [34.3, -106.0], NY: [42.9, -75.5],
  NC: [35.6, -79.8], ND: [47.5, -100.5], OH: [40.4, -82.8], OK: [35.6, -97.5],
  OR: [44.1, -120.5], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.7], TX: [31.5, -99.3], UT: [39.3, -111.1],
  VT: [44.1, -72.7], VA: [37.8, -78.2], WA: [47.4, -120.6], WV: [38.6, -80.6],
  WI: [44.3, -89.6], WY: [43.0, -107.5], DC: [38.9, -77.0],
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatePrice(distanceMiles: number, vehicleType: string, transportType: string, vehicleCondition: string): { min: number; max: number; brokerSavings: number } {
  let baseCostPerMile: number;
  if (distanceMiles < 250) baseCostPerMile = 1.80;
  else if (distanceMiles < 600) baseCostPerMile = 1.20;
  else if (distanceMiles < 1200) baseCostPerMile = 0.90;
  else baseCostPerMile = 0.70;

  const vehicleMultipliers: Record<string, number> = {
    sedan: 1.0, suv: 1.1, truck: 1.2, van: 1.15, motorcycle: 0.85,
    rv: 1.8, exotic: 1.6, other: 1.0,
  };
  const vehicleMult = vehicleMultipliers[vehicleType] || 1.0;
  const transportMult = transportType === "enclosed" ? 1.45 : 1.0;
  const conditionMult = vehicleCondition === "non_running" ? 1.25 : 1.0;
  const baseMin = Math.max(250, Math.round(distanceMiles * baseCostPerMile * vehicleMult * transportMult * conditionMult));
  const baseMax = Math.round(baseMin * 1.25);
  const brokerMarkup = Math.round((baseMin + baseMax) / 2 * 0.25);

  return { min: baseMin, max: baseMax, brokerSavings: brokerMarkup };
}

router.post("/price-estimate", (req: Request, res: Response) => {
  const { originState, destinationState, vehicleType, transportType, vehicleCondition } = req.body;
  if (!originState || !destinationState) {
    res.status(400).json({ error: "originState and destinationState are required" });
    return;
  }
  const origin = STATE_COORDS[originState?.toUpperCase()];
  const dest = STATE_COORDS[destinationState?.toUpperCase()];
  if (!origin || !dest) {
    res.status(400).json({ error: "Invalid state codes" });
    return;
  }
  const distance = Math.round(haversineDistance(origin[0], origin[1], dest[0], dest[1]));
  const { min, max, brokerSavings } = estimatePrice(distance, vehicleType || "sedan", transportType || "open", vehicleCondition || "running");
  res.json({ estimatedMin: min, estimatedMax: max, distanceMiles: distance, brokerSavings, note: "Direct driver pricing. Traditional brokers would add $" + brokerSavings + " on average." });
});

export default router;
