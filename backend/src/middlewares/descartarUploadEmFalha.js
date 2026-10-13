import { removerArquivoUpload } from "../utils/arquivoUpload.js";
import { limparUploadAposFalha } from "../utils/arquivos.js";

export default function descartarUploadEmFalha(error, req, _res, next) {
    if (!req.uploadPersistido && req.file?.fieldname === "arquivo") {
        limparUploadAposFalha(req.file.path, { origem: "upload_integrado", patrimonioId: req.validatedParams?.id })
            .then(() => next(error), () => next(error));
        return;
    }
    if (!req.uploadPersistido && req.file?.url) {
        removerArquivoUpload(req.file.url).then(() => next(error), () => next(error));
    } else {
        next(error);
    }
}
