import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../config/prisma.js";
import { PASTAS, URL_PREFIXO, UPLOAD_ROOT } from "../config/storage.js";
import { UPLOAD_DIR } from "../config/uploadDir.js";
import NotFoundError from "../errors/NotFoundError.js";
import UnauthorizedError from "../errors/UnauthorizedError.js";
import ForbiddenError from "../errors/ForbiddenError.js";


const PASTA_POR_TIPO = { imagens: "imagem", documentos: "documento" };

export function semCacheMidia(_req, res, next) {
    // Mesmo publicado não deve continuar público em cache após arquivamento.
    res.setHeader("Cache-Control", "private, no-store");
    res.vary("Authorization");
    next();
}

function autorizar(registros, user) {
    if (registros.some(registro => (registro.patrimonio?.status ?? registro.status) === "PUBLICADO")) return;
    if (!user?.isActive) throw new UnauthorizedError("Mídia disponível apenas para usuários autenticados.");
    if (!["ADMIN", "EDITOR"].includes(user.role)) throw new ForbiddenError();
}

function arquivoAusente(error) {
    return ["ENOENT", "ENOTDIR", "ELOOP"].includes(error.code)
        ? new NotFoundError("Arquivo não encontrado.") : error;
}

async function abrirArquivo(raiz, pasta, nome) {
    const caminho = path.join(pasta, nome);
    let handle;
    try {
        const [raizReal, pastaReal, caminhoReal, stat] = await Promise.all([
            fs.realpath(raiz), fs.realpath(pasta), fs.realpath(caminho), fs.lstat(caminho),
        ]);
        if (pastaReal !== path.join(raizReal, path.relative(raiz, pasta)) ||
            caminhoReal !== path.join(pastaReal, nome) || stat.isSymbolicLink() || !stat.isFile()) {
            throw new NotFoundError("Arquivo não encontrado.");
        }
        handle = await fs.open(caminhoReal, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        const aberto = await handle.stat();
        // Entrega pelo descritor conferido, evitando reabrir um caminho trocado.
        if (!aberto.isFile() || aberto.dev !== stat.dev || aberto.ino !== stat.ino) {
            throw new NotFoundError("Arquivo não encontrado.");
        }
        return { handle, tamanho: aberto.size };
    } catch (error) {
        await handle?.close();
        throw arquivoAusente(error);
    }
}

async function entregar(req, res, next, { raiz, pasta, url, model, attachment, editorial = false }) {
    const { arquivo } = req.validatedParams;
    const registros = await prisma[model].findMany({
        where: { [editorial ? "imagemUrl" : "url"]: `${url}/${arquivo}` },
        select: editorial ? { status: true } : { patrimonio: { select: { status: true } } },
    });
    if (!registros.length) throw new NotFoundError("Arquivo não encontrado.");

    let handle;
    try {
        const aberto = await abrirArquivo(raiz, pasta, arquivo);
        handle = aberto.handle;
        autorizar(registros, req.user);
        res.type(arquivo);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", attachment ? "attachment" : `inline; filename="${encodeURIComponent(arquivo)}"`);
        res.setHeader("Content-Length", aberto.tamanho);
        if (req.method === "HEAD") return res.end();

        const stream = handle.createReadStream();
        handle = undefined; // O stream assume o descritor e o fecha ao terminar.
        let falhou = false;
        const erroDeLeitura = (error) => {
            if (falhou) return;
            falhou = true;
            stream.destroy();
            if (res.headersSent) res.destroy(error);
            else next(arquivoAusente(error));
        };
        stream.once("error", erroDeLeitura);
        res.once("error", erroDeLeitura);
        res.once("close", () => stream.destroy());
        stream.pipe(res);
    } finally {
        await handle?.close();
    }
}

export function servirArquivo(req, res, next) {
    const tipo = PASTA_POR_TIPO[req.validatedParams.tipo];
    return entregar(req, res, next, {
        raiz: UPLOAD_ROOT, pasta: PASTAS[tipo], url: URL_PREFIXO[tipo],
        model: tipo === "imagem" ? "patrimonioImagem" : "patrimonioDocumento", attachment: false,
    });
}

export function servirArquivoLegado(req, res, next) {
    const { tipo } = req.validatedParams;
    return entregar(req, res, next, {
        raiz: UPLOAD_DIR, pasta: path.join(UPLOAD_DIR, tipo), url: `/uploads/${tipo}`,
        model: tipo === "patrimonios" ? "patrimonioImagem" : "patrimonioDocumento", attachment: tipo === "referencias",
    });
}


// Reutiliza a entrega segura e consulta o status a cada GET/HEAD.
export function servirImagemEditorial(req, res, next) {
    const { tipo } = req.validatedParams;
    return entregar(req, res, next, {
        raiz: UPLOAD_DIR, pasta: path.join(UPLOAD_DIR, tipo), url: `/uploads/${tipo}`,
        model: tipo === "exposicoes" ? "exposicao" : "novidade", attachment: false, editorial: true,
    });
}
