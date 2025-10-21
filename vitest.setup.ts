import { beforeAll } from "vitest";
import * as fs from "fs";
import { glob as nodeGlob } from "glob";

// Polyfill fs.glob for convex-test compatibility
beforeAll(() => {
  // @ts-expect-error - fs.glob is available in Node 20.10+ but not in types yet
  if (!fs.glob) {
    // @ts-expect-error - Polyfilling missing Node.js fs.glob API
    fs.glob = async (pattern: string, options?: { cwd?: string }) => {
      return nodeGlob(pattern, { cwd: options?.cwd || process.cwd() });
    };
  }
});
