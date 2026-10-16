from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_roles
from app.models import Album, Foto, Partido, Torneo, Usuario
from app.schemas.galeria import (
    AlbumCreate,
    AlbumDetalleOut,
    AlbumOut,
    FotoCreate,
    FotoOut,
    FotosPageOut,
    UploadUrlOut,
)
from app.services import storage

router = APIRouter()


@router.get("/fotos", response_model=FotosPageOut)
async def listar_fotos(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total = (await db.execute(select(func.count(Foto.id)))).scalar_one() or 0
    rows = await db.execute(
        select(Foto)
        .order_by(Foto.created_at.desc(), Foto.id.desc())
        .limit(limit)
        .offset((page - 1) * limit)
    )
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": list(rows.scalars().all()),
    }


@router.get("/albumes", response_model=list[AlbumOut])
async def listar_albumes(
    torneo_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Album]:
    query = select(Album).order_by(Album.fecha.desc())
    if torneo_id is not None:
        query = query.where(Album.torneo_id == torneo_id)
    rows = await db.execute(query)
    return list(rows.scalars().all())


@router.get("/albumes/{album_id}", response_model=AlbumDetalleOut)
async def detalle_album(album_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    album = await db.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    fotos = await db.execute(
        select(Foto).where(Foto.album_id == album_id).order_by(Foto.orden.asc(), Foto.id.asc())
    )
    return {
        "id": album.id,
        "torneo_id": album.torneo_id,
        "partido_id": album.partido_id,
        "titulo": album.titulo,
        "fecha": album.fecha,
        "fotos": list(fotos.scalars().all()),
    }


@router.post("/albumes", response_model=AlbumOut, status_code=201)
async def crear_album(
    body: AlbumCreate,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(require_roles("admin")),
) -> Album:
    torneo = await db.get(Torneo, body.torneo_id)
    if torneo is None:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if body.partido_id is not None:
        partido = await db.get(Partido, body.partido_id)
        if partido is None:
            raise HTTPException(status_code=404, detail="Partido no encontrado")

    album = Album(
        torneo_id=body.torneo_id,
        partido_id=body.partido_id,
        titulo=body.titulo,
        fecha=body.fecha,
        subido_por=user.id,
    )
    db.add(album)
    await db.commit()
    await db.refresh(album)
    return album


@router.post("/albumes/{album_id}/upload-url", response_model=UploadUrlOut)
async def generar_upload_url(
    album_id: int,
    filename: str = Query(..., min_length=1, max_length=255),
    content_type: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_roles("admin")),
) -> dict:
    album = await db.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    object_name, url = storage.generar_presigned_put_url(album_id, filename, content_type)
    return {"object_name": object_name, "url": url}


@router.post("/albumes/{album_id}/fotos", response_model=FotoOut, status_code=201)
async def registrar_foto(
    album_id: int,
    body: FotoCreate,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(require_roles("admin")),
) -> Foto:
    album = await db.get(Album, album_id)
    if album is None:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")

    # si la URL viene en base64 data: no es una URL minio, se acepta igual
    foto = Foto(
        album_id=album_id,
        url=body.url,
        titulo=body.titulo,
        orden=body.orden,
        subido_por=user.id,
    )
    db.add(foto)
    await db.commit()
    await db.refresh(foto)
    return foto


@router.delete("/fotos/{foto_id}")
async def eliminar_foto(
    foto_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    foto = await db.get(Foto, foto_id)
    if foto is None:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    object_name = storage.object_name_desde_url(foto.url)
    await db.delete(foto)
    await db.commit()
    try:
        storage.eliminar_objecto(object_name)
    except Exception:
        pass  # el registro ya no existe; el objeto huérfano se limpia manualmente si falla
    return {"ok": True}