const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Content-Disposition"],
  }),
);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs allowed"), false);
    }
    cb(null, true);
  },
});

app.get("/", (req, res) => {
  res.send("PDF Tool API is running 🚀");
});

app.post("/protect", upload.single("pdf"), (req, res) => {
  const password = req.body.password;

  if (!req.file || !password) {
    return res.status(400).send("Missing file or password");
  }

  if (password.length < 4) {
    return res.status(400).send("Password too short");
  }

  const input = req.file.path;

  const original = path.parse(req.file.originalname).name;
  const output = `uploads/${original}-protected.pdf`;

  const safePassword = password.replace(/[^a-zA-Z0-9]/g, "");

  const qpdf = spawn("qpdf", [
    "--encrypt",
    safePassword,
    safePassword,
    "256",
    "--",
    input,
    output,
  ]);

  qpdf.on("close", (code) => {
    if (code !== 0) {
      fs.unlinkSync(input);
      return res.status(500).send("Error processing PDF");
    }

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    res.download(output, `${original}-protected.pdf`, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.post("/unlock", upload.single("pdf"), (req, res) => {
  const password = req.body.password;

  if (!req.file || !password) {
    return res.status(400).send("Missing file or password");
  }

  const input = req.file.path;
  const original = path.parse(req.file.originalname).name;
  const output = `uploads/${original}-unlocked.pdf`;

  const qpdf = spawn("qpdf", [
    "--password=" + password,
    "--decrypt",
    input,
    output,
  ]);

  qpdf.on("close", (code) => {
    if (code !== 0) {
      fs.unlinkSync(input);
      return res.status(500).send("Wrong password or failed");
    }
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.download(output, `${original}-unlocked.pdf`, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.post("/compress", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).send("Only PDF allowed");
  }

  const inputPath = req.file.path;
  const original = path.parse(req.file.originalname).name;
  const outputPath = `uploads/optimized-${Date.now()}.pdf`;

  // qpdf arguments (SAFE way)
  const args = [
    inputPath,
    outputPath,
    "--stream-data=compress",
    "--object-streams=generate",
    "--compress-streams=y",
  ];

  const process = spawn("qpdf", args);

  // Capture errors (important)
  let errorOutput = "";

  process.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  process.on("error", (err) => {
    console.error("Spawn error:", err);
    return res.status(500).send("Failed to start compression");
  });

  process.on("close", (code) => {
    if (code !== 0) {
      console.error("qpdf error:", errorOutput);
      return res.status(500).send("Compression failed");
    }

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    res.download(outputPath, `${original}-compressed.pdf`, (err) => {
      // Cleanup (safe)
      try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.warn("Cleanup error:", e.message);
      }

      if (err) {
        console.error("Download error:", err);
      }
    });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
