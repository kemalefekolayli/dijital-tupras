"""Reproducible narrated motion-graphics lessons. No runtime AI dependency."""
from pathlib import Path
import sys,asyncio,json,subprocess,math,textwrap
sys.path.insert(0,str(Path('vendor').resolve()))
import edge_tts
from PIL import Image,ImageDraw,ImageFont
ROOT=Path('output/academy');ROOT.mkdir(parents=True,exist_ok=True)
ASSETS=Path('platform-app/public/assets')
SCENES=[
('01','İlk gün. İlk fikir. İlk engel.',['Yeni çalışan: Deniz','Görev: Haftalık rapor','Fikir: Tekrarlanan işi otomatikleştir'],
'Deniz, şirkete yeni katılan bir akademi asistanı. Her hafta eğitim katılım tablolarını birleştiriyor. Aynı satırları kopyalıyor, eksikleri kontrol ediyor, sonra raporu gönderiyor. Küçük bir kodla bu işi kolaylaştırabileceğini fark ediyor. Ama terminal kapalı. Geliştirme ortamı yok. Aldığı yanıt kısa: Sen bilgi teknolojilerinde değilsin. Bu temsili hikâyede sorun yalnızca bir aracın kapalı olması mı?'),
('01','Bir fikrin bekleme maliyeti',['Tekrarlanan manuel iş','Geciken geri bildirim','Denemeden öğrenememek'],
'Bütün geliştirme araçlarını departman adına göre kapatmak, işini iyi bilen çalışanların çözüm denemesini zorlaştırabilir. Fikirler sıraya girer. Küçük ihtiyaçlar büyük iş listelerinde bekler. Çalışan, eğitimde öğrendiği şeyi uygulayamaz. Hatta bazı kişiler onaysız araçlara yönelebilir. Bunlar her şirkette kaçınılmaz sonuçlar değil; iyi tasarlanmış bir erişim sürecinin azaltabileceği risklerdir. Akademinin görevi, öğrenme ile uygulama arasındaki bu boşluğu görünür kılmaktır.'),
('01','Yetkiyi unvana değil, işe bağla',['Hangi görev?','Hangi veri?','Hangi risk?'],
'Çözüm, herkese yönetici yetkisi vermek değil. Önce yapılacak işi tanımlamak gerekir. Deniz hangi veriye ihtiyaç duyuyor? Üretim sistemini değiştirecek mi, yoksa örnek bir dosyada mı çalışacak? Müşteri ve çalışan bilgileri var mı? Uygun yetki; görev, veri hassasiyeti ve etkiye göre belirlenir. Böylece şirket hem bilgisini korur hem de çalışanına sorumlu biçimde üretme fırsatı verir.'),
('01','Güvenli bir deneme yolu',['Sentetik örnek veri','Onaylı geliştirme ortamı','Süreli ve sınırlı erişim'],
'Deniz için ilk adım, gerçek çalışan bilgileri içermeyen örnek bir tablo olabilir. Onaylı bir geliştirme ortamında, gerekli araçlarla küçük bir prototip üretir. Erişimin süresi, kapsamı ve sorumlusu bellidir. Şirket verisi kişisel bir yapay zekâ hesabına yüklenmez. Ortamda ne yapıldığı izlenebilir. Bu yaklaşım, güvenliği sonradan eklenen bir engel olmaktan çıkarıp denemenin tasarımına yerleştirir.'),
('01','Low-code mu, kod mu?',['Basit akış → low-code','Özel mantık → kod','Üretim → teknik inceleme'],
'Low code araçlar, standart formlar ve basit onay akışları için çok yararlı olabilir. Ancak her problemi tek bir araca zorlamak da doğru değildir. Özel veri dönüşümleri veya test gerektiren karmaşık kurallar için kod daha uygun olabilir. Araç seçimini işin ihtiyacı belirlesin. Her iki yolda da sahiplik, test, sürüm yönetimi ve bakım sorumluluğu tanımlansın. Prototip ile canlı sistem aynı şey değildir.'),
('01','Akademi + BT + iş birimi',['Akademi: beceri ve rehberlik','BT: ortam ve kontroller','İş birimi: ihtiyaç ve sahiplik'],
'Deniz tek başına bırakılmamalı. Akademi, veri okuryazarlığı ve test etme becerisi kazandırır. Bilgi teknolojileri güvenli ortamı ve yayın kontrolünü sağlar. İş birimi ihtiyacı, başarı ölçütünü ve bakım sahibini belirler. Deniz prototipi gösterir; bir uzman çıktıları kontrol eder. Ancak bu incelemeden sonra, onaylanan kapsamda kullanıma geçilir. Erişim vermek, destek ve sorumluluk vermekle birlikte anlam kazanır.'),
('01','Karar senin',['A · Departman dışı: reddet','B · Kontrolsüz tam erişim','C · Sınırlı, denetlenen pilot'],
'Şimdi sen akademi yöneticisisin. Deniz bu fikri sana getiriyor. Üç seçeneğin var: Departmanı nedeniyle isteği reddetmek. Bütün sistemlere sınırsız erişim vermek. Ya da örnek veri, uygun araç, sorumlu kişi ve teknik inceleme içeren sınırlı bir pilot başlatmak. Hangisi öğrenmeyi gerçek işe taşırken riski de yönetir? Videonun ardından kararını ver; seçiminin sonuçlarını birlikte değerlendireceğiz.'),
('02','Akademinin işi nasıl değişti?',['Sınıf ve eğitim takvimi','Dijital içerik ve erişim','İş üzerinde beceri geliştirme'],
'Kurumsal akademilerin değişimini üç yaklaşım üzerinden düşünelim. Sınıf ve eğitim takvimi odaklı yaklaşım, düzenli bilgi aktarımı sağlar. Dijital içerik ve öğrenme sistemleri, daha geniş kitlelere erişimi kolaylaştırır. İş üzerinde beceri geliştirme yaklaşımı ise öğrenilenin gerçek göreve uygulanmasını öne çıkarır. Bu, bütün şirketlerin aynı yıllarda geçtiği zorunlu bir sıra değildir. Bugün bu yaklaşımlar aynı kurumda birlikte bulunabilir.'),
('02','Tamamlanmadan uygulamaya',['Kaç kişi izledi?','Kim uygulayabildi?','İşte ne değişti?'],
'Bir videonun tamamlanması, öğrenilen becerinin işe geçtiğini tek başına göstermez. Akademi, eğitimden önce hedef davranışı tanımlar. Örneğin raporu doğru biçimde hazırlamak. Eğitimden sonra örnek bir görev, yönetici gözlemi veya çıktı incelemesiyle uygulamayı değerlendirir. Süre ve hata oranı gibi iş göstergeleri takip edilebilir. Ancak değişimi yalnızca eğitime bağlamadan önce iş yükü ve süreç değişiklikleri de dikkate alınır.'),
('02','AI: taslaktan geri bildirime',['İhtiyaçtan senaryo üret','Soruları çeşitlendir','Uzmanla doğrula'],
'Yapay zekâ, akademinin içerik hazırlama işini hızlandırabilecek bir yardımcıdır. Bir uzmanın onayladığı kaynaklardan vaka taslakları oluşturabilir. Aynı kavram için farklı zorlukta sorular önerebilir. Anlatımı farklı roller için uyarlayabilir. Fakat ürettiği bilgi ve cevap anahtarı kendiliğinden doğru sayılmaz. Kaynaklar, önyargılar ve erişilebilirlik kontrol edilir. Son içerik sorumluluğu, eğitim sahibinde ve konu uzmanında kalır.'),
('02','İyi bir görev tarifi',['Hedef davranış + bağlam','Kaynak + veri sınırı','Çıktı + kontrol ölçütü'],
'Örnek bir görev tarifi şöyle olabilir: Yeni akademi çalışanları için, yalnızca bu onaylı süreç metnine dayanan kısa bir erişim talebi vakası hazırla. Gerçek kişi bilgisi kullanma. Üç seçenek üret; her seçeneğin sonucunu açıkla. Kaynakta olmayan noktaları belirsiz olarak işaretle. Sonunda inceleme listesi ver. Bu tarif, yapay zekâdan ne istediğini ve hangi sınırlar içinde çalışacağını açıkça belirtir.'),
('02','Beceri ihtiyacı büyüyor',['59 / 100 çalışan','2030 için eğitim ihtiyacı','İşveren beklentisi; garanti değil'],
'Dünya Ekonomik Forumunun iki bin yirmi beş Geleceğin İşleri raporu, işverenlerin beklentilerine dayanarak, yüz çalışandan elli dokuzunun iki bin otuz yılına kadar beceri geliştirmeye veya yeniden beceri kazanmaya ihtiyaç duyacağını öngörüyor. Bu bir tahmin; her şirket için kesin bir oran değil. Akademi açısından mesaj şu: Yalnızca içerik sayısını artırmak yetmez. Öğrenmeyi öncelikli iş görevlerine bağlamak gerekir.'),
('02','Küçük bir pilot tasarla',['Bir görev seç','Önce ölç, sonra dene','Çıktıyı kontrol et'],
'İlk pilot için tek bir görev seç: örneğin eğitim raporunun hazırlanması. Başlangıçtaki süreyi ve hata türlerini kaydet. Küçük bir grupla, onaylı ortamda yeni yöntemi dene. Aynı kalite ölçütüyle çıktıları incele. Zaman kazancı varsa bunun ek kontrol yüküyle dengelenip dengelenmediğine bak. Sonuç yeterli değilse yöntemi düzelt. Başarılıysa destek, bakım ve yetkilendirme planıyla kapsamı büyüt.'),
('02','Senin 30 günlük denemen',['Somut iş problemi','Sınırları belli erişim','Ölçülebilir sonuç'],
'Şimdi kendi işine dön. Hangi tekrarlanan görevi iyileştirmek istiyorsun? Hangi bilgiye ve araca gerçekten ihtiyacın var? Kim inceleyecek, başarıyı nasıl ölçeceksin? Birazdan kısa bir uygulama planı yazacaksın. Ardından eğitim deneyimini puanlayabilirsin. Bu platformdaki yan rehber, hazır içerikle çalışan bir gösterimdir; bir yapay zekâ servisine bağlı değildir. Öğrenmenin gerçek değeri, yarın atacağın somut adımda ortaya çıkar.')
]
W,H,FPS=1920,1080,24
BG='#091D2A'; FG='#F4F2E9'; TEAL='#58DEC4'; MUTED='#ADC0CC'
F={}
def font(size,bold=False):
 key=(size,bold)
 if key not in F:F[key]=ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if bold else 'segoeui.ttf'),size)
 return F[key]
