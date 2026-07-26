import os
from pydantic import BaseModel, Field
from typing import Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from .base import BaseTool

class SingleEvent(BaseModel):
    event_title: str = Field(..., description="The title of the calendar event.")
    start_time: str = Field(..., description="Start time of the event in ISO 8601 format (e.g., '2023-10-27T10:00:00-07:00').")
    end_time: str = Field(..., description="End time of the event in ISO 8601 format.")
    description: Optional[str] = Field(None, description="Detailed description or itinerary notes for the event.")
    location: Optional[str] = Field(None, description="Physical location or address for the event.")

class GoogleCalendarInput(BaseModel):
    events: list[SingleEvent] = Field(..., description="A list of events to add to the calendar.")
    
class GoogleCalendarTool(BaseTool):
    name = "google_calendar"
    description = (
        "Add one or more events to the user's primary Google Calendar. "
        "IMPORTANT: ONLY use this tool when the user EXPLICITLY requests adding dates or events to their calendar (e.g., 'add to my calendar', 'schedule on Google Calendar'). "
        "Do NOT automatically add travel itineraries, flight dates, or study schedules without an explicit request! "
        "Requires the user to have generated a token.json file first. "
        "This tool automatically prompts the user for approval before inserting the events."
    )
    input_schema = GoogleCalendarInput
    requires_approval = True

    async def execute(self, events: list[dict]) -> dict:
        # Make token path resolution absolute based on this file's location
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        token_path = os.path.join(base_dir, "token.json")
        
        if not os.path.exists(token_path):
            raise FileNotFoundError(
                f"Google Calendar token.json not found at {token_path}. Please run the `python -m src.scripts.auth_google` script to authorize the agent."
            )

        try:
            creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/calendar.events'])
            service = build('calendar', 'v3', credentials=creds)

            created_links = []
            for event_data in events:
                start_time = event_data['start_time']
                end_time = event_data['end_time']
                
                start_key = 'date' if len(start_time) <= 10 else 'dateTime'
                end_key = 'date' if len(end_time) <= 10 else 'dateTime'
                
                event = {
                    'summary': event_data['event_title'],
                    'start': {
                        start_key: start_time,
                    },
                    'end': {
                        end_key: end_time,
                    },
                }
                if event_data.get('description'):
                    event['description'] = event_data['description']
                if event_data.get('location'):
                    event['location'] = event_data['location']

                created_event = service.events().insert(calendarId='primary', body=event).execute()
                created_links.append(created_event.get('htmlLink'))
            
            return {
                "success": True,
                "message": f"{len(events)} events created successfully.",
                "event_links": created_links
            }

        except HttpError as error:
            raise RuntimeError(f"An error occurred connecting to Google Calendar: {error}")
        except Exception as e:
            raise RuntimeError(f"Failed to create Google Calendar event: {str(e)}")
