import os
import re
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
from fastapi.responses import FileResponse
from typing import List
import hashlib

app = FastAPI()

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "outputs"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

class GenerateRequest(BaseModel):
    text: str
    voice: str = "vi-VN-HoaiMyNeural"
    rate: str = "+5%"
    pitch: str = "+0Hz"

class MergeRequest(BaseModel):
    filenames: List[str]

# Helpers for parsing and converting
def clean(line: str) -> str:
    line = re.sub(r'^#{1,6}\s+', '', line)
    line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
    line = re.sub(r'\*(.*?)\*',     r'\1', line)
    line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', line)
    line = re.sub(r'^---+$', '', line)
    # Strip emojis
    line = re.sub(r'[\U0001F300-\U0001FFFF\U00002600-\U000027BF\U0001F000-\U0001FAFF]', '', line)
    # Strip variation selectors and zero-width spaces which break SSML
    line = line.replace('\uFE0F', '').replace('\u200B', '')
    return line.strip()

_vowels = [
    'a', 'ai', 'ao', 'au', 'ay', 'am', 'an', 'ang', 'anh', 'ap', 'at', 'ac', 'ach',
    'e', 'eo', 'em', 'en', 'eng', 'ep', 'et', 'ec',
    'i', 'ia', 'ieu', 'iu', 'im', 'in', 'inh', 'ip', 'it', 'ic', 'ich',
    'o', 'oa', 'oac', 'oai', 'oan', 'oang', 'oanh', 'oao', 'oap', 'oat', 'oay', 'oc', 'oe', 'oeo', 'oi', 'om', 'on', 'ong', 'oo', 'ooc', 'oong', 'op', 'ot',
    'u', 'ua', 'uan', 'uang', 'uat', 'uay', 'uc', 'ue', 'ui', 'um', 'un', 'ung', 'uo', 'uoc', 'uoi', 'uom', 'uon', 'uong', 'uop', 'uot',
    'uy', 'uya', 'uych', 'uyen', 'uyet', 'uynh', 'uyp', 'uyu',
    'y', 'ye', 'yem', 'yen', 'yeng', 'yeu'
]
_initials = ['b', 'c', 'ch', 'd', 'đ', 'g', 'gh', 'h', 'k', 'kh', 'l', 'm', 'n', 'ng', 'ngh', 'nh', 'p', 'ph', 'qu', 'r', 's', 't', 'th', 'tr', 'v', 'x', '']
_valid_syllables = set(i + v for i in _initials for v in _vowels)
_valid_syllables.update(['gi', 'gia', 'giai', 'giao', 'giay', 'giam', 'gian', 'giang', 'giap', 'giat', 'giac', 'gie', 'gieo', 'giem', 'gien', 'giep', 'giet', 'giec', 'gio', 'gioi', 'giom', 'gion', 'giong', 'giop', 'giot', 'gioc', 'giu', 'giua', 'giui', 'gium', 'giun', 'giung', 'giup', 'giut', 'giuc'])

def is_english_word(w: str) -> bool:
    if not w.isascii() or not w.isalpha(): return False
    if w.isupper() and len(w) >= 2: return True
    w = w.lower()
    eng_overlaps = {'mac', 'pro', 'ban', 'van', 'ram', 'rom', 'host', 'post', 'can', 'men', 'man', 'fan', 'pan', 'pin', 'pen', 'tin', 'top', 'hot', 'set', 'win', 'box', 'log'}
    if w in eng_overlaps: return True
    if w not in _valid_syllables: return True
    return False

