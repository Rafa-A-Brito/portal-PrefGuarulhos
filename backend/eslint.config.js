import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["node_modules/**", "uploads/**", "src/uploads/**", "src/uploads_backup/**"] },
    js.configs.recommended,
    { files: ["**/*.js"], languageOptions: { globals: globals.node }, rules: {
        "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true }],
    } },
    // Estes blocos legados relatam separadamente falha original e de limpeza;
    // a regra nova do ESLint 10 confunde o erro de filesystem com o do catch externo.
    { files: ["prisma/import-patrimonios.js", "scripts/import-novidades.js"], rules: { "preserve-caught-error": "off" } },
    // A regex de nome de arquivo precisa rejeitar explicitamente bytes de controle.
    { files: ["src/middlewares/uploadReferencia.js"], rules: { "no-control-regex": "off" } },
];
