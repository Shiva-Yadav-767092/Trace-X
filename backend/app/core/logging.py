import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    # Set third party loggers to WARNING
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

logger = logging.getLogger("trace_x")
