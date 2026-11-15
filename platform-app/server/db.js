import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
export function openDb(path=resolve(process.env.DATA_DIR||'data','pusula.sqlite')){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
  const db=new DatabaseSync(path,{timeout:5000});
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT NOT NULL,password TEXT,role TEXT NOT NULL DEFAULT 'student',guest INTEGER NOT NULL DEFAULT 0,job TEXT NOT NULL DEFAULT '',created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS courses(id TEXT PRIMARY KEY,draft TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,published_version INTEGER,archived INTEGER NOT NULL DEFAULT 0,updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS versions(course_id TEXT NOT NULL REFERENCES courses(id),version INTEGER NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(course_id,version));
  CREATE TABLE IF NOT EXISTS enrollments(user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL REFERENCES courses(id),version INTEGER NOT NULL,current_block TEXT NOT NULL,unlocked TEXT NOT NULL,terminal INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'active',started TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(user_id,course_id),FOREIGN KEY(course_id,version) REFERENCES versions(course_id,version));
  CREATE TABLE IF NOT EXISTS progress(user_id TEXT NOT NULL,course_id TEXT NOT NULL,block_id TEXT NOT NULL,status TEXT NOT NULL,answer TEXT,feedback TEXT,position REAL NOT NULL DEFAULT 0,updated TEXT NOT NULL,PRIMARY KEY(user_id,course_id,block_id),FOREIGN KEY(user_id,course_id) REFERENCES enrollments(user_id,course_id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL,version INTEGER NOT NULL,block_id TEXT NOT NULL,answer TEXT NOT NULL,passed INTEGER,created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS assignments(user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL REFERENCES courses(id),created TEXT NOT NULL,PRIMARY KEY(user_id,course_id));
  CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),course_id TEXT NOT NULL REFERENCES courses(id),role TEXT NOT NULL,body TEXT NOT NULL,created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
  PRAGMA user_version=1;`);
  return db;
}
export const now=()=>new Date().toISOString();
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}
export function audit(db,user,action,detail){db.prepare('INSERT INTO audit(user_id,action,detail,created) VALUES(?,?,?,?)').run(user,action,JSON.stringify(detail),now());}
