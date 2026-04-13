import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

DUYGU_SECENEKLERI = "isyan, huzur, karamsarlik, coskun, melankoli, ofke, kaygi, umut"

@app.post("/analiz")
async def analiz_et(payload: dict):
    metin = payload.get("metin", "")
    if not metin.strip():
        return {"hata": "Metin boş."}

    prompt = f"""
Sen bir 'Duygu Arkeoloğu'sun. Aşağıdaki metni iki aşamada analiz et ve SADECE JSON döndür, başka hiçbir şey yazma.

DUYGU SEÇENEKLERİ (sadece bunlardan birini kullan): {DUYGU_SECENEKLERI}

AŞAMA 1 — Metnin bütününe bak. Baskın duyguyu ve kısa felsefi bir özet cümle bul.
AŞAMA 2 — Metni cümlelere böl. Her cümle için duygu, momentum (0.1-1.0), eğim (-60 ile 60 arası), orijinal cümle metni ve neden o duyguyu seçtiğine dair tek cümlelik kısa açıklama belirle.

ŞABLON (bunu aynen kullan, başka alan ekleme):
{{
  "baskin": "isyan",
  "ozet": "Sistemin dayattığı sınırlara karşı derin bir başkaldırı.",
  "cumleler": [
    {{"duygu": "isyan", "momentum": 0.8, "egim": 40, "cumle": "Sistem sayısal adamı sever.", "neden": "Sistemin seçici ödüllendirmesine karşı doğrudan başkaldırı tonu taşıyor."}},
    {{"duygu": "melankoli", "momentum": 0.5, "egim": -20, "cumle": "Hakikat bir nehirdir.", "neden": "Ölçülemez ve kayıp hissi içeren imgelem melankoli işaret ediyor."}}
  ]
}}

METİN:
\"\"\"{metin}\"\"\"
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        raw = completion.choices[0].message.content
        clean_raw = raw.replace("```json", "").replace("```", "").strip()
        veri = json.loads(clean_raw)
        return veri

    except json.JSONDecodeError:
        return {"hata": "JSON parse hatası, LLM kurallara uymadı.", "ham": raw}
    except Exception as e:
        return {"hata": str(e)}