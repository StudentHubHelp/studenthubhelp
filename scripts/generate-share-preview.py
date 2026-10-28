from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LOGO_PATH = ROOT / "logo.png"
OUT_PATH = ROOT / "share-preview.png"
W, H = 1200, 630

# Premium StudentHubHelp social card. The actual repository logo.png is placed
# prominently in the card, while the 1200x630 canvas is optimized for link previews.
base = Image.new("RGB", (W, H), "#fff8fa")
pixels = base.load()
left = (255, 250, 251)
right = (248, 235, 241)
for x in range(W):
    t = x / (W - 1)
    col = tuple(round(left[i] * (1 - t) + right[i] * t) for i in range(3))
    for y in range(H):
        pixels[x, y] = col

draw = ImageDraw.Draw(base)
# Premium navy panel with warm pink accent.
draw.rounded_rectangle((32, 32, W - 32, H - 32), radius=34, fill="#071a33")
draw.rounded_rectangle((32, 32, 50, H - 32), radius=9, fill="#e88ba5")
draw.ellipse((900, -180, 1330, 250), fill="#152c4b")
draw.ellipse((1010, 400, 1290, 680), fill="#102642")
draw.rounded_rectangle((88, 88, 246, 246), radius=34, fill="#ffffff", outline="#f2c6d2", width=3)

logo = Image.open(LOGO_PATH).convert("RGBA")
# Keep the full original logo visible; the white tile provides a clean premium contrast.
logo.thumbnail((122, 122), Image.Resampling.LANCZOS)
lx = 167 - logo.width // 2
ly = 167 - logo.height // 2
base_rgba = base.convert("RGBA")
base_rgba.alpha_composite(logo, (lx, ly))
base = base_rgba.convert("RGB")
draw = ImageDraw.Draw(base)

def font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

draw.text((88, 286), "STUDENTHUBHELP", font=font(54, True), fill="#ffffff", stroke_width=0)
draw.rounded_rectangle((90, 365, 340, 372), radius=4, fill="#e88ba5")
draw.text((88, 397), "Discover. Verify. Decide Confidently.", font=font(27, True), fill="#f6cbd7")
draw.text((88, 454), "Hostels  •  PGs  •  Tiffin  •  Libraries", font=font(22), fill="#e8edf5")
draw.text((88, 492), "Cafes  •  Bookstores  •  Student Services", font=font(22), fill="#e8edf5")
draw.rounded_rectangle((88, 548, 430, 590), radius=18, fill="#e88ba5")
draw.text((110, 558), "STUDENT SERVICES ACROSS INDIA", font=font(14, True), fill="#071a33")

base.save(OUT_PATH, format="PNG", optimize=True)
print(f"Generated {OUT_PATH} ({W}x{H}) using {LOGO_PATH.name}")