def wrap(s,size,width):
 words=s.split();lines=[];row=''
 for word in words:
  trial=(row+' '+word).strip()
  if font(size).getlength(trial)>width and row:lines.append(row);row=word
  else:row=trial
 return lines+[row]
def text(im,x,y,s,size=36,color=FG,bold=False,width=1600):
 for line in wrap(s,size,width):ImageDraw.Draw(im).text((x,y),line,font=font(size,bold),fill=color);y+=size*1.3
 return y
def base(i):
 part,title,cards,narr=SCENES[i];im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 for x in range(0,W,96):d.line((x,0,x,H),fill='#102633')
 d.rectangle((90,90,98,248),fill=TEAL)
 text(im,125,85,f'PUSULA / AKADEMİNİN YENİ ROLÜ / {part}',26,TEAL,True)
 text(im,120,147,title,65,FG,True)
 text(im,125,265,'ÖĞREN • DENE • İŞE TAŞI',24,MUTED)
 d.line((125,950,1795,950),fill='#385361',width=2)
 text(im,125,981,'KURUMSAL AKADEMİ  ×  YAPAY ZEKÂ',23,MUTED,True)
 text(im,1630,981,f'{i+1:02d} / {len(SCENES):02d}',24,MUTED)
 if i==11:text(im,125,890,'Kaynak: World Economic Forum · Future of Jobs Report 2025',23,MUTED)
 return im
