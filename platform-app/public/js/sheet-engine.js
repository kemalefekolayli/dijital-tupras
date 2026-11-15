// Deliberately small, safe spreadsheet evaluator. No eval / Function execution.
export function cellValue(cells,address,stack=new Set()){
 address=address.replaceAll('$','').toUpperCase();if(stack.has(address))throw Error('Döngüsel hücre başvurusu');
 const value=cells[address]??'';if(typeof value==='number')return value;
 if(!String(value).startsWith('='))return value!==''&&Number.isFinite(Number(value))?Number(value):value;
 const next=new Set(stack);next.add(address);return formulaValue(String(value),cells,next);
}
export function formulaValue(formula,cells,stack=new Set()){
 if(formula.length>500)throw Error('Formül çok uzun');
 const src=formula.slice(1).replaceAll('$','');
 const tokens=src.match(/"[^"]*"|\d+(?:\.\d+)?|[A-Za-zÇĞİÖŞÜçğıöşü_]+\d*|>=|<=|<>|[()+\-*/:;,=<>]/g)||[];
 if(tokens.join('')!==src.replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g,''))throw Error('Desteklenmeyen formül');
 let i=0;
 const num=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Sayı bekleniyor');return v;};
 function atom(){const raw=tokens[i++];const t=raw?.startsWith('"')?raw:raw?.toUpperCase();if(!t)throw Error('Eksik formül');if(t==='-')return -num(atom());if(t==='+')return num(atom());if(t==='('){const v=expr();if(tokens[i++]!==')')throw Error('Parantez eksik');return v;}if(t.startsWith('"'))return t.slice(1,-1);if(/^\d/.test(t))return Number(t);
  if(/^[A-Z]\d{1,2}$/.test(t)){
   if(tokens[i]!==':')return cellValue(cells,t,stack);
   i++;const end=tokens[i++];if(!/^[A-Z]\d{1,2}$/.test(end||''))throw Error('Aralık geçersiz');
   const values=[];for(let r=+t.slice(1);r<=+end.slice(1);r++)for(let c=t.charCodeAt(0);c<=end.charCodeAt(0);c++){if(values.length>=500)throw Error('Aralık çok büyük');values.push(cellValue(cells,String.fromCharCode(c)+r,stack));}return values;
  }
  if(tokens[i++]!=='(')throw Error('İşlev veya hücre tanınmadı');const args=[];if(tokens[i]!==')'){do{args.push(expr());if(![';',','].includes(tokens[i]))break;i++;}while(true);}if(tokens[i++]!==')')throw Error('Parantez eksik');
  const flat=args.flat().filter(v=>typeof v==='number');
  if(['TOPLA','SUM'].includes(t))return flat.reduce((a,b)=>a+b,0);
  if(['ORTALAMA','AVERAGE'].includes(t)){if(!flat.length)throw Error('Sayı yok');return flat.reduce((a,b)=>a+b,0)/flat.length;}
  if(['EĞER','IF'].includes(t)&&args.length===3)return args[0]?args[1]:args[2];
  if(['EĞERSAY','COUNTIF'].includes(t)&&args.length===2){const m=String(args[1]).match(/^(>=|<=|<>|>|<|=)?(.*)$/);return (Array.isArray(args[0])?args[0]:[args[0]]).filter(v=>compare(v,m[1]||'=',isNaN(Number(m[2]))?m[2]:Number(m[2]))).length;}
  throw Error('Desteklenen işlevler: TOPLA, ORTALAMA, EĞER, EĞERSAY (İngilizceleri de geçerli)');
 }
 function product(){let v=atom();while(['*','/'].includes(tokens[i])){const op=tokens[i++],r=num(atom());v=op==='*'?num(v)*r:num(v)/r;if(!Number.isFinite(v))throw Error('Sıfıra bölme');}return v;}
 function sum(){let v=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],r=num(product());v=op==='+'?num(v)+r:num(v)-r;}return v;}
 function expr(){let v=sum();if(['=','<>','>','<','>=','<='].includes(tokens[i])){const op=tokens[i++];v=compare(v,op,sum());}return v;}
 const result=expr();if(i!==tokens.length)throw Error('Formül tamamlanamadı');return result;
}
function compare(a,op,b){if(typeof a==='string')a=a.toLocaleUpperCase('tr');if(typeof b==='string')b=b.toLocaleUpperCase('tr');return op==='='?a===b:op==='<>'?a!==b:op==='>'?a>b:op==='<'?a<b:op==='>='?a>=b:a<=b;}
