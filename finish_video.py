from pathlib import Path
import json, wave, math, subprocess
import numpy as np

text_segments=[
'Bölüm iki: GTİP ve tarife mühendisliği. Doğru GTİP; vergiyi, belgeyi ve teşviki birlikte belirler.',
'Bu bölümde sırayla GTİP nedir, doğru ve yanlış sınıflandırma, tarife mühendisliği, tarife eşiği ve komşu pozisyonu göreceğiz.',
'Peki GTİP nedir? Gümrük Tarife İstatistik Pozisyonu, bir eşyanın numarasıdır. Dünya üzerinde her eşyaya, her nesneye bir numara verildi.',
'Bu numara neden ortaya çıktı? 1900’lü yıllarda bir makine parçasını her ülke farklı değerlendiriyordu.',
'Diyelim ki bir motor parçasını Venezuela’ya gönderiyorsunuz. Venezuela onu demir yığını olarak algılıyordu.',
'Üstelik Venezuela’nın vergi oranlarıyla bizim vergi oranlarımız arasında hiçbir bağ yoktu. Her şey farklı anlaşılıyordu.',
'İkinci Dünya Savaşı’ndan sonra Fransa, Belçika ve İngiltere gibi ülkeler bir araya geldi.',
'Ticaret süreçlerini tam bir standart haline getirmek için her eşyaya bir numara vermeye karar verdiler.',
'Numara vermeye, insanların o dönemde en çok ihtiyaç duyduğu şeylerden başladılar.',
'Hayvanlardan, atlardan, eşeklerden. Sonra yiyeceklere geçtiler: et, süt, yoğurt, yumurta ve bunlardan çıkan yağlar.',
'Ardından mineral maddeler, tütün, alkol, içecekler, taşlar ve topraklar geldi.',
'Sonra ilaçlar, hayvanlardan elde edilen deri eşyalar, çantalar, bavullar, tekstil ve giyim.',
'Sonra demir çelik, demir çelikten yapılan makineler, elektrikli makineler, analiz cihazları, arabalar, uçaklar, gemiler.',
'Her eşyaya altı haneli bir numara verdiler. Böyle düşünebilirsiniz: 01 hayvanlar, 84 makineler, 73 demir çelik eşya, 52 pamuk.',
'Sonra bunları detaylandırdılar; her grubun altına daha ince ayrımlar ekleyerek altı haneye çıkardılar.',
'Tabii dünyada sadece bizim bir gümrük tarifemiz yok. Dünya Gümrük Örgütü üyesi ülkeler bu standardı kullanma kararı aldı.',
'1988’de ilk altı hane ortak oldu. Herkes bunun altına imza attı ve her ülke o eşya için kendi vergi oranını yerleştirdi.',
'Mesela aynı eşyada Türkiye’de %2,3 gümrük vergisi varsa, İtalya’da %1,7 olabilir.',
'Yani numara ortak, vergi oranı ülkeye göre değişiyor.',
'Sonra ülkeler altı hanenin ötesine, kendi detay basamaklarına geçti.',
'Ülkeler arasındaki anlaşmalar da bu dönemde oluşmaya başladı. Bu anlaşmalara daha sonra geleceğiz.',
'Soru bir. Aynı eşya için dünyada ilk altı hane ortaktır. Peki ülkeden ülkeye ne değişir?',
'A: Eşyanın numarası. B: Eşyaya uygulanan vergi oranı. C: Eşyanın adı.'
]
raw=json.loads(Path('assets/transcription.json').read_text(encoding='utf8'))
assert len(raw)==len(text_segments)
def stamp(t):
    n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
cues=[]
for seg,text in zip(raw,text_segments):
    words=text.split();lines=[];cur=''
    for word in words:
        if len(cur)+len(word)+1>47:lines.append(cur);cur=word
        else:cur=(cur+' '+word).strip()
    if cur:lines.append(cur)
    chunks=['\n'.join(lines[i:i+2]) for i in range(0,len(lines),2)]
    a=seg['start'];b=min(164.55,seg['end']);total=sum(len(c) for c in chunks)
    for c in chunks:
        end=a+(b-seg['start'])*len(c)/total
        cues.append((a,end,c));a=end
cues.extend([(172.8,176.9,'Doğru cevap B.\nEşyaya uygulanan vergi oranı.'),(176.9,181.1,'Aynı eşyanın ilk altı hanesi ortaktır.'),(181.1,185.4,'Vergi oranı ise ülkeye göre değişebilir.')])
Path('output/GTIP_Egitim_TR.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{c}' for i,(a,b,c) in enumerate(cues))+'\n',encoding='utf8')

# Original, quiet cue sounds: no copyrighted music or external sound assets.
sr=48000;N=round(187*sr);sound=np.zeros(N,dtype=np.float32)
def tone(at,freq,duration,amp):
    t=np.arange(round(duration*sr))/sr
    wavelet=np.sin(2*np.pi*freq*t)*np.exp(-t*12)*np.minimum(1,t/.01)*amp
    off=round(at*sr);sound[off:off+len(t)]+=wavelet.astype(np.float32)
for at in [97.66,99.34,101.2,103.26]:tone(at,650,.35,.026)
for i in range(8):tone(164.55+i,550 if i<5 else 720,.15,.032)
for k,f in enumerate([523.25,659.25,783.99]):tone(172.55+k*.12,f,.75,.052)
with wave.open('assets/cues.wav','wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(sr);f.writeframes((sound*32767).astype(np.int16).tobytes())
cmd=['ffmpeg','-y','-v','warning','-i','assets/narration.wav','-i','assets/answer.mp3','-i','assets/cues.wav','-filter_complex',
'[0:a]atrim=end=164.55,asetpts=PTS-STARTPTS,afade=t=out:st=164.48:d=0.07,loudnorm=I=-18:TP=-1.5:LRA=9,apad=whole_dur=187[a];[1:a]loudnorm=I=-18:TP=-1.5:LRA=9,adelay=172800:all=1[b];[a][b][2:a]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.95,atrim=end=187[out]',
'-map','[out]','-ar','48000','-ac','2','assets/final_audio.wav']
subprocess.run(cmd,check=True)
print('Audio and subtitles ready',flush=True)
