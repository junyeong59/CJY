import { createHash } from "node:crypto";
import { cp, mkdir, rm, copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
await cp(path.join(root, "component"), path.join(dist, "component"), { recursive: true });
await cp(path.join(root, "public"), dist, { recursive: true });

const assetVersion = async (filePath) => {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex").slice(0, 12);
};

const configPath = path.join(dist, "src", "config.js");
const configVersion = await assetVersion(configPath);
const appPath = path.join(dist, "src", "app.js");
const appSource = await readFile(appPath, "utf8");
const versionedAppSource = appSource.replace(
  /\.\/config\.js(?:\?v=[^"]*)?/u,
  `./config.js?v=${configVersion}`
);

await writeFile(appPath, versionedAppSource);

const appVersion = await assetVersion(appPath);
const stylesVersion = await assetVersion(path.join(dist, "src", "styles.css"));
const indexPath = path.join(dist, "index.html");
const indexHtml = await readFile(indexPath, "utf8");
const versionedIndexHtml = indexHtml
  .replace(/\/src\/styles\.css(?:\?v=[^"]*)?/u, `/src/styles.css?v=${stylesVersion}`)
  .replace(/\/src\/app\.js(?:\?v=[^"]*)?/u, `/src/app.js?v=${appVersion}`);

await writeFile(indexPath, versionedIndexHtml);

console.log("Built static site into dist/");
