from pydantic import BaseModel, Field
import httpx
from .base import BaseTool

class WeatherInput(BaseModel):
    city: str = Field(..., description="The name of the city to get weather for.")

class WeatherTool(BaseTool):
    name = "weather"
    description = (
        "Get current weather data for any city or coordinates. Returns temperature, "
        "windspeed, and general conditions. Essential for trip planning, packing lists, "
        "and checking local climate."
    )
    input_schema = WeatherInput

    async def execute(self, city: str) -> dict:
        # 1. Geocoding using Nominatim (much better coverage than Open-Meteo geocoding)
        geocode_url = "https://nominatim.openstreetmap.org/search"
        params = {"q": city, "format": "json", "limit": 1}
        headers = {"User-Agent": "PersonalAi-Agent/0.1"}
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            geo_res = await client.get(geocode_url, params=params, headers=headers)
            geo_res.raise_for_status()
            geo_data = geo_res.json()
            if not geo_data:
                raise ValueError(f"City '{city}' not found.")
            
            loc = geo_data[0]
            lat, lon = float(loc["lat"]), float(loc["lon"])
            
            # 2. Weather
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
            w_res = await client.get(weather_url)
            w_res.raise_for_status()
            return w_res.json()
