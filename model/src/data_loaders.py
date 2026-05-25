"""API wrappers for LTA DataMall, OneMap, and NEA."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
import requests
from tqdm import tqdm

from .config import (
    RAW_DIR,
    PROCESSED_DIR,
    SSL_VERIFY,
    get_onemap_token,
    require_lta_key,
    requests_verify,
)

logger = logging.getLogger(__name__)

# Silence the LibreSSL "unverified HTTPS" warning when SSL_VERIFY is off.
if not SSL_VERIFY:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    logger.warning(
        "SSL_VERIFY is OFF — HTTPS certs are not validated. Demo-only; do not "
        "use with sensitive credentials over an untrusted network."
    )

LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice"
LTA_PAGE_SIZE = 500
# LTA migrated TrafficSpeedBands to a versioned path in 2023; the unversioned
# legacy URL now 404s. TrafficIncidents is still unversioned at time of writing.
LTA_ENDPOINTS = {
    "TrafficSpeedBands": "v3/TrafficSpeedBands",
    "TrafficIncidents": "TrafficIncidents",
}
NEA_RAINFALL_URL = "https://api.data.gov.sg/v1/environment/rainfall"
ONEMAP_ROUTE_URL = "https://www.onemap.gov.sg/api/public/routingsvc/route"


def _timestamp() -> str:
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def _lta_paginated(endpoint: str, max_pages: int = 200) -> list[dict[str, Any]]:
    """Fetch all pages from an LTA endpoint that uses `$skip` pagination.

    `endpoint` is the friendly name (e.g. `TrafficSpeedBands`). It's resolved
    to the current versioned path via `LTA_ENDPOINTS`.
    """
    key = require_lta_key()
    headers = {"AccountKey": key, "accept": "application/json"}
    path = LTA_ENDPOINTS.get(endpoint, endpoint)
    results: list[dict[str, Any]] = []
    for page in range(max_pages):
        skip = page * LTA_PAGE_SIZE
        url = f"{LTA_BASE}/{path}?$skip={skip}"
        resp = requests.get(url, headers=headers, timeout=60, verify=requests_verify())
        if resp.status_code == 404 and page == 0:
            raise RuntimeError(
                f"LTA returned 404 for {url}. The endpoint path may have "
                "changed again — check https://datamall.lta.gov.sg/content/"
                "datamall/en/dynamic-data.html and update LTA_ENDPOINTS in "
                "src/data_loaders.py."
            )
        resp.raise_for_status()
        chunk = resp.json().get("value", [])
        if not chunk:
            break
        results.extend(chunk)
        if len(chunk) < LTA_PAGE_SIZE:
            break
        time.sleep(0.1)  # be polite
    else:
        logger.warning("Hit max_pages=%d for %s; results may be truncated", max_pages, endpoint)
    return results


def fetch_lta_speedbands() -> pd.DataFrame:
    """Pull all LTA traffic speed bands, save raw + processed, return DataFrame."""
    rows = _lta_paginated("TrafficSpeedBands")
    ts = _timestamp()
    raw_path = RAW_DIR / f"lta_speedbands_{ts}.json"
    raw_path.write_text(json.dumps(rows, indent=2))

    df = pd.DataFrame(rows)
    # LTA returns Location as "startLat startLng endLat endLng" string in some
    # versions; in current API, columns are explicit. Normalize both.
    if "Location" in df.columns and "StartLat" not in df.columns:
        coords = df["Location"].str.split(" ", expand=True).astype(float)
        coords.columns = ["StartLat", "StartLng", "EndLat", "EndLng"]
        df = pd.concat([df.drop(columns=["Location"]), coords], axis=1)

    # LTA v3 uses "StartLon"/"EndLon"; normalize to "StartLng"/"EndLng".
    if "StartLon" in df.columns and "StartLng" not in df.columns:
        df = df.rename(columns={"StartLon": "StartLng", "EndLon": "EndLng"})

    expected = [
        "LinkID", "RoadName", "MinimumSpeed", "MaximumSpeed",
        "SpeedBand", "StartLat", "StartLng", "EndLat", "EndLng",
    ]
    for col in expected:
        if col not in df.columns:
            df[col] = pd.NA

    out_path = PROCESSED_DIR / "speedbands.parquet"
    df.to_parquet(out_path, index=False)
    logger.info("Saved %d speed bands to %s", len(df), out_path)
    return df


def fetch_lta_incidents() -> pd.DataFrame:
    """Pull current LTA traffic incidents."""
    rows = _lta_paginated("TrafficIncidents")
    ts = _timestamp()
    raw_path = RAW_DIR / f"lta_incidents_{ts}.json"
    raw_path.write_text(json.dumps(rows, indent=2))

    df = pd.DataFrame(rows)
    out_path = PROCESSED_DIR / "incidents.parquet"
    df.to_parquet(out_path, index=False)
    logger.info("Saved %d incidents to %s", len(df), out_path)
    return df


def onemap_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    route_type: str = "drive",
) -> dict[str, Any]:
    """Request a single route from OneMap."""
    token = get_onemap_token()
    params = {
        "start": f"{start_lat},{start_lng}",
        "end": f"{end_lat},{end_lng}",
        "routeType": route_type,
    }
    headers = {"Authorization": token}
    resp = requests.get(ONEMAP_ROUTE_URL, params=params, headers=headers, timeout=30, verify=requests_verify())
    resp.raise_for_status()
    return resp.json()


def fetch_nea_rainfall(date_time: str | None = None) -> pd.DataFrame:
    """Fetch NEA rainfall readings.

    Args:
        date_time: ISO-8601 string for historical readings, or None for current.
    """
    params = {"date_time": date_time} if date_time else None
    resp = requests.get(NEA_RAINFALL_URL, params=params, timeout=30, verify=requests_verify())
    resp.raise_for_status()
    payload = resp.json()

    ts = _timestamp()
    raw_path = RAW_DIR / f"nea_rainfall_{ts}.json"
    raw_path.write_text(json.dumps(payload, indent=2))

    items = payload.get("items", [])
    if not items:
        return pd.DataFrame()
    reading_ts = items[0].get("timestamp")
    readings = items[0].get("readings", [])
    stations = {s["id"]: s for s in payload.get("metadata", {}).get("stations", [])}

    rows = []
    for r in readings:
        sid = r["station_id"]
        st = stations.get(sid, {})
        loc = st.get("location", {})
        rows.append({
            "station_id": sid,
            "station_name": st.get("name"),
            "lat": loc.get("latitude"),
            "lng": loc.get("longitude"),
            "rainfall_mm": r["value"],
            "timestamp": reading_ts,
        })
    df = pd.DataFrame(rows)
    out_path = PROCESSED_DIR / "rainfall_latest.parquet"
    df.to_parquet(out_path, index=False)
    logger.info("Saved %d rainfall readings to %s", len(df), out_path)
    return df
