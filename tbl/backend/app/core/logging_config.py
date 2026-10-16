import logging
import sys


def setup_logging(level: str = "INFO") -> None:
    """Configura el logging centralizado y estructurado de la aplicación."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    log_format = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=numeric_level,
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    # Ajustar nivel de logs ruidosos de terceros si es necesario
    logging.getLogger("uvicorn.access").setLevel(numeric_level)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
