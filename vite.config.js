import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: `${projectRoot}/index.html`,
        admin: `${projectRoot}/admin.html`,
        review: `${projectRoot}/review.html`,
        privacy: `${projectRoot}/privacy.html`,
        copyrightPolicy: `${projectRoot}/copyright-policy.html`,
        terms: `${projectRoot}/terms.html`,
      },
    },
  },
});
