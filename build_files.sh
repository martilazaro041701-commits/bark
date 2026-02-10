#!/usr/bin/env bash
set -e

python -m pip install --upgrade pip
pip install -r requirements.txt

export DJANGO_SETTINGS_MODULE=config.settings

python manage.py migrate --noinput
python manage.py collectstatic --noinput
