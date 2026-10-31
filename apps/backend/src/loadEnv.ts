import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(currentDir, "..");

loadDotenv({ path: resolve(backendDir, ".env"), override: false });
loadDotenv({ path: resolve(backendDir, "..", "..", ".env"), override: false });
