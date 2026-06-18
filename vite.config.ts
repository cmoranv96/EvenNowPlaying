import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "apk-content-type",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.endsWith(".apk")) {
            response.setHeader("Content-Type", "application/vnd.android.package-archive");
            response.setHeader(
              "Content-Disposition",
              'attachment; filename="even-now-playing-companion-debug.apk"',
            );
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      ignored: ["**/.tools/**", "**/app/build/**", "**/node_modules/**"],
    },
  },
});
