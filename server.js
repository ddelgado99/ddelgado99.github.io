const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 📁 PUBLIC
const PUBLIC_PATH = path.join(__dirname, "public");
app.use(express.static(PUBLIC_PATH));

// 🏠 HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

// 🧑‍💻 ADMIN
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "admin.html"));
});

// 🔌 MYSQL (RAILWAY + SSL)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// 🧪 TEST CONEXIÓN
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL error:", err.message);
  } else {
    console.log("✅ MySQL conectado correctamente");
    connection.release();
  }
});

// 📦 GET PRODUCTS
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error("❌ Error products:", err.message);
      return res.json([]);
    }

    res.json(
      rows.map(p => ({
        ...p,
        images: (() => {
          try { return JSON.parse(p.images || "[]"); }
          catch { return []; }
        })()
      }))
    );
  });
});

// ➕ CREATE PRODUCT
app.post("/products", (req, res) => {
  const p = req.body;

  db.query(
    `INSERT INTO products (name, description, price, discount, available, images)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      p.name,
      p.description,
      Number(p.price) || 0,
      Number(p.discount) || 0,
      p.available ? 1 : 0,
      JSON.stringify(p.images || [])
    ],
    err => {
      if (err) {
        console.error("❌ Error insert:", err.message);
        return res.status(500).json({ error: true });
      }
      res.json({ success: true });
    }
  );
});

// 🚀 START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
