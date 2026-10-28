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

if (existsSync(logoPath)) {
  await sharp(logoPath).resize(512, 512).png().toFile(pngPath);
  console.log(`generate-win-icon: rasterized ${logoPath}`);
}

if (!existsSync(pngPath)) {
  console.error(`generate-win-icon: missing ${pngPath}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
await writeFile(icoPath, await pngToIco(pngPath));
console.log(`generate-win-icon: wrote ${icoPath}`);
