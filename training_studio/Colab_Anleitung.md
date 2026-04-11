# Dein Google Colab Trainings-Script für V2

Du hast die Bilder und du hast die `.txt` (YOLO) Dateien. Perfekt! Jetzt nutzen wir Googles kostenlose Server, um dein neuronales Netz zu schmieden.

## Schritt 1: Vorbereitung der Daten (Reißverschluss)
1. Erstelle auf deinem PC einen Ordner namens `dataset`.
2. In diesem Ordner erstellst du zwei Unterordner: `images` und `labels`.
3. Packe deine 17 Fotos (jpg/png) in den Ordner `images`.
4. Packe deine 17 Text-Dateien (aus MakeSense) in den Ordner `labels`.
   *(Wichtig: Das Foto `bild1.jpg` muss exakt so heißen wie seine Textdatei `bild1.txt`)*
5. Verpacke den `dataset` Ordner als ZIP-Datei (Rechtsklick -> In ZIP-Datei komprimieren) -> `dataset.zip`.

---

## Schritt 2: Auf zu Google Colab
1. Öffne die Seite: [Google Colab](https://colab.research.google.com/)
2. Melde dich mit einem Google-Konto an.
3. Klicke auf **"Neues Notebook"**.
4. **Ganz Wichtig:** Klicke oben im Menü auf `Laufzeit` -> `Laufzeittyp ändern` -> Wähle als Hardwarebeschleuniger **T4 GPU** aus und speichere. Das gibt dir den Gratis-Supercomputer.
5. Klicke auf der linken Seite auf das kleine **Ordner-Symbol** (Dateien) und lade deine `dataset.zip` hoch.

---

## Schritt 3: Der Magische Code
Kopiere diesen Python-Code komplett in das weiße Code-Feld deines Notebooks. Danach drückst du den **Play-Button** (Links neben dem Code).

```python
# 1. Entpacken deiner hochgeladenen Trainingsdaten
import zipfile
import os

print("Entpacke Datensatz...")
with zipfile.ZipFile('/content/dataset.zip', 'r') as zip_ref:
    zip_ref.extractall('/content/datasets/monitor')

# 2. YAML-Konfiguration für YOLO generieren
yaml_content = """
path: /content/datasets/monitor
train: images
val: images

# Bei 2 Klassen: 0=Discipline, 1=Score (passe Namen an, falls du andere Labels in MakeSense gewählt hast)
nc: 2
names: ['discipline', 'score']
"""
with open('/content/datasets/monitor/data.yaml', 'w') as f:
    f.write(yaml_content)

# 3. YoloV8 installieren
print("Installiere Ultralytics KI...")
!pip install -q ultralytics tensorflow tensorflowjs

# 4. Das Training starten!
from ultralytics import YOLO

# Wir laden das kleinste und schnellste Modell (nano), perfekt für Handys
model = YOLO('yolov8n.pt') 

print("Starte Training... (Das kann ein paar Minuten dauern)")
# Wir nutzen automatische Data-Augmentation (flipping, blur, etc. macht yolo von selbst!)
results = model.train(data='/content/datasets/monitor/data.yaml', epochs=100, imgsz=640)

# 5. Export für die PWA (TensorFlow.js)
print("Training fertig! Exportiere Modell für unsere Web-App...")
model.export(format='tfjs')

# 6. Ordner für den Download zippen
import shutil
shutil.make_archive('/content/v2_tfjs_model', 'zip', '/content/runs/detect/train/weights/best_web_model')
print("✅ ALLES FERTIG! Lade jetzt links die Datei 'v2_tfjs_model.zip' herunter!")
```

## Schritt 4: Das fertige Gehirn
Sobald der Befehl durchgelaufen ist, siehst du links im Dateimanager (evtl. auf "Aktualisieren" klicken) eine Datei namens `v2_tfjs_model.zip`.
Lade diese herunter! Darin befinden sich deine heiß ersehnten `model.json` und die `weights`. 

Sag mir Bescheid, wenn du die `.zip` hast, dann schreibe ich unsere `v2-vision-engine.js` so um, dass sie genau dieses Profi-Objekterkennungs-Netz nutzt!
