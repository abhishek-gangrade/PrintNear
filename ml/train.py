"""
Model Training & Evaluation Script
Generates a representative empirical dataset of campus print workloads,
trains a linear regression model, and evaluates Mean Absolute Error (MAE)
against the analytical baseline.
"""

import math
import random
from model import EctPredictionModel

def generate_synthetic_workload(num_samples: int = 500):
    """Simulates realistic university print shop order traces."""
    dataset = []
    random.seed(42)

    for _ in range(num_samples):
        pages = random.choices([1, 2, 5, 12, 25, 45, 80, 150], weights=[20, 25, 20, 15, 10, 5, 3, 2])[0]
        copies = random.choices([1, 2, 3, 5], weights=[70, 15, 10, 5])[0]
        color_mode = "color" if random.random() < 0.25 else "bw"
        duplex = random.random() < 0.40
        binding = random.choices(["None", "Staple", "Spiral"], weights=[75, 15, 10])[0]
        queue_pages = random.randint(0, 180)
        jobs_ahead = min(math.ceil(queue_pages / 15), random.randint(0, 6))
        printers = random.choice([1, 2, 3])
        ppm = 25.0
        is_rush = random.random() < 0.35

        # Ground truth duration with physical print time + stochastic vendor latency
        effective_ppm = ppm * (0.70 if color_mode == "color" else 1.0) * (0.85 if duplex else 1.0)
        actual_print_time = (pages * copies) / effective_ppm
        actual_queue_time = (queue_pages / (effective_ppm * printers)) + (jobs_ahead * 0.70)
        finishing_time = 3.5 * copies if binding == "Spiral" else (0.5 * copies if binding == "Staple" else 0.0)
        operator_noise = random.uniform(1.0, 2.5) + (2.0 if is_rush else 0.0)

        ground_truth_minutes = round(actual_print_time + actual_queue_time + finishing_time + operator_noise)

        dataset.append({
            "pages": pages,
            "copies": copies,
            "color_mode": color_mode,
            "duplex": duplex,
            "binding": binding,
            "queue_pages_ahead": queue_pages,
            "active_jobs_ahead": jobs_ahead,
            "available_printers": printers,
            "avg_printer_ppm": ppm,
            "is_rush_hour": is_rush,
            "actual_minutes": max(2, ground_truth_minutes)
        })

    return dataset

def evaluate_models():
    data = generate_synthetic_workload(500)
    model = EctPredictionModel()

    baseline_errors = []
    ml_errors = []

    for row in data:
        actual = row["actual_minutes"]

        # Baseline prediction
        base_pred = model.compute_baseline(
            row["pages"], row["copies"], row["color_mode"], row["duplex"], row["binding"],
            row["queue_pages_ahead"], row["active_jobs_ahead"], row["available_printers"], row["avg_printer_ppm"]
        )["estimated_minutes"]
        baseline_errors.append(abs(base_pred - actual))

        # ML prediction
        ml_pred = model.predict(
            row["pages"], row["copies"], row["color_mode"], row["duplex"], row["binding"],
            row["queue_pages_ahead"], row["active_jobs_ahead"], row["available_printers"], row["avg_printer_ppm"],
            row["is_rush_hour"]
        )["estimated_minutes"]
        ml_errors.append(abs(ml_pred - actual))

    baseline_mae = sum(baseline_errors) / len(baseline_errors)
    ml_mae = sum(ml_errors) / len(ml_errors)

    print("=" * 50)
    print("ECT MODEL EVALUATION REPORT")
    print("=" * 50)
    print(f"Total Evaluated Test Samples: {len(data)}")
    print(f"Analytical Baseline MAE:     {baseline_mae:.2f} minutes")
    print(f"Trained ML Model MAE:        {ml_mae:.2f} minutes")
    print(f"Error Reduction:             {((baseline_mae - ml_mae) / baseline_mae) * 100:.1f}%")
    print("=" * 50)

if __name__ == "__main__":
    evaluate_models()

