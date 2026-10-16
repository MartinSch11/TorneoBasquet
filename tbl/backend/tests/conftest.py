import os
import tempfile

_tmp = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp.name}/tbl_test.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["MINIO_ENDPOINT"] = "localhost:9000"
os.environ["MINIO_PUBLIC_URL"] = "http://localhost:9000/tbl-fotos"

import asyncio
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models import (
    Equipo,
    EstadisticaPartido,
    Fecha,
    Inscripcion,
    Jugador,
    Partido,
    Torneo,
    Usuario,
)


def _seed() -> None:
    async def run():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionLocal() as db:
            admin = Usuario(usuario="admin", password_hash=hash_password("admin123"), rol="admin")
            db.add(admin)
            t = Torneo(nombre="TBL A", edicion=1, categoria="TBL A", temporada="2026", estado="activo")
            db.add(t)
            await db.flush()

            e1, e2, e3, e4 = (Equipo(nombre="Leones"), Equipo(nombre="Tigres"),
                              Equipo(nombre="Águilas"), Equipo(nombre="Cóndores"))
            db.add_all([e1, e2, e3, e4])
            await db.flush()
            for eq in (e1, e2, e3, e4):
                db.add(Inscripcion(torneo_id=t.id, equipo_id=eq.id))

            f = Fecha(torneo_id=t.id, numero=1, descripcion="Fecha 1", fecha=date(2026, 9, 1))
            db.add(f)
            await db.flush()

            p1 = Partido(fecha_id=f.id, torneo_id=t.id, equipo_local_id=e1.id,
                         equipo_visitante_id=e2.id, pts_local=80, pts_visitante=70, jugado=True)
            p2 = Partido(fecha_id=f.id, torneo_id=t.id, equipo_local_id=e3.id,
                         equipo_visitante_id=e4.id, pts_local=60, pts_visitante=90, jugado=True)
            db.add_all([p1, p2])
            await db.flush()

            j1 = Jugador(nombre="Juan", apellido="Pérez", equipo_id=e1.id)
            j2 = Jugador(nombre="Carlos", apellido="Díaz", equipo_id=e2.id)
            j3 = Jugador(nombre="Luis", apellido="Gómez", equipo_id=e3.id)
            j4 = Jugador(nombre="Marco", apellido="López", equipo_id=e4.id)
            db.add_all([j1, j2, j3, j4])
            await db.flush()

            db.add(EstadisticaPartido(
                partido_id=p1.id, jugador_id=j1.id,
                libres_conv=6, libres_int=8,
                dobles_conv=6, dobles_int=10,
                triples_conv=4, triples_int=9,
                asistencias=5, reb_ofensivos=2, reb_defensivos=6,
                faltas_personales=2, faltas_recibidas=4,
                perdidas=3, bloqueos=1, recuperos=2))
            db.add(EstadisticaPartido(
                partido_id=p1.id, jugador_id=j2.id,
                libres_conv=4, libres_int=5, dobles_conv=4, dobles_int=8,
                triples_conv=2, triples_int=6, asistencias=3,
                reb_ofensivos=1, reb_defensivos=4, faltas_personales=3,
                faltas_recibidas=2, perdidas=4, recuperos=1))
            db.add(EstadisticaPartido(
                partido_id=p2.id, jugador_id=j3.id,
                libres_conv=2, libres_int=2, dobles_conv=6, dobles_int=9,
                triples_conv=2, triples_int=5, asistencias=4,
                reb_ofensivos=3, reb_defensivos=5, faltas_personales=1,
                faltas_recibidas=3, perdidas=2, bloqueos=2, recuperos=3))
            db.add(EstadisticaPartido(
                partido_id=p2.id, jugador_id=j4.id,
                libres_conv=3, libres_int=4, dobles_conv=8, dobles_int=12,
                triples_conv=2, triples_int=7, asistencias=2,
                reb_ofensivos=4, reb_defensivos=7, faltas_personales=2,
                faltas_recibidas=1, perdidas=5, recuperos=1))
            await db.commit()

    asyncio.run(run())


@pytest.fixture(scope="session", autouse=True)
def seed_db():
    _seed()


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(scope="session")
def admin_token(client):
    res = client.post("/api/v1/auth/login", json={"usuario": "admin", "password": "admin123"})
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session