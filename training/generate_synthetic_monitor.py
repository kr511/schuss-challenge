#!/usr/bin/env python3
"""
Synthetischer Datengenerator fuer die Foto-KI (Trefferanlagen-Monitor).

Erzeugt gelabelte Trainingsbilder im YOLO-Format mit zwei Klassen:
    0: discipline   (z. B. "LG 40", "KK 3x20")
    1: score        (z. B. "402.5", "578")

Zweck: die komplette Trainings-Pipeline laesst sich damit OHNE ein einziges
handgelabeltes Foto testen, und echte Fotos muessen nur noch zum Feinschliff
beigemischt werden (statt hunderte selbst zu labeln).

Reines Python + Pillow, keine GPU noetig.

Beispiel:
    python3 training/generate_synthetic_monitor.py --out datasets/monitor --count 600

Ergebnis:
    datasets/monitor/
      images/{train,val}/*.png
      labels/{train,val}/*.txt        # YOLO: "<cls> <xc> <yc> <w> <h>" (normiert)
      data.yaml                       # direkt fuer `yolo detect train data=...`
"""

import argparse
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Klassen-Reihenfolge MUSS image-compare-brain.js VISION_MODEL.classes entsprechen.
CLASSES = ["discipline", "score"]

# Realistische Wertebereiche je Disziplin (Label-Text, Ringbereich, Ganzzahl?).
DISCIPLINES = [
    {"labels": ["LG 40", "LG40", "LG-40", "LG 40 Sch.", "L6 40"], "lo": 300, "hi": 420, "integer": False},
    {"labels": ["LG 60", "LG60", "LG-60", "L6 60"],               "lo": 480, "hi": 640, "integer": False},
    {"labels": ["KK 50", "KK50", "KK-50", "KK 50m"],              "lo": 400, "hi": 600, "integer": True},
    {"labels": ["KK 100", "KK100", "KK-100", "KK 100m"],          "lo": 400, "hi": 600, "integer": True},
    # KK 3x20: viele Monitor-Varianten (X, ×, K statt X auf LCD)
    {"labels": ["KK 3x20", "KK 3X20", "KK3X20", "KK 3×20", "KK 3K20", "KK3x20"], "lo": 450, "hi": 600, "integer": True},
]

KEYWORDS = ["GESAMT", "TOTAL", "SUMME", "ERGEBNIS", "RINGE", "SERIE", "STAND",
            "SCHIESSEN", "TREFFER", "PUNKTE", "PKT", "RNG"]


def load_font(size):
    """Beste verfuegbare TTF, sonst Pillow-Default (immer vorhanden)."""
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def make_score_text(disc, rng):
    """Plausibler Score-String fuer die Disziplin."""
    if disc["integer"]:
        return str(rng.randint(disc["lo"], disc["hi"]))
    # LG: eine Nachkommastelle, deutscher oder englischer Dezimaltrenner.
    val = rng.randint(disc["lo"] * 10, disc["hi"] * 10) / 10.0
    sep = rng.choice([",", "."])
    return f"{val:.1f}".replace(".", sep)


def rotate_point(px, py, cx, cy, angle_rad):
    dx, dy = px - cx, py - cy
    cos_a, sin_a = math.cos(angle_rad), math.sin(angle_rad)
    return (cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a)


def rotated_bbox(box, cx, cy, angle_rad):
    """Achsenparallele Huelle einer um (cx,cy) rotierten Box."""
    x0, y0, x1, y1 = box
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pts = [rotate_point(px, py, cx, cy, angle_rad) for px, py in corners]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def draw_glare(img, rng):
    """Heller, weicher Lichtfleck (Reflexion) – haeufigster Stoerfaktor."""
    overlay = Image.new("L", img.size, 0)
    od = ImageDraw.Draw(overlay)
    w, h = img.size
    cx, cy = rng.randint(0, w), rng.randint(0, h)
    r = rng.randint(int(w * 0.12), int(w * 0.35))
    od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rng.randint(70, 160))
    overlay = overlay.filter(ImageFilter.GaussianBlur(r * 0.6))
    white = Image.new("RGB", img.size, (255, 255, 255))
    return Image.composite(white, img, overlay)


def draw_scanlines(img, rng):
    """Horizontale Scan-Linien – typisch fuer LCD/CRT-Trefferanlagen-Monitore."""
    overlay = img.copy()
    od = ImageDraw.Draw(overlay)
    w, h = img.size
    step = rng.randint(3, 6)          # Zeilenabstand
    alpha = rng.uniform(0.04, 0.14)   # Staerke: sehr subtil
    for y in range(0, h, step):
        od.line([(0, y), (w, y)], fill=(0, 0, 0))
    return Image.blend(img, overlay, alpha)


