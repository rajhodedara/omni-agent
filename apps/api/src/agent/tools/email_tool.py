import uuid
import logging
from pydantic import BaseModel, Field
from src.agent.tools.base import BaseTool
from src.services.gmail_service import GmailService
from src.models.email import EmailLog

logger = logging.getLogger(__name__)

class SendEmailInput(BaseModel):
    recipient: str = Field(..., description="The recipient's email address.")
    subject: str = Field(..., description="The email subject line.")
    body: str = Field(..., description="The body content of the email.")

class SendEmailTool(BaseTool):
    name = "send_email"
    description = (
        "Sends an email to a recipient using Gmail API. "
        "IMPORTANT: This tool requires explicit human approval before running."
    )
    input_schema = SendEmailInput
    requires_approval = True

    async def execute(self, recipient: str, subject: str, body: str, **kwargs) -> dict:
        # Validate recipient email format
        if "@" not in recipient or "." not in recipient:
            return {"status": "failed", "error": "Invalid email address format"}

        gmail = GmailService()
        execution_id = kwargs.get("_execution_id")

        try:
            result = await gmail.send_email(recipient, subject, body)
            
            # Extract message ID and construct Gmail web URL
            message_id = result.get("id", "")
            gmail_url = f"https://mail.google.com/mail/u/0/#sent/{message_id}" if message_id else None

            # Log successful email send
            await self._log_email(
                recipient=recipient,
                subject=subject,
                body=body,
                status="success",
                result=str(result),
                execution_id=execution_id
            )

            response = {
                "status": "success",
                "message": "Email sent successfully",
                "recipient": recipient,
            }
            if gmail_url:
                response["gmail_url"] = gmail_url
            return response
        except Exception as e:
            logger.error(f"Gmail SendEmailTool failed: {e}")
            # Log failed email send
            await self._log_email(
                recipient=recipient,
                subject=subject,
                body=body,
                status="failed",
                result=str(e),
                execution_id=execution_id
            )
            return {
                "status": "failed",
                "error": str(e)
            }

    async def _log_email(self, recipient: str, subject: str, body: str, status: str, result: str, execution_id: str | None) -> None:
        try:
            from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
            from src.config import get_settings
            
            settings = get_settings()
            engine = create_async_engine(settings.DATABASE_URL)
            async_session = async_sessionmaker(engine, expire_on_commit=False)
            
            async with async_session() as session:
                log_entry = EmailLog(
                    execution_id=uuid.UUID(execution_id) if execution_id else None,
                    recipient=recipient,
                    subject=subject,
                    body=body,
                    status=status,
                    result=result
                )
                session.add(log_entry)
                await session.commit()
        except Exception as db_err:
            logger.warning(f"Failed to log email to database: {db_err}")
