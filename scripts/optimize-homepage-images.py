#!/usr/bin/env python3
"""Create small WebP delivery variants for the homepage without changing source artwork."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

def make_webp(source_name: str, output_name: str, max_width: int, quality: int) -> None:
    source = ROOT / source_name
    output = ROOT / output_name
    if not source.is_file():
        raise FileNotFoundError(f"Required homepage image is missing: {source_name}")
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((max_width, max_width), Image.Resampling.LANCZOS)
        options = {"format": "WEBP", "quality": quality, "method": 6}
        icc_profile = original.info.get("icc_profile")
        if icc_profile:
            options["icc_profile"] = icc_profile
        image.save(output, **options)
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError(f"Failed to generate {output_name}")
    print(f"{source_name}: {source.stat().st_size:,} bytes -> {output_name}: {output.stat().st_size:,} bytes")

def main() -> None:
    make_webp("logo.png", "logo-optimized.webp", 256, 86)
    make_webp("herobanner.jpg", "herobanner.webp", 1280, 80)
    for name in (
        "hostelherobanner.jpg",
        "tiffinherobanner.jpg",
        "libraryherobanner.jpg",
        "cafeherobanner.jpg",
        "bookstoreherobanner.jpg",
    ):
        make_webp(name, Path(name).with_suffix(".webp").name, 800, 80)

    index_path = ROOT / "index.html"
    html = index_path.read_text(encoding="utf-8")
    original = html

    # Switch only visible <img> logo instances. Keep favicon, Apple touch icon,
    # Open Graph, Twitter and structured-data logo references on the original.
    html = html.replace(
        'src="/logo.png?v=20261122-home-refresh"',
        'src="/logo-optimized.webp?v=20261122-mobile-performance"',
    )
    html = html.replace('href="/herobanner.jpg"', 'href="/herobanner.webp"')
    html = html.replace('src="/herobanner.jpg"', 'src="/herobanner.webp"')
    for name in (
        "hostelherobanner.jpg",
        "tiffinherobanner.jpg",
        "libraryherobanner.jpg",
        "cafeherobanner.jpg",
        "bookstoreherobanner.jpg",
    ):
        optimized = Path(name).with_suffix(".webp").name
        html = html.replace(f'src="/{name}"', f'src="/{optimized}"')

    if html != original:
        index_path.write_text(html, encoding="utf-8")
        print("Updated homepage image URLs. Existing Google Fonts URL already uses display=swap.")
    else:
        print("Homepage already references optimized assets; no HTML changes needed.")

if __name__ == "__main__":
    main()
