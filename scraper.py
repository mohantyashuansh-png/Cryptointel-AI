import time
import requests
import hashlib
import re
import json
import os
import random
import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# Your local FastAPI Core
API_ENDPOINT = "http://localhost:8000/api/v1/investigate"

async def scrape_target(page, url, seen_hashes, use_tor=False):
    try:
        print(f"\n[+] Scanning target: {url}")
        
        # Navigate to page, wait for domcontentloaded
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # Give JS/Captchas a moment to settle
        await page.wait_for_timeout(2000)
        
        scraped_text = await page.content()

        # If Telegram, extract ONLY the message text to ignore dynamic view counts/timestamps
        if "t.me" in url:
            messages = re.findall(r'<div class="tgme_widget_message_text[^>]*>(.*?)</div>', scraped_text, re.DOTALL)
            if messages:
                # Get only the latest 3 messages to prevent blowing up the LLM token limit
                recent_messages = messages[-3:]
                # Strip internal HTML tags like <br> or <b>
                clean_messages = [re.sub(r'<[^>]+>', ' ', m) for m in recent_messages]
                scraped_text = " ".join(clean_messages)
            else:
                # Fallback if regex fails: strip all HTML and digits so timestamps/view counts don't change the hash
                clean_html = re.sub(r'<[^>]+>', ' ', scraped_text)
                stable_text = re.sub(r'\d+', '', clean_html) # Strip numbers
                scraped_text = stable_text[-2000:]
        else:
            # For surface/dark web, cleanly extract visible innerText instead of raw HTML tags
            try:
                scraped_text = await page.evaluate("document.body.innerText")
            except:
                clean_html = re.sub(r'<[^>]+>', ' ', scraped_text)
                scraped_text = clean_html

        # Hard cap all extractions to prevent massive context window crashes in the LLM
        if len(scraped_text) > 4000:
            scraped_text = scraped_text[:4000]

        # Deduplication
        text_hash = hashlib.sha256(scraped_text.encode('utf-8')).hexdigest()
        if text_hash in seen_hashes:
            print(f"[*] No new changes detected on target. Bypassing AI engine.")
            return
        
        seen_hashes.add(text_hash)
        print(f"[*] Extracted {len(scraped_text)} characters. Sending to CryptoIntel Core...")
        
        # POST the live web data, passing the source_url
        api_res = requests.post(API_ENDPOINT, json={
            "raw_text": scraped_text,
            "source_url": url
        })
        
        if api_res.status_code == 200:
            print("[✓] Intelligence Matrix updated successfully.")
        else:
            print(f"[!] API Error: {api_res.text}")
            
    except Exception as e:
        if use_tor:
            print(f"[!] Tor connection failed or timed out: {e}")
        else:
            print(f"[!] Target unreachable or rate-limited: {e}")

async def run_autonomous_scraper():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("🕵️‍♂️ [SCRAPER] Initializing Playwright stealth autonomous web collection...")
    seen_hashes = set()

    async with async_playwright() as p:
        # Launch two browsers: one standard, one Tor-proxied
        print("[*] Launching stealth browsers...")
        browser_standard = await p.chromium.launch(headless=True)
        browser_tor = await p.chromium.launch(
            headless=True,
            proxy={"server": "socks5://127.0.0.1:9150"}
        )

        while True:
            try:
                with open("targets.json", "r") as f:
                    targets = json.load(f)
            except Exception:
                targets = []

            for target in targets:
                url = target.get("url")
                use_tor = "onion" in target.get("type", "").lower() or ".onion" in url
                
                if not url: continue

                context = await (browser_tor if use_tor else browser_standard).new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" if "wikipedia.org" not in url else "CryptoIntel-OSINT-Bot/1.0"
                )
                page = await context.new_page()
                
                # Apply stealth ONLY to surface web non-wikipedia sites to defeat Cloudflare
                if not use_tor and "wikipedia.org" not in url:
                    await Stealth().apply_stealth_async(page)
                
                await scrape_target(page, url, seen_hashes, use_tor=use_tor)
                await context.close()

            print("[*] Sleeping 15 seconds to avoid rate limits...")
            await asyncio.sleep(15)

if __name__ == "__main__":
    asyncio.run(run_autonomous_scraper())
