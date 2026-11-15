let csrf='';
export function setCsrf(value){csrf=value||'';}
export async function api(path,{method='GET',body,raw=false}={}){
 const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{'X-Pusula-Client':'web',...(csrf?{'X-CSRF-Token':csrf}:{}),...(body!==undefined?{'Content-Type':raw?body.type:'application/json'}:{})},body:body===undefined?undefined:raw?body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'Sunucu yanıtı okunamadı.'}));
 if(!response.ok){const e=new Error(data.error||'İşlem tamamlanamadı.');e.status=response.status;throw e;}if(data.csrf)setCsrf(data.csrf);return data;
}
export const post=(path,body={})=>api(path,{method:'POST',body});
