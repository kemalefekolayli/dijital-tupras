import {check,text} from './errors.js';
import {cellValue} from '../public/js/sheet-engine.js';
export function validateAdvanced(raw,b){
 if(b.type==='assessment'){
  check(Array.isArray(raw.questions)&&raw.questions.length>=1&&raw.questions.length<=20,'1–20 soru gerekli.');
  b.questions=raw.questions.map((q,i)=>{check(Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=5,'Soruda 2–5 seçenek gerekli.');const options=q.options.map((o,j)=>({id:String(j),text:text(typeof o==='string'?o:o.text,500,1)}));check(Number.isInteger(Number(q.answer))&&Number(q.answer)>=0&&Number(q.answer)<options.length,'Doğru yanıt geçersiz.');return {id:String(i),prompt:text(q.prompt,1000,1),options,answer:String(q.answer),explanation:text(q.explanation||'',1500)};});
  b.passScore=Number(raw.passScore);check(Number.isInteger(b.passScore)&&b.passScore>=1&&b.passScore<=b.questions.length,'Geçiş eşiği geçersiz.');b.skipTarget=raw.skipTarget?text(raw.skipTarget,60,1):null;
 }
 if(b.type==='sheet'){
  check(raw.cells&&typeof raw.cells==='object'&&!Array.isArray(raw.cells)&&Object.keys(raw.cells).length<=100,'Hücre tablosu gerekli.');b.cells={};
  for(const [a,v]of Object.entries(raw.cells)){check(/^[A-F][1-9]\d?$/.test(a),'Hücre adresi geçersiz.');b.cells[a]=text(String(v),500);}
  check(Array.isArray(raw.tasks)&&raw.tasks.length>=1&&raw.tasks.length<=8,'1–8 hücre görevi gerekli.');
  b.tasks=raw.tasks.map(t=>{check(/^[A-F][1-9]\d?$/.test(t.cell),'Görev hücresi geçersiz.');check(Array.isArray(t.solutions)&&t.solutions.length>=1&&t.solutions.length<=10,'Örnek doğru formüller gerekli.');return {cell:t.cell,label:text(t.label,500,1),hint:text(t.hint||'',1000),solutions:t.solutions.map(s=>text(s,500,1))};});
  check(new Set(b.tasks.map(t=>t.cell)).size===b.tasks.length,'Görev hücreleri benzersiz olmalı.');
  for(const t of b.tasks){b.cells[t.cell]='';try{cellValue({...b.cells,[t.cell]:t.solutions[0]},t.cell);}catch{check(false,'Örnek çözüm desteklenen bir formül olmalı.');}}
 }
 if(b.type==='scenario'&&raw.context){b.context={role:text(raw.context.role,100,1),message:text(raw.context.message,1200,1),sender:text(raw.context.sender,100,1)};}
 if(b.type==='video'&&raw.checkpoints){check(Array.isArray(raw.checkpoints)&&raw.checkpoints.length<=5,'En fazla 5 video karar noktası.');b.checkpoints=raw.checkpoints.map(x=>{check(Number.isFinite(x.time)&&x.time>0,'Karar zamanı geçersiz.');check(Array.isArray(x.options)&&x.options.length>=2&&x.options.length<=4,'Karar seçenekleri gerekli.');return {time:x.time,prompt:text(x.prompt,1000,1),options:x.options.map(o=>({text:text(o.text,500,1),outcome:text(o.outcome,1500,1)}))};});}
}
export function evaluateAdvanced(b,answer){
 if(b.type==='assessment'){
  check(answer&&typeof answer==='object'&&!Array.isArray(answer),'Test yanıtları gerekli.');
  const details=b.questions.map(q=>{check(q.options.some(o=>o.id===answer[q.id]),'Tüm soruları yanıtlayın.');return {id:q.id,correct:answer[q.id]===q.answer,explanation:q.explanation};});const score=details.filter(x=>x.correct).length;
  return {status:'passed',score,total:b.questions.length,canSkip:score>=b.passScore,details,feedback:`${score}/${b.questions.length} doğru. ${score>=b.passScore?'Modülü atlayabilir veya uygulamaları yine de yapabilirsin.':'Bu modülün anlatımı ve uygulamalarıyla devam edelim.'}`};
 }
 if(b.type==='sheet'){
  check(answer&&typeof answer==='object'&&!Array.isArray(answer),'Hücre yanıtları gerekli.');let passed=0;const details=[];
  for(const task of b.tasks){const input=text(answer[task.cell],500,1);let ok=false,value,error;
   try{check(input.startsWith('='),'Hücreye = ile başlayan bir formül yaz.');const cells={...b.cells,...Object.fromEntries(b.tasks.map(t=>[t.cell,answer[t.cell]||'']))};value=cellValue(cells,task.cell);
    const normalized=s=>s.toUpperCase().replace(/\s/g,'').replaceAll('$','').replaceAll(',',';').replaceAll('SUM(','TOPLA(').replaceAll('AVERAGE(','ORTALAMA(').replaceAll('COUNTIF(','EĞERSAY(').replaceAll('IF(','EĞER(');
    ok=task.solutions.some(s=>normalized(s)===normalized(input));
    if(!ok)error='Sonuç tek başına yeterli değil. Görevde istenen başvuruları ve işlevi kullan; ipucunu incele.';
   }catch(e){error=e.message;}
   if(ok)passed++;details.push({cell:task.cell,correct:ok,value,error});
  }
  return {status:passed===b.tasks.length?'passed':'incorrect',details,feedback:`${passed}/${b.tasks.length} hücre doğru. ${passed===b.tasks.length?'Formüller kaydedildi.':'İşaretlenen hücreleri düzeltip yeniden deneyebilirsin.'}`};
 }
}
