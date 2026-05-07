#!/usr/bin/env python3
"""Generate King PWA icons in the vintage typewriter aesthetic.

Outputs to public/: icon-192.png, icon-512.png, apple-touch-icon.png (180px).

Requires Pillow. Run from repo root:

    python3 -m venv .venv && .venv/bin/pip install Pillow
    .venv/bin/python3 scripts/make-pwa-icons.py
"""
import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO, "public")
FONT_PATH = "/System/Library/Fonts/Supplemental/AmericanTypewriter.ttc"
FONT_BOLD_INDEX = 2  # American Typewriter Bold

PAPER = (235, 229, 216)
INK = (32, 32, 32)


def make_master(size: int = 1024) -> Image.Image:
    img = Image.new("RGB", (size, size), PAPER)

    random.seed(42)
    grain = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grain)
    for _ in range(size * size // 50):
        x = random.randint(0, size - 1)
        y = random.randint(0, size - 1)
        a = random.randint(6, 18)
        gdraw.point((x, y), fill=(80, 70, 50, a))
    img = Image.alpha_composite(img.convert("RGBA"), grain)
    draw = ImageDraw.Draw(img, "RGBA")

    outer = int(size * 0.135)
    inner = int(size * 0.155)
    draw.rectangle([outer, outer, size - outer, size - outer],
                   outline=(70, 62, 48, 140), width=max(2, size // 256))
    draw.rectangle([inner, inner, size - inner, size - inner],
                   outline=(70, 62, 48, 80), width=max(1, size // 512))

    font_size = int(size * 0.56)
    font = ImageFont.truetype(FONT_PATH, size=font_size, index=FONT_BOLD_INDEX)
    bbox = draw.textbbox((0, 0), "K", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx = (size - tw) // 2 - bbox[0]
    cy = (size - th) // 2 - bbox[1] - int(size * 0.015)

    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.text((cx + max(2, size // 360), cy + max(2, size // 360)),
               "K", font=font, fill=(0, 0, 0, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=size // 256))
    img = Image.alpha_composite(img, shadow)
    ImageDraw.Draw(img, "RGBA").text((cx, cy), "K", font=font, fill=INK)

    return img.convert("RGB")


def save_png(img: Image.Image, path: str, size: int):
    img.resize((size, size), Image.LANCZOS).save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def main():
    master = make_master(1024)
    save_png(master, os.path.join(OUT_DIR, "icon-512.png"), 512)
    save_png(master, os.path.join(OUT_DIR, "icon-192.png"), 192)
    save_png(master, os.path.join(OUT_DIR, "apple-touch-icon.png"), 180)


if __name__ == "__main__":
    main()
