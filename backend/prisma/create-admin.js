/**
 * Cria o PRIMEIRO administrador (ou mais um, se precisar).
 *
 * Por que isso existe: a rota POST /api/admins só aceita quem já é ADMIN, e o
 * seed só cria um editor inativo. Sem este script, ninguém consegue logar na
 * primeira vez.
 *
 * Uso (valores só por variável de ambiente, nada fica salvo em arquivo):
 *   ADMIN_NAME="Seu Nome" ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD="uma senha longa aqui" \
 *   npm run admin:create
 *
 * As regras (e-mail válido, senha de 12 a 72 bytes) são as mesmas da rota,
 * porque o script reaproveita o createAdminSchema.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createAdminSchema } from "../src/schemas/adminSchema.js";
import { hashPassword } from "../src/utils/password.js";

if (!process.env.DATABASE_URL) {
    throw new Error("A variável DATABASE_URL é obrigatória.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const resultado = createAdminSchema.safeParse({
        nome: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        role: "ADMIN",
        password: process.env.ADMIN_PASSWORD,
    });

    if (!resultado.success) {
        for (const issue of resultado.error.issues) {
            console.error(`- ${issue.path.join(".")}: ${issue.message}`);
        }
        console.error("Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres).");
        process.exitCode = 1;
        return;
    }

    const { nome, email, role, password } = resultado.data;

    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) {
        // Não sobrescreve a senha de uma conta que já existe.
        console.log(
            `Já existe um usuário com o e-mail ${email} (perfil ${existente.role}). Nada foi alterado.`
        );
        return;
    }

    await prisma.user.create({
        data: {
            name: nome,
            email,
            role,
            passwordHash: await hashPassword(password),
            isActive: true,
        },
    });
    console.log(`Administrador criado: ${email}`);
}

main()
    .catch((error) => {
        console.error("Erro ao criar o administrador:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
