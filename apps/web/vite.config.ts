import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import * as MdxConfig from "./source.config";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), mdx(MdxConfig), tanstackStart(), nitro(), viteReact()],
});
