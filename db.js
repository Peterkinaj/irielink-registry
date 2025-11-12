// db.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const dbPath = path.join(__dirname, 'registry.db');
sqlite3.verbose();
export const db = new sqlite3.Database(dbPath);


// Create tables if not exist
const initSQL = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS categories (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_cents INTEGER DEFAULT 0,
  purchase_link TEXT,
  quantity INTEGER DEFAULT 1,
  note TEXT,
  status TEXT CHECK(status IN ('available','claimed','purchased')) DEFAULT 'available'
);
CREATE TABLE IF NOT EXISTS item_categories (
item_id INTEGER NOT NULL,
category_id INTEGER NOT NULL,
PRIMARY KEY (item_id, category_id),
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS claims (
id INTEGER PRIMARY KEY AUTOINCREMENT,
item_id INTEGER NOT NULL,
claimer_name TEXT,
status TEXT CHECK(status IN ('claimed','purchased')) NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
`;


export function init() {
return new Promise((resolve, reject) => {
db.exec(initSQL, (err) => (err ? reject(err) : resolve()));
});
}