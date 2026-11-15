from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
import math, subprocess, sys, json

W,H,FPS=1920,1080,24
NAVY='#071B2B'; PANEL='#112D40'; TEAL='#48DEC7'; GOLD='#F1B66A'; WHITE='#F5F3EC'; MUTED='#A8BACA'; LINE='#254357'; INK='#122E40'
END_VOICE=164.55; REVEAL=172.55; TOTAL=187.0
OUT=Path('output'); OUT.mkdir(exist_ok=True)
FONT='C:/Windows/Fonts/segoeui.ttf'; BOLD='C:/Windows/Fonts/segoeuib.ttf'
fonts={}
decorations={}
def font(n,b=False):
    key=(n,b)
    if key not in fonts: fonts[key]=ImageFont.truetype(BOLD if b else FONT,n)
    return fonts[key]
def txt(im,xy,s,n=36,c=WHITE,b=False,anchor=None):
    ImageDraw.Draw(im).text(xy,s,font=font(n,b),fill=c,anchor=anchor,spacing=9)
def rr(im,box,fill=PANEL,outline=None,r=24,width=2): ImageDraw.Draw(im).rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=width)
def line(im,pts,c=TEAL,w=4): ImageDraw.Draw(im).line(pts,fill=c,width=w,joint='curve')
def ease(v): return 1-(1-min(1,max(0,v)))**3
def bg(light=False):
    im=Image.new('RGB',(W,H),WHITE if light else NAVY)
    d=ImageDraw.Draw(im)
    for x in range(0,W,80): d.line((x,0,x,H),fill='#E9E9E1' if light else '#0A2031')
    for y in range(0,H,80): d.line((0,y,W,y),fill='#E9E9E1' if light else '#0A2031')
    return im
def header(im,kicker,title,sub=None,light=False):
    c=INK if light else WHITE
    txt(im,(100,110),kicker,25,'#127E79' if light else TEAL,True)
    txt(im,(96,167),title,66,c,True)
    if sub: txt(im,(100,260),sub,30,'#526879' if light else MUTED)
def footer(im,t,section):
    d=ImageDraw.Draw(im); d.rectangle((0,1002,W,H),fill=NAVY)
    txt(im,(100,1020),'DIŞ TİCARET  /  BÖLÜM 02',23,MUTED,True)
    txt(im,(1818,1020),section,23,MUTED,anchor='ra')
    d.rectangle((100,1065,1820,1070),fill=LINE)
    d.rectangle((100,1065,100+1720*t/TOTAL,1070),fill=TEAL)
