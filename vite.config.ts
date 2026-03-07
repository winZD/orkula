import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "olives.png"],
      manifest: {
        name: "Orkula",
        short_name: "Orkula",
        description:
          "A modern agriculture management platform. Track your fields, monitor crops, and manage your farm operations all in one place.",
        theme_color: "#2d5a27",
        background_color: "#f5f0e8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/olives.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/olives.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
