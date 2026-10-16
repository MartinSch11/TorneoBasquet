import uuid
from datetime import timedelta

from minio import Minio

from app.core.config import get_settings


def _client() -> Minio:
    s = get_settings()
    return Minio(
        s.minio_endpoint,
        access_key=s.minio_access_key,
        secret_key=s.minio_secret_key,
        secure=False,
    )


def generar_object_name(album_id: int, filename: str) -> str:
    extension = ""
    if "." in filename:
        extension = filename.rsplit(".", 1)[-1].lower()[:8]
        extension = f".{extension}" if extension in {"jpg", "jpeg", "png", "webp", "gif"} else ""
    return f"albumes/{album_id}/{uuid.uuid4().hex[:16]}{extension}"


def generar_presigned_put_url(album_id: int, filename: str, content_type: str) -> tuple[str, str]:
    """Devuelve (object_name, presigned_url). El frontend sube directo a MinIO."""
    object_name = generar_object_name(album_id, filename)
    url = _client().presigned_put_object(
        get_settings().minio_bucket,
        object_name,
        expires=timedelta(hours=1),
        # minio-py usa content_type? no; el header se setea del lado cliente.
    )
    return object_name, url


def url_publica(object_name: str) -> str:
    return f"{get_settings().minio_public_url.rstrip('/')}/{object_name}"


def eliminar_objecto(object_name: str) -> None:
    _client().remove_object(get_settings().minio_bucket, object_name)


def object_name_desde_url(url: str) -> str:
    public_base = get_settings().minio_public_url.rstrip("/") + "/"
    if url.startswith(public_base):
        return url[len(public_base):]
    return url.rsplit("/", 1)[-1]