import os
import json
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "mock-gemini-key")
genai.configure(api_key=GEMINI_API_KEY)

# Use standard requests, but for a real production scenario, use Playwright or ScrapingBee
def fetch_url(url: str) -> str:
    try:
        # We can still use the Scrape.do proxy for reliability as a fallback
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Clean HTML slightly before returning
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove noisy tags
        for script in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            script.decompose()
            
        return soup.get_text(separator=' ', strip=True)
    except Exception as e:
        print(f"Error fetching URL {url}: {e}")
        return ""

def extract_schemes_with_ai(raw_text: str, source_url: str) -> list:
    if not raw_text or len(raw_text) < 100:
        return []

    # Truncate to avoid exceeding token limits (rough approximation)
    raw_text = raw_text[:15000]

    prompt = f"""
    You are an AI trained to extract government and NGO welfare schemes from webpage text.
    Extract any and all schemes found in the following text.
    
    For each scheme, return a JSON object strictly matching this schema:
    {{
        "name": "Scheme Name",
        "description": "A detailed description",
        "benefits": "What are the financial or social benefits",
        "eligibility": "Text describing who is eligible (age, income, category)",
        "documents": "List of required documents as a comma separated string",
        "officialLink": "{source_url}",
        "ministry": "The offering ministry, state, or organization"
    }}
    
    Respond ONLY with a JSON array of these objects. If none are found, return [].
    
    --- Text ---
    {raw_text}
    """

    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean potential markdown wrapping
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        schemes = json.loads(response_text)
        return schemes
    except Exception as e:
        print(f"AI Extraction failed: {e}")
        return []

def run_scraper(url: str):
    print(f"Starting scrape for {url}")
    raw_text = fetch_url(url)
    schemes = extract_schemes_with_ai(raw_text, url)
    print(f"Extracted {len(schemes)} schemes via AI.")
    return schemes
