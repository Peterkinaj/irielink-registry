import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function inspectDB() {
  const db = await open({
    filename: "./registry.db",
    driver: sqlite3.Database,
  });

  console.log("🧠 Checking tables...");
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables:", tables.map(t => t.name));

  console.log("\n📋 Items in your registry:");
  const items = await db.all("SELECT * FROM items");
  if (items.length === 0) {
    console.log("⚠️ No items found in database!");
  } else {
    console.table(items);
  }

  console.log("\n🧱 Table structure:");
  const columns = await db.all("PRAGMA table_info(items)");
  console.table(columns);

  await db.close();
}

inspectDB().catch(err => console.error("❌ DB error:", err));
