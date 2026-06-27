import requests
import time

API = "http://localhost:8000/api/v1/investigate"

SEEDS = [
    {
        "raw_text": "OFAC Sanctioned. Wallet 12QtD5BFwRsdNsAZY76UVE1xyCGNTojH9h linked to Hydra Market operators (Russian darknet narcotics marketplace). Alias: HydraAdmin. Email: admin@hydra-market.ru. Location: Moscow, Russia. Seized in April 2022 joint US-German operation.",
        "source_url": "https://www.treasury.gov/ofac/hydra-market-2022"
    },
    {
        "raw_text": "OFAC Lazarus Group. Address 1LQoWist8KkaUXSPKZHNvEyfrEkPHzSsCd used in Ronin Bridge hack. $625M stolen. Linked to North Korean state actors. APT38. Terror Financing via crypto laundering through Tornado Cash.",
        "source_url": "https://www.treasury.gov/ofac/lazarus-group"
    },
    {
        "raw_text": "Tornado Cash smart contract 0x7F367cC41522cE07553e823bf3be79A889debe1B sanctioned by OFAC August 2022. Used to launder over $7 billion in virtual currency. Linked to Lazarus Group money laundering operations.",
        "source_url": "https://www.treasury.gov/ofac/tornado-cash"
    },
    {
        "raw_text": "TRX wallet TNVoq598cXth1FCZpMRkGQMHqNBsSJBKjg identified in ransomware payment trail. Suspect alias: CryptoGhost_RU. Phone: +7 (495) 000-0000. Bank: Sberbank routed. Estimated location: Saint Petersburg, Russia.",
        "source_url": "https://www.cisa.gov/ransomware-advisory-2023"
    },
    {
        "raw_text": "Darknet forum post: User DarkBazaar99 selling 500g cocaine, payment only in Monero or BTC. Wallet 3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5. Contact Telegram: @DarkBazaar99. Verified vendor since 2021. Ships from Netherlands.",
        "source_url": "https://t.me/darkbazaar99"
    },
    {
        "raw_text": "Terror financing alert: ETH address 0x8576aCC5C05D6Ce88f4e49bf65BdF0C62F91353 linked to fundraising campaign for extremist group. Multiple small donations aggregated. Cross-referenced with FinCEN suspicious activity reports.",
        "source_url": "https://www.fincen.gov/terror-financing-alerts"
    },
    {
        "raw_text": "Cryptojacking operation traced to wallet bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh. Botnet operator alias: ShadowMiner_KP. Estimated 15,000 infected machines. Location clue: Korean Won referenced, UTC+9 timezone in logs.",
        "source_url": "https://pastebin.com/shadowminer-leak"
    },
]

for i, seed in enumerate(SEEDS):
    print(f"[{i+1}/{len(SEEDS)}] Seeding: {seed['source_url']}")
    try:
        res = requests.post(API, json=seed)
        print(f"  Status: {res.status_code}")
    except Exception as e:
        print(f"  Error: {e}")
    time.sleep(2)  # Give backend time to process

print("[SUCCESS] Seeding complete! Your graph is now populated.")
