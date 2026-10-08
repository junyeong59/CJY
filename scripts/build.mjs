import { build } from "esbuild";
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
await build({
  entryPoints: [path.join(root, "src", "supabase-client.js")],
  outfile: path.join(dist, "src", "supabase-client.js"),
  bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true,
  define: { __CJY_SUPABASE_PUBLIC_KEY__: JSON.stringify(process.env.CJY_SUPABASE_PUBLIC_KEY) || "undefined" }
});

const assetVersion = async (filePath) => {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex").slice(0, 12);
};

const checkoutPath = path.join(dist, "src", "apply-checkout.js");
const supabaseVersion = await assetVersion(path.join(dist, "src", "supabase-client.js"));
await writeFile(checkoutPath, (await readFile(checkoutPath, "utf8")).replace('./supabase-client.js', `./supabase-client.js?v=${supabaseVersion}`));
const checkoutVersion = await assetVersion(checkoutPath);
for (const module of ["direct-application.js", "order.js"]) {
  const filePath = path.join(dist, "src", module);
  await writeFile(filePath, (await readFile(filePath, "utf8")).replace('./apply-checkout.js', `./apply-checkout.js?v=${checkoutVersion}`));
}
const configPath = path.join(dist, "src", "config.js");
const configVersion = await assetVersion(configPath);
const appPath = path.join(dist, "src", "app.js");
const appSource = await readFile(appPath, "utf8");
const applicationPath = path.join(dist, "src", "application.js");
const directVersion = await assetVersion(path.join(dist, "src", "direct-application.js"));
const applicationSource = await readFile(applicationPath, "utf8");
await writeFile(applicationPath, applicationSource.replace('./direct-application.js', `./direct-application.js?v=${directVersion}`));
const applicationVersion = await assetVersion(applicationPath);
const policiesVersion = await assetVersion(path.join(dist, "src", "policies.js"));
const orderVersion = await assetVersion(path.join(dist, "src", "order.js"));
const versionedAppSource = appSource.replace("./policies.js", `./policies.js?v=${policiesVersion}`).replace("./order.js", `./order.js?v=${orderVersion}`).replace("./application.js", `./application.js?v=${applicationVersion}`).replace(
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
