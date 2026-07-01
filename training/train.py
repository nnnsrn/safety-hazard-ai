"""
SafetyVision-7 — YOLOv11 training entry point.

Usage:
    pip install ultralytics==8.3.0
    python train.py

Produces (under runs/detect/safetyvision7/):
    weights/best.pt              -> deploy this
    weights/last.pt
    results.png                  -> loss + mAP training curves
    confusion_matrix.png         -> per-class confusion matrix
    confusion_matrix_normalized.png
    PR_curve.png, F1_curve.png, P_curve.png, R_curve.png
    val_batch*_pred.jpg          -> qualitative predictions

Hardware:
    - NVIDIA GPU with >= 8 GB VRAM recommended
    - Colab T4 / A100 works; expect ~2 h on T4 for 100 epochs at imgsz 640
"""

from pathlib import Path
from ultralytics import YOLO

HERE = Path(__file__).parent
DATA_YAML = HERE / "dataset" / "data.yaml"

assert DATA_YAML.exists(), (
    f"Missing {DATA_YAML}. Prepare the dataset per training/README.md "
    "(images/train, images/val, labels/train, labels/val) and drop the "
    "provided data.yaml into training/dataset/."
)


def main() -> None:
    # Start from the YOLOv11 small pretrained COCO weights — best speed /
    # accuracy trade-off for a 7-class industrial task on a T4-class GPU.
    # Swap to 'yolo11m.pt' if you have an A100 and want another ~2-3 mAP.
    model = YOLO("yolo11s.pt")

    model.train(
        data=str(DATA_YAML),
        epochs=100,
        imgsz=640,
        batch=32,                 # drop to 16 on T4 if OOM
        device=0,                 # first CUDA device; use 'cpu' to smoke-test
        project="runs/detect",
        name="safetyvision7",
        exist_ok=True,

        # ---- optimizer ----
        optimizer="SGD",
        lr0=0.01,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        cos_lr=True,

        # ---- augmentation tuned for industrial CCTV / phone footage ----
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=5.0,              # slight camera rotation
        translate=0.1,
        scale=0.5,
        shear=2.0,
        perspective=0.0005,
        flipud=0.0,               # PPE/floor hazards have a clear "up"
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.15,
        copy_paste=0.3,           # helps rare classes (exposed_cable, spill)

        # ---- training niceties ----
        patience=25,              # early-stop if val mAP plateaus
        close_mosaic=10,          # disable mosaic for final 10 epochs
        amp=True,                 # mixed precision
        seed=42,
        plots=True,               # writes results.png, confusion_matrix.png, PR/F1/P/R curves
        save=True,
        val=True,
    )

    # Explicit validation pass — prints per-class mAP@50 / mAP@50-95.
    # Every class should show mAP50 >= 0.80. If not, add more images for
    # that class and rerun; see training/README.md.
    best = YOLO("runs/detect/safetyvision7/weights/best.pt")
    metrics = best.val(
        data=str(DATA_YAML),
        imgsz=640,
        conf=0.25,
        iou=0.6,
        plots=True,               # regenerates confusion_matrix.png with best.pt
        split="val",
    )
    print("\nPer-class mAP@50:")
    for i, name in metrics.names.items():
        print(f"  {i} {name:<18s} mAP50={metrics.box.ap50[i]:.3f}")


if __name__ == "__main__":
    main()
