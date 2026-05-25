"""Road graph utilities — loading the OSM network and matching LTA bands."""

from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Optional

import networkx as nx
import numpy as np
import pandas as pd

from .config import (
    DEFAULT_EDGE_SPEED_KMH,
    PROCESSED_DIR,
    ROAD_CLASS_ORDINAL,
    SPEED_BAND_TO_KMH,
)

logger = logging.getLogger(__name__)

NETWORK_PICKLE = PROCESSED_DIR / "sg_road_network.pkl"


def load_road_network() -> "nx.MultiDiGraph":
    """Load the cached Singapore road network. Notebook 1 builds it."""
    if not NETWORK_PICKLE.exists():
        raise FileNotFoundError(
            f"Road network not found at {NETWORK_PICKLE}. "
            "Run Notebook 1 first."
        )
    with NETWORK_PICKLE.open("rb") as f:
        return pickle.load(f)


def save_road_network(graph: "nx.MultiDiGraph") -> Path:
    NETWORK_PICKLE.parent.mkdir(parents=True, exist_ok=True)
    with NETWORK_PICKLE.open("wb") as f:
        pickle.dump(graph, f)
    return NETWORK_PICKLE


def edge_speed_kmh(speed_band: Optional[int]) -> float:
    """Resolve an LTA speed-band code to a representative speed."""
    if speed_band is None or pd.isna(speed_band):
        return DEFAULT_EDGE_SPEED_KMH
    return SPEED_BAND_TO_KMH.get(int(speed_band), DEFAULT_EDGE_SPEED_KMH)


def road_class_ordinal(highway: object) -> int:
    """Map an OSM highway tag (str or list) to our ordinal scale."""
    if isinstance(highway, list):
        # OSM sometimes returns a list when an edge has multiple tags.
        return max(ROAD_CLASS_ORDINAL.get(h, 0) for h in highway)
    return ROAD_CLASS_ORDINAL.get(str(highway), 0)


def assign_edge_speeds(
    graph: "nx.MultiDiGraph",
    edges_df: pd.DataFrame,
) -> "nx.MultiDiGraph":
    """Annotate each edge with `speed_kmh` and `travel_time_min`.

    Edges that appear in `edges_df` use the LTA-band-derived speed; the rest
    fall back to `DEFAULT_EDGE_SPEED_KMH` (or the OSM `maxspeed` tag when it
    parses cleanly).

    Mutates `graph` in place and returns it.
    """
    lookup = {
        (row["u"], row["v"], row["key"]): row["speed_band"]
        for _, row in edges_df.iterrows()
    }
    for u, v, k, data in graph.edges(keys=True, data=True):
        band = lookup.get((u, v, k))
        if band is not None:
            speed = edge_speed_kmh(band)
        else:
            speed = _osm_maxspeed_kmh(data.get("maxspeed")) or DEFAULT_EDGE_SPEED_KMH
        length_m = data.get("length", 0.0) or 0.0
        data["speed_kmh"] = speed
        data["travel_time_min"] = (length_m / 1000.0) / max(speed, 1.0) * 60.0
        data["speed_band"] = band
    return graph


def _osm_maxspeed_kmh(maxspeed) -> Optional[float]:
    """Parse an OSM `maxspeed` tag (str or list) into km/h, or None on failure."""
    if maxspeed is None:
        return None
    if isinstance(maxspeed, list):
        maxspeed = maxspeed[0]
    s = str(maxspeed).strip().lower().split()
    if not s:
        return None
    try:
        val = float(s[0])
    except ValueError:
        return None
    if len(s) > 1 and "mph" in s[1]:
        return val * 1.60934
    return val


def shortest_path_travel_time(
    graph: "nx.MultiDiGraph",
    src_node: int,
    dst_node: int,
) -> tuple[list[int], float]:
    """Dijkstra by `travel_time_min`. Returns (node path, total minutes).

    Raises `nx.NetworkXNoPath` if the destination is unreachable.
    Requires `assign_edge_speeds()` to have been called first.
    """
    path = nx.shortest_path(graph, src_node, dst_node, weight="travel_time_min")
    total = nx.shortest_path_length(graph, src_node, dst_node, weight="travel_time_min")
    return path, float(total)


