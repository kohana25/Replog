"""
Generates Movara's original app icon / splash artwork.

Run with:  python3 scripts/generate-assets.py

The mark is an abstract barbell: a central bar with two plates, drawn with
the app's own palette. It is original artwork created for this project.
"""

import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "images")
os.makedirs(OUT, exist_ok=True)

NAVY = (15, 23, 42, 255)        # #0F172A
BLUE = (37, 99, 235, 255)       # #2563EB
GREEN = (34, 197, 94, 255)      # #22C55E
LIGHT = (248, 250, 252, 255)    # #F8FAFC


def draw_mark(size, bg=None, scale=1.0):
    """Draw the barbell mark centred on an optional background."""
    ss = 4  # supersample for smooth edges
    w = size * ss
    img = Image.new("RGBA", (w, w), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if bg is not None and bg[3] > 0:
        # rounded-square backdrop is handled by the platform mask, so the
        # flat fill above is enough.
        pass

    c = w / 2
    unit = (w / 2) * scale

    bar_h = unit * 0.20
    bar_w = unit * 1.34
    # centre bar
    d.rounded_rectangle(
        [c - bar_w / 2, c - bar_h / 2, c + bar_w / 2, c + bar_h / 2],
        radius=bar_h / 2,
        fill=LIGHT,
    )

    # inner plates (tall, blue)
    plate_w = unit * 0.26
    plate_h = unit * 1.05
    for sign in (-1, 1):
        x = c + sign * (unit * 0.52)
        d.rounded_rectangle(
            [x - plate_w / 2, c - plate_h / 2, x + plate_w / 2, c + plate_h / 2],
            radius=plate_w * 0.38,
            fill=BLUE,
        )

    # outer plates (shorter, green accent)
    o_w = unit * 0.20
    o_h = unit * 0.66
    for sign in (-1, 1):
        x = c + sign * (unit * 0.90)
        d.rounded_rectangle(
            [x - o_w / 2, c - o_h / 2, x + o_w / 2, c + o_h / 2],
            radius=o_w * 0.4,
            fill=GREEN,
        )

    return img.resize((size, size), Image.LANCZOS)


def save(name, img):
    path = os.path.join(OUT, name)
    img.save(path, "PNG")
    print("wrote", path)


save("icon.png", draw_mark(1024, bg=NAVY, scale=0.62))
save("adaptive-icon.png", draw_mark(1024, bg=(0, 0, 0, 0), scale=0.44))
save("splash-icon.png", draw_mark(512, bg=(0, 0, 0, 0), scale=0.80))
save("favicon.png", draw_mark(96, bg=NAVY, scale=0.66))
