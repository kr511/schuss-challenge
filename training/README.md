# Training der Foto-KI

Werkzeuge, um das YOLO-Detektionsmodell (`discipline` + `score`) neu zu
trainieren. Das Training selbst läuft extern auf einer GPU (Colab); hier liegen
nur die Bausteine.

## Dateien

- **`generate_synthetic_monitor.py`** – erzeugt automatisch gelabelte,
  monitor-ähnliche Trainingsbilder im YOLO-Format. Damit lässt sich die ganze
  Pipeline **ohne ein einziges handgelabeltes Foto** testen und (zusammen mit
  echten Fotos) der Label-Aufwand stark reduzieren.

  ```bash
  pip install pillow
  python3 training/generate_synthetic_monitor.py --out datasets/monitor --count 1000
  ```

- **`../notebooks/train-vision-model.ipynb`** – schlüsselfertiges Colab-Notebook:
  installieren → Daten wählen → trainieren → validieren → nach TensorFlow.js
  exportieren → `vision_model_dropin.zip` herunterladen.

- **`../scripts/apply-model-export.mjs`** – übernimmt den fertigen Export per
  Drop-in ins Repo (Dateien platzieren, veraltete Shards entfernen, Version +
  Cache-Busting hochzählen, validieren).

## Klassen

Reihenfolge ist verbindlich und muss überall übereinstimmen
(`image-compare-brain.js` → `VISION_MODEL.classes`, `metadata.yaml` → `names`):

```
0: discipline
1: score
```

Vollständige Anleitung: [`../docs/vision-model-upgrade.md`](../docs/vision-model-upgrade.md).
