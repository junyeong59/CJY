import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
await copyFile(path.join(root, "index.html"), path.join(dist, "404.html"));
await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
await cp(path.join(root, "component"), path.join(dist, "component"), { recursive: true });
await cp(path.join(root, "public"), dist, { recursive: true });

console.log("Built static site into dist/");
