// --- seed.js ---
// Seeds the IrieLink Registry database with base categories only.

import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function seed() {
  // open database connection
  const db = await open({
    filename: "./registry.db",
    driver: sqlite3.Database,
  });

  console.log("🌱 Seeding IrieLink Registry database...");

  // Drop existing tables for a clean start
  await db.exec(`
    DROP TABLE IF EXISTS item_categories;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS categories;
  `);

  // Create the main tables
  await db.exec(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      price_cents INTEGER,
      purchase_link TEXT,
      quantity INTEGER DEFAULT 1,
      note TEXT,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE item_categories (
      item_id INTEGER,
      category_id INTEGER,
      FOREIGN KEY(item_id) REFERENCES items(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );
  `);

  // Insert base categories
  const baseCategories = [
    "Food",
    "Appliances",
    "Toiletries",
    "Kitchen Supplies"
  ];

  for (const category of baseCategories) {
    await db.run("INSERT INTO categories (name) VALUES (?)", [category]);
  }

  console.log("✅ Database seeded successfully with base categories only.");
  await db.close();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
});
