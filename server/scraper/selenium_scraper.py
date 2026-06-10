import sys
import json
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def scrape_schemes():
    driver = None
    try:
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)

        driver.get("https://www.myscheme.gov.in/search")
        time.sleep(5)

        # Look for links that might be schemes
        links = driver.find_elements(By.TAG_NAME, "a")
        
        found_links = []
        for link in links:
            try:
                title = link.text.strip()
                href = link.get_attribute("href")
                if title and href and ("scheme" in title.lower() or "mission" in title.lower() or "yojana" in title.lower()):
                    found_links.append((title, href))
            except:
                continue

        schemes = []
        # Limit to 5 for speed and stability in proof-of-concept
        for title, href in found_links[:10]:
            try:
                driver.get(href)
                time.sleep(3)

                paragraphs = driver.find_elements(By.TAG_NAME, "p")
                description = " ".join([p.text.strip() for p in paragraphs[:3] if p.text.strip()])
                
                if not description or len(description) < 20:
                    # Try to find a div with content if paragraphs are empty
                    content_areas = driver.find_elements(By.CSS_SELECTOR, ".field-item, .content, #content")
                    if content_areas:
                        description = content_areas[0].text[:500].strip()

                schemes.append({
                    "name": title,
                    "description": description or "Details available on official portal.",
                    "benefits": "Financial assistance and social security benefits as per scheme guidelines.",
                    "eligibility": "Refer to official documentation for age and income criteria.",
                    "documents": "Aadhar Card, Residence Proof, Income Certificate",
                    "officialLink": href,
                    "source": "india.gov.in",
                    "category": "social-welfare"
                })

            except Exception as e:
                print(f"Error scraping {href}: {str(e)}", file=sys.stderr)
                continue

        return schemes

    except Exception as e:
        print(f"CRITICAL SCRAPER ERROR: {str(e)}", file=sys.stderr)
        return []
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

if __name__ == "__main__":
    try:
        data = scrape_schemes()
        print(json.dumps(data))
    except Exception as e:
        print(f"FATAL ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
