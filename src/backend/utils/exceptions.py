"""Custom exceptions for NurseNote AI backend."""


class AIServiceError(RuntimeError):
    """Raised when AI generation fails."""

    pass


class ValidationError(ValueError):
    """Raised when request validation fails."""

    pass


class ConfigurationError(ValueError):
    """Raised when configuration is invalid."""

    pass

