import os
import time
from collections import defaultdict


class SlidingWindowRateLimiter:
    """Limitador de tasa en memoria por ventana deslizante y bloqueo fijo (lockout).

    Permite mitigar ataques de fuerza bruta en endpoints sensibles como /login.
    """

    def __init__(self) -> None:
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._lockouts: dict[str, float] = {}

    def _limpiar_antiguos(self, key: str, ahora: float, window_seconds: int) -> None:
        corte = ahora - window_seconds
        self._attempts[key] = [t for t in self._attempts[key] if t > corte]
        if not self._attempts[key]:
            self._attempts.pop(key, None)

    def is_rate_limited(
        self, key: str, max_attempts: int = 5, window_seconds: int = 60
    ) -> tuple[bool, int]:
        """Comprueba si la clave ha superado el límite de intentos.

        Devuelve (bloqueado: bool, retry_after_segundos: int).
        """
        # Permitir desactivar en pruebas unitarias automáticas si así se define
        if os.environ.get("DISABLE_RATE_LIMIT") == "true":
            return False, 0

        ahora = time.time()

        # 1. Verificar si hay un período de bloqueo activo
        bloqueado_hasta = self._lockouts.get(key, 0)
        if ahora < bloqueado_hasta:
            tiempo_restante = int(bloqueado_hasta - ahora) + 1
            return True, tiempo_restante
        elif key in self._lockouts:
            # El bloqueo expiró: reiniciar el ciclo de intentos limpio
            self._lockouts.pop(key, None)
            self._attempts.pop(key, None)

        # 2. Verificar intentos acumulados en la ventana deslizante
        self._limpiar_antiguos(key, ahora, window_seconds)
        intentos = self._attempts.get(key, [])

        if len(intentos) >= max_attempts:
            # Al alcanzar los intentos máximos, se activa el bloqueo completo por window_seconds
            self._lockouts[key] = ahora + window_seconds
            self._attempts.pop(key, None)
            return True, window_seconds

        return False, 0

    def record_attempt(self, key: str) -> None:
        """Registra un nuevo intento en la clave especificada."""
        self._attempts[key].append(time.time())

    def reset(self, key: str) -> None:
        """Limpia el historial de intentos y bloqueos para la clave."""
        self._attempts.pop(key, None)
        self._lockouts.pop(key, None)


# Instancia singleton para control de acceso
login_rate_limiter = SlidingWindowRateLimiter()
