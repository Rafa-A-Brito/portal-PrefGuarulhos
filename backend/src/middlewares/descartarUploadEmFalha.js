import { removerArquivoUpload } from "../utils/arquivoUpload.js";

export default function descartarUploadEmFalha(error, req, _res, next) {
    if (!req.uploadPersistido && req.file?.url) {
        removerArquivoUpload(req.file.url).then(() => next(error), () => next(error));
    } else {
        next(error);
    }
}
