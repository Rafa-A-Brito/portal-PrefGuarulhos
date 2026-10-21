import path from "node:path";
import { pathToFileURL } from "node:url";
import { executarCliSeed } from "./seed.js";
export { executarCargaInicial, planejarCarga, catalogoInicial, SEED_EMAIL } from "./carga-inicial.js";

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    executarCliSeed("research").catch(error => {
        console.error(error.report ? JSON.stringify(error.report) : "Carga de pesquisa abortada. " + error.message);
        process.exitCode = 1;
    });
}
