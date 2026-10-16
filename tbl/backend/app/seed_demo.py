"""Poblá la base local con datos de ejemplo (SQLite).

Uso:
    ./.venv/Scripts/python -m app.seed_demo
"""
import asyncio
from datetime import date, time

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Equipo,
    EstadisticaPartido,
    Fecha,
    Inscripcion,
    Jugador,
    Partido,
    Sponsor,
    Torneo,
    Usuario,
)

EQUIPOS = ["Bartolomé Mitre", "Tokio", "CAPRI", "Itapúa", "Tirica", "El Coatí"]


def escudo_url(nombre: str) -> str:
    return f"https://ui-avatars.com/api/?name={nombre}&background=F97316&color=fff&size=128"


async def poblado() -> bool:
    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count(Torneo.id)))).scalar_one()
        return total > 0


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        db.add(Usuario(usuario="admin", password_hash=hash_password("admin123"), rol="admin"))
        db.add_all([
            Sponsor(nombre="Banco Macro", logo_url=escudo_url("Macro"), url_sitio="https://macro.com.ar", orden=1),
            Sponsor(nombre="Gatorade", logo_url=escudo_url("Gatorade"), url_sitio="https://gatorade.com", orden=2),
            Sponsor(nombre="Dafiti", logo_url=escudo_url("Dafiti"), url_sitio="https://dafiti.com.ar", orden=3),
        ])

        torneo = Torneo(
            nombre="LBA",
            edicion=1,
            categoria="LBA A",
            temporada="2026",
            estado="activo",
        )
        db.add(torneo)
        await db.flush()

        equipos: dict[str, Equipo] = {}
        for nombre in EQUIPOS:
            eq = Equipo(nombre=nombre, escudo_url=None)
            db.add(eq)
            await db.flush()
            equipos[nombre] = eq
            db.add(Inscripcion(torneo_id=torneo.id, equipo_id=eq.id))

        jugadores: dict[tuple[str, str], Jugador] = {}

        def jugador(nombre, apellido, equipo_nombre, numero=None):
            j = Jugador(nombre=nombre, apellido=apellido, numero=numero, equipo_id=equipos[equipo_nombre].id)
            db.add(j)
            return j

        planteles = {
            "Bartolomé Mitre": [("Juan", "Pérez", 4), ("Diego", "Molina", 7)],
            "Tokio": [("Carlos", "Díaz", 8), ("Tomás", "Bravo", 10)],
            "CAPRI": [("Luis", "Gómez", 9), ("Agustín", "Ríos", 11)],
            "Itapúa": [("Marco", "López", 5), ("Nicolás", "Castro", 12)],
            "Tirica": [("Federico", "Núñez", 6), ("Santiago", "Vega", 14)],
            "El Coatí": [("Gonzalo", "Silva", 13), ("Joaquín", "Ferreyra", 15)],
        }
        for eq, lista in planteles.items():
            for nombre, apellido, numero in lista:
                j = jugador(nombre, apellido, eq, numero)
                await db.flush()
                jugadores[(nombre, apellido)] = j

        def nueva_fecha(numero: int, descripcion: str, dia: date | None = None) -> Fecha:
            f = Fecha(torneo_id=torneo.id, numero=numero, descripcion=descripcion, fecha=dia)
            db.add(f)
            return f

        resultados = [
            # (fecha, local, visitante, pl, pv, stats extra por jugador)
            (1, "Tokio", "CAPRI", 80, 70),
            (1, "Bartolomé Mitre", "Itapúa", 75, 62),
            (2, "CAPRI", "Bartolomé Mitre", 66, 71),
            (2, "El Coatí", "Tirica", 58, 74),
        ]
        fechas: dict[int, Fecha] = {}
        fechas[1] = nueva_fecha(1, "Fecha 1 - ida", date(2026, 9, 5))
        fechas[2] = nueva_fecha(2, "Fecha 2 - ida", date(2026, 9, 12))
        await db.flush()

        partidos_por_par: dict[tuple[int, str, str], Partido] = {}

        for num_fecha, l, v, pl, pv in resultados:
            p = Partido(
                fecha_id=fechas[num_fecha].id,
                torneo_id=torneo.id,
                equipo_local_id=equipos[l].id,
                equipo_visitante_id=equipos[v].id,
                pts_local=pl,
                pts_visitante=pv,
                jugado=True,
                cancha="Polideportivo Finito Gehrmann",
                horario=time(20, 0),
            )
            db.add(p)
            await db.flush()
            partidos_por_par[(num_fecha, l, v)] = p

        # Estadísticas por jugador alineadas con los partidos jugados:
        # (numero_fecha, equipo, nombre, apellido, campos)
        demos = [
            (1, "Tokio", "Carlos", "Díaz", dict(libres_conv=5, libres_int=7, dobles_conv=8, dobles_int=13,
                triples_conv=3, triples_int=8, asistencias=6, reb_ofensivos=2, reb_defensivos=5,
                faltas_personales=2, faltas_recibidas=5, perdidas=3, bloqueos=1, recuperos=2)),
            (1, "Tokio", "Tomás", "Bravo", dict(libres_conv=2, libres_int=3, dobles_conv=5, dobles_int=9,
                triples_conv=2, triples_int=6, asistencias=3, reb_ofensivos=1, reb_defensivos=4,
                faltas_personales=3, faltas_recibidas=2, perdidas=4, recuperos=1)),
            (1, "CAPRI", "Luis", "Gómez", dict(libres_conv=4, libres_int=4, dobles_conv=6, dobles_int=11,
                triples_conv=4, triples_int=9, asistencias=4, reb_ofensivos=3, reb_defensivos=5,
                faltas_personales=1, faltas_recibidas=4, perdidas=2, bloqueos=2, recuperos=3)),
            (1, "CAPRI", "Agustín", "Ríos", dict(libres_conv=3, libres_int=5, dobles_conv=7, dobles_int=12,
                triples_conv=1, triples_int=5, asistencias=2, reb_ofensivos=2, reb_defensivos=6,
                faltas_personales=2, faltas_recibidas=1, perdidas=5, recuperos=1)),
            (1, "Bartolomé Mitre", "Juan", "Pérez", dict(libres_conv=6, libres_int=8, dobles_conv=7, dobles_int=11,
                triples_conv=4, triples_int=9, asistencias=5, reb_ofensivos=2, reb_defensivos=6,
                faltas_personales=2, faltas_recibidas=4, perdidas=3, bloqueos=1, recuperos=2)),
            (1, "Bartolomé Mitre", "Diego", "Molina", dict(libres_conv=3, libres_int=4, dobles_conv=5, dobles_int=8,
                triples_conv=2, triples_int=7, asistencias=4, reb_ofensivos=3, reb_defensivos=7,
                faltas_personales=1, faltas_recibidas=3, perdidas=2, recuperos=4, bloqueos=1)),
            (1, "Itapúa", "Marco", "López", dict(libres_conv=4, libres_int=6, dobles_conv=8, dobles_int=14,
                triples_conv=1, triples_int=4, asistencias=3, reb_ofensivos=4, reb_defensivos=8,
                faltas_personales=3, faltas_recibidas=2, perdidas=5, recuperos=1)),
            (1, "Itapúa", "Nicolás", "Castro", dict(libres_conv=2, libres_int=2, dobles_conv=4, dobles_int=9,
                triples_conv=2, triples_int=6, asistencias=2, reb_ofensivos=1, reb_defensivos=4,
                faltas_personales=2, faltas_recibidas=1, perdidas=4, bloqueos=1, recuperos=1)),
            (2, "CAPRI", "Luis", "Gómez", dict(libres_conv=5, libres_int=7, dobles_conv=6, dobles_int=10,
                triples_conv=3, triples_int=8, asistencias=5, reb_ofensivos=2, reb_defensivos=5,
                faltas_personales=2, faltas_recibidas=3, perdidas=3, bloqueos=1, recuperos=3)),
            (2, "CAPRI", "Agustín", "Ríos", dict(libres_conv=2, libres_int=3, dobles_conv=4, dobles_int=8,
                triples_conv=1, triples_int=5, asistencias=4, reb_ofensivos=5, reb_defensivos=7,
                faltas_personales=3, faltas_recibidas=2, perdidas=4, recuperos=2)),
            (2, "Bartolomé Mitre", "Juan", "Pérez", dict(libres_conv=7, libres_int=9, dobles_conv=8, dobles_int=12,
                triples_conv=3, triples_int=7, asistencias=4, reb_ofensivos=3, reb_defensivos=6,
                faltas_personales=2, faltas_recibidas=6, perdidas=4, bloqueos=2, recuperos=3)),
            (2, "Bartolomé Mitre", "Diego", "Molina", dict(libres_conv=4, libres_int=5, dobles_conv=5, dobles_int=9,
                triples_conv=1, triples_int=4, asistencias=2, reb_ofensivos=2, reb_defensivos=5,
                faltas_personales=1, faltas_recibidas=2, perdidas=3, bloqueos=1, recuperos=1)),
            (2, "El Coatí", "Gonzalo", "Silva", dict(libres_conv=2, libres_int=3, dobles_conv=6, dobles_int=11,
                triples_conv=2, triples_int=6, asistencias=3, reb_ofensivos=4, reb_defensivos=8,
                faltas_personales=3, faltas_recibidas=2, perdidas=4, recuperos=2, bloqueos=2)),
            (2, "El Coatí", "Joaquín", "Ferreyra", dict(libres_conv=3, libres_int=4, dobles_conv=4, dobles_int=7,
                triples_conv=1, triples_int=3, asistencias=5, reb_ofensivos=1, reb_defensivos=3,
                faltas_personales=2, faltas_recibidas=3, perdidas=2, recuperos=1)),
            (2, "Tirica", "Federico", "Núñez", dict(libres_conv=6, libres_int=8, dobles_conv=9, dobles_int=13,
                triples_conv=2, triples_int=5, asistencias=4, reb_ofensivos=5, reb_defensivos=9,
                faltas_personales=1, faltas_recibidas=5, perdidas=3, bloqueos=3, recuperos=2)),
            (2, "Tirica", "Santiago", "Vega", dict(libres_conv=4, libres_int=6, dobles_conv=5, dobles_int=10,
                triples_conv=1, triples_int=4, asistencias=6, reb_ofensivos=2, reb_defensivos=4,
                faltas_personales=2, faltas_recibidas=4, perdidas=3, recuperos=4)),
        ]

        for num_fecha, eq, nombre, apellido, campos in demos:
            j = jugadores[(nombre, apellido)]
            p = next(
                p for (nf, l, v), p in partidos_por_par.items()
                if nf == num_fecha and eq in (l, v)
            )
            db.add(EstadisticaPartido(partido_id=p.id, jugador_id=j.id, **campos))

        # Próximos partidos (sin jugar)
        fechas[3] = nueva_fecha(3, "Fecha 3 - ida", date(2026, 9, 19))
        fechas[4] = nueva_fecha(4, "Fecha 4 - ida", date(2026, 9, 26))
        await db.flush()
        cruces = [
            (3, "Tokio", "Bartolomé Mitre"),
            (3, "CAPRI", "Itapúa"),
            (4, "Tirica", "El Coatí"),
            (4, "Itapúa", "Tokio"),
        ]
        for num_fecha, l, v in cruces:
            db.add(Partido(
                fecha_id=fechas[num_fecha].id,
                torneo_id=torneo.id,
                equipo_local_id=equipos[l].id,
                equipo_visitante_id=equipos[v].id,
                jugado=False,
                cancha="Polideportivo Finito Gehrmann",
                horario=time(20, 30),
            ))

        await db.commit()


if __name__ == "__main__":
    async def _main() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if await poblado():
            print("La base ya tiene datos. Para repoblar, borrá el archivo tbl.db.")
        else:
            await seed()
            print("Datos demo creados. Usuario admin/admin123")

    asyncio.run(_main())