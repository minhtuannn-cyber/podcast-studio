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

def fix_pronunciation(text: str) -> str:
    # Fix dates
    text = re.sub(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b', r'ngày \1 tháng \2 năm \3', text)
    # Fix some specific acronyms that we DO want in Vietnamese 
    # (Optional: đô-la -> đô la)
    text = re.sub(r'\bđô-la\b', 'đô la', text, flags=re.IGNORECASE)
    
    # We rely on the native Edge-TTS multi-lingual models to correctly pronounce English words.
    # Do NOT insert SSML tags because edge-tts escapes < and > by default, causing them to be read aloud.
    return text

def improve_prosody(text: str) -> str:
    """Improves natural pacing by adding punctuation for TTS to breathe."""
    text = text.strip()
    if not text:
        return text
    
    # Force a period at the end if there's no punctuation, allowing the TTS to drop pitch naturally
    if text[-1] not in '.!?\"\'':
        text += '.'
        
    # Heuristic for long sentences: Add commas before certain conjunctions to create natural pauses
    conjunctions = ['nhưng', 'và', 'mà', 'hoặc', 'nên', 'cho nên', 'bởi vì', 'tuy nhiên', 'do đó', 'mặc dù']
    
    sentences = re.split(r'(?<=[.!?]) +', text)
    processed_sentences = []
    
    for s in sentences:
        words = s.split()
        if len(words) > 12: # Threshold for a "long" sentence
            for conj in conjunctions:
                # Add comma if not already preceded by one
                pattern = r'(?<![,.!?])\s+\b' + conj + r'\b'
                s = re.sub(pattern, f', {conj}', s)
        processed_sentences.append(s)
        
    text = ' '.join(processed_sentences)
    
    # Handle ellipses and dashes to force a thoughtful pause
    text = re.sub(r'\s*-\s*', ' - ', text)
    
    return text

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
        
    joined_text = " ".join(parts)
    return improve_prosody(joined_text)

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

