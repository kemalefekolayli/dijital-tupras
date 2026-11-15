import { backup } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync,cpSync,existsSync } from 'node:fs';
import { openDb } from '../server/db.js';
const data=resolve(process.env.DATA_DIR||'data'),out=resolve(data,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(out,{recursive:true});const db=openDb(resolve(data,'pusula.sqlite'));await backup(db,resolve(out,'pusula.sqlite'));if(existsSync(resolve(data,'uploads')))cpSync(resolve(data,'uploads'),resolve(out,'uploads'),{recursive:true});db.close();console.log('Yedek hazır: '+out);