def fix_pronunciation(text: str) -> str:
    text = re.sub(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b', r'ngày \1 tháng \2 năm \3', text)
    text = re.sub(r'\bđô-la\b', 'đô la', text, flags=re.IGNORECASE)
    
    tokens = re.findall(r'\w+|\W+', text)
    result = []
    in_eng = False
    
    for token in tokens:
        if re.match(r'^\w+$', token):
            if is_english_word(token):
                if not in_eng:
                    result.append('<lang xml:lang="en-US">')
                    in_eng = True
                result.append(token)
            else:
                if in_eng:
                    result.append('</lang>')
                    in_eng = False
                result.append(token)
        else:
            if in_eng:
                if token.isspace() or token in ['-', '\'']:
                    result.append(token)
                else:
                    result.append('</lang>')
                    in_eng = False
                    result.append(token)
            else:
                result.append(token)
                
    if in_eng:
        result.append('</lang>')
        
    return "".join(result)

def process_text(raw_text: str) -> str:
    lines = raw_text.split('\n')
    parts = []
    for line in lines:
        line = clean(line)
        if not line or line.startswith('http') or re.match(r'^-+$', line):
            continue
        line = fix_pronunciation(line)
        m = re.match(r'^\[([^\]]+)\]$', line)
        if m:
            continue
        parts.append(line)
    return " ".join(parts)

@app.post("/api/generate")
async def generate_audio(req: GenerateRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    final_text = process_text(req.text)
    if not final_text.strip():
        raise HTTPException(status_code=400, detail="Text contains no valid words after cleaning")

    hash_input = f"{final_text}|{req.voice}|{req.rate}|{req.pitch}"
    text_hash = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
    output_filename = f"audio_{text_hash}.mp3"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    if os.path.exists(output_path):
        return {"audioUrl": f"/api/audio/{output_filename}"}

    try:
        communicate = edge_tts.Communicate(final_text, req.voice, rate=req.rate, pitch=req.pitch)
        await communicate.save(output_path)
    except Exception as e:
        print(f"TTS ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"audioUrl": f"/api/audio/{output_filename}"}

@app.post("/api/preview")
async def preview_voice(req: GenerateRequest):
    """Generate a short preview sample for a voice."""
    sample_text = "Xin chào, đây là giọng đọc mẫu của tôi."
    hash_input = f"preview|{req.voice}|{req.rate}|{req.pitch}"
    text_hash = hashlib.md5(hash_input.encode('utf-8')).hexdigest()
    output_filename = f"preview_{text_hash}.mp3"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    if os.path.exists(output_path):
        return {"audioUrl": f"/api/audio/{output_filename}"}

    try:
        communicate = edge_tts.Communicate(sample_text, req.voice, rate=req.rate, pitch=req.pitch)
        await communicate.save(output_path)
    except Exception as e:
        print(f"TTS PREVIEW ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"audioUrl": f"/api/audio/{output_filename}"}

class MergeWithBgmRequest(BaseModel):
    filenames: List[str]
    bgm: str = ""  # background music filename (empty = no bgm)
    bgm_volume: int = -20  # dB relative to voice

@app.post("/api/merge")
async def merge_audio(req: MergeWithBgmRequest):
    """Merge multiple audio files into a single MP3, optionally with background music."""
    from pydub import AudioSegment

    if not req.filenames:
        raise HTTPException(status_code=400, detail="No files to merge")

    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=500)

    for i, fname in enumerate(req.filenames):
        file_path = os.path.join(OUTPUT_DIR, fname)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {fname}")
        segment = AudioSegment.from_mp3(file_path)
        if i > 0:
            combined += silence
        combined += segment

    # Mix with background music if specified
    if req.bgm:
        bgm_path = os.path.join(BGM_DIR, req.bgm)
        if os.path.exists(bgm_path):
            bgm = AudioSegment.from_mp3(bgm_path)
            # Loop BGM to match voice length
            voice_len = len(combined)
            if len(bgm) < voice_len:
                loops_needed = (voice_len // len(bgm)) + 1
                bgm = bgm * loops_needed
            bgm = bgm[:voice_len]
            bgm = bgm.apply_gain(req.bgm_volume)
            bgm = bgm.fade_in(2000).fade_out(3000)
            combined = combined.overlay(bgm)

    merged_hash = hashlib.md5(("|".join(req.filenames) + req.bgm + str(req.bgm_volume)).encode('utf-8')).hexdigest()
    merged_filename = f"merged_{merged_hash}.mp3"
    merged_path = os.path.join(OUTPUT_DIR, merged_filename)
    combined.export(merged_path, format="mp3")

    return {"audioUrl": f"/api/audio/{merged_filename}"}

BGM_DIR = "bgm"
if not os.path.exists(BGM_DIR):
    os.makedirs(BGM_DIR)

@app.get("/api/bgm/list")
async def list_bgm():
    """List available background music templates."""
    bgm_files = []
    if os.path.exists(BGM_DIR):
        for f in sorted(os.listdir(BGM_DIR)):
            if f.endswith('.mp3'):
                bgm_files.append(f)
    return {"files": bgm_files}

@app.get("/api/bgm/{filename}")
async def get_bgm(filename: str):
    file_path = os.path.join(BGM_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="BGM file not found")
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)

@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

