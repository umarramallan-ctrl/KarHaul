import { useQuery } from "@tanstack/react-query";

export type WeatherSeverity = "advisory" | "warning" | "watch" | null;

export interface WeatherAlert {
  severity: WeatherSeverity;
  headline: string;
  detail: string;
  icon: "cloud-rain" | "cloud-snow" | "zap" | "wind" | "cloud-drizzle";
}

const WEATHER_CODES: Record<number, { label: string; severity: WeatherSeverity; icon: WeatherAlert["icon"] }> = {
  51: { label: "Light drizzle", severity: "advisory", icon: "cloud-drizzle" },
  53: { label: "Moderate drizzle", severity: "advisory", icon: "cloud-drizzle" },
  55: { label: "Heavy drizzle", severity: "advisory", icon: "cloud-drizzle" },
  61: { label: "Light rain", severity: "advisory", icon: "cloud-rain" },
  63: { label: "Moderate rain", severity: "advisory", icon: "cloud-rain" },
  65: { label: "Heavy rain", severity: "warning", icon: "cloud-rain" },
  66: { label: "Light freezing rain", severity: "warning", icon: "cloud-rain" },
  67: { label: "Heavy freezing rain", severity: "watch", icon: "cloud-rain" },
  71: { label: "Light snow", severity: "advisory", icon: "cloud-snow" },
  73: { label: "Moderate snow", severity: "warning", icon: "cloud-snow" },
  75: { label: "Heavy snow", severity: "watch", icon: "cloud-snow" },
  77: { label: "Snow grains / ice pellets", severity: "warning", icon: "cloud-snow" },
  80: { label: "Light rain showers", severity: "advisory", icon: "cloud-rain" },
  81: { label: "Moderate rain showers", severity: "advisory", icon: "cloud-rain" },
  82: { label: "Violent rain showers", severity: "warning", icon: "cloud-rain" },
  85: { label: "Light snow showers", severity: "advisory", icon: "cloud-snow" },
  86: { label: "Heavy snow showers", severity: "warning", icon: "cloud-snow" },
  95: { label: "Thunderstorm", severity: "warning", icon: "zap" },
  96: { label: "Thunderstorm with hail", severity: "watch", icon: "zap" },
  99: { label: "Thunderstorm with heavy hail", severity: "watch", icon: "zap" },
};

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = `${city} ${state}`;
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&country_code=US&count=1`
    );
    const json = await res.json();
    if (json.results?.[0]) {
      return { lat: json.results[0].latitude, lon: json.results[0].longitude };
    }
  } catch { }
  return null;
}

async function fetchWeatherAlert(city: string, state: string): Promise<WeatherAlert | null> {
  const coords = await geocodeCity(city, state);
  if (!coords) return null;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=weather_code,wind_speed_10m,apparent_temperature&wind_speed_unit=mph&timezone=auto`
    );
    const json = await res.json();
    const code: number = json.current?.weather_code ?? 0;
    const wind: number = json.current?.wind_speed_10m ?? 0;
    const temp: number = json.current?.apparent_temperature ?? 99;

    const weatherInfo = WEATHER_CODES[code];

    if (wind >= 50) {
      return {
        severity: wind >= 65 ? "watch" : "warning",
        headline: `High wind advisory near ${city}, ${state}`,
        detail: `Sustained winds at ${Math.round(wind)} mph — open carriers may be affected. Secure loads and drive with caution.`,
        icon: "wind",
      };
    }

    if (weatherInfo) {
      const baseDetail = buildDetail(weatherInfo.label, city, state, temp);
      return {
        severity: weatherInfo.severity,
        headline: `${weatherInfo.label} near ${city}, ${state}`,
        detail: baseDetail,
        icon: weatherInfo.icon,
      };
    }

    if (wind >= 35 && wind < 50) {
      return {
        severity: "advisory",
        headline: `Breezy conditions near ${city}, ${state}`,
        detail: `Winds at ${Math.round(wind)} mph — open carriers should be prepared for increased fuel use and handling changes.`,
        icon: "wind",
      };
    }

    return null;
  } catch {
    return null;
  }
}

function buildDetail(condition: string, city: string, state: string, feelsLike: number): string {
  const parts: string[] = [];
  if (condition.toLowerCase().includes("ice") || condition.toLowerCase().includes("freezing")) {
    parts.push("Ice or freezing precipitation expected — allow extra stopping distance, avoid sudden braking, and check tire chains.");
  } else if (condition.toLowerCase().includes("snow") || condition.toLowerCase().includes("blizzard")) {
    parts.push("Snow conditions reported — reduce speed, increase following distance, and ensure windshield defrosters are clear.");
  } else if (condition.toLowerCase().includes("thunder")) {
    parts.push("Active thunderstorm — stay off elevated highways, be alert for hydroplaning, and check your route for road closures.");
  } else if (condition.toLowerCase().includes("rain")) {
    parts.push("Wet road conditions near pickup — allow extra braking distance and watch for standing water on ramps.");
  }
  if (feelsLike <= 28) {
    parts.push(`Feels like ${Math.round(feelsLike)}°F — risk of black ice on bridges and overpasses.`);
  }
  return parts.join(" ") || `Current ${condition} conditions reported near ${city}, ${state}. Drive with caution.`;
}

export function useWeatherAlert(city: string | undefined, state: string | undefined) {
  return useQuery<WeatherAlert | null>({
    queryKey: ["weather", city, state],
    queryFn: () => (city && state ? fetchWeatherAlert(city, state) : Promise.resolve(null)),
    enabled: !!city && !!state,
    staleTime: 15 * 60 * 1000,
    retry: false,
  });
}
