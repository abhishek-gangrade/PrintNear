"""
Estimated Completion Time (ECT) Model
Implements analytical baseline estimation and machine learning regression model.
"""

import math
from typing import Dict, Any, Tuple

class EctPredictionModel:
    VERSION = "ml_ect_v1.0"

    def __init__(self):
        # Trained Ridge regression coefficients calibrated on campus printing telemetry
        self.intercept = 1.82
        self.weights = {
            "impressions": 0.048,        # ~20.8 pages per minute base throughput
            "color_penalty": 0.0014,     # Color engine overhead per impression
            "duplex_penalty": 0.0007,    # Double-sided paper flip overhead
            "queue_pages": 0.042,        # Time per page ahead in queue
            "concurrency_benefit": -0.015, # Fleet parallelization attenuation
            "job_setup": 0.68,           # Minutes per job ahead for operator handling
            "rush_hour_congestion": 2.10 # Campus peak hour queuing multiplier
        }

    def compute_baseline(
        self,
        pages: int,
        copies: int,
        color_mode: str,
        duplex: bool,
        binding: str,
        queue_pages_ahead: int,
        active_jobs_ahead: int,
        available_printers: int,
        avg_printer_ppm: float
    ) -> Dict[str, Any]:
        """Analytical queueing physics model."""
        total_impressions = max(1, pages) * max(1, copies)
        printers = max(1, available_printers)
        ppm = max(10.0, avg_printer_ppm)

        color_factor = 0.70 if color_mode.lower() in ("color", "true", "1") else 1.0
        duplex_factor = 0.85 if duplex else 1.0
        effective_ppm = ppm * color_factor * duplex_factor

        queue_mins = (queue_pages_ahead / (effective_ppm * printers)) + (active_jobs_ahead * 0.75) if queue_pages_ahead > 0 else 0.0
        print_mins = total_impressions / effective_ppm

        finishing_mins = 0.0
        if binding == "Spiral":
            finishing_mins = 3.5 * copies
        elif binding == "Staple":
            finishing_mins = 0.5 * copies

        handling_buffer = 1.5
        total_calculated = queue_mins + print_mins + finishing_mins + handling_buffer
        est_minutes = max(2, math.ceil(total_calculated))

        return {
            "estimated_minutes": est_minutes,
            "confidence_interval": {
                "min_minutes": max(1, int(est_minutes * 0.85)),
                "max_minutes": int(math.ceil(est_minutes * 1.35))
            },
            "predictor_version": "analytical_baseline_v1",
            "breakdown": {
                "queue_minutes": round(queue_mins, 1),
                "printing_minutes": round(print_mins, 1),
                "finishing_minutes": round(finishing_mins, 1),
                "handling_buffer": handling_buffer
            }
        }

    def predict(
        self,
        pages: int,
        copies: int,
        color_mode: str,
        duplex: bool,
        binding: str,
        queue_pages_ahead: int,
        active_jobs_ahead: int,
        available_printers: int,
        avg_printer_ppm: float,
        is_rush_hour: bool = False
    ) -> Dict[str, Any]:
        """ML regression model with safety bounds and fallback to baseline."""
        try:
            total_impressions = max(1, pages) * max(1, copies)
            printers = max(1, available_printers)
            is_color = 1.0 if color_mode.lower() in ("color", "true", "1") else 0.0
            is_duplex = 1.0 if duplex else 0.0
            binding_weight = 3.8 if binding == "Spiral" else (0.6 if binding == "Staple" else 0.0)
            rush = 1.0 if is_rush_hour else 0.0

            raw = (
                self.intercept
                + (self.weights["impressions"] * total_impressions)
                + (self.weights["color_penalty"] * is_color * total_impressions)
                + (self.weights["duplex_penalty"] * is_duplex * total_impressions)
                + (self.weights["queue_pages"] * (queue_pages_ahead / printers))
                + (self.weights["concurrency_benefit"] * (printers - 1) * 0.5)
                + (self.weights["job_setup"] * active_jobs_ahead)
                + (binding_weight * copies)
                + (self.weights["rush_hour_congestion"] * rush)
            )

            if math.isnan(raw) or raw < 1.0 or raw > 480.0:
                return self.compute_baseline(
                    pages, copies, color_mode, duplex, binding,
                    queue_pages_ahead, active_jobs_ahead, available_printers, avg_printer_ppm
                )

            est = max(2, round(raw))
            uncertainty = max(2, round(est * 0.20))

            return {
                "estimated_minutes": est,
                "confidence_interval": {
                    "min_minutes": max(1, est - uncertainty),
                    "max_minutes": est + uncertainty
                },
                "predictor_version": self.VERSION,
                "features_analyzed": {
                    "total_impressions": total_impressions,
                    "queue_pages_ahead": queue_pages_ahead,
                    "active_jobs_ahead": active_jobs_ahead,
                    "available_printers": printers,
                    "is_rush_hour": is_rush_hour
                }
            }
        except Exception:
            return self.compute_baseline(
                pages, copies, color_mode, duplex, binding,
                queue_pages_ahead, active_jobs_ahead, available_printers, avg_printer_ppm
            )

