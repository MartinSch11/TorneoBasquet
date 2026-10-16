import os
import time
from collections import defaultdict


class SlidingWindowRateLimiter:
    """Limitador de tasa en memoria por ventana deslizante.

    Permite mitigar ataques de fuerza bruta en endpoints sensibles como /login.
    """

    def __init__(self) -> None:
        self._attempts: dict[str, list[float]] = defaultdict(list)

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
        self._limpiar_antiguos(key, ahora, window_seconds)
        intentos = self._attempts.get(key, [])

        if len(intentos) >= max_attempts:
            primer_intento = intentos[0]
            tiempo_restante = int(max(1, window_seconds - (ahora - primer_intento)))
            return True, tiempo_restante

        return False, 0

    def record_attempt(self, key: str) -> None:
        """Registra un nuevo intento en la clave especificada."""
        self._attempts[key].append(time.time())

    def reset(self, key: str) -> None:
        """Limpia el historial de intentos para la clave (por ejemplo, tras login exitoso)."""
        self._attempts.pop(key, None)


# Instancia singleton para control de acceso
login_rate_limiter = SlidingWindowRateLimiter()
