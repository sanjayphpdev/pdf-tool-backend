const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, //50MB
});

app.post("/protect", upload.single("pdf"), (req, res) => {
  if (!req.file.mimetype.includes("pdf")) {
    return res.status(400).send("Only PDF files allowed");
  }

  const password = req.body.password;
  const safePassword = password.replace(/[^a-zA-Z0-9]/g, "");

  const input = req.file.path;

  const original = path.parse(req.file.originalname).name;
  const output = `uploads/${original}-protected.pdf`;

  /* //For Windows Environment
  const command = `"C:\\Users\\sanja\\Documents\\sanjay-office\\becholor\\pdf-tool-server\\window-qpdf\\bin\\qpdf.exe" --encrypt ${safePassword} ${safePassword} 256 -- ${input} ${output}`;
  console.log(`command = ${command}`);
  exec(command, (err) => {
    if (err) {
      console.log(err.stack || err.message);
      fs.unlinkSync(input);
      return res.status(500).send("Error protecting PDF");
    }

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    res.download(output, `${original}-protected.pdf`, () => {
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
  */
  //-- For render or live linux server
  const process = spawn("qpdf", [
    "--encrypt",
    safePassword,
    safePassword,
    "256",
    "--",
    input,
    output,
  ]);

  process.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).send("Error protecting PDF");
    }
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.download(output, `${original}-protected.pdf`, () => {
      console.log(`pdf password protected successfully`);
      fs.unlinkSync(input);
      fs.unlinkSync(output);
    });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
