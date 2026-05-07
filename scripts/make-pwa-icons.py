#!/usr/bin/env python3
"""Generate King PWA icons from the Vitruvian Man homepage logo.

Pipeline: render public/vitruvian-logo.svg via rsvg-convert, crop to just
the figure (the wordmark below it is illegible at icon sizes), pad onto a
cream paper square, and downsample to:

    public/icon-512.png         (512x512, manifest)
    public/icon-192.png         (192x192, manifest)
    public/apple-touch-icon.png (180x180, iOS home screen)

Requires Pillow and rsvg-convert (brew install librsvg). Run from repo root.
"""
import os
import shutil
import subprocess
import tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(REPO, "public", "vitruvian-logo.svg")
OUT = os.path.join(REPO, "public")

# Original viewBox is 0 0 520 560. The figure (head/feet/hands, no wordmark)
# lives in roughly y=72..505, x=44..476. Crop to that with a touch of
# breathing room on each side.
SVG_W, SVG_H = 520, 560
CROP_X0, CROP_Y0, CROP_X1, CROP_Y1 = 36, 64, 484, 510

PAPER = (235, 229, 216)  # cream — matches site bg


def render_svg(width: int) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        png = f.name
    try:
        subprocess.run(
            ["rsvg-convert", "--width", str(width),
             "--background-color", "rgb(235,229,216)",
             "--output", png, SVG],
            check=True,
        )
        return Image.open(png).convert("RGBA")
    finally:
        os.unlink(png)


def build_master(target: int = 1024) -> Image.Image:
    raster_w = 2048
    raster = render_svg(raster_w)
    scale = raster_w / SVG_W
    box = (int(CROP_X0 * scale), int(CROP_Y0 * scale),
           int(CROP_X1 * scale), int(CROP_Y1 * scale))
    figure = raster.crop(box)

    pad = int(target * 0.06)
    inner = target - 2 * pad
    fw, fh = figure.size
    s = min(inner / fw, inner / fh)
    figure = figure.resize((int(fw * s), int(fh * s)), Image.LANCZOS)

    canvas = Image.new("RGB", (target, target), PAPER)
    cx = (target - figure.width) // 2
    cy = (target - figure.height) // 2
    canvas.paste(figure, (cx, cy), figure if figure.mode == "RGBA" else None)
    return canvas


def save(img: Image.Image, name: str, size: int):
    out = img.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, name)
    out.save(path, "PNG", optimize=True)
    print(f"wrote {path}")


def main():
    if not shutil.which("rsvg-convert"):
        raise SystemExit("rsvg-convert not found. Install with: brew install librsvg")
    master = build_master(1024)
    save(master, "icon-512.png", 512)
    save(master, "icon-192.png", 192)
    save(master, "apple-touch-icon.png", 180)


if __name__ == "__main__":
    main()
