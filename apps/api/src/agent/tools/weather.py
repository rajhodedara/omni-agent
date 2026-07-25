from pydantic import BaseModel, Field
import httpx
from .base import BaseTool

class WeatherInput(BaseModel):
    city: str = Field(..., description="The name of the city to get weather for.")

class WeatherTool(BaseTool):
    name = "weather"
    description = "Gets current weather and forecast for a given city."
    input_schema = WeatherInput

    async def execute(self, city: str) -> dict:
        # 1. Geocoding
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
        async with httpx.AsyncClient(timeout=10.0) as client:
            geo_res = await client.get(geocode_url)
            geo_res.raise_for_status()
            geo_data = geo_res.json()
            if not geo_data.get("results"):
                raise ValueError(f"City {city} not found.")
            
            loc = geo_data["results"][0]
            lat, lon = loc["latitude"], loc["longitude"]
            
            # 2. Weather
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
            w_res = await client.get(weather_url)
            w_res.raise_for_status()
            return w_res.json()
