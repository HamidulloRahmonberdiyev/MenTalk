"""
Builds every app-icon asset from the single master, assets/images/app-icon.png.

    python scripts/generate-icons.py

Outputs (all referenced from app.json):
  icon.png                      1024, opaque, full-bleed   (iOS app icon, Expo default icon, splash)
  android-icon-background.png   1024, the icon's blue gradient
  android-icon-foreground.png   1024, only the "M", shrunk into Android's safe zone
  favicon.png                   256

The master is a glossy rounded tile drawn on a white canvas with a shadow, so it can't be used as is:
stores want a full-bleed square (the OS rounds the corners itself). Instead the tile's blue is
modelled as a smooth surface, the "M" is lifted off it with its shading, and both are rebuilt on a
clean square.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

IMAGES = Path(__file__).resolve().parent.parent / "assets" / "images"
SIZE = 1024
# The "M" (with its shading) in master pixels, and the tile's flat interior used to sample its blue.
GLYPH_BOX = (180, 300, 1100, 960)
GLYPH_SEED = (450, 500)  # a point on the "M"'s left stroke  # starts just clear of the tile's top-left glare
TILE_BOX = (150, 150, 1110, 1110)
# Width of the "M" as a share of the canvas: the store icon, and Android's circle-masked safe zone.
ICON_GLYPH_WIDTH = 0.70
ANDROID_GLYPH_WIDTH = 0.50


def fit_surface(rgb: np.ndarray) -> np.ndarray:
    """Per-channel quadratic in (x, y), fitted to the tile's saturated blue only (not the "M", not the glare)."""
    x0, y0, x1, y1 = TILE_BOX
    ys, xs = np.mgrid[y0:y1:4, x0:x1:4]
    sample = rgb[ys, xs]
    keep = sample[..., 0] < 60  # pure tile blue; the "M" and the top-left glare are much lighter
    x, y = xs[keep] / 1000.0, ys[keep] / 1000.0
    basis = np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], axis=1)
    coeffs, *_ = np.linalg.lstsq(basis, sample[keep].astype(float), rcond=None)
    return coeffs


def surface(coeffs: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    x, y = xs / 1000.0, ys / 1000.0
    basis = np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], axis=-1)
    return np.clip(basis @ coeffs, 0, 255)


def connected_to(mask: np.ndarray, seed: tuple[int, int]) -> np.ndarray:
    """1 where `mask` is reachable from `seed` (x, y), else 0."""
    image = Image.fromarray((mask * 255).astype("uint8"), "L").copy()  # floodfill ignores array-backed images
    ImageDraw.floodfill(image, seed, 128)
    return (np.asarray(image) == 128).astype(float)


def lift_glyph(rgb: np.ndarray, coeffs: np.ndarray) -> Image.Image:
    """The "M" and its shading as soft alpha: whatever differs from the fitted blue inside GLYPH_BOX."""
    x0, y0, x1, y1 = GLYPH_BOX
    ys, xs = np.mgrid[y0:y1, x0:x1]
    a = rgb[y0:y1, x0:x1].astype(float)
    b = surface(coeffs, xs, ys)
    dist = np.sqrt(((a - b) ** 2).sum(axis=2))
    alpha = np.clip((dist - 18) / 40, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    alpha *= connected_to(alpha > 0.01, (GLYPH_SEED[0] - x0, GLYPH_SEED[1] - y0))  # drop stray glare specks
    safe = np.maximum(alpha, 1e-3)[..., None]
    out = np.clip(b + (a - b) / safe, 0, 255)  # undo the blend with the blue
    return Image.fromarray(np.dstack([out, alpha * 255]).astype("uint8"), "RGBA")


def background(coeffs: np.ndarray) -> Image.Image:
    """The tile's blue stretched over the whole canvas: canvas edges map onto TILE_BOX's edges."""
    x0, y0, x1, y1 = TILE_BOX
    v, u = np.mgrid[0:SIZE, 0:SIZE] / (SIZE - 1)
    grad = surface(coeffs, x0 + u * (x1 - x0), y0 + v * (y1 - y0))
    return Image.fromarray(grad.astype("uint8"), "RGB").convert("RGBA")


def place(glyph: Image.Image, canvas: Image.Image, width_share: float) -> Image.Image:
    """Scales the glyph to `width_share` of the canvas and centres it."""
    w = int(SIZE * width_share)
    h = round(glyph.height * w / glyph.width)
    art = glyph.resize((w, h), Image.LANCZOS)
    out = canvas.copy()
    out.alpha_composite(art, ((SIZE - w) // 2, (SIZE - h) // 2))
    return out


def main() -> None:
    rgb = np.asarray(Image.open(IMAGES / "app-icon.png").convert("RGB"))
    coeffs = fit_surface(rgb)
    glyph = lift_glyph(rgb, coeffs)
    blue = background(coeffs)

    icon = place(glyph, blue, ICON_GLYPH_WIDTH).convert("RGB")
    icon.save(IMAGES / "icon.png", optimize=True)
    icon.resize((256, 256), Image.LANCZOS).save(IMAGES / "favicon.png", optimize=True)
    blue.convert("RGB").save(IMAGES / "android-icon-background.png", optimize=True)

    clear = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    place(glyph, clear, ANDROID_GLYPH_WIDTH).save(IMAGES / "android-icon-foreground.png", optimize=True)


if __name__ == "__main__":
    main()
