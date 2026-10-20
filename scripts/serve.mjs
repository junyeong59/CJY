import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");
const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

// Match the production build: browsers cannot resolve bare npm imports.
const clientBundle = await build({
  entryPoints: [path.join(root, "src", "supabase-client.js")],
  bundle: true, write: false, format: "esm", platform: "browser", target: "es2022",
  define: { __CJY_SUPABASE_PUBLIC_KEY__: JSON.stringify(process.env.CJY_SUPABASE_PUBLIC_KEY) || "undefined" }
});

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const pathname = decodePath(url.pathname);
  if (pathname === "/src/supabase-client.js") {
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
    response.end(clientBundle.outputFiles[0].text);
    return;
  }
  const filePath = resolveRequest(pathname);

  if (!filePath) {
    const html = await readFile(path.join(root, "index.html"));
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }

  const ext = path.extname(filePath);
  const contentType = pathname.endsWith("apple-app-site-association")
    ? "application/json; charset=utf-8"
    : mimeTypes.get(ext) || "application/octet-stream";

  response.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-cache"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`CJY site running at http://${host}:${server.address().port}`);
});

function resolveRequest(pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const candidates = [
    path.join(root, normalized),
    path.join(publicRoot, normalized)
  ];

  for (const candidate of candidates) {
    if (isInside(candidate, root) && existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function isInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
