const formato = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export function diaSaoPaulo(agora = new Date()) {
    const partes = Object.fromEntries(formato.formatToParts(agora).map(p => [p.type, p.value]));
    return `${partes.year}-${partes.month}-${partes.day}`;
}
export function fimDiaSaoPaulo(agora = new Date()) {
    const dia = diaSaoPaulo(agora);
    let inicio = agora.getTime(), fim = inicio + 48 * 3600000;
    while (fim - inicio > 1) {
        const meio = Math.floor((inicio + fim) / 2);
        if (diaSaoPaulo(new Date(meio)) === dia) inicio = meio;
        else fim = meio;
    }
    return new Date(fim);
}
