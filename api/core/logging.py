import logging
import sys


def setup_logging(debug: bool) -> None:
    level = logging.DEBUG if debug else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
    )

    # Make uvicorn logs consistent
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(level)

    logging.getLogger("python_multipart").setLevel(logging.INFO)
    logging.getLogger("python_multipart.multipart").setLevel(logging.INFO)
