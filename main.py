import sys

from app.config import settings
from app.core.logging import setup_logging


def main():
    logger = setup_logging()
    logger.info(
        f"Starting {settings.app_name} v{settings.app_version}..."
    )

    try:
        from app.db.session import init_db

        init_db()
        logger.info("Database schema initialized successfully.")

    except ImportError as exc:
        logger.warning(
            f"Application dependency or model import missing: {exc}"
        )
        logger.info(
            "Check installed dependencies and module imports."
        )

    # Avoid constructing QApplication in service deployments or CI hosts
    # without a display; some Qt plugins abort before Python can catch errors.
    if settings.headless:
        logger.info("Headless startup requested; database is ready.")
        return 0

    try:
        from PySide6.QtWidgets import QApplication
        from app.ui.main_window import MainWindow

        app = QApplication(sys.argv)
        window = MainWindow()
        window.show()
        return app.exec()

    except ImportError:
        logger.info(
            "PySide6 not present or running in headless mode. "
            "Headless BOS service ready."
        )
        return 0


if __name__ == "__main__":
    sys.exit(main())
