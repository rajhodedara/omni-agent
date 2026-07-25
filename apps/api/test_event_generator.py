import asyncio
import json
from src.api.chat import ChatRequest, event_generator

async def main():
    request = ChatRequest(message="what is my fav color?")
    try:
        async for event in event_generator(request):
            print(event)
    except Exception as e:
        print(f"FAILED WITH EXCEPTION: {e}")

asyncio.run(main())
