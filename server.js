// --- server.js ---
// Main application for IrieLink Registry

import express from "express";
import session from "express-session";
import methodOverride from "method-override";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

// --- Database connection ---
const db = await open({
  filename: path.join(__dirname, "registry.db"),
  driver: sqlite3.Database,
});

// --- Helper functions ---
async function get(sql, params = []) {
  return db.get(sql, params);
}

async function all(sql, params = []) {
  return db.all(sql, params);
}

async function run(sql, params = []) {
  return db.run(sql, params);
}

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Session setup ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// --- Utility: Auth middleware ---
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}

// --- Home Page (Display Items) ---
app.get("/", async (req, res) => {
  const items = await all("SELECT * FROM items");
  res.render("index", { items });
});


/// ----- Contact Page ----

app.get('/contact', (req, res) => {
  res.render('contact');
});


/// ----- Full List ----

app.get('/full-list', (req, res) => {
  res.render('full-list');
});





// --- Admin Login Page ---
app.get("/admin/login", (req, res) => {
  res.render("admin", { page: "login", error: null });
});

// --- Handle Admin Login ---
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect("/admin");
  } else {
    res.render("admin", { page: "login", error: "Invalid password." });
  }
});

// --- Admin Dashboard ---
app.get("/admin", requireAdmin, async (req, res) => {
  const items = await all("SELECT * FROM items ORDER BY id DESC");
  res.render("admin", { page: "dashboard", data: { items } });
});

// --- Add New Item ---
app.post("/admin/items", requireAdmin, async (req, res) => {
  try {
    const priceCents = req.body.price_dollars
      ? Math.round(parseFloat(req.body.price_dollars) * 100)
      : 0;

    await run(
      `INSERT INTO items (name, description, image_url, price_cents, purchase_link, quantity, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.name,
        req.body.description,
        req.body.image_url,
        priceCents,
        req.body.purchase_link,
        req.body.quantity || 1,
        req.body.note || "",
        "available",
      ]
    );

    res.redirect("/admin");
  } catch (err) {
    console.error("❌ Error adding item:", err);
    res.status(500).send("Error adding item");
  }
});

// --- Update an Existing Item ---
app.put("/admin/items/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const item = await get("SELECT * FROM items WHERE id = ?", [id]);
    if (!item) {
      console.warn(`⚠️ No item found with ID ${id}`);
      return res.redirect("/admin");
    }

    const priceCents = req.body.price_dollars
      ? Math.round(parseFloat(req.body.price_dollars) * 100)
      : 0;

    await run(
      `UPDATE items
       SET name = ?, description = ?, image_url = ?, price_cents = ?, purchase_link = ?, quantity = ?, note = ?
       WHERE id = ?`,
      [
        req.body.name,
        req.body.description,
        req.body.image_url,
        priceCents,
        req.body.purchase_link,
        req.body.quantity || 1,
        req.body.note || "",
        id,
      ]
    );

    console.log(`✅ Item ${id} updated successfully.`);
    res.redirect("/admin");
  } catch (err) {
    console.error("❌ Error updating item:", err);
    res.status(500).send("Error updating item");
  }
});

// --- Delete an Item ---
app.delete("/admin/items/:id", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await run("DELETE FROM items WHERE id = ?", [id]);
    res.redirect("/admin");
  } catch (err) {
    console.error("❌ Error deleting item:", err);
    res.status(500).send("Error deleting item");
  }
});

// --- Mark Item as Purchased (from public site) ---
app.post("/items/:id/purchase", async (req, res) => {
  try {
    const id = req.params.id;
    const item = await get("SELECT * FROM items WHERE id = ?", [id]);
    if (!item) {
      console.warn(`⚠️ Item ${id} not found for purchase`);
      return res.redirect("/");
    }

    await run("UPDATE items SET status = ? WHERE id = ?", ["purchased", id]);
    res.redirect("/");
  } catch (err) {
    console.error("❌ Error marking item purchased:", err);
    res.status(500).send("Error updating item status");
  }
});

// --- Logout Admin ---
app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// --- Fallback 404 Page ---
app.use((req, res) => {
  res.status(404).render("not-found");
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🌿 IrieLink running on http://localhost:${PORT}`);
});


