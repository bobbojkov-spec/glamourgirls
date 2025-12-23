import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import hashlib

BASE_URL = "https://slingshotsports.com"
OUTPUT_DIR = "slingshot_images"
VISITED_PAGES = set()
DOWNLOADED_IMAGES = set()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ImageCollector/1.0)"
}

os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_filename(url):
    parsed = urlparse(url)
    name = os.path.basename(parsed.path)
    if not name:
        name = hashlib.md5(url.encode()).hexdigest() + ".jpg"
    return name.split("?")[0]


def save_image(img_url):
    if img_url in DOWNLOADED_IMAGES:
        return

    try:
        r = requests.get(img_url, headers=HEADERS, timeout=10)
        if r.status_code == 200 and "image" in r.headers.get("Content-Type", ""):
            filename = clean_filename(img_url)
            path = os.path.join(OUTPUT_DIR, filename)

            with open(path, "wb") as f:
                f.write(r.content)

            DOWNLOADED_IMAGES.add(img_url)
            print(f"✓ Saved {filename}")
    except Exception as e:
        print(f"✗ Failed {img_url} | {e}")


def extract_images(soup, page_url):
    # <img> tags
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if src:
            save_image(urljoin(page_url, src))

    # background images in inline styles
    for tag in soup.find_all(style=True):
        style = tag["style"]
        if "background-image" in style:
            start = style.find("url(") + 4
            end = style.find(")", start)
            bg_url = style[start:end].strip("'\"")
            save_image(urljoin(page_url, bg_url))


def crawl(url, depth=0, max_depth=3):
    if url in VISITED_PAGES or depth > max_depth:
        return

    VISITED_PAGES.add(url)
    print(f"\n🔍 Crawling: {url}")

    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return

        soup = BeautifulSoup(r.text, "html.parser")

        extract_images(soup, url)

        # Follow internal links
        for a in soup.find_all("a", href=True):
            link = urljoin(url, a["href"])
            if BASE_URL in link:
                crawl(link, depth + 1)

    except Exception as e:
        print(f"✗ Error crawling {url}: {e}")


if __name__ == "__main__":
    crawl(BASE_URL)
    print(f"\n✅ Done. Downloaded {len(DOWNLOADED_IMAGES)} images.")