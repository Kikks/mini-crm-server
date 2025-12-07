import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["index.ts"],
	format: ["esm"],
	target: "node20",
	outDir: "dist",
	splitting: false,
	sourcemap: true,
	clean: true,
	bundle: true,
	dts: false,
	// Keep node_modules external (don't bundle them)
	noExternal: [],
	// Mark certain packages as external if they have issues with bundling
	external: [],
	esbuildOptions(options) {
		options.platform = "node";
	},
});