def match_speedbands_to_edges(
    graph: "nx.MultiDiGraph",
    speedbands_df: pd.DataFrame,
    max_distance_m: float = 50.0,
) -> pd.DataFrame:
    """For each LTA speed band, find the nearest OSM edge.

    Uses the midpoint of the band's start/end coordinates as the query point.
    Bands whose nearest edge is farther than `max_distance_m` are dropped.

    Args:
        graph: the OSM road network (a projected or geographic MultiDiGraph).
        speedbands_df: DataFrame with StartLat/StartLng/EndLat/EndLng/SpeedBand.
        max_distance_m: drop matches farther than this from any edge.

    Returns:
        DataFrame with columns:
            LinkID, SpeedBand, u, v, key, distance_m, matched (bool)
    """
    import osmnx as ox

    coord_cols = ["StartLat", "StartLng", "EndLat", "EndLng"]
    df = speedbands_df.dropna(subset=coord_cols).copy()
    if df.empty:
        return pd.DataFrame(columns=["LinkID", "SpeedBand", "u", "v", "key",
                                     "distance_m", "matched"])

    mid_lat = (df["StartLat"].astype(float) + df["EndLat"].astype(float)) / 2.0
    mid_lng = (df["StartLng"].astype(float) + df["EndLng"].astype(float)) / 2.0

    # osmnx 2.x returns an ndarray of (u, v, key) tuples.
    edges = ox.distance.nearest_edges(
        graph, X=mid_lng.tolist(), Y=mid_lat.tolist(), return_dist=False,
    )
    u = [e[0] for e in edges]
    v = [e[1] for e in edges]
    k = [e[2] for e in edges]
    dists = _edge_distances_m(graph, u, v, k, mid_lat.tolist(), mid_lng.tolist())

    out = pd.DataFrame({
        "LinkID": df["LinkID"].values,
        "SpeedBand": df["SpeedBand"].values,
        "u": u, "v": v, "key": k,
        "distance_m": dists,
    })
    out["matched"] = out["distance_m"] <= max_distance_m
    return out


def _edge_distances_m(
    graph: "nx.MultiDiGraph",
    u_list, v_list, k_list,
    lat_list, lng_list,
) -> list[float]:
    """Distance in metres from each (lat, lng) to its assigned edge midpoint.

    Approximation: use the haversine distance between the query point and the
    midpoint of the edge's endpoints. Good enough for filtering bad matches.
    """
    from .features import haversine_km

    out: list[float] = []
    for u, v, _k, lat, lng in zip(u_list, v_list, k_list, lat_list, lng_list):
        nu = graph.nodes[u]
        nv = graph.nodes[v]
        mid_lat = (nu["y"] + nv["y"]) / 2.0
        mid_lng = (nu["x"] + nv["x"]) / 2.0
        out.append(haversine_km(lat, lng, mid_lat, mid_lng) * 1000.0)
    return out


def edges_with_traffic(
    graph: "nx.MultiDiGraph",
    matches_df: pd.DataFrame,
) -> pd.DataFrame:
    """Build the matched-edges dataset used by feature engineering.

    One row per OSM edge that received at least one matched speed band.
    When multiple bands match an edge, we keep the worst (slowest) band — the
    conservative choice for travel-time estimation.
    """
    matched = matches_df[matches_df["matched"]].copy()
    if matched.empty:
        return pd.DataFrame(columns=[
            "u", "v", "key", "road_class", "length_m", "speed_band",
        ])

    matched["SpeedBand"] = pd.to_numeric(matched["SpeedBand"], errors="coerce")
    # Worst band = lowest number (1 = jammed, 8 = free-flow).
    agg = (
        matched.groupby(["u", "v", "key"], as_index=False)["SpeedBand"]
        .min()
        .rename(columns={"SpeedBand": "speed_band"})
    )

    edge_attrs = []
    for _, row in agg.iterrows():
        data = graph.get_edge_data(row["u"], row["v"], row["key"], default={})
        highway = data.get("highway", "residential")
        length = data.get("length", np.nan)
        edge_attrs.append({
            "road_class": road_class_ordinal(highway),
            "length_m": length,
        })
    extra = pd.DataFrame(edge_attrs)
    return pd.concat([agg.reset_index(drop=True), extra], axis=1)
