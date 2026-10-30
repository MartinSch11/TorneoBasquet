from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_roles
from app.models import Sponsor, Usuario
from app.schemas.sponsor import SponsorCreate, SponsorOut, SponsorUpdate


class SponsorOrdenIn(BaseModel):
    orden: list[int]


router = APIRouter()


@router.get("", response_model=list[SponsorOut])
async def listar_sponsors(
    db: AsyncSession = Depends(get_db), todos: bool = False
) -> list[Sponsor]:
    query = select(Sponsor).order_by(Sponsor.orden.asc(), Sponsor.id.asc())
    if not todos:
        query = query.where(Sponsor.activo.is_(True))
    row = await db.execute(query)
    return list(row.scalars().all())


@router.post("", response_model=SponsorOut, status_code=status.HTTP_201_CREATED)
async def crear_sponsor(
    body: SponsorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> Sponsor:
    sponsor = Sponsor(**body.model_dump())
    db.add(sponsor)
    await db.commit()
    await db.refresh(sponsor)
    return sponsor


@router.patch("/{sponsor_id}", response_model=SponsorOut)
async def actualizar_sponsor(
    sponsor_id: int,
    body: SponsorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> Sponsor:
    sponsor = await db.get(Sponsor, sponsor_id)
    if sponsor is None:
        raise HTTPException(status_code=404, detail="Sponsor no encontrado")
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(sponsor, campo, valor)
    await db.commit()
    await db.refresh(sponsor)
    return sponsor


@router.put("/orden")
async def reordenar_sponsors(
    body: SponsorOrdenIn,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    for pos, sponsor_id in enumerate(body.orden):
        sponsor = await db.get(Sponsor, sponsor_id)
        if sponsor is not None:
            sponsor.orden = pos
    await db.commit()
    return {"ok": True}


@router.delete("/{sponsor_id}")
async def eliminar_sponsor(
    sponsor_id: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> dict:
    sponsor = await db.get(Sponsor, sponsor_id)
    if sponsor is None:
        raise HTTPException(status_code=404, detail="Sponsor no encontrado")
    await db.delete(sponsor)
    await db.commit()
    return {"ok": True}
