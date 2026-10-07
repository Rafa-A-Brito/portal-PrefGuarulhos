import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import BadRequestError from "../errors/BadRequestError.js";
import BaseError from "../errors/BaseError.js";

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

const MAX_SIZE = 10 * 1024 * 1024;

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXTENSOES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
};

const PASTAS_PERMITIDAS = new Set(["patrimonios", "exposicoes", "novidades"]);

function parseContentDisposition(value) {
    const out = {};

    for (const part of value.split(";")) {
        const [rawKey, rawValue] = part.trim().split("=");

        if (!rawKey || rawValue === undefined) {
            continue;
        }

        out[rawKey] = rawValue.replace(/^"|"$/g, "");
    }

    return out;
}

function parseHeaders(buffer) {
    const headers = {};

    for (const line of buffer.toString("utf8").split("\r\n")) {
        const index = line.indexOf(":");

        if (index > 0) {
            headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
        }
    }

    return headers;
}

export function uploadImagem(pasta, { opcional = false } = {}) {
    if (!PASTAS_PERMITIDAS.has(pasta)) {
        throw new Error(`Pasta de upload inválida: ${pasta}`);
    }

    const destinoUploadDir = path.join(uploadDir, pasta);

    return function uploadImagemMiddleware(req, _res, next) {
        const contentType = req.get("content-type") || "";

        const match = contentType.match(/^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))/i);

        if (!match) {
            if (opcional && !/^multipart\//i.test(contentType)) return next();
            return next(new BadRequestError("Envie a imagem usando multipart/form-data."));
        }

        const boundary = Buffer.from(`--${match[1] || match[2]}`);

        const chunks = [];

        let total = 0;
        let finalizado = false;

        req.on("data", (chunk) => {
            if (finalizado) {
                return;
            }

            total += chunk.length;

            if (total > MAX_SIZE + 1024 * 1024) {
                finalizado = true;

                req.resume();

                next(new BaseError("O upload excede o limite de 10 MB.", 413));

                return;
            }

            chunks.push(chunk);
        });

        req.on("error", (error) => {
            if (!finalizado) {
                finalizado = true;
                next(error);
            }
        });

        req.on("end", () => {
            if (finalizado) {
                return;
            }

            try {
                const body = Buffer.concat(chunks);

                req.body = {};

                let pos = body.indexOf(boundary);
                let file;

                while (pos !== -1) {
                    const start = pos + boundary.length;

                    if (body.slice(start, start + 2).toString() === "--") {
                        break;
                    }

                    const headerStart = start + 2;

                    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), headerStart);

                    if (headerEnd === -1) {
                        break;
                    }

                    const headers = parseHeaders(body.slice(headerStart, headerEnd));

                    const disposition = parseContentDisposition(
                        headers["content-disposition"] || ""
                    );

                    const nextBoundary = body.indexOf(boundary, headerEnd + 4);

                    if (nextBoundary === -1) {
                        break;
                    }

                    const contentEnd = nextBoundary - 2;

                    const content = body.slice(headerEnd + 4, contentEnd);

                    if (disposition.name === "imagem") {
                        if (opcional && !disposition.filename && content.length === 0) {
                            pos = nextBoundary;
                            continue;
                        }
                        if (file) throw new BadRequestError("Envie apenas uma imagem.");
                        if (!disposition.filename || content.length === 0) {
                            throw new BadRequestError("Envie um arquivo de imagem.");
                        }

                        const mime = (headers["content-type"] || "")
                            .split(";")[0]
                            .trim()
                            .toLowerCase();

                        if (!TIPOS.has(mime)) {
                            throw new BadRequestError(
                                "Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF."
                            );
                        }

                        if (content.length > MAX_SIZE) {
                            throw new BaseError("A imagem deve ter no máximo 10 MB.", 413);
                        }

                        fs.mkdirSync(destinoUploadDir, {
                            recursive: true,
                        });

                        const filename = `${randomUUID()}${EXTENSOES[mime]}`;

                        const filePath = path.join(destinoUploadDir, filename);

                        fs.writeFileSync(filePath, content);

                        file = req.file = {
                            filename,
                            originalname: disposition.filename,
                            mimetype: mime,
                            size: content.length,

                            // Caminho relativo dentro de uploads/
                            relativePath: `${pasta}/${filename}`,

                            // URL pública que pode ser salva no banco
                            url: `/uploads/${pasta}/${filename}`,
                        };
                    } else if (disposition.name) {
                        req.body[disposition.name] = content.toString("utf8");
                    }

                    pos = nextBoundary;
                }

                if (!file && !opcional) {
                    throw new BadRequestError("Envie um arquivo no campo imagem.");
                }

                if (file) req.file = file;

                finalizado = true;

                next();
            } catch (error) {
                finalizado = true;
                next(error);
            }
        });
    };
}
