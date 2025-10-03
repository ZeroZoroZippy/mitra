import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite automatically loads .env files in this order:
// 1. .env
// 2. .env.local (overrides .env)
// 3. .env.[mode]
// 4. .env.[mode].local (highest priority)
// No need for manual dotenv.config() as it can cause conflicts

export default defineConfig({
  plugins: [react()],
  root: '.', // The current directory containing the `index.html`
});