import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const assetsDir = path.resolve(repoRoot, "assets");

/** 1x1 PNG used to hold document load until the glTF + pattern shader are ready. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function holdLoadUntilReady(): Plugin {
  let released = false;
  const waiters: Array<() => void> = [];

  const isHold = (url: string): boolean =>
    url === "/m1-hold.png" || url === "/m2-hold.png" || url === "/hold.png";
  const isRelease = (url: string): boolean =>
    url === "/m1-release" || url === "/m2-release" || url === "/release";

  const release = (): void => {
    released = true;
    for (const send of waiters) send();
    waiters.length = 0;
    setTimeout(() => {
      released = false;
    }, 0);
  };

  return {
    name: "hold-load-until-ready",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (isHold(url)) {
          const send = (): void => {
            res.statusCode = 200;
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-store");
            res.end(PIXEL_PNG);
          };
          if (released) send();
          else waiters.push(send);
          return;
        }
        if (isRelease(url)) {
          release();
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [holdLoadUntilReady()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [appRoot, assetsDir],
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
