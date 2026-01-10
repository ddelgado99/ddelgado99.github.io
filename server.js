const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

/* ===== PUBLIC ===== */
const PUBLIC_PATH = path.join(__dirname, "public");
app.use(express.static(PUBLIC_PATH));

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "admin.html"));
});

/* ===== MYSQL (RENDER / RAILWAY) ===== */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ===== TEST DB ===== */
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ MySQL error:", err.message);
  } else {
    console.log("✅ MySQL conectado");
    conn.query("ALTER TABLE products MODIFY COLUMN images LONGTEXT", () => {});
    conn.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(255),
        quantity INT,
        total INT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    conn.release();
  }
});

/* ===== PRODUCTS ===== */
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows.map(p => ({
      ...p,
      images: (() => {
        try { return JSON.parse(p.images || "[]"); }
        catch { return []; }
      })()
    })));
  });
});

app.post("/products", (req, res) => {
  const p = req.body;
  db.query(
    "INSERT INTO products (name, description, price, discount, available, images) VALUES (?, ?, ?, ?, ?, ?)",
    [
      p.name,
      p.description,
      Number(p.price) || 0,
      Number(p.discount) || 0,
      p.available ? 1 : 0,
      JSON.stringify(p.images || [])
    ],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const p = req.body;

  db.query(
    `UPDATE products SET
      name=?, description=?, price=?, discount=?, available=?, images=?
     WHERE id=?`,
    [
      p.name,
      p.description,
      Number(p.price) || 0,
      Number(p.discount) || 0,
      p.available ? 1 : 0,
      JSON.stringify(p.images || []),
      id
    ],
    err => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    }
  );
});

app.delete("/products/:id", (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], () => {
    res.json({ success: true });
  });
});

/* ===== SALES ===== */
app.post("/sales", (req, res) => {
  const { product_name, quantity, total } = req.body;
  db.query(
    "INSERT INTO sales (product_name, quantity, total) VALUES (?, ?, ?)",
    [product_name, quantity, total],
    () => res.json({ success: true })
  );
});

/* ===== PORT ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Servidor activo en puerto", PORT);
});
