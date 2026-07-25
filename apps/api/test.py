import httpx
import asyncio
import json

async def main():
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", "http://127.0.0.1:8000/api/chat", json={"message": "what is my fav color?"}) as response:
                async for chunk in response.aiter_text():
                    print(chunk)
        except Exception as e:
            print("Error:", e)

asyncio.run(main())
