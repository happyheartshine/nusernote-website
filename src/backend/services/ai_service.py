"""AI service layer for generating SOAP notes via OpenAI."""

from typing import Optional

from openai import OpenAI, OpenAIError

from config import settings
from utils.exceptions import AIServiceError, ConfigurationError


class AIService:
    """Thin wrapper around the OpenAI Responses API."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize AI service.

        Args:
            api_key: OpenAI API key (defaults to settings.OPENAI_API_KEY)
            model: OpenAI model name (defaults to settings.OPENAI_MODEL)

        Raises:
            ConfigurationError: If API key is not provided or configured.
        """
        api_key = api_key or settings.OPENAI_API_KEY
        if not api_key:
            raise ConfigurationError("OPENAI_API_KEY is not configured.")

        self.client = OpenAI(api_key=api_key)
        self.model = model or settings.OPENAI_MODEL

    def generate_output(self, prompt: str) -> str:
        """
        Send prompt to OpenAI and return the generated text.

        Args:
            prompt: The prompt text to send to OpenAI.

        Returns:
            The generated text output.

        Raises:
            AIServiceError: If the API call fails or returns empty response.
        """
        if not prompt or not prompt.strip():
            raise AIServiceError("Prompt cannot be empty.")

        try:
            response = self.client.responses.create(
                model=self.model,
                input=prompt,
                temperature=0.3,
                max_output_tokens=3000,  # Increased for comprehensive SOAP + care plan output
            )

            output_text = response.output_text if hasattr(response, "output_text") else None
            if not output_text:
                raise AIServiceError("Empty response from OpenAI API.")
            return output_text.strip()

        except OpenAIError as exc:
            raise AIServiceError(f"OpenAI API error: {exc}") from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise AIServiceError(f"Unexpected error during AI generation: {exc}") from exc


_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Return singleton AI service instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service

