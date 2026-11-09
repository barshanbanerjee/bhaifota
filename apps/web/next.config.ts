import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load root .env file in monorepo if available
const rootEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {};

export default nextConfig;
