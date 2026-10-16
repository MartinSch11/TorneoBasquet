from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_roles
from app.models.cancha import Cancha
from app.models.partido import Partido
from app.models.usuario import Usuario
from app.schemas.cancha import CanchaCreate, CanchaOut, CanchaUpdate

router = APIRouter()


@router.get("", response_model=list[CanchaOut])
async def listar_canchas(
    todas: bool = False,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    query = select(Cancha).order_by(Cancha.nombre.asc())
    if not todas:
        query = query.where(Cancha.activo.is_(True))

    result = await db.execute(query)
    canchas = list(result.scalars().all())

    # Contar partidos por cancha
    counts_query = (
        select(Partido.cancha, func.count(Partido.id))
        .where(Partido.cancha.is_not(None))
        .group_by(Partido.cancha)
    )
    counts_res = await db.execute(counts_query)
    counts_map = {row[0].strip().lower(): row[1] for row in counts_res.all() if row[0]}

    salida = []
    for c in canchas:
        p_count = counts_map.get(c.nombre.strip().lower(), 0)
        salida.append(
            {
                "id": c.id,
                "nombre": c.nombre,
                "direccion": c.direccion,
                "ciudad": c.ciudad,
                "telefono": c.telefono,
                "notas": c.notas,
                "activo": c.activo,
                "partidos_count": p_count,
                "created_at": c.created_at,
            }
        )

    return salida


@router.get("/{cancha_id}", response_model=CanchaOut)
async def obtener_cancha(
    cancha_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    cancha = await db.get(Cancha, cancha_id)
    if cancha is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    count_res = await db.execute(
        select(func.count(Partido.id)).where(Partido.cancha == cancha.nombre)
    )
    p_count = count_res.scalar() or 0

    return {
        "id": cancha.id,
        "nombre": cancha.nombre,
        "direccion": cancha.direccion,
        "ciudad": cancha.ciudad,
        "telefono": cancha.telefono,
        "notas": cancha.notas,
        "activo": cancha.activo,
        "partidos_count": p_count,
        "created_at": cancha.created_at,
    }


@router.post("", response_model=CanchaOut, status_code=status.HTTP_201_CREATED)
async def crear_cancha(
    body: CanchaCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    # Verificar si ya existe con el mismo nombre
    existente = (
        await db.execute(select(Cancha).where(func.lower(Cancha.nombre) == body.nombre.strip().lower()))
    ).scalar_one_or_none()

    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una cancha registrada con el nombre '{body.nombre.strip()}'",
        )

    cancha = Cancha(
        nombre=body.nombre.strip(),
        direccion=body.direccion.strip() if body.direccion else None,
        ciudad=body.ciudad.strip() if body.ciudad else "Córdoba",
        telefono=body.telefono.strip() if body.telefono else None,
        notas=body.notas.strip() if body.notas else None,
        activo=True,
    )
    db.add(cancha)
    try:
        await db.commit()
        await db.refresh(cancha)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe una cancha registrada con el nombre '{body.nombre.strip()}'",
        )

    return {
        "id": cancha.id,
        "nombre": cancha.nombre,
        "direccion": cancha.direccion,
        "ciudad": cancha.ciudad,
        "telefono": cancha.telefono,
        "notas": cancha.notas,
        "activo": cancha.activo,
        "partidos_count": 0,
        "created_at": cancha.created_at,
    }


@router.patch("/{cancha_id}", response_model=CanchaOut)
async def actualizar_cancha(
    cancha_id: int,
    body: CanchaUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    cancha = await db.get(Cancha, cancha_id)
    if cancha is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    data = body.model_dump(exclude_unset=True)

    if "nombre" in data and data["nombre"]:
        nuevo_nombre = data["nombre"].strip()
        existente = (
            await db.execute(
                select(Cancha).where(
                    func.lower(Cancha.nombre) == nuevo_nombre.lower(),
                    Cancha.id != cancha_id,
                )
            )
        ).scalar_one_or_none()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otra cancha registrada con el nombre '{nuevo_nombre}'",
            )
        # Si se renombra la cancha, propagar a los partidos que la tenían asignada
        viejo_nombre = cancha.nombre
        cancha.nombre = nuevo_nombre

        partidos_res = await db.execute(select(Partido).where(Partido.cancha == viejo_nombre))
        for p in partidos_res.scalars().all():
            p.cancha = nuevo_nombre

    if "direccion" in data:
        cancha.direccion = data["direccion"].strip() if data["direccion"] else None
    if "ciudad" in data:
        cancha.ciudad = data["ciudad"].strip() if data["ciudad"] else "Córdoba"
    if "telefono" in data:
        cancha.telefono = data["telefono"].strip() if data["telefono"] else None
    if "notas" in data:
        cancha.notas = data["notas"].strip() if data["notas"] else None
    if "activo" in data and data["activo"] is not None:
        cancha.activo = bool(data["activo"])

    try:
        await db.commit()
        await db.refresh(cancha)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe otra cancha registrada con el nombre especificado",
        )

    count_res = await db.execute(
        select(func.count(Partido.id)).where(Partido.cancha == cancha.nombre)
    )
    p_count = count_res.scalar() or 0

    return {
        "id": cancha.id,
        "nombre": cancha.nombre,
        "direccion": cancha.direccion,
        "ciudad": cancha.ciudad,
        "telefono": cancha.telefono,
        "notas": cancha.notas,
        "activo": cancha.activo,
        "partidos_count": p_count,
        "created_at": cancha.created_at,
    }


@router.delete("/{cancha_id}")
async def eliminar_cancha(
    cancha_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    cancha = await db.get(Cancha, cancha_id)
    if cancha is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    # Soft delete
    cancha.activo = False
    await db.commit()
    return {"ok": True, "detail": "Cancha desactivada correctamente"}
