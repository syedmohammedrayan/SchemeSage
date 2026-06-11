from deep_translator import GoogleTranslator

def translate_to_english(text: str) -> str:
    if not text or not text.strip():
        return text
    try:
        translated = GoogleTranslator(source='auto', target='en').translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"Translation error: {e}")
        # Never crash, return original text on failure
        return text