def icon(kind,size=220,color=TEAL):
    im=Image.new('RGBA',(size,size)); d=ImageDraw.Draw(im)
    def p(x,y): return (int(x*size/200),int(y*size/200))
    def ln(points,w=7): d.line([p(*q) for q in points],fill=color,width=max(2,int(w*size/200)),joint='curve')
    def ell(box,fill=None,w=6): d.ellipse((*p(*box[:2]),*p(*box[2:])),fill=fill,outline=color,width=max(2,int(w*size/200)))
    def rect(box,fill=None,w=6): d.rounded_rectangle((*p(*box[:2]),*p(*box[2:])),radius=10*size/200,fill=fill,outline=color,width=max(2,int(w*size/200)))
    if kind=='gear':
        pts=[]
        for i in range(64):
            a=2*math.pi*i/64; r=78 if i%8 in (0,1,6,7) else 64
            pts.append(p(100+r*math.cos(a),100+r*math.sin(a)))
        d.polygon(pts,fill=color); d.ellipse((*p(54,54),*p(146,146)),fill=(0,0,0,0)); ell((76,76,124,124))
    elif kind=='steel':
        for ox,oy in [(22,45),(60,80),(98,115)]:
            ln([(ox,oy),(ox+60,oy),(ox+60,oy+12),(ox+40,oy+12),(ox+40,oy+34),(ox+60,oy+34),(ox+60,oy+46),(ox,oy+46),(ox,oy+34),(ox+20,oy+34),(ox+20,oy+12),(ox,oy+12),(ox,oy)],5)
    elif kind=='cotton':
        ln([(100,172),(100,90)]); ln([(100,145),(62,125)]); ln([(100,130),(142,109)])
        for x,y,r in [(75,70,27),(107,52,29),(133,78,27),(103,93,27)]:ell((x-r,y-r,x+r,y+r),WHITE)
        ln([(65,121),(49,106),(52,132),(80,140)]);ln([(133,117),(158,95),(153,123),(133,131)])
    elif kind=='horse':
        ln([(35,85),(62,99),(124,99),(135,64),(158,48),(172,63),(162,87),(144,88),(137,130),(62,130),(48,109),(33,125)])
        ln([(67,129),(60,171)]);ln([(90,130),(96,171)]);ln([(123,130),(130,171)]);ln([(139,127),(150,171)]);ln([(152,51),(151,32),(162,48)]);ell((155,61,160,66),color)
    elif kind=='food':
        rect((27,64,94,163)); ln([(36,64),(36,35),(83,35),(83,64)]);ln([(34,99),(86,99)]);ell((119,91,175,164));ln([(44,119),(77,119)])
    elif kind=='rock':
        ln([(30,150),(47,82),(88,40),(142,55),(176,121),(150,164),(30,150)],6);ln([(47,82),(107,99),(88,40)]);ln([(107,99),(142,55)]);ln([(107,99),(150,164)]);ln([(107,99),(30,150)])
    elif kind=='bottle':
        rect((69,20,130,49)); ln([(74,49),(74,74),(54,97),(54,169),(146,169),(146,97),(126,74),(126,49)]);rect((62,111,138,148))
    elif kind=='leaf':
        d.ellipse((*p(34,38),*p(166,160)),outline=color,width=int(size*.04));ln([(48,165),(145,51)]);ln([(79,128),(63,81)]);ln([(105,95),(145,99)])
    elif kind=='bag':
        rect((30,72,170,169));ln([(71,72),(71,43),(129,43),(129,72)]);ln([(58,77),(58,164)]);ln([(142,77),(142,164)])
    elif kind=='shirt':
        ln([(68,35),(35,52),(16,92),(49,109),(58,91),(58,170),(142,170),(142,91),(151,109),(184,92),(165,52),(132,35),(119,57),(81,57),(68,35)])
    elif kind=='pill':
        d.rounded_rectangle((*p(33,67),*p(171,133)),radius=int(size*.16),outline=color,width=int(size*.035));ln([(101,69),(101,131)])
    elif kind=='ship':
        ln([(18,125),(182,125),(159,167),(50,167),(18,125)]);rect((55,64,93,120));rect((99,80,151,121));ln([(73,64),(73,38)]);ln([(20,180),(50,174),(80,180),(110,174),(140,180),(179,174)],4)
    elif kind=='plane':
        d.polygon([p(*q) for q in [(96,18),(106,18),(113,78),(180,124),(180,138),(112,113),(110,158),(133,174),(133,183),(101,174),(70,183),(70,174),(92,158),(91,113),(23,138),(23,124),(89,78)]],fill=color)
    elif kind=='car':
        ln([(27,111),(46,76),(137,76),(163,111),(178,119),(178,149),(23,149),(23,119),(27,111)]);ln([(44,110),(151,110)]);ell((40,133,70,163),PANEL);ell((132,133,162,163),PANEL)
    elif kind=='doc':
        rect((42,23,158,178));ln([(68,64),(132,64)]);ln([(68,88),(132,88)]);ln([(68,112),(115,112)]);ln([(94,141),(108,154),(139,126)])
    elif kind=='box':
        ln([(30,60),(100,27),(173,60),(173,141),(100,180),(30,141),(30,60),(100,96),(173,60)]);ln([(100,96),(100,180)]);ln([(65,43),(137,79),(137,113)])
    return im

