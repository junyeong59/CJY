from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "musicnow-invite-og.png"
W, H = 1200, 630

FONT_LATIN = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def draw_centered_text(draw, text, font_obj, y, fill="#000000"):
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    x = (W - (bbox[2] - bbox[0])) / 2
    draw.text((x, y), text, font=font_obj, fill=fill)


def draw_music_logo(draw, y):
    parts = [
        ("Music ", "#000000"),
        ("N", "#ff0004"),
        ("o", "#ffc925"),
        ("w", "#2ac3ff"),
    ]
    logo_font = font(FONT_LATIN, 64)
    widths = [draw.textlength(text, font=logo_font) for text, _ in parts]
    x = (W - sum(widths)) / 2
    for (text, fill), width in zip(parts, widths):
        draw.text((x, y), text, font=logo_font, fill=fill)
        x += width


def main():
    image = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(image)

    draw_music_logo(draw, 86)
    draw_centered_text(draw, "당신의 음악력을 공유해보세요", font(FONT_KR, 92, index=6), 208)

    cx, cy, radius = W // 2, 451, 68
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill="#2778f6")
    draw.line((cx - 32, cy, cx + 30, cy), fill="#ffffff", width=11)
    draw.line((cx + 4, cy - 33, cx + 36, cy), fill="#ffffff", width=11)
    draw.line((cx + 4, cy + 33, cx + 36, cy), fill="#ffffff", width=11)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
