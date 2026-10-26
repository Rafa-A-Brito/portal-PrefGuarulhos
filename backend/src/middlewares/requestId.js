import { randomUUID } from "node:crypto";
import { requestContext } from "../utils/logger.js";

export default function requestId(req, res, next) {
    // Sempre gerado no backend: não confia em identificadores enviados pelo cliente.
    const id = randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    requestContext.run({ requestId: id, req }, next);
}
