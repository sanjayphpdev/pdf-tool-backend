const { spawn } = require("child_process");
const fs = require("fs");

async function compressWithQpdf(inputPath, outputPath, targetKB = 100) {
  let currentInput = inputPath;

  for (let i = 0; i < 3; i++) {
    // max 2–3 passes only
    const tempOutput = `${outputPath}-step${i}.pdf`;

    await runQpdf(currentInput, tempOutput);

    const sizeKB = fs.statSync(tempOutput).size / 1024;
    console.log(`Step ${i} → ${sizeKB.toFixed(2)} KB`);

    // ✅ stop if target reached
    if (sizeKB <= targetKB) {
      fs.renameSync(tempOutput, outputPath);
      cleanup(currentInput);
      return outputPath;
    }

    // ❌ if no improvement, stop early
    if (i > 0) {
      const prevSize = fs.statSync(currentInput).size;
      const newSize = fs.statSync(tempOutput).size;

      if (newSize >= prevSize) {
        fs.renameSync(tempOutput, outputPath);
        cleanup(currentInput);
        return outputPath;
      }
    }

    if (i > 0) fs.unlinkSync(currentInput);
    currentInput = tempOutput;
  }

  fs.renameSync(currentInput, outputPath);
  return outputPath;
}

function runQpdf(input, output) {
  return new Promise((resolve, reject) => {
    const args = [
      input,
      output,
      "--stream-data=compress",
      "--object-streams=generate",
      "--compress-streams=y",
      "--recompress-flate",
      "--compression-level=9",
      "--linearize",
    ];

    const proc = spawn("qpdf", args);

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error("qpdf failed"));
      resolve();
    });
  });
}

function cleanup(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

module.exports = {
  compressWithQpdf,
};