def card(w,h,title,kind=None,code=None,sub=None,accent=TEAL,light=False):
    im=Image.new('RGBA',(w,h)); rr(im,(0,0,w-1,h-1),'#FFFFFF' if light else PANEL,'#D8E1E1' if light else LINE)
    d=ImageDraw.Draw(im);d.rounded_rectangle((0,0,8,h-1),radius=4,fill=accent)
    if code:
        txt(im,(30,24),code,92,accent,True)
    if kind:
        sz=150 if code else min(250,h-150)
        ico=icon(kind,sz,accent)
        decorations[id(im)]=(ico,w-sz-22 if code else (w-sz)//2,25 if code else 35,kind)
    txt(im,(30,h-112 if sub else h-88),title,30,INK if light else WHITE,True)
    if sub: txt(im,(30,h-63),sub,22,'#526879' if light else MUTED)
    return im

class Scene:
    def __init__(self,start,end,name,base): self.start=start;self.end=end;self.name=name;self.base=base;self.items=[];self.dynamic=None
    def add(self,img,x,y,at=0,dur=.65,move=45): self.items.append((img,x,y,at,dur,move));return self
    def render(self,t):
        im=self.base.copy(); local=t-self.start
        for obj,x,y,at,dur,move in self.items:
            if local<at:continue
            p=ease((local-at)/dur)
            deco=decorations.get(id(obj))
            if deco:
                ico,ix,iy,kind=deco
                obj=obj.copy()
                if kind=='gear': ico=ico.rotate(-(local-at)*8,resample=Image.Resampling.BICUBIC)
                obj.alpha_composite(ico,(ix,int(iy+5*math.sin((local-at)*1.8))))
            if p<1:
                obj=obj.copy(); obj.putalpha(obj.getchannel('A').point(lambda a:int(a*p)))
            im.paste(obj,(int(x),int(y+move*(1-p))),obj)
        if self.dynamic:self.dynamic(im,local,t)
        footer(im,t,self.name)
        # short fades make scene cuts less abrupt, without muting the narration
        f=min(1,local/.25,(self.end-t)/.18)
        if f<1: im=Image.blend(Image.new('RGB',(W,H),NAVY),im,max(0,f))
        return im

scenes=[]
def scene(a,b,n,base):
    s=Scene(a,b,n,base);scenes.append(s);return s
def photo(name):
    im=ImageOps.fit(Image.open('assets/'+name+'.png').convert('RGB'),(W,H))
    over=Image.new('RGBA',(W,H));d=ImageDraw.Draw(over)
    for x in range(W):
        alpha=int(180*max(0,1-x/1350))
        d.line((x,0,x,H),fill=(7,27,43,alpha))
    return Image.alpha_composite(im.convert('RGBA'),over).convert('RGB')
def label(s,w=600,n=36,c=WHITE,b=True):
    im=Image.new('RGBA',(w,150));txt(im,(0,0),s,n,c,b);return im

im=photo('hero');txt(im,(100,117),'BÖLÜM 02',29,TEAL,True);txt(im,(92,235),'GTİP',148,WHITE,True);txt(im,(100,423),'ve tarife\nmühendisliği',70,WHITE,True)
s=scene(0,7.8,'GİRİŞ',im)
for i,(title,at) in enumerate([('Vergi',4.55),('Belge',5.3),('Teşvik',6.0)]):
    chip=Image.new('RGBA',(220,90));rr(chip,(0,0,219,89),PANEL,TEAL,r=14);txt(chip,(110,44),title,33,WHITE,True,'mm');s.add(chip,100+i*240,750,at)

im=photo('hero');header(im,'BU BÖLÜMDE','Öğrenme rotası')
s=scene(7.8,16.7,'BÖLÜM PLANI',im)
for i,(v,at) in enumerate([('GTİP nedir?',.2),('Doğru ve yanlış sınıflandırma',2.7),('Tarife mühendisliği',4.5),('Tarife eşiği',6.1),('Komşu pozisyon',7.1)]):
    l=Image.new('RGBA',(840,100));rr(l,(0,0,839,99),PANEL,LINE,r=14);txt(l,(30,18),f'0{i+1}',36,TEAL,True);txt(l,(110,20),v,35,WHITE,True);s.add(l,100,340+i*113,at,.5)

im=bg();header(im,'TANIM','Eşyanın ticaretteki kimliği','GTİP  /  Gümrük Tarife İstatistik Pozisyonu')
s=scene(16.7,25.8,'GTİP NEDİR?',im)
s.add(icon('box',310),175,430,.25);s.add(label('EŞYA',400,33,TEAL),230,770,.4)
ident=Image.new('RGBA',(990,370));rr(ident,(0,0,989,369),PANEL,LINE);txt(ident,(45,35),'SINIFLANDIRMA KODU',26,TEAL,True);txt(ident,(45,100),'Bir ürün. Bir tanım.',58,WHITE,True);txt(ident,(45,197),'Uluslararası ticarette\nortak bir sınıflandırma dili.',39,MUTED)
s.add(ident,785,420,1.8)
def arrow_move(im,u,t):
    d=ImageDraw.Draw(im);line(im,[(550,600),(710,600)],TEAL,5);d.polygon([(710,600),(690,588),(690,612)],fill=TEAL)
    x=550+160*((u*.3)%1);d.ellipse((x-7,593,x+7,607),fill=WHITE)
s.dynamic=arrow_move

im=photo('machine');header(im,'STANDART ÖNCESİ','Aynı eşya.\nFarklı yorumlar.')
txt(im,(100,430),'1900’lü yıllar',36,GOLD,True);txt(im,(100,510),'Bir makine parçası,\nfarklı ülkelerde farklı\ndeğerlendirilebiliyordu.',42,WHITE)
scene(25.8,32.5,'NEDEN BİR KOD?',im)

im=bg();header(im,'ANLATIMDAKİ ÖRNEK','Bir parça, iki farklı yorum','Sınıflandırma farkı, ticarette belirsizlik oluşturur.')
s=scene(32.5,45.5,'ORTAK DİL İHTİYACI',im)
s.add(card(620,370,'Motor parçası','gear',sub='Göndericinin tanımı'),100,400,0)
s.add(card(620,370,'“Demir yığını”','steel',sub='Venezuela örneğindeki yorum',accent=GOLD),1200,400,3.3)
def parcel(im,u,t):
    line(im,[(760,565),(1160,565)],TEAL,4)
    x=760+330*((u*.18)%1);ic=icon('box',76,TEAL);im.paste(ic,(int(x),520),ic)
    if u>6:txt(im,(960,853),'Farklı yorumlar  +  farklı vergi oranları',39,GOLD,True,'mm')
s.dynamic=parcel

im=photo('history');header(im,'ORTAK STANDARDA DOĞRU','Ticaret için\nortak bir dil')
txt(im,(100,425),'II. Dünya Savaşı sonrası',32,GOLD,True)
s=scene(45.5,57.1,'STANDARTLAŞMA',im)
for i,(v,at) in enumerate([('Fransa',1.8),('Belçika',3.0),('İngiltere',3.7)]):
    l=Image.new('RGBA',(215,75));rr(l,(0,0,214,74),PANEL,LINE,12);txt(l,(107,37),v,28,WHITE,True,'mm');s.add(l,100+i*232,525,at)
s.add(label('Her eşya için\nortak bir sınıflandırma.',800,47,TEAL),100,688,7.0)

im=bg();header(im,'EŞYA GRUPLARI','Temel ihtiyaçlardan başlayan düzen','Canlı hayvanlar ve gıda ürünleri')
s=scene(57.1,70.8,'ÜRÜN AİLELERİ',im)
s.add(card(750,390,'Canlı hayvanlar','horse',sub='Atlar • Eşekler',accent=TEAL),100,393,.2)
s.add(card(870,390,'Gıda ürünleri','food',sub='Et • Süt • Yoğurt • Yumurta • Yağlar',accent=GOLD),950,393,8.1)
s.add(label('İhtiyaçlar → eşya grupları → ortak kodlar',1500,37,MUTED),100,853,1.0)

im=bg();header(im,'EŞYA GRUPLARI','Doğal kaynaklar ve diğer ürünler')
s=scene(70.8,77.1,'ÜRÜN AİLELERİ',im)
for i,(v,k,at) in enumerate([('Mineral maddeler','rock',0),('Tütün','leaf',2.2),('Alkol ve içecekler','bottle',3.2)]):s.add(card(540,440,v,k,sub='Taşlar ve topraklar' if i==0 else None,accent=TEAL if i!=1 else GOLD),100+i*590,385,at)

im=bg();header(im,'EŞYA GRUPLARI','Sağlık, deri ve tekstil')
s=scene(77.1,84.5,'ÜRÜN AİLELERİ',im)
for i,(v,k,at,sub) in enumerate([('İlaçlar','pill',0,'Sağlık ürünleri'),('Deri eşya','bag',1.2,'Çantalar • Bavullar'),('Tekstil ve giyim','shirt',5.1,'Kumaşlar • Giysiler')]):s.add(card(540,440,v,k,sub=sub,accent=TEAL if i!=1 else GOLD),100+i*590,385,at)

im=bg();header(im,'EŞYA GRUPLARI','Sanayi, teknoloji ve ulaşım')
s=scene(84.5,93.1,'ÜRÜN AİLELERİ',im)
for i,(v,k,at) in enumerate([('Demir ve çelik','steel',0),('Makineler','gear',1.8),('Otomobiller','car',6.0),('Uçaklar','plane',7.0),('Gemiler','ship',7.8)]):
    s.add(card(320,410,v,k,accent=TEAL if i<2 else GOLD),100+i*350,400,at,.4)
s.add(label('Elektrikli makineler ve analiz cihazları',1300,33,MUTED),100,862,3.3)

im=bg(True);header(im,'KODLARI TANIYALIM','İlk iki hane: eşyanın faslı','Her fasıl, belirli bir eşya grubunu ifade eder.',True)
s=scene(93.1,104.4,'FASIL KODLARI',im)
for i,(code,v,k,at,sub) in enumerate([('01','Canlı hayvanlar','horse',4.55,'Hayvanlar'),('84','Makineler','gear',6.2,'Mekanik cihazlar'),('73','Demir veya çelikten','steel',8.0,'eşya'),('52','Pamuk','cotton',10.1,'Pamuk ve pamuklu ürünler')]):
    s.add(card(400,440,v,k,code,sub,accent='#087E80' if i%2==0 else '#A7631D',light=True),100+i*440,390,at,.45)
txt(im,(100,905),'2 haneli fasıl kodu  ≠  6 haneli tam HS kodu',30,'#526879')

im=bg();header(im,'KODUN YAPISI','Genelden ayrıntıya','Her yeni basamak, eşya tanımını daha ayrıntılı hale getirir.')
s=scene(104.4,110.7,'2 → 4 → 6 HANE',im)
for i,(title,sub,at) in enumerate([('2 HANE','Fasıl',0),('4 HANE','Pozisyon',1.8),('6 HANE','Alt pozisyon / HS',3.7)]):
    lay=Image.new('RGBA',(500,330));rr(lay,(0,0,499,329),PANEL,TEAL if i==2 else LINE);txt(lay,(35,35),title,58,TEAL if i==2 else WHITE,True);txt(lay,(35,125),sub,31,MUTED)
    for j in range((i+1)*2):rr(lay,(35+j*66,215,88+j*66,283),TEAL if j<2 else '#286273',r=7)
    s.add(lay,100+i*590,420,at,.55)
    if i<2:txt(im,(650+i*590,550),'→',55,GOLD,True)

im=photo('hero');header(im,'ULUSLARARASI STANDART','Dünya ticaretinin\nortak dili')
txt(im,(100,440),'Dünya Gümrük Örgütü',38,TEAL,True);txt(im,(100,530),'Armonize Sistem\nHarmonized System — HS',38,WHITE)
scene(110.7,118.3,'ORTAK SINIFLANDIRMA',im)

im=bg();header(im,'DÖNÜM NOKTASI','1988',None);txt(im,(101,285),'Armonize Sistem yürürlüğe girdi.',36,MUTED)
s=scene(118.3,127.1,'İLK 6 HANE ORTAK',im)
for i in range(6):
    l=Image.new('RGBA',(175,205));rr(l,(0,0,174,204),PANEL,TEAL,r=15);txt(l,(87,95),'X',88,TEAL,True,'mm');s.add(l,100+i*193,435,.8+i*.11)
s.add(label('İLK 6 HANE ORTAK',1300,44,TEAL),100,699,1.4)
right=Image.new('RGBA',(460,400));rr(right,(0,0,459,399),PANEL,LINE);txt(right,(35,36),'VERGİ ORANI',28,GOLD,True);txt(right,(35,95),'%',130,GOLD,True);txt(right,(35,271),'Ülkelere göre\nbelirlenir.',35,WHITE)
s.add(right,1360,412,5.5)
txt(im,(100,915),'X: Kod yapısını gösteren temsili hane',23,MUTED)

im=bg(True);header(im,'AYNI EŞYA • AYNI İLK 6 HANE','Vergi oranı ülkeye göre değişir','Anlatımdaki temsili karşılaştırma',True)
s=scene(127.1,138.5,'KOD ORTAK, ORAN FARKLI',im)
for i,(country,val,at,c) in enumerate([('TÜRKİYE','%2,3',1.8,'#087E80'),('İTALYA','%1,7',5.3,'#A7631D')]):
    l=Image.new('RGBA',(800,390));rr(l,(0,0,799,389),'#FFFFFF','#D8E1E1');txt(l,(42,35),country,36,INK,True);txt(l,(42,112),val,117,c,True);txt(l,(42,286),'Gümrük vergisi',32,'#526879');s.add(l,100+i*920,405,at,.6)
s.add(label('Numara ortak. Vergi oranı farklı.',1600,42,INK),100,846,8.0)
txt(im,(100,934),'Oranlar yalnızca öğretici örnektir; güncel tarife oranlarını göstermez.',24,'#526879')

im=bg();header(im,'ULUSAL DETAYLAR','Ortak temelin üzerine ek basamaklar','Ülkeler, ilk altı haneden sonra kendi ayrıntılarını ekleyebilir.')
s=scene(138.5,149.2,'KODUN DEVAMI',im)
for i in range(10):
    l=Image.new('RGBA',(133,180));rr(l,(0,0,132,179),PANEL,TEAL if i<6 else GOLD,r=12);txt(l,(66,84),'X',65,TEAL if i<6 else GOLD,True,'mm');s.add(l,100+i*172,430,0 if i<6 else 1.8+(i-6)*.3,.5)
txt(im,(100,665),'ORTAK 6 HANE',33,TEAL,True);txt(im,(1130,665),'ULUSAL DETAY',33,GOLD,True)
s.add(label('Ülkeler arası anlaşmalar → sonraki konularda',1700,36,MUTED),100,829,5.2)
txt(im,(100,931),'Şematik gösterim • Ulusal kod uzunluğu ülkeye göre farklılaşabilir.',24,MUTED)

im=bg();header(im,'SORU 01','Ülkeden ülkeye ne değişir?','Aynı eşyanın ilk altı hanesi ortaktır.')
s=scene(149.2,REVEAL,'BİLGİNİ TEST ET',im)
for i,(v,at) in enumerate([('Eşyanın numarası',7.9),('Eşyaya uygulanan vergi oranı',10.0),('Eşyanın adı',13.0)]):
    l=Image.new('RGBA',(1270,130));rr(l,(0,0,1269,129),PANEL,LINE,r=16);rr(l,(20,21,106,108),'#214357',r=12);txt(l,(63,62),'ABC'[i],42,WHITE,True,'mm');txt(l,(145,37),v,38,WHITE,True);s.add(l,100,390+i*155,at,.4)
def countdown(im,u,t):
    if t>=END_VOICE:
        left=max(0,REVEAL-t);d=ImageDraw.Draw(im);d.ellipse((1500,442,1780,722),outline=LINE,width=12);d.arc((1500,442,1780,722),-90,-90+360*left/8,fill=TEAL,width=12)
        txt(im,(1640,578),str(math.ceil(left)),106,TEAL,True,'mm');txt(im,(1640,785),'Düşünme süresi',28,MUTED,anchor='mm');txt(im,(100,927),'Yanıtınızı seçin. Çözüm birazdan ekranda.',28,TEAL)
    else:
        txt(im,(1640,535),'?',165,TEAL,True,'mm');txt(im,(1640,730),'Sıra sizde',30,MUTED,anchor='mm')
s.dynamic=countdown

im=bg();header(im,'DOĞRU YANIT','B — Eşyaya uygulanan vergi oranı')
s=scene(REVEAL,TOTAL,'YANIT VE AÇIKLAMA',im)
answer=Image.new('RGBA',(1720,200));rr(answer,(0,0,1719,199),'#124B48',TEAL,r=25);line(answer,[(65,100),(95,132),(154,65)],TEAL,12);txt(answer,(205,55),'İlk 6 hane ortaktır.',54,WHITE,True)
s.add(answer,100,365,.1)
s.add(card(810,250,'Ortak olan: sınıflandırma kodu',sub='Eşyanın uluslararası tanımı',accent=TEAL),100,632,2.4)
s.add(card(810,250,'Değişebilen: vergi oranı',sub='Ülkenin uyguladığı tarife',accent=GOLD),1010,632,4.4)
s.add(label('Aklınızda kalsın: Kod ortak, vergi oranı ülkeye bağlı.',1700,33,TEAL),100,932,7.2)

def frame(t):
    for s in scenes:
        if s.start<=t<s.end:return s.render(t)
    return scenes[-1].render(TOTAL-.05)

if '--preview' in sys.argv:
    ts=[5.8,14,21,35,52,68,75,82,92,104.1,109.7,123,136.5,145,168.3,180]
    thumbs=[]
    for i,t in enumerate(ts):
        im=frame(t);im.save(OUT/f'preview_{i:02d}.jpg',quality=92);thumb=im.resize((480,270));thumbs.append(thumb)
    sheet=Image.new('RGB',(1920,1080))
    for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*480,(i//4)*270))
    sheet.save(OUT/'storyboard.jpg',quality=95)
    print('Preview ready',flush=True)
else:
    cmd=['ffmpeg','-y','-v','warning','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'silent.mp4')]
    p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    for i in range(round(TOTAL*FPS)):
        p.stdin.write(frame(i/FPS).tobytes())
        if i%(FPS*10)==0:print(f'Render {i/FPS:.0f}/{TOTAL:.0f} s',flush=True)
    p.stdin.close();result=p.wait()
    if result:raise SystemExit(result)
    print('Video render complete',flush=True)
