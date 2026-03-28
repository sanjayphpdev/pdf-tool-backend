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
});

app.post("/protect", upload.single("pdf"), (req, res) => {
  const password = req.body.password;

  if (!req.file || !password) {
    return res.status(400).send("Missing file or password");
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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
