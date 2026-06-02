# Foto-KI: Modell-Upgrade (nächstes Modell)

Diese Anleitung beschreibt, wie das YOLO-Detektionsmodell der Foto-Auswertung
(Live-Scanner / „V2") auf ein neues Modell gebracht wird. Das eigentliche
Training läuft **extern** (Colab / lokale GPU) – im Repo ist alles so
vorbereitet, dass der fertige Export per **Drop-in** übernommen wird.

## Überblick: was steckt heute drin?

- **Modell**: Ultralytics YOLO (`task=detect`), exportiert nach TensorFlow.js
  als `graph-model`.
- **Dateien** (Repo-Root): `model.json` + `group1-shard{1,2,3}of3.bin`,
  Begleit-Metadaten in `metadata.yaml`.
- **Klassen**: `0: discipline`, `1: score` – das Netz findet auf einem
  **Trefferanlagen-Monitor** die Bereiche für Disziplin und Score.
- **Runtime**: `v2-vision-engine.js` lädt das Modell via TF.js und dekodiert
  die YOLO-Ausgabe (Boxen + NMS).

## Single Source of Truth: `VISION_MODEL`

Alle Modell-Parameter stehen zentral in [`image-compare-brain.js`](../image-compare-brain.js)
unter `VISION_MODEL`. `v2-vision-engine.js` liest **alles** von dort:

```js
const VISION_MODEL = {
  version: '8.4.37-monitor',         // bei jedem Tausch hochzählen
  path: './model.json',              // TFJS graph-model
  task: 'detect',                    // 'detect' | (vorgesehen: 'segment')
  inputSize: 640,                    // quadratische Netz-Eingabe
  classes: ['discipline', 'score'],  // Reihenfolge == metadata.yaml "names"
  confThreshold: 0.50,
  iouThreshold: 0.45,
  maxDetections: 10,
  tfjsBackend: 'auto'                // 'auto' | 'webgl' | 'cpu'
};
```

Die **Klassenzahl treibt den Decoder**: `NUM_OUTPUT_COLS = 4 + classes.length`.
Ein neues Modell mit anderen/mehr Klassen braucht daher **keine Code-Änderung** –
nur diese Config.

## Schritt 1 – Daten sammeln & labeln

- Fotos echter Trefferanlagen-Monitore sammeln (verschiedene Stände, Licht,
  Winkel, Handys). Möglichst auch die Problemfälle: Glare/Reflexionen,
  schräg, dunkel.
- Labeln (z. B. [Roboflow](https://roboflow.com) oder [CVAT](https://cvat.ai))
  mit denselben Klassen-Namen wie in der Config: `discipline`, `score`.
  Sollen Klassen dazukommen, hier konsistent benennen.
- Export als **YOLO**-Format (`data.yaml` + `images/`, `labels/`).

## Schritt 2 – Training (Colab / GPU)

```bash
pip install ultralytics

# YOLOv8 ODER neuer (z. B. YOLO11) – beide exportieren nach TFJS
yolo detect train \
  model=yolov8n.pt \           # alternativ: yolo11n.pt
  data=/content/datasets/monitor/data.yaml \
  imgsz=640 epochs=100 batch=16

# Validieren
yolo detect val model=runs/detect/train/weights/best.pt data=.../data.yaml
```

Tipp: `imgsz` muss später `VISION_MODEL.inputSize` entsprechen.

## Schritt 3 – Export nach TensorFlow.js

```bash
yolo export model=runs/detect/train/weights/best.pt format=tfjs imgsz=640
```

Ergebnis (Ordner `best_web_model/`):
- `model.json`
- `group1-shard1ofN.bin … shardNofN.bin`
- `metadata.yaml` (enthält u. a. die `names`)

## Schritt 4 – Drop-in ins Repo

1. **Alte** Modelldateien im Repo-Root ersetzen: `model.json`, alle
   `group1-shard*of*.bin` sowie `metadata.yaml`.
   - Achtung: Stimmt die **Shard-Anzahl** nicht mehr (z. B. `of3` → `of4`),
     verbleibende alte Shards löschen. Die Referenzliste steht im
     `weightsManifest` der neuen `model.json`.
2. `VISION_MODEL` in `image-compare-brain.js` anpassen:
   - `version` hochzählen (z. B. `8.4.37-monitor` → `11.0.0-monitor`),
   - `classes` nur ändern, wenn sich die Klassen geändert haben
     (Reihenfolge == `metadata.yaml` `names`),
   - ggf. `inputSize`, `confThreshold`, `iouThreshold`.
3. **Cache-Busting**: in [`index.html`](../index.html) die Query-Version von
   `v2-vision-engine.js`/`image-compare-brain.js` erhöhen und ggf. die
   Service-Worker-Cache-Version in [`sw.js`](../sw.js) anheben, damit Clients
   das neue Modell laden.

## Schritt 5 – Validieren

```bash
npm run check:vision-model   # Shards vollständig? Klassen == metadata.yaml? Format ok?
npm test                     # vollständige Suite (enthält den Check)
npm run dev                  # lokal im Browser gegenfotos testen
```

`check:vision-model` schlägt fehl bei: fehlenden Shards, Klassen-Mismatch
zwischen Config und `metadata.yaml`, ungültigem `model.json`.

## Performance (optional)

- `tfjsBackend: 'webgl'` ist auf Mobilgeräten meist am schnellsten und ist im
  gebündelten `tf.min.js` enthalten.
- **WebGPU/WASM** benötigen ein zusätzliches TF.js-Backend-Skript in
  `index.html` und sind hier bewusst noch nicht aktiviert (separater Schritt).

## Rollback

Vorherige Modelldateien + den `VISION_MODEL`-Block aus der Git-Historie
wiederherstellen (`git checkout <commit> -- model.json group1-shard*.bin metadata.yaml image-compare-brain.js`),
Cache-Version anheben.

## Grenzen

Dieses Modell liest die **angezeigte Zahl** vom Monitor. Echte
Schusslocherkennung auf Papier mit geometrischer Ringberechnung ist ein
eigener, größerer Schritt (siehe „Stufe 2").