def frame(i,t,duration):
 im=base_cache[i].copy();d=ImageDraw.Draw(im);cards=SCENES[i][2]
 for j,label in enumerate(cards):
  progress=max(0,min(1,(t-.45*j)/.8));ease=1-(1-progress)**3
  x=125+j*566+int((1-ease)*100);y=400
  if progress<=0:continue
  im.paste(card_cache[i,j],(x,y));d=ImageDraw.Draw(im)
  # Moving signal shows that the elements are part of a live flow.
  px=x+35+int((t*.11+j*.2)%1*450)
  d.line((x+35,y+309,x+485,y+309),fill='#355766',width=3)
  d.ellipse((px-6,y+303,px+6,y+315),fill=TEAL)
  if j<2:d.text((x+537,y+142),'›',font=font(52),fill=TEAL)
 d.rounded_rectangle((125,805,1795,865),radius=14,fill='#102D3B')
 text(im,150,814,'Kontrollü erişim → gerçek uygulama → ölçülebilir gelişim',29,TEAL)
 d.rectangle((125,1045,1795,1052),fill='#355766')
 d.rectangle((125,1045,125+1670*min(t/duration,1),1052),fill=TEAL)
 return im
base_cache={i:base(i) for i in range(len(SCENES))}
def make_card(i,j):
 im=Image.new('RGB',(531,351),BG);d=ImageDraw.Draw(im)
 d.rounded_rectangle((0,0,530,350),radius=26,fill='#163442',outline='#355766',width=2)
 d.ellipse((34,35,114,115),fill=TEAL);d.text((57,42),str(j+1),font=font(44,True),fill=BG)
 text(im,35,150,SCENES[i][2][j],38,FG,True,450)
 # Purpose-built line illustrations: employee, workspace, protection, target.
 kind=(i+j)%4;ox,oy=365,30
 if kind==0:
  d.ellipse((ox+25,oy,ox+75,oy+50),outline=TEAL,width=4)
  d.arc((ox,oy+42,ox+100,oy+125),180,360,fill=TEAL,width=4)
 elif kind==1:
  d.rounded_rectangle((ox-10,oy,ox+110,oy+82),radius=8,outline=TEAL,width=4)
  for k in range(3):d.line((ox+8,oy+18+18*k,ox+85-k*12,oy+18+18*k),fill=TEAL,width=3)
  d.line((ox+50,oy+82,ox+50,oy+100),fill=TEAL,width=4);d.line((ox+20,oy+100,ox+80,oy+100),fill=TEAL,width=4)
 elif kind==2:
  d.arc((ox+20,oy,ox+80,oy+70),180,360,fill=TEAL,width=5)
  d.rounded_rectangle((ox+5,oy+35,ox+95,oy+105),radius=10,outline=TEAL,width=4)
  d.ellipse((ox+43,oy+60,ox+57,oy+74),fill=TEAL);d.line((ox+50,oy+68,ox+50,oy+86),fill=TEAL,width=4)
 else:
  for r in [48,30,10]:d.ellipse((ox+50-r,oy+50-r,ox+50+r,oy+50+r),outline=TEAL,width=3)
  d.line((ox+50,oy+50,ox+110,oy-5),fill=TEAL,width=4)
 return im
