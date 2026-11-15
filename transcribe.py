import sys, os, json
from pathlib import Path
sys.path.insert(0, str(Path('vendor').resolve()))
os.environ['HF_HUB_DISABLE_XET']='1'
from faster_whisper import WhisperModel
model=WhisperModel('base',device='cpu',compute_type='int8',download_root='models',cpu_threads=6)
import wave, numpy as np
with wave.open('assets/narration16.wav','rb') as wav:
    audio=np.frombuffer(wav.readframes(wav.getnframes()),dtype=np.int16).astype(np.float32)/32768
segments,info=model.transcribe(audio,language='tr',beam_size=5,word_timestamps=True,initial_prompt='GTİP, Gümrük Tarife İstatistik Pozisyonu. Tarife mühendisliği. Venezuela, Dünya Gümrük Örgütü.')
out=[]
for s in segments:
    d={'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'word':w.word} for w in s.words]}
    out.append(d)
    print(f'{s.start:.2f} - {s.end:.2f}: {s.text}',flush=True)
Path('assets/transcription.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
