import base64
import os
import logging
from email.mime.text import MIMEText
import httpx
from src.config import get_settings

logger = logging.getLogger(__name__)

class GmailService:
    def __init__(self):
        self.settings = get_settings()

    async def get_access_token(self) -> str:
        # Load from environment variables, fallback to settings
        client_id = os.environ.get("GMAIL_CLIENT_ID") or getattr(self.settings, "GMAIL_CLIENT_ID", "")
        client_secret = os.environ.get("GMAIL_CLIENT_SECRET") or getattr(self.settings, "GMAIL_CLIENT_SECRET", "")
        refresh_token = os.environ.get("GMAIL_REFRESH_TOKEN") or getattr(self.settings, "GMAIL_REFRESH_TOKEN", "")

        if not client_id or not client_secret or not refresh_token:
            logger.error("Missing Google OAuth credentials.")
            raise ValueError("Gmail authorization credentials are not configured. Please check your environment variables.")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            if resp.status_code != 200:
                logger.error(f"Failed to refresh Google access token: {resp.text}")
                raise Exception("Gmail authorization expired. Please reconnect your account.")
            
            return resp.json()["access_token"]

    async def send_email(self, recipient: str, subject: str, body: str) -> dict:
        access_token = await self.get_access_token()

        # Construct MIME email
        message = MIMEText(body)
        message["to"] = recipient
        message["subject"] = subject

        # Encode MIME message to base64url format
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={"raw": raw_message}
            )
            if resp.status_code != 200:
                logger.error(f"Gmail API error: {resp.text}")
                raise Exception(f"Failed to send email via Gmail API: {resp.text}")
            
            return resp.json()
