import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", ".wrangler", "dist", "coverage"] },
  ...tseslint.configs.recommended,
);
