const path = require("node:path");
const fs = require("node:fs");

const rootDir = path.resolve(__dirname, "..");
const appDir = path.join(rootDir, "apps", "web-public");
const port = Number(process.env.PORT || process.argv[2] || 3000);
const hostname = process.env.HOST || "localhost";

process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.__NEXT_DISABLE_MEMORY_WATCHER = process.env.__NEXT_DISABLE_MEMORY_WATCHER || "1";
process.chdir(appDir);

const serverCacheDir = path.join(appDir, ".next", "server");
try {
  fs.rmSync(serverCacheDir, { recursive: true, force: true });
  console.log("Cleared stale Next server cache.");
} catch (error) {
  console.warn(`Could not clear stale Next server cache: ${error.message}`);
}

const { startServer } = require(require.resolve("next/dist/server/lib/start-server", { paths: [appDir] }));

console.log(`Next dev server direct mode: http://${hostname}:${port}`);
startServer({
  dir: appDir,
  port,
  hostname,
  isDev: true,
  allowRetry: true,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
