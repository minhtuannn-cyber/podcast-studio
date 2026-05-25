"""
Generate simple royalty-free background music templates using pydub synthesis.
Each template is a 60-second loop saved as MP3.
"""
import os
import math
import struct
import wave
import tempfile
from pydub import AudioSegment
from pydub.generators import Sine, WhiteNoise

OUTPUT_DIR = "bgm"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_chord(freqs, duration_ms=2000, volume=-20):
    """Mix multiple sine waves into a chord."""
    combined = None
    for freq in freqs:
        tone = Sine(freq).to_audio_segment(duration=duration_ms).apply_gain(volume)
        if combined is None:
            combined = tone
        else:
            combined = combined.overlay(tone)
    return combined

def fade_loop(segment, fade_ms=500):
    return segment.fade_in(fade_ms).fade_out(fade_ms)

def generate_ambient_calm():
    """Soft ambient pad - peaceful, meditative."""
    print("Generating: Ambient Calm...")
    # C major 7th chord progression
    chords = [
        [261.63, 329.63, 392.00, 493.88],  # Cmaj7
        [293.66, 369.99, 440.00, 523.25],  # Dm7 -> F
        [349.23, 440.00, 523.25, 659.25],  # Fmaj7
        [392.00, 493.88, 587.33, 739.99],  # G7
    ]
    track = AudioSegment.silent(duration=0)
    for _ in range(4):  # 4 repetitions = ~32 seconds per chord
        for chord_freqs in chords:
            pad = make_chord(chord_freqs, duration_ms=4000, volume=-26)
            pad = pad.fade_in(800).fade_out(800)
            track += pad
    # Add gentle white noise layer
    noise = WhiteNoise().to_audio_segment(duration=len(track)).low_pass_filter(800).apply_gain(-38)
    track = track.overlay(noise)
    track = track[:60000]  # 60 seconds
    track = track.fade_in(1000).fade_out(2000)
    track.export(os.path.join(OUTPUT_DIR, "ambient_calm.mp3"), format="mp3")
    print("  -> Done: ambient_calm.mp3")

def generate_lofi_chill():
    """Lo-fi chill beat - warm, relaxing."""
    print("Generating: Lo-fi Chill...")
    # Warm jazz chords
    chords = [
        [220.00, 277.18, 329.63, 415.30],  # Am7
        [196.00, 246.94, 293.66, 369.99],  # G6
        [174.61, 220.00, 261.63, 329.63],  # Fmaj7
        [164.81, 207.65, 261.63, 311.13],  # Em7
    ]
    track = AudioSegment.silent(duration=0)
    for _ in range(5):
        for chord_freqs in chords:
            pad = make_chord(chord_freqs, duration_ms=3000, volume=-24)
            pad = pad.low_pass_filter(2000)
            pad = pad.fade_in(600).fade_out(600)
            track += pad
    # Add filtered noise for vinyl effect
    noise = WhiteNoise().to_audio_segment(duration=len(track))
    noise = noise.low_pass_filter(400).high_pass_filter(100).apply_gain(-42)
    track = track.overlay(noise)
    track = track[:60000]
    track = track.fade_in(1000).fade_out(2000)
    track.export(os.path.join(OUTPUT_DIR, "lofi_chill.mp3"), format="mp3")
    print("  -> Done: lofi_chill.mp3")

def generate_news_professional():
    """Professional news/broadcast style - clean, authoritative."""
    print("Generating: News Professional...")
    # Bright, confident chords
    chords = [
        [293.66, 369.99, 440.00],  # D major
        [329.63, 415.30, 493.88],  # E major
        [349.23, 440.00, 523.25],  # F major
        [293.66, 369.99, 440.00],  # D major
    ]
    track = AudioSegment.silent(duration=0)
    for _ in range(5):
        for chord_freqs in chords:
            pad = make_chord(chord_freqs, duration_ms=3000, volume=-28)
            pad = pad.fade_in(500).fade_out(500)
            track += pad
    track = track[:60000]
    track = track.fade_in(800).fade_out(2000)
    track.export(os.path.join(OUTPUT_DIR, "news_professional.mp3"), format="mp3")
    print("  -> Done: news_professional.mp3")

def generate_upbeat_energy():
    """Upbeat energetic - for dynamic content, reviews."""
    print("Generating: Upbeat Energy...")
    chords = [
        [329.63, 415.30, 493.88, 622.25],  # E major 7
        [440.00, 554.37, 659.25, 830.61],  # A major 7
        [493.88, 622.25, 739.99, 932.33],  # B major 7
        [440.00, 554.37, 659.25, 830.61],  # A major 7
    ]
    track = AudioSegment.silent(duration=0)
    for _ in range(6):
        for chord_freqs in chords:
            pad = make_chord(chord_freqs, duration_ms=2500, volume=-25)
            pad = pad.fade_in(400).fade_out(400)
            track += pad
    track = track[:60000]
    track = track.fade_in(500).fade_out(2000)
    track.export(os.path.join(OUTPUT_DIR, "upbeat_energy.mp3"), format="mp3")
    print("  -> Done: upbeat_energy.mp3")

def generate_storytelling():
    """Gentle storytelling - for audiobooks, stories."""
    print("Generating: Storytelling...")
    # Minor key, gentle and mysterious
    chords = [
        [220.00, 261.63, 329.63],  # Am
        [196.00, 246.94, 293.66],  # G
        [174.61, 220.00, 261.63],  # F
        [164.81, 196.00, 246.94],  # Em
    ]
    track = AudioSegment.silent(duration=0)
    for _ in range(5):
        for chord_freqs in chords:
            pad = make_chord(chord_freqs, duration_ms=3000, volume=-30)
            pad = pad.low_pass_filter(1500)
            pad = pad.fade_in(1000).fade_out(1000)
            track += pad
    noise = WhiteNoise().to_audio_segment(duration=len(track)).low_pass_filter(500).apply_gain(-44)
    track = track.overlay(noise)
    track = track[:60000]
    track = track.fade_in(1500).fade_out(2500)
    track.export(os.path.join(OUTPUT_DIR, "storytelling.mp3"), format="mp3")
    print("  -> Done: storytelling.mp3")

if __name__ == "__main__":
    print("=== Generating Background Music Templates ===")
    generate_ambient_calm()
    generate_lofi_chill()
    generate_news_professional()
    generate_upbeat_energy()
    generate_storytelling()
    print("\n✅ All templates generated in ./bgm/")
