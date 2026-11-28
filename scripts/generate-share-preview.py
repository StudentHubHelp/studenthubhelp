from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO_PATH = ROOT / "logo.png"
OUT_PATH = ROOT / "share-preview.png"
CITY_OUT = ROOT / "share-previews"
W, H = 1200, 630

CITY_CARDS = {
    "student-cities": ("Student Cities Across India", "Explore 12 student city guides", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "sikar": ("Sikar", "Student city guide", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "bengaluru": ("Bengaluru", "Student city guide", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "chennai": ("Chennai", "Student city guide", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "kota": ("Kota", "Student city guide", "Hostels • PGs • Tiffin"),
    "delhi": ("Delhi", "Student city guide", "Hostels • PGs"),
    "patna": ("Patna", "Student city guide", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "jhunjhunu": ("Jhunjhunu", "Student city guide", "Libraries • Cafes • Bookstores"),
    "pune": ("Pune", "Student city guide", "Hostels • PGs • Tiffin • Libraries • Cafes"),
    "gurugram": ("Gurugram", "Student city guide", "Hostels • PGs • Tiffin • Cafes"),
    "coimbatore": ("Coimbatore", "Student city guide", "Libraries • Reading rooms"),
    "jaipur": ("Jaipur", "Student city guide", "Hostels • PGs • Bookstores"),
    "lucknow": ("Lucknow", "Student city guide", "City guide • Listings coming soon"),
}

def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

def render_card(title, eyebrow, services, output):
    image = Image.new("RGB", (W, H), "#fff8ed")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((28, 28, W - 28, H - 28), radius=34, fill="#173b32")
    draw.rounded_rectangle((28, 28, 48, H - 28), radius=10, fill="#f28c28")
    draw.ellipse((930, -180, 1340, 230), fill="#245747")
    draw.ellipse((1000, 390, 1320, 710), fill="#214b3e")
    draw.ellipse((1040, 90, 1160, 210), outline="#f28c28", width=10)
    draw.rounded_rectangle((88, 82, 244, 238), radius=30, fill="#ffffff", outline="#f4b36f", width=3)

    logo = Image.open(LOGO_PATH).convert("RGBA")
    scale = min(120 / logo.width, 120 / logo.height)
    logo = logo.resize((max(1, round(logo.width * scale)), max(1, round(logo.height * scale))), Image.Resampling.LANCZOS)
    image_rgba = image.convert("RGBA")
    image_rgba.alpha_composite(logo, (166 - logo.width // 2, 160 - logo.height // 2))
    image = image_rgba.convert("RGB")
    draw = ImageDraw.Draw(image)

    draw.text((88, 278), "STUDENTHUBHELP", font=font(48, True), fill="#ffffff")
    draw.rounded_rectangle((90, 350, 310, 359), radius=4, fill="#f28c28")
    draw.text((88, 388), eyebrow.upper(), font=font(20, True), fill="#f6c58e")

    title_font = font(66 if len(title) < 19 else 54, True)
    draw.text((88, 430), title, font=title_font, fill="#ffffff")
    draw.text((90, 526), services, font=font(20, True), fill="#e8f1ec")
    draw.rounded_rectangle((895, 520, 1095, 570), radius=22, fill="#f28c28")
    draw.text((928, 535), "EXPLORE", font=font(18, True), fill="#173b32")

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)

# Keep the standard site-wide preview for pages outside the city-guide set.
render_card("Student Services Across India", "Discover • Compare • Confirm", "Hostels • PGs • Tiffin • Libraries • Cafes", OUT_PATH)

# City and Student Cities Hub pages receive distinct, title-specific social images.
for slug, (title, eyebrow, services) in CITY_CARDS.items():
    render_card(title, eyebrow, services, CITY_OUT / (slug + ".png"))

print(f"Generated global share preview and {len(CITY_CARDS)} unique city-guide previews.")
