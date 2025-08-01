const express = require("express");
const multer = require("multer");
const path = require("path");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ---- MySQL connection ----
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // <-- put your MySQL username here
  password: "Mayanks@078", // <-- put your MySQL password here
  database: "snacktil_db",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL!");
});

// ---- Multer for image uploads ----
const storage = multer.diskStorage({
  destination: "public/images",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ---- Get all facts ----
app.get("/api/facts", (req, res) => {
  db.query("SELECT * FROM facts", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ---- Add a new fact ----
app.post("/api/facts", upload.single("image"), (req, res) => {
  const { summary, source, category } = req.body;
  const image = req.file ? `/images/${req.file.filename}` : null;
  db.query(
    "INSERT INTO facts (summary, source, category, image) VALUES (?, ?, ?, ?)",
    [summary, source, category, image],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, summary, source, category, image });
    }
  );
});

// ---- React to a fact ----
app.post("/api/facts/:id/react", (req, res) => {
  const { type } = req.body;
  const { id } = req.params;
  const valid = ["likes", "mindblown", "wrong"];
  if (!valid.includes(type))
    return res.status(400).json({ error: "Invalid reaction type" });
  db.query(
    `UPDATE facts SET ${type} = ${type} + 1 WHERE id = ?`,
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.sendStatus(200);
    }
  );
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
