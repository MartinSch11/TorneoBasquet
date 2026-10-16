from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_roles
from app.core.rate_limit import login_rate_limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UsuarioCreate,
    UsuarioOut,
    UsuarioUpdate,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    rate_key = f"login:{ip}:{body.usuario.lower().strip()}"

    bloqueado, retry_after = login_rate_limiter.is_rate_limited(
        rate_key, max_attempts=5, window_seconds=60
    )
    if bloqueado:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Intente nuevamente en {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)},
        )

    result = await db.execute(select(Usuario).where(Usuario.usuario == body.usuario))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        login_rate_limiter.record_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error en login! Usuario o contraseña incorrectos.",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Contacte al administrador.",
        )

    login_rate_limiter.reset(rate_key)
    token = create_access_token(subject=user.id, rol=user.rol)
    return TokenResponse(access_token=token, rol=user.rol)


@router.get("/me", response_model=UsuarioOut)
async def me(user: Usuario = Depends(get_current_user)) -> Usuario:
    return user


@router.get("/usuarios", response_model=list[UsuarioOut])
async def listar_usuarios(
    db: AsyncSession = Depends(get_db), _: Usuario = Depends(require_roles("admin"))
) -> list[Usuario]:
    result = await db.execute(select(Usuario).order_by(Usuario.id))
    return list(result.scalars().all())


@router.post("/usuarios", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    body: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles("admin")),
) -> Usuario:
    exists = await db.execute(select(Usuario.id).where(Usuario.usuario == body.usuario))
    if exists.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="El usuario ya existe.")

    user = Usuario(usuario=body.usuario, password_hash=hash_password(body.password), rol=body.rol)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/usuarios/{user_id}", response_model=UsuarioOut)
async def actualizar_usuario(
    user_id: int,
    body: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin")),
) -> Usuario:
    user = await db.get(Usuario, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if body.activo is False and user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="No podés desactivar tu propia cuenta de administrador.",
        )

    if body.rol is not None and body.rol != "admin" and user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="No podés revocar tu propio rol de administrador.",
        )

    if body.rol is not None:
        user.rol = body.rol
    if body.activo is not None:
        user.activo = body.activo

    await db.commit()
    await db.refresh(user)
    return user