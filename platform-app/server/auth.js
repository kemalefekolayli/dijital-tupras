import { randomBytes,randomUUID,scrypt,timingSafeEqual,createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { check,text } from './errors.js';
import { now } from './db.js';
const derive=promisify(scrypt);
const digest=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){text(password,128,10);const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64,{N:32768,maxmem:64*1024*1024});return salt+':'+key.toString('hex');}
export async function verifyPassword(password,stored){if(typeof password!=='string'||password.length>128)return false;const [salt,hex]=(stored||'00000000000000000000000000000000:'+ '00'.repeat(64)).split(':');const key=await derive(password,salt,64,{N:32768,maxmem:64*1024*1024});return timingSafeEqual(key,Buffer.from(hex,'hex'))&&!!stored;}
export function emailAddress(value){const email=text(value,254,3).toLowerCase();check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Geçerli bir e-posta adresi girin.');return email;}
export function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,guest:!!u.guest,job:u.job};}
export function sessionFrom(db,req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pusula_session='))?.slice(15);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT s.id session_id,s.csrf,s.expires,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires>?').get(digest(token),Date.now());}
export function setSession(db,res,user,secure=false,old=null){if(old)db.prepare('DELETE FROM sessions WHERE id=?').run(old);const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),user.id,csrf,Date.now()+30*86400000);res.setHeader('Set-Cookie',`pusula_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure?'; Secure':''}`);return {user:publicUser(user),csrf};}
export function createGuest(db){const id=randomUUID();db.prepare('INSERT INTO users(id,name,guest,created) VALUES(?,?,1,?)').run(id,'Misafir',now());return db.prepare('SELECT * FROM users WHERE id=?').get(id);}
export function requireUser(session){check(session,'Oturumunuz sona erdi. Yeniden giriş yapın.',401);return session;}
export function requireAdmin(session){requireUser(session);check(session.role==='admin','Bu işlem için yönetici yetkisi gerekli.',403);return session;}
