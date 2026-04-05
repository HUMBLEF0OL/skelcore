import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/react.ts", "src/runtime.ts", "src/build.ts"],
    format: ["cjs", "esm"],
    dts: { resolve: true },
    clean: true,
    noExternal: [/^@ghostframe\//],
});