def draw_segment_dropout(draw, bbox, fg, rng):
    """Uebermalt einen zufaelligen Teilbereich der Score-Box mit Hintergrundfarbe
    (simuliert ein ausgefallenes LCD-Segment / partiell unleserliche Ziffer)."""
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    if w < 10 or h < 10:
        return
    # Kleines Rechteck irgendwo in der Box
    rx0 = rng.randint(x0, x0 + w // 2)
    ry0 = rng.randint(y0, y0 + h // 2)
    rx1 = min(x1, rx0 + rng.randint(3, max(4, w // 4)))
    ry1 = min(y1, ry0 + rng.randint(3, max(4, h // 4)))
    # Hintergrundfarbe annaehernd: Invertierung der Vordergrundfarbe
    bg_approx = tuple(max(0, min(255, 255 - c)) for c in fg)
    draw.rectangle([rx0, ry0, rx1, ry1], fill=bg_approx)


def generate_one(rng, imgsz):
    """Erzeugt (PIL-Image, [(cls, xc, yc, w, h), ...]) – Labels normiert."""
    # Auf groesserer Leinwand komponieren, dann auf imgsz skalieren.
    big = int(imgsz * rng.uniform(1.4, 2.2))
    W = H = big

    # Monitor (dunkel) oder Papier (hell).
    monitor = rng.random() < 0.7
    if monitor:
        bg = (rng.randint(8, 40), rng.randint(10, 45), rng.randint(12, 50))
        fg = (rng.randint(200, 255), rng.randint(200, 255), rng.randint(120, 200))
    else:
        bg = (rng.randint(210, 245), rng.randint(210, 245), rng.randint(205, 240))
        fg = (rng.randint(10, 40), rng.randint(10, 40), rng.randint(10, 40))

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    # Leichter Helligkeits-Gradient.
    for y in range(0, H, 4):
        shade = int(18 * math.sin(y / H * math.pi))
        draw.line([(0, y), (W, y)], fill=tuple(max(0, min(255, c + shade)) for c in bg))

    disc = rng.choice(DISCIPLINES)
    disc_text = rng.choice(disc["labels"])
    score_text = make_score_text(disc, rng)

    disc_font = load_font(rng.randint(int(H * 0.07), int(H * 0.11)))
    score_font = load_font(rng.randint(int(H * 0.16), int(H * 0.26)))
    kw_font = load_font(rng.randint(int(H * 0.04), int(H * 0.06)))

    boxes = []  # (cls, x0,y0,x1,y1) in Pixel

    def place(text, font, cls, x_lo, x_hi, y_lo, y_hi, color):
        # Textgroesse vorab messen und die Startposition so klemmen, dass der
        # Text komplett im Bild bleibt (saubere, vollstaendige Labels).
        m = draw.textbbox((0, 0), text, font=font)
        tw, th = m[2] - m[0], m[3] - m[1]
        x = min(max(rng.randint(x_lo, x_hi), 4), max(4, W - tw - 4))
        y = min(max(rng.randint(y_lo, y_hi), 4), max(4, H - th - 4))
        bb = draw.textbbox((x, y), text, font=font)
        draw.text((x, y), text, font=font, fill=color)
        pad = int((bb[3] - bb[1]) * 0.18) + 2
        boxes.append((cls, bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad))

    # Disziplin oben.
    place(disc_text, disc_font, 0,
          int(W * 0.06), int(W * 0.30), int(H * 0.05), int(H * 0.16), fg)

    # Optionales Schluesselwort neben/unter der Disziplin (Realismus).
    if rng.random() < 0.6:
        kx = rng.randint(int(W * 0.50), int(W * 0.78))
        ky = rng.randint(int(H * 0.06), int(H * 0.18))
        draw.text((kx, ky), rng.choice(KEYWORDS), font=kw_font, fill=fg)

    # Score gross, mittig-unten.
    place(score_text, score_font, 1,
          int(W * 0.18), int(W * 0.55), int(H * 0.42), int(H * 0.66), fg)

    # ── Geometrische Augmentierung: Rotation (Boxen mitdrehen) ──
    # ±12° statt ±7°: YOLO11 profitiert von haeufigeren Schraeglage-Samples
    angle_deg = rng.uniform(-12, 12)
    if abs(angle_deg) > 0.3:
        cx, cy = W / 2.0, H / 2.0
        img = img.rotate(angle_deg, resample=Image.BICUBIC, fillcolor=bg)
        # PIL dreht mathematisch positiv = gegen den Uhrzeigersinn; Punkte
        # entsprechend mit -angle transformieren.
        a = math.radians(-angle_deg)
        boxes = [(c, *rotated_bbox((x0, y0, x1, y1), cx, cy, a)) for (c, x0, y0, x1, y1) in boxes]

    # Auf Zielgroesse skalieren.
    img = img.resize((imgsz, imgsz), Image.BICUBIC)
    sx_ratio, sy_ratio = imgsz / W, imgsz / H

    # ── Photometrische Augmentierung (keine Geometrie) ──
    if rng.random() < 0.45:
        img = draw_glare(img, rng)
    if rng.random() < 0.35:
        img = draw_scanlines(img, rng)      # LCD-Scan-Linien (neu fuer YOLO11)
    if rng.random() < 0.5:
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.4, 1.6)))
    if rng.random() < 0.4:
        noise = Image.effect_noise((imgsz, imgsz), rng.randint(8, 26)).convert("RGB")
        img = Image.blend(img, noise, rng.uniform(0.04, 0.12))
    # Partieller Segment-Dropout (20% der Bilder): simuliert ausgefallene LCD-Segmente
    if rng.random() < 0.20:
        draw_after = ImageDraw.Draw(img)
        # Treffe nur die Score-Box (boxes[-1] ist score, boxes[0] ist discipline)
        score_box = next(
            ((int(x0 * sx_ratio), int(y0 * sy_ratio), int(x1 * sx_ratio), int(y1 * sy_ratio))
             for (cls, x0, y0, x1, y1) in boxes if cls == 1),
            None
        )
        if score_box:
            draw_segment_dropout(draw_after, score_box, fg, rng)

    # Pixel-Boxen -> normierte YOLO-Labels, geclippt + gefiltert.
    labels = []
    for cls, x0, y0, x1, y1 in boxes:
        x0, x1 = sorted((x0 * sx_ratio, x1 * sx_ratio))
        y0, y1 = sorted((y0 * sy_ratio, y1 * sy_ratio))
        x0, y0 = max(0.0, x0), max(0.0, y0)
        x1, y1 = min(float(imgsz), x1), min(float(imgsz), y1)
        w, h = x1 - x0, y1 - y0
        if w < 4 or h < 4:
            continue
        labels.append((cls, (x0 + x1) / 2 / imgsz, (y0 + y1) / 2 / imgsz, w / imgsz, h / imgsz))

    return img, labels


def main():
    ap = argparse.ArgumentParser(description="Synthetische Monitor-Trainingsdaten (YOLO).")
    ap.add_argument("--out", default="datasets/monitor", help="Zielordner")
    ap.add_argument("--count", type=int, default=600, help="Anzahl Bilder gesamt")
    ap.add_argument("--val-split", type=float, default=0.15, help="Anteil Validierung")
    ap.add_argument("--imgsz", type=int, default=640, help="Bildgroesse (== VISION_MODEL.inputSize)")
    ap.add_argument("--seed", type=int, default=42, help="Zufalls-Seed (Reproduzierbarkeit)")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    out = os.path.abspath(args.out)
    for split in ("train", "val"):
        os.makedirs(os.path.join(out, "images", split), exist_ok=True)
        os.makedirs(os.path.join(out, "labels", split), exist_ok=True)

    n_val = max(1, int(args.count * args.val_split))
    for i in range(args.count):
        split = "val" if i < n_val else "train"
        img, labels = generate_one(rng, args.imgsz)
        stem = f"mon_{i:05d}"
        img.save(os.path.join(out, "images", split, stem + ".png"))
        with open(os.path.join(out, "labels", split, stem + ".txt"), "w", encoding="utf-8") as f:
            for cls, xc, yc, w, h in labels:
                f.write(f"{cls} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")

    # data.yaml fuer Ultralytics.
    with open(os.path.join(out, "data.yaml"), "w", encoding="utf-8") as f:
        f.write(f"path: {out}\n")
        f.write("train: images/train\n")
        f.write("val: images/val\n")
        f.write(f"nc: {len(CLASSES)}\n")
        f.write("names:\n")
        for idx, name in enumerate(CLASSES):
            f.write(f"  {idx}: {name}\n")

    print(f"Fertig: {args.count} Bilder ({n_val} val) -> {out}")
    print(f"  Klassen: {', '.join(CLASSES)}")
    print(f"  data.yaml: {os.path.join(out, 'data.yaml')}")
    print("  Training (YOLO11): yolo detect train model=yolo11n.pt data=" +
          os.path.join(out, "data.yaml") + f" imgsz={args.imgsz} epochs=100")


if __name__ == "__main__":
    main()
