import app from "../../src/app.js";
import prisma from "../../src/config/prisma.js";
const server = app.listen(0, "127.0.0.1", () => process.send({ port: server.address().port }));
process.on("message", message => {
    if (message === "stop") server.close(async () => { await prisma.$disconnect(); process.exit(0); });
});
