const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const out = fs.openSync(path.join(root, "server.log"), "a");
const err = fs.openSync(path.join(root, "server.err.log"), "a");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", "3000"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", out, err],
  windowsHide: true
});

child.on("error", (error) => {
  fs.writeSync(err, `${new Date().toISOString()} failed to start server: ${error.stack || error.message}\n`);
});

child.unref();
console.log(`Hammer Trading Company server started on http://127.0.0.1:3000 (pid ${child.pid})`);
