import {validateAdvanced,evaluateAdvanced} from './advanced.js';
import { check,text } from './errors.js';
export const TYPES=['video','micro','choice','open','boolean','match','compare','scenario','survey','assessment','sheet'];
export function validateCourse(input,{publish=false}={}){
  check(input&&typeof input==='object','Eğitim içeriği gerekli.');
  const c={title:text(input.title,140,1),description:text(input.description||'',2000),category:text(input.category||'Genel',80,1),duration:text(input.duration||'15 dk',40),skills:[],blocks:[],start:input.start};
  check(Array.isArray(input.skills)&&input.skills.length<=20,'En fazla 20 yetkinlik eklenebilir.');c.skills=input.skills.map(x=>text(x,80,1));
  check(Array.isArray(input.blocks)&&input.blocks.length>0&&input.blocks.length<=100,'Eğitim 1–100 blok içermeli.');
  const ids=new Set();
  for(const raw of input.blocks){
    check(typeof raw.id==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(raw.id)&&!ids.has(raw.id),'Blok kimlikleri benzersiz olmalı.');ids.add(raw.id);
    check(TYPES.includes(raw.type),'Bilinmeyen blok türü.');
    const b={id:raw.id,type:raw.type,title:text(raw.title,140,1),module:text(raw.module||'Modül 1',100,1),body:text(raw.body||'',10000),next:raw.next||null,wrong:raw.wrong||null};
    for(const key of ['next','wrong'])check(b[key]===null||typeof b[key]==='string','Geçiş kimliği geçersiz.');
    if(b.type==='video'){b.url=text(raw.url||'/assets/egitim.mp4',1000,1);check(/^\/(assets|uploads)\/[a-zA-Z0-9_.\/-]+\.(mp4|webm)$/.test(b.url)&&!b.url.includes('..'),'Video için yerel MP4 veya WebM dosyası kullanın.');}
    if(['choice','scenario','boolean'].includes(b.type)){
      const opts=b.type==='boolean'?[{id:'true',text:'Doğru'},{id:'false',text:'Yanlış'}]:raw.options;
      check(Array.isArray(opts)&&opts.length>=2&&opts.length<=8,'2–8 seçenek ekleyin.');
      b.options=opts.map(o=>({id:text(o.id,40,1),text:text(o.text,500,1)}));check(new Set(b.options.map(o=>o.id)).size===b.options.length,'Seçenek kimlikleri benzersiz olmalı.');
      b.answer=raw.answer;check(b.options.some(o=>o.id===b.answer),'Doğru seçeneği belirleyin.');
      b.correctFeedback=text(raw.correctFeedback||'Doğru! Bir sonraki adıma geçebilirsiniz.',2000);b.wrongFeedback=text(raw.wrongFeedback||'Yanıtınızı tekrar gözden geçirin.',2000);
    }
    if(b.type==='match'){check(Array.isArray(raw.pairs)&&raw.pairs.length>=2&&raw.pairs.length<=10,'2–10 eşleştirme çifti ekleyin.');b.pairs=raw.pairs.map(p=>({left:text(p.left,200,1),right:text(p.right,200,1)}));check(new Set(b.pairs.map(p=>p.left)).size===b.pairs.length&&new Set(b.pairs.map(p=>p.right)).size===b.pairs.length,'Eşleştirme değerleri benzersiz olmalı.');}
    if(b.type==='video'&&raw.poster){b.poster=text(raw.poster,200,1);check(/^\/assets\/[a-zA-Z0-9_-]+\.(png|jpg)$/.test(b.poster),'Geçersiz poster yolu.');}
    if(b.type==='survey')b.questions=['Eğitimden genel olarak memnunum.','İçeriği işimde kullanabilirim.','Örnekler ve anlatım anlaşılırdı.'];
    if(b.type==='open'){b.rubric=text(raw.rubric||'Kavramın doğru ve örnekle açıklanması.',3000);b.minLength=Number(raw.minLength??20);check(Number.isInteger(b.minLength)&&b.minLength>=1&&b.minLength<=1000,'En az karakter sayısı 1–1000 olmalı.');}
    if(b.type==='compare'){check(Array.isArray(raw.columns)&&raw.columns.length===2,'İki karşılaştırma sütunu gerekli.');b.columns=raw.columns.map(x=>({title:text(x.title,100,1),body:text(x.body,3000,1)}));}
    validateAdvanced(raw,b);
    c.blocks.push(b);
  }
  check(ids.has(c.start),'Başlangıç bloğunu seçin.');
  for(const b of c.blocks)for(const target of [b.next,b.wrong,b.skipTarget||null])check(target===null||ids.has(target),'Bir bağlantı silinmiş veya bulunmayan bir bloğa gidiyor.');
  if(publish){
    for(const b of c.blocks.filter(x=>x.type==='assessment')){check(b.skipTarget&&b.next,'Ön test için normal ve atlama hedefi gerekli.');let cur=b.next;const visited=new Set();while(cur!==b.skipTarget){check(cur&&!visited.has(cur),'Ön test atlama yolu geçersiz.');visited.add(cur);const item=c.blocks.find(x=>x.id===cur);check(item&&item.module===b.module,'Atlama yalnızca aynı modülün adımlarını geçebilir.');cur=item.next;}}

    // Correct-answer edges must terminate. Remediation edges can return to an earlier block.
    for(const b of c.blocks){const seen=new Set();let cur=b;while(cur){check(!seen.has(cur.id),'Doğru/sonraki geçişlerde bitmeyen döngü var.');seen.add(cur.id);cur=c.blocks.find(x=>x.id===cur.next);}}
    const reachable=new Set(),visit=id=>{if(!id||reachable.has(id))return;reachable.add(id);const b=c.blocks.find(x=>x.id===id);visit(b.next);visit(b.wrong);visit(b.skipTarget)};visit(c.start);
    check(reachable.size===c.blocks.length,'Başlangıçtan ulaşılamayan bloklar var. Bağlantıları tamamlayın.');
  }
  return c;
}
export function studentContent(c){return {...c,blocks:c.blocks.map(raw=>{const b={...raw};delete b.answer;delete b.correctFeedback;delete b.wrongFeedback;delete b.rubric;if(b.questions&&b.type==='assessment')b.questions=b.questions.map(({answer,explanation,...q})=>q);if(b.tasks)b.tasks=b.tasks.map(({solutions,...t})=>t);if(b.pairs){b.left=b.pairs.map(p=>p.left);b.right=b.pairs.map(p=>p.right).sort((a,z)=>a.localeCompare(z,'tr'));delete b.pairs;}return b;})};}
export function evaluate(block,answer){
  const advanced=evaluateAdvanced(block,answer);if(advanced)return advanced;
  if(block.type==='survey'){check(answer&&typeof answer==='object'&&!Array.isArray(answer),'Anketi doldurun.');check(Array.isArray(answer.ratings)&&answer.ratings.length===3&&answer.ratings.every(n=>Number.isInteger(n)&&n>=1&&n<=5),'Her ifade için 1–5 arasında bir puan seçin.');text(answer.comment||'',2000);return {status:'passed',feedback:'Geri bildiriminiz kaydedildi. Teşekkürler! Puanlarınız başarı değerlendirmesine dahil edilmez.'};}
  if(['choice','boolean','scenario'].includes(block.type)){check(typeof answer==='string'&&block.options.some(o=>o.id===answer),'Seçeneklerden birini seçin.');const pass=answer===block.answer;return {status:pass?'passed':'incorrect',feedback:pass?block.correctFeedback:block.wrongFeedback};}
  if(block.type==='match'){check(answer&&typeof answer==='object'&&!Array.isArray(answer),'Eşleştirmeleri tamamlayın.');check(block.pairs.every(p=>typeof answer[p.left]==='string'&&block.pairs.some(x=>x.right===answer[p.left])),'Her satır için geçerli bir eşleştirme seçin.');const count=block.pairs.filter(p=>answer[p.left]===p.right).length;return {status:count===block.pairs.length?'passed':'incorrect',feedback:`${count}/${block.pairs.length} doğru eşleştirme.`};}
  if(block.type==='open'){text(answer,5000,block.minLength);return {status:'pending',feedback:'Yanıtınız kaydedildi ve eğitmen incelemesine gönderildi. Sonraki adıma geçebilirsiniz.'};}
  check(answer===true,'Adımı tamamladığınızı onaylayın.');return {status:'passed',feedback:'Adım tamamlandı.'};
}
