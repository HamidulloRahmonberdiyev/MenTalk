"""
Builds every app-icon asset from the single master, assets/images/logo.png.

    python scripts/generate-icons.py

Outputs (all referenced from app.json):
  icon.png                      1024, opaque, full-bleed   (iOS app icon, Expo default icon)
  android-icon-background.png   1024, the icon's blue gradient
  android-icon-foreground.png   1024, only the bubbles, shrunk into Android's safe zone
  favicon.png                   256

The master is a rounded square on a transparent canvas. Stores want a full-bleed square (the OS
rounds the corners itself), so the transparent corners are filled with a gradient sampled from the
artwork's own colours.
"""
from pathlib import Path

import numpy as np
from PIL import Image

IMAGES = Path(__file__).resolve().parent.parent / "assets" / "images"
SIZE = 1024
# Square crop that sits inside the artwork's rounded square, away from its antialiased rim.
CROP = (122, 120, 1132, 1130)
# Android masks adaptive icons to roughly the central 66%; keep the artwork inside it.
ANDROID_SCALE = 0.74


def corner_gradient(art: Image.Image) -> Image.Image:
    """
    Bilinear gradient that continues the artwork's blue past its rounded corners.

    Colours come from the top and bottom rims (clear of the speech bubbles) and are extrapolated
    along each rim out to the canvas edge.
    """
    w, h = art.size
    pick = lambda fx, fy: np.array(art.getpixel((int(w * fx), int(h * fy)))[:3], dtype=float)

    def rim(fy: float) -> tuple[np.ndarray, np.ndarray]:
        left, right = pick(0.3, fy), pick(0.7, fy)
        slope = (right - left) / 0.4
        return left - slope * 0.3, right + slope * 0.3  # colour at x=0 and x=1

    (tl, tr), (bl, br) = rim(0.04), rim(0.96)
    u = np.linspace(0, 1, w)[None, :, None]
    v = np.linspace(0, 1, h)[:, None, None]
    top, bottom = tl * (1 - u) + tr * u, bl * (1 - u) + br * u
    grad = np.clip(top * (1 - v) + bottom * v, 0, 255)
    return Image.fromarray(grad.astype("uint8"), "RGB").convert("RGBA")


def lift_foreground(art: Image.Image, background: Image.Image) -> Image.Image:
    """Keeps only what differs from the background (bubbles, sparkles, their shading) as soft alpha."""
    a = np.asarray(art.convert("RGB"), dtype=float)
    b = np.asarray(background.convert("RGB"), dtype=float)
    dist = np.sqrt(((a - b) ** 2).sum(axis=2))
    alpha = np.clip((dist - 14) / 40, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip(b + (a - b) / safe, 0, 255)  # undo the blend with the background
    out = np.dstack([rgb, alpha * 255]).astype("uint8")
    return Image.fromarray(out, "RGBA")


def main() -> None:
    master = Image.open(IMAGES / "logo.png").convert("RGBA").crop(CROP).resize((SIZE, SIZE), Image.LANCZOS)
    background = corner_gradient(master)
    full_bleed = Image.alpha_composite(background, master)

    full_bleed.convert("RGB").save(IMAGES / "icon.png", optimize=True)
    full_bleed.convert("RGB").resize((256, 256), Image.LANCZOS).save(IMAGES / "favicon.png", optimize=True)
    background.convert("RGB").save(IMAGES / "android-icon-background.png", optimize=True)

    # Foreground: just the bubbles, scaled into Android's safe zone, over the background layer.
    inner = int(SIZE * ANDROID_SCALE)
    art = lift_foreground(full_bleed, background).resize((inner, inner), Image.LANCZOS)
    foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    foreground.paste(art, ((SIZE - inner) // 2, (SIZE - inner) // 2), art)
    foreground.save(IMAGES / "android-icon-foreground.png", optimize=True)


if __name__ == "__main__":
    main()
