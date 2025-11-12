// 🌿 IrieLink Registry Server (with auto-migrate)
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// --- Middleware setup ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'irie-secret',
    resave: false,
    saveUninitialized: false,
  })
);

// --- Database setup ---
const db = new sqlite3.Database('registry.db', err => {
  if (err) console.error('❌ Database connection failed:', err.message);
  else console.log('✅ Connected to registry.db');
});

// Ensure base table exists (minimal shape)
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )
`);

// --- Auto-migrate: add any missing columns safely ---
function ensureSchema() {
  const desired = [
    { name: 'description',   ddl: "ALTER TABLE items ADD COLUMN description TEXT" },
    { name: 'image_url',     ddl: "ALTER TABLE items ADD COLUMN image_url TEXT" },
    { name: 'purchase_link', ddl: "ALTER TABLE items ADD COLUMN purchase_link TEXT" },
    { name: 'quantity',      ddl: "ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1" },
    { name: 'note',          ddl: "ALTER TABLE items ADD COLUMN note TEXT" },
    { name: 'categories',    ddl: "ALTER TABLE items ADD COLUMN categories TEXT" },
    { name: 'status',        ddl: "ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'available'" },
  ];

  db.all("PRAGMA table_info(items)", (err, rows) => {
    if (err) {
      console.error('❌ PRAGMA table_info failed:', err.message);
      return;
    }
    const existing = new Set(rows.map(r => r.name));
    const toAdd = desired.filter(c => !existing.has(c.name));

    if (toAdd.length === 0) {
      console.log('🧩 Schema OK: no migrations needed.');
      return;
    }

    db.serialize(() => {
      toAdd.forEach(col => {
        db.run(col.ddl, e => {
          if (e) {
            console.error(`❌ Failed adding column ${col.name}:`, e.message);
          } else {
            console.log(`🛠️  Added missing column: ${col.name}`);
          }
        });
      });
    });
  });
}
ensureSchema();

// --- Routes ---

// 🌿 Home Page
app.get('/', (req, res) => {
  db.all('SELECT * FROM items ORDER BY id DESC', (err, items) => {
    if (err) return res.status(500).send('Database error');
    res.render('index', { items });
  });
});

// 📋 Full List Page
// 📋 Full List Page
app.get('/full-list', (req, res) => {
  res.render('fullList');
});


// ✉️ Contact Page
app.get('/contact', (req, res) => {
  res.render('contact');
});

// 🧑🏽‍💻 Admin Login Page
app.get('/admin', (req, res) => {
  if (req.session.loggedIn) {
    db.all('SELECT * FROM items ORDER BY id DESC', (err, items) => {
      if (err) return res.status(500).send('Database error');
      res.render('admin', { page: 'dashboard', data: { items } });
    });
  } else {
    res.render('admin', { page: 'login' });
  }
});

// 🧠 Handle Admin Login
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'iriepass123';
  if (password === adminPass) {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.render('admin', { page: 'login', error: 'Invalid password' });
  }
});

// 🚪 Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// ➕ Add New Item
app.post('/admin/items', (req, res) => {
  const { name, description, image_url, purchase_link, quantity, note, category_ids } = req.body;

  const categories = Array.isArray(category_ids)
    ? category_ids.join(', ')
    : (category_ids || '');

  const sql = `
    INSERT INTO items (name, description, image_url, purchase_link, quantity, note, categories, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'available')
  `;

  db.run(
    sql,
    [name, description, image_url, purchase_link, quantity || 1, note, categories],
    err => {
      if (err) {
        console.error('❌ Error adding item:', err.message);
        return res.status(500).send('Error adding item');
      }
      console.log(`✅ Added new item: ${name}`);
      res.redirect('/admin');
    }
  );
});

// ✏️ Edit Item
app.put('/admin/items/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, purchase_link, quantity, note, category_ids } = req.body;

  const categories = Array.isArray(category_ids)
    ? category_ids.join(', ')
    : (category_ids || '');

  const sql = `
    UPDATE items
    SET name = ?, description = ?, image_url = ?, purchase_link = ?, quantity = ?, note = ?, categories = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [name, description, image_url, purchase_link, quantity || 1, note, categories, id],
    err => {
      if (err) {
        console.error('❌ Error updating item:', err.message);
        return res.status(500).send('Error updating item');
      }
      console.log(`✅ Updated item ID ${id}: ${name}`);
      res.redirect('/admin');
    }
  );
});

// ❌ Delete Item
app.delete('/admin/items/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM items WHERE id = ?', [id], err => {
    if (err) {
      console.error('❌ Error deleting item:', err.message);
      return res.status(500).send('Error deleting item');
    }
    console.log(`🗑️ Deleted item ID ${id}`);
    res.redirect('/admin');
  });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🌿 IrieLink running on http://localhost:${PORT}`);
});