card_cache={(i,j):make_card(i,j) for i in range(len(SCENES)) for j in range(3)}
async def voices():
 for i,(_,_,_,narr) in enumerate(SCENES):
  path=ROOT/f'{i:02d}.mp3'
  if not path.exists():
   for attempt in range(3):
    try:await edge_tts.Communicate(narr,'tr-TR-AhmetNeural',rate='-2%').save(str(path));break
    except Exception:
     if attempt==2:raise
     await asyncio.sleep(2)
  print('VOICE',i,flush=True)
def render():
 timings=[]
 for i,scene in enumerate(SCENES):
  audio=ROOT/f'{i:02d}.mp3';duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)]))+.65
  timings.append({'scene':i,'part':scene[0],'duration':duration,'title':scene[1],'narration':scene[3]})
  target=ROOT/f'{i:02d}.mp4'
  if target.exists():continue
  cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(audio),'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-af','apad','-t',str(duration),'-movflags','+faststart',str(target)]
  p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
  for f in range(math.ceil(duration*FPS)):p.stdin.write(frame(i,f/FPS,duration).tobytes())
  p.stdin.close();assert p.wait()==0
  print('RENDER',i,round(duration,1),flush=True)
 for part in ['01','02']:
  listing=ROOT/f'part-{part}.txt';listing.write_text('\n'.join(f"file '{i:02d}.mp4'" for i,s in enumerate(SCENES) if s[0]==part),encoding='utf-8')
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(ASSETS/f'akademi-{part}.mp4')],check=True)
 (ROOT/'timings.json').write_text(json.dumps(timings,ensure_ascii=False,indent=2),encoding='utf-8')
 frame(0,3,30).save(ASSETS/'akademi-poster.jpg',quality=92)
 (ROOT/'transkript.txt').write_text('\n\n'.join(f'{s[1]}\n{s[3]}' for s in SCENES),encoding='utf-8')
if __name__=='__main__':
 if '--preview' in sys.argv:frame(3,3,30).save(ROOT/'preview.jpg')
 else:asyncio.run(voices());render()
