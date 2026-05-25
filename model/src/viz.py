"""Map visualization helpers built on folium."""

from __future__ import annotations

from typing import Iterable, Optional

import folium

from .config import DEMO_STATIONS, Station

SINGAPORE_CENTER = (1.3521, 103.8198)


def base_map(zoom: int = 12, tiles: str = "cartodbpositron") -> folium.Map:
    """A clean folium basemap centered on Singapore."""
    return folium.Map(location=SINGAPORE_CENTER, zoom_start=zoom, tiles=tiles)


def add_stations(m: folium.Map, stations: Iterable[Station] = DEMO_STATIONS) -> folium.Map:
    """Drop a marker for each demo fire station."""
    for s in stations:
        folium.Marker(
            location=(s.lat, s.lng),
            tooltip=s.name,
            popup=f"<b>{s.name}</b><br>{s.address}",
            icon=folium.Icon(color="red", icon="fire", prefix="fa"),
        ).add_to(m)
    return m
