import express from "express";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Configuración para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, "public")));

// =======================
// MYSQL CONNECTION
// =======================
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL error:", err);
  } else {
    console.log("✅ MySQL conectado correctamente");
  }
});

// =======================
// ENDPOINTS
// =======================

// Obtener productos
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) return res.status(500).json(err);
    
    // Adaptar los datos de la DB al formato que espera el frontend
    const products = results.map(p => {
      // 1. Manejo de imágenes: soporta columna 'image' (singular) o 'images' (JSON array)
      let imgs = [];
      if (p.image) {
        imgs = [p.image]; // Si viene de la columna 'image' (tu caso actual)
      } else if (p.images) {
        try {
          imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        } catch (e) { imgs = []; }
      }

      // 2. Manejo de disponibilidad: si no existe la columna, asumimos disponible (1)
      const isAvailable = (p.available !== undefined && p.available !== null) ? p.available : 1;

      return {
        ...p,
        images: Array.isArray(imgs) ? imgs : [],
        available: isAvailable,
        discount: p.discount || 0
      };
    });
    
    res.json(products);
  });
});

// Crear producto (admin)
app.post("/products", (req, res) => {
  const p = req.body;
  
  const sql = `
    INSERT INTO products (name, description, price, discount, available, images)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
      p.name,
      p.description,
      Number(p.price) || 0,
      Number(p.discount) || 0,
      p.available ? 1 : 0,
      JSON.stringify(p.images || [])
  ];

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, id: result.insertId });
  });
});

// Actualizar producto (PUT) - Necesario para tu admin.html
app.put("/products/:id", (req, res) => {
  const { id } = req.params;
  const p = req.body;
  const sql = `UPDATE products SET name=?, description=?, price=?, discount=?, available=?, images=? WHERE id=?`;
  const values = [
      p.name,
      p.description,
      Number(p.price) || 0,
      Number(p.discount) || 0,
      p.available ? 1 : 0,
      JSON.stringify(p.images || []),
      id
  ];
  db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
  });
});

// Eliminar producto (DELETE) - Necesario para tu admin.html
app.delete("/products/:id", (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// =======================
// SERVER
// =======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
