"""S3 service for PDF storage and presigned URL generation."""

import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config import settings

logger = logging.getLogger(__name__)

# Global S3 client instance
_s3_client: Optional[boto3.client] = None


def get_s3_client() -> boto3.client:
    """
    Get or create S3 client instance.
    
    Returns:
        Boto3 S3 client instance.
        
    Raises:
        ValueError: If AWS configuration is missing.
    """
    global _s3_client
    
    if _s3_client is None:
        if not settings.AWS_ACCESS_KEY_ID:
            raise ValueError("AWS_ACCESS_KEY_ID environment variable is required.")
        if not settings.AWS_SECRET_ACCESS_KEY:
            raise ValueError("AWS_SECRET_ACCESS_KEY environment variable is required.")
        if not settings.AWS_S3_BUCKET_NAME:
            raise ValueError("AWS_S3_BUCKET_NAME environment variable is required.")
        
        _s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        logger.info("S3 client initialized")
    
    return _s3_client


class S3ServiceError(Exception):
    """Exception raised for S3 service errors."""
    pass


def upload_pdf_to_s3(file_content: bytes, s3_key: str) -> str:
    """
    Upload PDF file to S3.
    
    Args:
        file_content: PDF file content as bytes
        s3_key: S3 object key (path) where the file will be stored
        
    Returns:
        S3 object key (path) where the file was stored.
        
    Raises:
        S3ServiceError: If upload operation fails.
    """
    try:
        s3_client = get_s3_client()
        
        logger.info(f"Uploading PDF to S3: {s3_key}")
        
        s3_client.put_object(
            Bucket=settings.AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=file_content,
            ContentType='application/pdf',
        )
        
        logger.info(f"Successfully uploaded PDF to S3: {s3_key}")
        return s3_key
        
    except ClientError as e:
        logger.error(f"S3 client error uploading PDF: {e}")
        raise S3ServiceError(f"Failed to upload PDF to S3: {str(e)}") from e
    except Exception as e:
        logger.error(f"Unexpected error uploading PDF to S3: {e}")
        raise S3ServiceError(f"Failed to upload PDF to S3: {str(e)}") from e


def generate_presigned_url(s3_key: str, expiration: Optional[int] = None) -> str:
    """
    Generate a presigned URL for downloading a PDF from S3.
    
    Args:
        s3_key: S3 object key (path) of the file
        expiration: URL expiration time in seconds (default: from settings)
        
    Returns:
        Presigned URL string.
        
    Raises:
        S3ServiceError: If presigned URL generation fails.
    """
    try:
        s3_client = get_s3_client()
        
        expiration_time = expiration or settings.AWS_S3_PRESIGNED_URL_EXPIRATION
        
        logger.info(f"Generating presigned URL for S3 key: {s3_key}, expiration: {expiration_time}s")
        
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_S3_BUCKET_NAME,
                'Key': s3_key,
            },
            ExpiresIn=expiration_time,
        )
        
        logger.info(f"Successfully generated presigned URL for {s3_key}")
        return presigned_url
        
    except ClientError as e:
        logger.error(f"S3 client error generating presigned URL: {e}")
        raise S3ServiceError(f"Failed to generate presigned URL: {str(e)}") from e
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL: {e}")
        raise S3ServiceError(f"Failed to generate presigned URL: {str(e)}") from e



