import spacy
import re
from datetime import datetime, timedelta

# NLP модель
nlp = spacy.load("en_core_web_md")

VALID_CURRENCIES = {
    "USD", "EUR", "UAH", "RON", "GBP", "PLN", "JPY", "CHF", "CAD", "AUD"
}

# supported languages for translation
SUPPORTED_LANGUAGES = {
    "ukrainian": "uk",
    "ukranian": "uk",
    "ukr": "uk",
    "french": "fr",
    "korean": "ko"
}

# intent detection
def detect_intent(text: str):
    text_lower = text.lower()

 
    weather_keywords = [
        "weather", "weahter", "temperature", "temp", "hot", "cold", "forecast", "тепло", "холодно"
    ]

    if any(word in text_lower for word in weather_keywords):
        return "weather"

   
    currency_keywords = ["usd", "eur", "uah", "ron", "gbp", "pln", "jpy", "chf", "cad", "aud"]
    if any(word in text_lower for word in currency_keywords):
        return "currency"
    
    reminder_keywords = ["remind", "reminder", "remember", "alert", "notify"]
    if any(word in text_lower for word in reminder_keywords):
        return "reminder"

    translate_keywords = ["translate", "translation", "trans"]
    if any(word in text_lower for word in translate_keywords):
        return "translate"

    return "unknown"

# тільки для погоди
def extract_city(text: str):
    doc = nlp(text)

    #  через spaCy
    for ent in doc.ents:
        if ent.label_ == "GPE":
            return ent.text

    match = re.search(r"в\s+([а-яіїєґa-z\s]+)", text.lower())
    if match:
        return match.group(1).strip()

    return None

# тільки для валют
def extract_currency(text: str):
    text_lower = text.lower()

  
    match = re.search(r"([a-z]{3})\s+(?:to|in)\s+([a-z]{3})", text_lower)
    if match:
        from_curr, to_curr = match.group(1).upper(), match.group(2).upper()
        if from_curr in VALID_CURRENCIES and to_curr in VALID_CURRENCIES:
            return from_curr, to_curr

    
    matches = re.findall(r"\b([a-zA-Z]{3})\b", text)
    currencies = [m.upper() for m in matches if m.upper() in VALID_CURRENCIES]

    if len(currencies) >= 2:
        return currencies[0], currencies[1]

    return None, None

def extract_reminder(text: str):
    text_lower = text.lower()

    # tomorrow
    if "tomorrow" in text_lower:
        date = datetime.now() + timedelta(days=1)
    else:
        date = datetime.now()

    # time (9:00, 14:30)
    time_match = re.search(r"(\d{1,2}):(\d{2})", text)
    if not time_match:
        return None

    hour = int(time_match.group(1))
    minute = int(time_match.group(2))

    reminder_datetime = date.replace(hour=hour, minute=minute, second=0, microsecond=0)

    # text after "about" or "to"
    text_match = re.search(r"(?:about|to)\s+(.+)", text_lower)
    reminder_text = text_match.group(1) if text_match else "Reminder"

    return {
        "datetime": reminder_datetime.isoformat(),
        "text": reminder_text
    }

def extract_translation_details(text: str):
    text_lower = text.lower()
    
    # 1. Спробуємо знайти мову
    target_lang = None
    lang_code = None
    for lang, code in SUPPORTED_LANGUAGES.items():
        if lang in text_lower:
            target_lang = lang
            lang_code = code
            break
            
    if not target_lang:
        return None

    
    word_match = re.search(r"(?:word|text):\s*(.+)", text, re.IGNORECASE)
    if word_match:
        translate_text = word_match.group(1).strip()
    else:
       
        translate_text = text.replace(target_lang, "").replace("translate", "").replace("in", "").replace("to", "").strip()
        translate_text = re.sub(r'\s+', ' ', translate_text).strip()

    return {
        "target_language": target_lang,
        "language_code": lang_code,
        "text": translate_text
    }

#  основна функція
def process_text(text: str):
    intent = detect_intent(text)

    if intent == "weather":
        city = extract_city(text)
        return {
            "intent": intent,
            "city": city
        }

    if intent == "currency":
        from_curr, to_curr = extract_currency(text)
        return {
            "intent": intent,
            "from": from_curr,
            "to": to_curr
        }
    
    if intent == "reminder":
        reminder = extract_reminder(text)
        return {
            "intent": intent,
            "reminder": reminder
        }

    if intent == "translate":
        translation = extract_translation_details(text)
        return {
            "intent": intent,
            "translation": translation
        }

    return {
        "intent": "unknown"
    }

