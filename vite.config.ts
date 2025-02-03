import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config(); // ✅ Ensures .env is loaded

export default defineConfig({
  plugins: [react()],
  root: '.', // The current directory containing the `index.html`
});