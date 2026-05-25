"""Configuration: env vars, paths, OneMap token caching, demo stations."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

# Make Python's SSL stack read the OS-native trust store (macOS Keychain on
# this machine), which includes any corporate root CAs your IT has pushed.
# Must run before the first `requests` import so urllib3 picks it up.
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    # truststore is optional — falls back to certifi's default chain.
    pass

import requests  # noqa: E402  (must follow truststore.inject_into_ssl)
from dotenv import load_dotenv  # noqa: E402

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
CACHE_DIR = DATA_DIR / "cache"

for _d in (RAW_DIR, PROCESSED_DIR, CACHE_DIR):
    _d.mkdir(parents=True, exist_ok=True)

load_dotenv(PROJECT_ROOT / ".env")

LTA_ACCOUNT_KEY: Optional[str] = os.getenv("LTA_ACCOUNT_KEY")
ONEMAP_EMAIL: Optional[str] = os.getenv("ONEMAP_EMAIL")
ONEMAP_PASSWORD: Optional[str] = os.getenv("ONEMAP_PASSWORD")

# SSL verification toggle. Set to "false" in .env when a corporate proxy is
# doing TLS interception and you cannot import its root CA. INSECURE — leave
# True everywhere else.
_ssl_env = os.getenv("SSL_VERIFY", "true").strip().lower()
SSL_VERIFY: bool = _ssl_env not in ("false", "0", "no")

# Custom CA bundle path (e.g., a corporate root CA appended to certifi's
# cacert.pem). When set, requests uses this file instead of the default
# verification chain. Takes precedence over SSL_VERIFY=False.
SSL_CA_BUNDLE: Optional[str] = os.getenv("SSL_CA_BUNDLE") or None


def requests_verify():
    """Return the `verify` argument to pass to `requests` calls."""
    if SSL_CA_BUNDLE:
        return SSL_CA_BUNDLE
    return SSL_VERIFY

ONEMAP_TOKEN_URL = "https://www.onemap.gov.sg/api/auth/post/getToken"
ONEMAP_TOKEN_CACHE = CACHE_DIR / "onemap_token.json"

DEFAULT_RESPONSE_THRESHOLD_MIN = 8.0

# Speed-band → representative speed (km/h). LTA documents 8 bands; we take the
# midpoint of each band's posted range (band 1 = jammed, band 8 = free-flow).
SPEED_BAND_TO_KMH = {
    1: 5.0,
    2: 15.0,
    3: 25.0,
    4: 35.0,
    5: 45.0,
    6: 55.0,
    7: 65.0,
    8: 75.0,
}

# Default fallback speed when no LTA band is matched to an edge (km/h).
DEFAULT_EDGE_SPEED_KMH = 40.0

# Road-class ordinal encoding used as a model feature.
ROAD_CLASS_ORDINAL = {
    "residential": 0,
    "living_street": 0,
    "tertiary": 1,
    "tertiary_link": 1,
    "secondary": 1,
    "secondary_link": 1,
    "primary": 2,
    "primary_link": 2,
    "trunk": 3,
    "trunk_link": 3,
    "motorway": 4,
    "motorway_link": 4,
}


@dataclass(frozen=True)
class Station:
    """A fire station used as a coverage anchor in the demo."""

    id: str
    name: str
    lat: float
    lng: float
    address: str


# Coordinates verified against OneMap / public addresses; refine if data.gov.sg
# fire-station dataset gives a more authoritative source.
DEMO_STATIONS: list[Station] = [
    Station(
        id="jurong",
        name="Jurong Fire Station",
        lat=1.3329,
        lng=103.7436,
        address="200 Yuan Ching Rd, Singapore 618660",
    ),
    Station(
        id="bishan",
        name="Bishan Fire Station",
        lat=1.3525,
        lng=103.8497,
        address="120 Bishan St 12, Singapore 579809",
    ),
    Station(
        id="tampines",
        name="Tampines Fire Station",
        lat=1.3548,
        lng=103.9421,
        address="400 Tampines Ave 5, Singapore 529648",
    ),
    Station(
        id="central",
        name="Central Fire Station",
        lat=1.2986,
        lng=103.8505,
        address="62 Hill St, Singapore 179367",
    ),
]


class ConfigError(RuntimeError):
    """Raised when required configuration is missing."""


def require_lta_key() -> str:
    if not LTA_ACCOUNT_KEY:
        raise ConfigError(
            "LTA_ACCOUNT_KEY is not set. Copy .env.example to .env and add "
            "your key from https://datamall.lta.gov.sg/"
        )
    return LTA_ACCOUNT_KEY


def require_onemap_credentials() -> tuple[str, str]:
    if not ONEMAP_EMAIL or not ONEMAP_PASSWORD:
        raise ConfigError(
            "ONEMAP_EMAIL and ONEMAP_PASSWORD are not set. Copy .env.example "
            "to .env and add your credentials from "
            "https://www.onemap.gov.sg/apidocs/register"
        )
    return ONEMAP_EMAIL, ONEMAP_PASSWORD


def get_onemap_token(force_refresh: bool = False) -> str:
    """Return a valid OneMap access token, refreshing if needed.

    OneMap tokens expire roughly every 3 days. We cache the token + expiry on
    disk so repeated notebook runs don't burn through fresh logins.
    """
    if not force_refresh and ONEMAP_TOKEN_CACHE.exists():
        cached = json.loads(ONEMAP_TOKEN_CACHE.read_text())
        expiry = datetime.fromisoformat(cached["expires_at"])
        # Refresh 30 min before actual expiry to be safe.
        if datetime.now(timezone.utc) < expiry - timedelta(minutes=30):
            return cached["access_token"]

    email, password = require_onemap_credentials()
    resp = requests.post(
        ONEMAP_TOKEN_URL,
        json={"email": email, "password": password},
        timeout=30,
        verify=requests_verify(),
    )
    resp.raise_for_status()
    payload = resp.json()
    token = payload["access_token"]
    # OneMap returns expiry_timestamp as epoch seconds (string).
    expiry_epoch = int(payload["expiry_timestamp"])
    expires_at = datetime.fromtimestamp(expiry_epoch, tz=timezone.utc)
    ONEMAP_TOKEN_CACHE.write_text(
        json.dumps(
            {"access_token": token, "expires_at": expires_at.isoformat()},
            indent=2,
        )
    )
    logger.info("Fetched new OneMap token, expires %s", expires_at.isoformat())
    return token
