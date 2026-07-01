# SafetyVision-7 — YOLOv11 EHSS Detection Model

Trains a YOLOv11 detector on **7 EHSS classes** used by the SafetyVision app:

| id | class            | description                              |
|----|------------------|------------------------------------------|
| 0  | person           | any human in frame                       |
| 1  | helmet           | hard hat worn on head                    |
| 2  | safety_vest      | hi-vis vest                              |
| 3  | wet_floor        | visible wet floor / puddle / wet sign    |
| 4  | blocked_walkway  | boxes, pallets, carts blocking aisle     |
| 5  | exposed_cable    | loose / hanging / damaged electrical     |
| 6  | chemical_spill   | liquid chemical spill on floor           |

Target: **≥ 0.80 mAP@50 per class** on the validation split.

---

## 1. Dataset

Recommended composition (~8k images total, license-permissive):

| source                                                                          | classes used                                | images |
|---------------------------------------------------------------------------------|---------------------------------------------|--------|
| [SH17 PPE dataset](https://github.com/ahmadmughees/sh17)                        | person, helmet, safety_vest                 | ~3000  |
| [Roboflow Universe – PPE Detection](https://universe.roboflow.com/roboflow-universe-projects/personal-protective-equipment-combined-model) | person, helmet, safety_vest | ~1500  |
| [Roboflow Universe – Wet Floor](https://universe.roboflow.com/search?q=wet+floor) | wet_floor                                 | ~800   |
| [Roboflow Universe – Blocked Walkway / Aisle Obstruction](https://universe.roboflow.com/search?q=aisle+obstruction) | blocked_walkway | ~800   |
| [Roboflow Universe – Exposed / Damaged Cable](https://universe.roboflow.com/search?q=exposed+cable) | exposed_cable | ~800   |
| [Roboflow Universe – Chemical / Oil Spill](https://universe.roboflow.com/search?q=oil+spill) | chemical_spill | ~800   |

Convert all sources to **YOLO txt format** and remap class IDs to the table above. Split 80 / 15 / 5 for train / val / test.

Final layout (drop under `training/dataset/`):

```
dataset/
  images/
    train/  *.jpg
    val/    *.jpg
    test/   *.jpg
  labels/
    train/  *.txt   # <cls> <cx> <cy> <w> <h> normalized
    val/    *.txt
    test/   *.txt
  data.yaml
```

`data.yaml` is provided in this folder — just move it into `dataset/data.yaml`.

---

## 2. Train

Requires an NVIDIA GPU (T4/A100 on Colab works). ~2h on a T4 for 100 epochs.

```bash
pip install ultralytics==8.3.0
python train.py
```

Outputs land in `runs/detect/safetyvision7/`:

- `weights/best.pt`        ← ship this to the inference worker
- `weights/last.pt`
- `results.png`            ← loss + mAP training curves
- `confusion_matrix.png`   ← per-class confusion matrix
- `confusion_matrix_normalized.png`
- `PR_curve.png`, `F1_curve.png`, `P_curve.png`, `R_curve.png`
- `val_batch*_pred.jpg`    ← qualitative predictions

Verify per-class accuracy:

```bash
yolo detect val model=runs/detect/safetyvision7/weights/best.pt data=training/dataset/data.yaml
```

The printed table shows `mAP50` per class — every row should read ≥ 0.80. If a class is under, add ~300 more images for that class and rerun.

---

## 3. Export for the web

To use `best.pt` from the browser via `tfjs`, convert once:

```bash
yolo export model=runs/detect/safetyvision7/weights/best.pt format=tfjs imgsz=640
```

This produces `best_web_model/` — copy it to `public/models/safetyvision7/` and load with `@tensorflow/tfjs`. The React app already draws bounding boxes color-coded per class; only the inference call needs swapping.

For server-side inference (recommended for real deployments), run `best.pt` in a Python worker behind a Cloudflare Worker route.
