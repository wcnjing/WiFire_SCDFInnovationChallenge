## Dynamic Coverage Surface

We trained a LightGBM classifier to predict whether each fire station can reach any point on Singapore's road network within 8 minutes, given time of day and conditions. Our pipeline fuses LTA speed bands (56k segments), OSM Dijkstra shortest paths (46k-node graph), and NEA rainfall data. With ~8,000 training examples and a target-node-level train/test split, we achieved 98.4% accuracy (AUC 0.995) on 12 leakage-safe features.

Our key output is per-station probability heatmaps showing how coverage contracts during peak hours and expands at night — a "coverage breathing" effect invisible in static radius-based planning. During PM peak, we observed effective 8-minute coverage shrinking by up to 30% versus free-flow conditions.
