export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function check(condition,message,status=400){if(!condition)throw new HttpError(status,message);}
export function text(value,max=1000,min=0){check(typeof value==='string'&&value.trim().length>=min&&value.length<=max,`Metin ${min}–${max} karakter olmalı.`);return value.trim();}
