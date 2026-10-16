from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Equipo, Inscripcion, Partido


class Posicion:
    __slots__ = (
        "equipo_id",
        "equipo",
        "escudo_url",
        "pj",
        "pg",
        "pp",
        "puntos_favor",
        "puntos_contra",
        "puntos",
    )

    def __init__(self, equipo: Equipo) -> None:
        self.equipo_id = equipo.id
        self.equipo = equipo.nombre
        self.escudo_url = equipo.escudo_url
        self.pj = 0
        self.pg = 0
        self.pp = 0
        self.puntos_favor = 0
        self.puntos_contra = 0
        self.puntos = 0

    # Puntos: Victoria = 2 | Derrota = 1
    @property
    def porcentaje(self) -> float:
        return round(self.pg / self.pj * 100, 2) if self.pj else 0.0

    @property
    def dgo(self) -> int:
        return self.puntos_favor - self.puntos_contra


def aplicar_resultado(p: Posicion, es_local: bool, pf: int, pc: int) -> None:
    p.pj += 1
    p.puntos_favor += pf
    p.puntos_contra += pc
    if pf > pc:
        p.pg += 1
        p.puntos += 2
    else:
        p.pp += 1
        p.puntos += 1


async def calcular_posiciones(db: AsyncSession, torneo_id: int) -> list[Posicion]:
    equipos_row = await db.execute(
        select(Equipo)
        .join(Inscripcion, Inscripcion.equipo_id == Equipo.id)
        .where(Inscripcion.torneo_id == torneo_id)
        .order_by(Equipo.nombre)
    )
    equipos = equipos_row.scalars().all()

    posiciones = {eq.id: Posicion(eq) for eq in equipos}

    partidos_row = await db.execute(
        select(Partido).where(Partido.torneo_id == torneo_id, Partido.jugado.is_(True))
    )
    partidos_jugados = list(partidos_row.scalars().all())
    for partido in partidos_jugados:
        local = posiciones.get(partido.equipo_local_id)
        visitante = posiciones.get(partido.equipo_visitante_id)
        pf, pc = partido.pts_local, partido.pts_visitante
        if local is None or visitante is None or pf is None or pc is None:
            continue
        aplicar_resultado(local, True, pf, pc)
        aplicar_resultado(visitante, False, pc, pf)

    return ordenar_posiciones(list(posiciones.values()), partidos_jugados)


def _resultado_directo(
    a: Posicion, b: Posicion, partidos: list[Partido]
) -> int | None:
    for p in partidos:
        dupla_local = (p.equipo_local_id, p.equipo_visitante_id)
        dupla_visita = (p.equipo_visitante_id, p.equipo_local_id)
        if dupla_local == (a.equipo_id, b.equipo_id):
            if (p.pts_local or 0) > (p.pts_visitante or 0):
                return 1
            if (p.pts_local or 0) < (p.pts_visitante or 0):
                return -1
        if dupla_visita == (a.equipo_id, b.equipo_id):
            if (p.pts_visitante or 0) > (p.pts_local or 0):
                return 1
            if (p.pts_visitante or 0) < (p.pts_local or 0):
                return -1
    return None


def _ordenar_empate_grupo(
    grupo: list[Posicion], partidos: list[Partido]
) -> list[Posicion]:
    ids = {p.equipo_id for p in grupo}
    dif_entre_si: dict[int, int] = {p.equipo_id: 0 for p in grupo}
    victorias: dict[tuple[int, int], int] = {}

    for partido in partidos:
        local_id, visit_id = partido.equipo_local_id, partido.equipo_visitante_id
        if local_id not in ids or visit_id not in ids:
            continue
        pf, pc = partido.pts_local or 0, partido.pts_visitante or 0
        triunfador = local_id if pf > pc else (visit_id if pc > pf else None)
        if triunfador is not None:
            perdedor = visit_id if triunfador == local_id else local_id
            victorias[(triunfador, perdedor)] = victorias.get((triunfador, perdedor), 0) + 1
        dif_entre_si[local_id] += pf - pc
        dif_entre_si[visit_id] += pc - pf

    def clave(p: Posicion):
        resultados = (
            victorias.get((p.equipo_id, otro.equipo_id), 0)
            - victorias.get((otro.equipo_id, p.equipo_id), 0)
            for otro in grupo
            if p.equipo_id != otro.equipo_id
        )
        return (
            -sum(1 for r in resultados if r > 0),
            -dif_entre_si[p.equipo_id],
            -p.dgo,
        )

    return sorted(grupo, key=clave)


def ordenar_posiciones(lista: list[Posicion], partidos: list[Partido]) -> list[Posicion]:
    lista.sort(key=lambda p: (-p.puntos, -p.dgo))
    resultado: list[Posicion] = []
    i = 0
    while i < len(lista):
        j = i
        while j + 1 < len(lista) and lista[j + 1].puntos == lista[i].puntos:
            j += 1
        bloque = lista[i : j + 1]
        if len(bloque) > 1:
            resultado.extend(_ordenar_empate_grupo(bloque, partidos))
        else:
            resultado.append(bloque[0])
        i = j + 1
    return resultado