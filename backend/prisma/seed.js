import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/utils/password.js";
import { slugify } from "../src/utils/slug.js";
import { PATRIMONIOS_SEED } from "./patrimonioSeedData.js";

if (!process.env.DATABASE_URL) {
    throw new Error("A variável DATABASE_URL é obrigatória para executar o seed.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
import { UPLOAD_DIR as uploadDir } from "../src/config/uploadDir.js";
const sourceUploads = path.resolve(process.cwd(), "src", "uploads");

const CATEGORIAS = [
    ["Arquitetônico", "Edificações de valor histórico e arquitetônico"],
    ["Imaterial", "Festas, tradições, saberes e expressões culturais vivas"],
    ["Ferroviário", "Bens ligados ao Tramway da Cantareira e à ferrovia"],
    ["Industrial", "Fábricas e edificações de uso industrial"],
    ["Educacional", "Escolas e edificações de ensino público"],
    ["Ambiental", "Parques, represas e bens de valor ambiental/paisagístico"],
    ["Histórico", "Sítios e edificações de relevância histórica e cultural"],
].map(([nome, descricao]) => ({ nome, descricao }));

function repararUtf8(texto) {
    if (typeof texto !== "string" || !/[ÃÂ]/.test(texto)) return texto;
    try {
        const reparado = Buffer.from(texto, "latin1").toString("utf8");
        return reparado.includes("�") ? texto : reparado;
    } catch {
        return texto;
    }
}

function localizacaoData(item) {
    if (!item.endereco || !item.bairro) return null;
    return {
        endereco: item.endereco,
        numero: item.numero ?? null,
        complemento: null,
        bairro: item.bairro,
        cidade: "Guarulhos",
        uf: "SP",
        cep: item.cep ?? null,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
    };
}

// No UPDATE do re-seed, item sem coordenadas no seed NÃO pode zerar as que já
// existem no banco (por exemplo, calculadas depois pelo geocoding do admin).
// Só sobrescreve latitude/longitude quando o seed traz as duas.
function localizacaoUpdateData(localizacao) {
    if (localizacao.latitude !== null && localizacao.longitude !== null) return localizacao;

    const { latitude, longitude, ...semCoordenadas } = localizacao;
    return semCoordenadas;
}

async function copiarUploadsIniciais() {
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.cp(sourceUploads, uploadDir, { recursive: true, force: false }).catch((error) => {
        if (error.code !== "ENOENT") throw error;
    });
}

async function main() {
    await copiarUploadsIniciais();

    const seedUser = await prisma.user.upsert({
        where: { email: "seed.patrimonios@localhost.invalid" },
        update: {},
        create: {
            name: "Importação inicial de patrimônios",
            email: "seed.patrimonios@localhost.invalid",
            passwordHash: await hashPassword(randomUUID()),
            role: "EDITOR",
            isActive: false,
        },
    });

    const categoriasPorNome = {};
    for (const categoriaData of CATEGORIAS) {
        const dados = { ...categoriaData, slug: slugify(categoriaData.nome).slice(0, 120) };
        const categoria = await prisma.categoria.upsert({
            where: { nome: dados.nome },
            update: { slug: dados.slug, descricao: dados.descricao },
            create: dados,
        });
        categoriasPorNome[categoria.nome] = categoria;
    }

    for (const item of PATRIMONIOS_SEED) {
        const slug = slugify(item.nome);
        const categoria = categoriasPorNome[item.categoria];
        if (!categoria) throw new Error(`Categoria não cadastrada no seed: ${item.categoria}`);

        const localizacao = localizacaoData(item);
        const dadosPublicos = {
            nome: item.nome,
            descricao: repararUtf8(item.descricao),
            descricaoResumida: repararUtf8(item.descricaoResumida || item.descricao?.slice(0, 500)),
            historia: repararUtf8(item.historia),
            importanciaCultural: repararUtf8(item.importanciaCultural),
            situacao: item.situacao,
            status: "PUBLICADO",
            categoriaId: categoria.id,
            publicadoEm: new Date(),
        };

        const patrimonio = await prisma.patrimonio.upsert({
            where: { slug },
            update: {
                ...dadosPublicos,
                ...(localizacao && {
                    localizacao: {
                        upsert: { create: localizacao, update: localizacaoUpdateData(localizacao) },
                    },
                }),
            },
            create: {
                ...dadosPublicos,
                slug,
                createdBy: seedUser.id,
                ...(localizacao && { localizacao: { create: localizacao } }),
            },
            select: { id: true },
        });

        await prisma.patrimonioDetalhe.deleteMany({ where: { patrimonioId: patrimonio.id } });
        if (item.detalhes?.length) {
            await prisma.patrimonioDetalhe.createMany({
                data: item.detalhes.map((detalhe, ordem) => ({
                    patrimonioId: patrimonio.id,
                    icone: detalhe.icone ?? null,
                    titulo: repararUtf8(detalhe.titulo),
                    texto: repararUtf8(detalhe.texto),
                    ordem,
                })),
            });
        }

        if (item.imagem) {
            const url = `/uploads/patrimonios/${item.imagem}`;
            const atual = await prisma.patrimonioImagem.findFirst({
                where: { patrimonioId: patrimonio.id, principal: true },
                select: { id: true },
            });
            if (atual) {
                await prisma.patrimonioImagem.update({
                    where: { id: atual.id },
                    data: { url, textoAlternativo: item.nome, ordem: 0, principal: true },
                });
            } else {
                await prisma.patrimonioImagem.create({
                    data: {
                        patrimonioId: patrimonio.id,
                        url,
                        textoAlternativo: item.nome,
                        ordem: 0,
                        principal: true,
                    },
                });
            }
        }
    }

    console.log(`Seed concluído: ${PATRIMONIOS_SEED.length} patrimônios processados.`);
}

main()
    .catch((error) => {
        console.error("Erro ao rodar o seed:", error);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
