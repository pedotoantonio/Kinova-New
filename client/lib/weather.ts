/**
 * Weather Service using Open-Meteo API
 * 
 * Open-Meteo is a free, open-source weather API that:
 * - Requires no API key
 * - Has no commercial restrictions
 * - Supports current weather + 7-day forecasts
 * - Has a geocoding API for city search
 * - Is highly reliable and well-maintained
 */

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1";

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;
}

export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  apparentTemperature: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  current: CurrentWeather;
  today: DailyForecast;
  tomorrow: DailyForecast;
  location: {
    city: string;
    lat: number;
    lon: number;
  };
  fetchedAt: string;
}

export async function searchCities(query: string, language: "it" | "en" = "it"): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const url = `${GEOCODING_BASE}/search?name=${encodeURIComponent(query)}&count=5&language=${language}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("[Weather] City search error:", error);
    return [];
  }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  city: string
): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: "2",
    });

    const url = `${OPEN_METEO_BASE}/forecast?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const current: CurrentWeather = {
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      humidity: data.current.relative_humidity_2m,
      apparentTemperature: Math.round(data.current.apparent_temperature),
      isDay: data.current.is_day === 1,
    };
    
    const today: DailyForecast = {
      date: data.daily.time[0],
      weatherCode: data.daily.weather_code[0],
      temperatureMax: Math.round(data.daily.temperature_2m_max[0]),
      temperatureMin: Math.round(data.daily.temperature_2m_min[0]),
      precipitationProbability: data.daily.precipitation_probability_max[0] || 0,
      sunrise: data.daily.sunrise[0],
      sunset: data.daily.sunset[0],
    };
    
    const tomorrow: DailyForecast = {
      date: data.daily.time[1],
      weatherCode: data.daily.weather_code[1],
      temperatureMax: Math.round(data.daily.temperature_2m_max[1]),
      temperatureMin: Math.round(data.daily.temperature_2m_min[1]),
      precipitationProbability: data.daily.precipitation_probability_max[1] || 0,
      sunrise: data.daily.sunrise[1],
      sunset: data.daily.sunset[1],
    };
    
    return {
      current,
      today,
      tomorrow,
      location: { city, lat, lon },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Weather] Fetch error:", error);
    return null;
  }
}

export function getWeatherDescription(code: number, language: "it" | "en"): string {
  const descriptions: Record<number, { it: string; en: string }> = {
    0: { it: "Sereno", en: "Clear sky" },
    1: { it: "Prevalentemente sereno", en: "Mainly clear" },
    2: { it: "Parzialmente nuvoloso", en: "Partly cloudy" },
    3: { it: "Nuvoloso", en: "Overcast" },
    45: { it: "Nebbia", en: "Fog" },
    48: { it: "Nebbia con brina", en: "Depositing rime fog" },
    51: { it: "Pioviggine leggera", en: "Light drizzle" },
    53: { it: "Pioviggine moderata", en: "Moderate drizzle" },
    55: { it: "Pioviggine intensa", en: "Dense drizzle" },
    56: { it: "Pioviggine gelata", en: "Freezing drizzle" },
    57: { it: "Pioviggine gelata intensa", en: "Dense freezing drizzle" },
    61: { it: "Pioggia leggera", en: "Slight rain" },
    63: { it: "Pioggia moderata", en: "Moderate rain" },
    65: { it: "Pioggia intensa", en: "Heavy rain" },
    66: { it: "Pioggia gelata", en: "Freezing rain" },
    67: { it: "Pioggia gelata intensa", en: "Heavy freezing rain" },
    71: { it: "Neve leggera", en: "Slight snow" },
    73: { it: "Neve moderata", en: "Moderate snow" },
    75: { it: "Neve intensa", en: "Heavy snow" },
    77: { it: "Granuli di neve", en: "Snow grains" },
    80: { it: "Rovesci leggeri", en: "Slight rain showers" },
    81: { it: "Rovesci moderati", en: "Moderate rain showers" },
    82: { it: "Rovesci violenti", en: "Violent rain showers" },
    85: { it: "Rovesci di neve leggeri", en: "Slight snow showers" },
    86: { it: "Rovesci di neve intensi", en: "Heavy snow showers" },
    95: { it: "Temporale", en: "Thunderstorm" },
    96: { it: "Temporale con grandine", en: "Thunderstorm with hail" },
    99: { it: "Temporale con grandine intensa", en: "Thunderstorm with heavy hail" },
  };
  
  return descriptions[code]?.[language] || (language === "it" ? "Sconosciuto" : "Unknown");
}

export function getWeatherIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2) return isDay ? "cloud" : "cloud";
  if (code === 3) return "cloud";
  if (code >= 45 && code <= 48) return "cloud";
  if (code >= 51 && code <= 67) return "cloud-rain";
  if (code >= 71 && code <= 77) return "cloud-snow";
  if (code >= 80 && code <= 82) return "cloud-rain";
  if (code >= 85 && code <= 86) return "cloud-snow";
  if (code >= 95) return "cloud-lightning";
  return "cloud";
}
