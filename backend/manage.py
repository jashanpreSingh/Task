#!/usr/bin/env python
import os
import sys


if sys.version_info < (3, 10) or sys.version_info >= (3, 15):
    raise SystemExit(
        f"Django in this project is not compatible with Python "
        f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}. "
        "Use Python 3.10 through 3.14 and recreate your virtual environment."
    )


if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'taskboard.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)
