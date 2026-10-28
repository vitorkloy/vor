/**
 * Windows .exe / atalhos / barra de tarefas usam ICO embutido no PE; PNG em win.icon falha facilmente.
 * Gera build/icon.ico a partir de public/icon.png antes do electron-builder.
 */
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = join(root, "public", "logo.svg");
const pngPath = join(root, "public", "icon.png");
const outDir = join(root, "build");
const icoPath = join(outDir, "icon.ico");

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
if (existsSync(logoPath)) {
  for (const size of sizes) {
    const dest = size === 512 ? pngPath : join(root, "public", `icon-${size}.png`);
    await sharp(logoPath).resize(size, size).png().toFile(dest);
  }
  console.log(`generate-win-icon: rasterized ${logoPath}`);
}

if (!existsSync(pngPath)) {
  console.error(`generate-win-icon: missing ${pngPath}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const icoInputs = [16, 32, 48, 256].map((size) => join(root, "public", size === 512 ? "icon.png" : `icon-${size}.png`));
await writeFile(icoPath, await pngToIco(icoInputs));
console.log(`generate-win-icon: wrote ${icoPath}`);
