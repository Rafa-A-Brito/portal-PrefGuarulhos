// Recebe campos já validados. Mantém o PATCH esparso e converte o dia civil
// para o Date exigido pelo Prisma @db.Date, sempre usando UTC explicitamente.
export function dadosVisitacao(data) {
    const fields = Object.fromEntries(
        ["statusVisitacao", "motivoRestricao", "previsaoReabertura"]
            .filter(key => data[key] !== undefined)
            .map(key => [key, data[key]])
    );
    if (["ABERTO", "NAO_INFORMADO"].includes(fields.statusVisitacao)) {
        fields.motivoRestricao = null;
        fields.previsaoReabertura = null;
    } else if (typeof fields.previsaoReabertura === "string") {
        fields.previsaoReabertura = new Date(`${fields.previsaoReabertura}T00:00:00.000Z`);
    }
    return fields;
}

export function dataVisitacao(value) {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
