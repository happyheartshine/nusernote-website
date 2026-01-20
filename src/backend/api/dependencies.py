"""Dependency injection for API routes."""

import logging
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)
security = HTTPBearer()


def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify Supabase JWT access token and return decoded payload.
    
    Args:
        credentials: HTTP Bearer token from Authorization header.
        
    Returns:
        Decoded JWT payload containing user information.
        
    Raises:
        HTTPException: If token is missing, invalid, or expired.
    """
    if not settings.SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET is not configured in environment variables")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase JWT secret is not configured.",
        )
    
    token = credentials.credentials
    logger.info(f"Attempting to verify JWT token (first 20 chars): {token[:20]}...")
    logger.info(f"JWT secret length: {len(settings.SUPABASE_JWT_SECRET)} characters")
    
    try:
        # Verify and decode the JWT token
        # Supabase uses HS256 algorithm
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
        )
        logger.info(f"JWT verified successfully. User ID: {payload.get('sub')}")
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.warning(f"Token has expired: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidSignatureError as e:
        logger.error(f"Invalid token signature (secret mismatch?): {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature.",
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token format: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error during JWT verification: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )


def get_current_user(
    token_payload: dict = Depends(verify_supabase_token),
) -> dict:
    """
    Get current authenticated user from verified token.
    
    Args:
        token_payload: Decoded JWT payload from verify_supabase_token.
        
    Returns:
        User information dictionary with required user_id.
        
    Raises:
        HTTPException: If user_id is missing from token (401 Unauthorized).
    """
    user_id = token_payload.get("sub")
    
    # Validate that user_id is present and not empty
    if not user_id or not isinstance(user_id, str) or not user_id.strip():
        logger.error(f"user_id is required but missing or invalid in token. Token payload keys: {list(token_payload.keys())}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンにユーザーIDが含まれていません。再度ログインしてください。",
        )
    
    return {
        "user_id": user_id.strip(),
        "email": token_payload.get("email"),
        "aud": token_payload.get("aud"),
    }


def get_ai_service_dependency() -> AIService:
    """Dependency to get AI service instance."""
    return get_ai_service()

