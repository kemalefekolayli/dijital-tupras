import {esc,lines} from './ui.js';
import {cellValue} from './sheet-engine.js';
export function advancedActivity(b,p){
 if(b.type==='assessment')return `<div class="exam-banner"><strong>${b.questions.length} soruluk bilgi kontrolü</strong><span>Geçiş: ${b.passScore}/${b.questions.length} · Süre sınırı yok</span><p>Sonuçta modülü atlama veya pratik yapma seçimini sen yapacaksın.</p></div><div class="exam-counter" aria-live="polite">0 / ${b.questions.length} yanıtlandı</div>${b.questions.map((q,i)=>`<fieldset class="exam-question"><legend><span>${i+1}</span> ${esc(q.prompt)}</legend>${q.options.map(o=>`<label class="option"><input type="radio" name="question-${q.id}" value="${o.id}" ${p?.answer?.[q.id]===o.id?'checked':''} required><span>${esc(o.text)}</span></label>`).join('')}</fieldset>`).join('')}`;
 if(b.type==='sheet'){
  const rows=Math.max(...Object.keys(b.cells).map(a=>Number(a.slice(1))),...b.tasks.map(t=>Number(t.cell.slice(1))));const cols=Math.max(...Object.keys(b.cells).map(a=>a.charCodeAt(0)-64),...b.tasks.map(t=>t.cell.charCodeAt(0)-64));
  return `<div class="sheet-workspace"><div class="sheet-ribbon"><strong>▦ İş laboratuvarı</strong><span>Dosya &nbsp; Giriş &nbsp; Formüller</span></div><div class="formula-bar"><strong id="active-cell">fx</strong><span id="formula-preview">Yeşil hücreyi seç ve formül yaz</span></div><div class="table-scroll"><table class="sheet-grid"><thead><tr><th></th>${Array.from({length:cols},(_,i)=>`<th>${String.fromCharCode(65+i)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:rows},(_,i)=>`<tr><th>${i+1}</th>${Array.from({length:cols},(_,j)=>{const a=String.fromCharCode(65+j)+(i+1),task=b.tasks.find(t=>t.cell===a);return `<td class="${task?'editable':''}">${task?`<input aria-label="${a} formülü" name="cell-${a}" data-cell="${a}" value="${esc(p?.answer?.[a]||'')}" placeholder="=…" maxlength="500" autocomplete="off"><output data-value="${a}">—</output>`:esc(b.cells[a]??'')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div><div class="sheet-tab">● Eğitim verisi <span>Demo çalışma sayfası</span></div></div><button type="button" id="calculate-sheet">ƒx Hesapla</button><div class="sheet-tasks">${b.tasks.map(t=>`<div><strong>${t.cell}</strong> ${esc(t.label)}<details><summary>İpucu</summary><p>${esc(t.hint)}</p></details></div>`).join('')}</div>`;
 }
 return null;
}
export function bindAdvanced(b){
 if(b.type==='assessment'){const update=()=>{document.querySelector('.exam-counter').textContent=`${document.querySelectorAll('.exam-question input:checked').length} / ${b.questions.length} yanıtlandı`;};document.querySelectorAll('.exam-question input').forEach(x=>x.onchange=update);update();}
 if(b.type==='sheet'){
  const inputs=[...document.querySelectorAll('[data-cell]')];
  const calc=()=>{const cells={...b.cells,...Object.fromEntries(inputs.map(x=>[x.dataset.cell,x.value]))};for(const x of inputs){const o=document.querySelector(`[data-value="${x.dataset.cell}"]`);try{o.textContent=x.value?String(cellValue(cells,x.dataset.cell)):'—';o.className='';}catch(e){o.textContent=e.message;o.className='cell-error';}}};
  for(const x of inputs){x.onfocus=x.oninput=()=>{document.querySelector('#active-cell').textContent=x.dataset.cell;document.querySelector('#formula-preview').textContent=x.value||'Formül = ile başlar';};x.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();calc();}};}
  document.querySelector('#calculate-sheet').onclick=calc;calc();
 }
}
export function resultDetails(b,result){
 if(b.type==='assessment')return `<div class="exam-score"><strong>${result.score}<small> / ${result.total}</small></strong><span>${result.canSkip?'Modülü atlama hakkı kazandın':'Uygulamayla pekiştirelim'}</span></div><details><summary>Soru bazında geri bildirim</summary>${result.details.map((x,i)=>`<p>${x.correct?'✓':'↻'} Soru ${i+1}: ${esc(x.explanation)}</p>`).join('')}</details>${result.canSkip?'<button type="button" id="skip-module" class="primary">Bu modülü atla →</button>':''}`;
 if(b.type==='sheet')return `<ul>${result.details.map(x=>`<li>${x.correct?'✓':'↻'} <strong>${x.cell}</strong>: ${x.correct?'Doğru':esc(x.error||'Formülü kontrol et')}${x.value!==undefined?` · Hesaplanan: ${esc(x.value)}`:''}</li>`).join('')}</ul>`;
 return '';
}
const moments={
 '/assets/akademi-01.mp4':[{time:106,prompt:'Deniz’in ilk prototipine hangi veriyi verirsin?',options:[{text:'Gerçek çalışan tablosu',outcome:'İzin ve veri sınırı belirlenmeden gerçek veri kullanmak riski artırır. İlk prototipte sentetik veriyi düşün.'},{text:'Sentetik örnek tablo',outcome:'İş mantığını gerçek kişi verisi taşımadan test edebilirsin. Sonraki adım onaylı ortam ve inceleme.'}]}],
 '/assets/akademi-02.mp4':[{time:69,prompt:'Eğitimin işe yaradığını hangi kanıtla araştırırsın?',options:[{text:'Yalnızca izlenme sayısı',outcome:'İzlenme erişimi gösterir. Becerinin işe taşındığını görmek için görev çıktısını da incele.'},{text:'Örnek görev ve kalite kontrolü',outcome:'Hedef davranışı gözleyebilirsin. Sonuçları yorumlarken iş yükü ve bağlamı da dikkate al.'}]}]
};
export function bindVideoMoments(video,b){
 const points=b.checkpoints||moments[b.url]||[];if(!points.length)return;
 const box=document.createElement('div');box.className='video-moment';box.hidden=true;video.after(box);
 const rail=document.createElement('div');rail.className='moment-rail';rail.innerHTML='<span>Karar durağı</span>'+points.map((x,i)=>`<button type="button" data-moment="${i}">${Math.floor(x.time/60)}:${String(Math.floor(x.time%60)).padStart(2,'0')} · Sen karar ver</button>`).join('');box.after(rail);
 const seen=new Set();let last=video.currentTime;
 const show=i=>{seen.add(i);video.pause();const p=points[i];box.hidden=false;box.innerHTML=`<span class="eyebrow">VİDEO DURDU · KARAR SENİN</span><h3>${esc(p.prompt)}</h3><p class="quiet">Bu bir düşünme durağıdır; not verilmez.</p><div class="options">${p.options.map((o,j)=>`<button type="button" data-pick="${j}">${esc(o.text)}</button>`).join('')}</div><div class="moment-outcome" aria-live="polite"></div>`;box.querySelectorAll('[data-pick]').forEach(el=>el.onclick=()=>{box.querySelector('.moment-outcome').innerHTML=`<div class="feedback">${esc(p.options[+el.dataset.pick].outcome)}</div><button type="button" class="primary">Videoya devam et →</button>`;box.querySelector('.moment-outcome button').onclick=()=>{box.hidden=true;video.play().catch(()=>{});};});};
 video.addEventListener('timeupdate',()=>{const current=video.currentTime;points.forEach((p,i)=>{if(!seen.has(i)&&last<p.time&&current>=p.time&&current-p.time<2)show(i);});last=current;});
 rail.querySelectorAll('[data-moment]').forEach(el=>el.onclick=()=>{const i=+el.dataset.moment;video.currentTime=points[i].time;show(i);});
}
