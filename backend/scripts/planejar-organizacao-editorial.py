"""Dry-run offline do CSV aprovado e das ligações expressas no XLSX.

Uso: python backend/scripts/planejar-organizacao-editorial.py --csv arquivo.csv
     --xlsx arquivo.xlsx --saida backend/reports/organizacao-editorial-dry-run.json
Sem conexão ao banco, SQL, dependências externas ou modo de aplicação.
"""

import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import re
from uuid import UUID
import xml.etree.ElementTree as ET
from zipfile import ZipFile


NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def exigir(condicao, mensagem):
    if not condicao:
        raise ValueError(mensagem)


def ler_planilha(caminho):
    with ZipFile(caminho) as arquivo:
        strings = []
        if "xl/sharedStrings.xml" in arquivo.namelist():
            strings = ["".join(item.itertext()) for item in
                       ET.fromstring(arquivo.read("xl/sharedStrings.xml"))]
        rels = {item.attrib["Id"]: item.attrib["Target"] for item in
                ET.fromstring(arquivo.read("xl/_rels/workbook.xml.rels"))}
        abas = {}
        for aba in ET.fromstring(arquivo.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
            rel_id = aba.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            alvo = rels[rel_id]
            alvo = alvo.lstrip("/") if alvo.startswith("/") else "xl/" + alvo
            linhas = []
            for linha in ET.fromstring(arquivo.read(alvo)).findall("s:sheetData/s:row", NS):
                valores = {}
                for celula in linha.findall("s:c", NS):
                    valor = celula.find("s:v", NS)
                    texto = valor.text if valor is not None else ""
                    if celula.get("t") == "s":
                        texto = strings[int(texto)]
                    elif celula.get("t") == "inlineStr":
                        texto = "".join(celula.find("s:is", NS).itertext())
                    valores[re.sub(r"\d", "", celula.attrib["r"])] = texto
                linhas.append((int(linha.attrib["r"]), valores))
            abas[aba.attrib["name"]] = linhas
        return abas


def planejar(csv_path, xlsx_path):
    with csv_path.open(encoding="utf-8-sig", newline="") as arquivo:
        itens = list(csv.DictReader(arquivo, delimiter=";"))
    campos = {"id", "slug", "nome", "status", "novaRegiaoSlug", "novoNumeroExibicao", "novaOrdemExibicao"}
    exigir(len(itens) == 36 and all(campos <= item.keys() for item in itens), "CSV deve conter os 36 bens e as colunas aprovadas.")
    por_slug = {item["slug"]: item for item in itens}
    exigir(len(por_slug) == 36 and len({item["id"] for item in itens}) == 36, "ID ou slug duplicado no CSV.")
    for item in itens:
        UUID(item["id"])
    for campo in ["novoNumeroExibicao", "novaOrdemExibicao"]:
        valores = sorted(int(item[campo]) for item in itens if item[campo])
        exigir(valores == list(range(1, 34)), f"{campo}: esperado intervalo único de 1 a 33.")
    exigir(all(bool(item["novoNumeroExibicao"]) == (item["status"] == "PUBLICADO")
               and item["novoNumeroExibicao"] == item["novaOrdemExibicao"] for item in itens), "Números/ordens incompatíveis com os status aprovados.")
    sem_regiao = {item["slug"] for item in itens if not item["novaRegiaoSlug"]}
    exigir(sem_regiao == {"cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu", "parque-ecologico-do-tiete"}, "As duas regiões vazias divergem da proposta aprovada.")
    abas = ler_planilha(xlsx_path)
    classificacao = [row for n, row in abas["Classificacao_36"] if n > 1 and row.get("B")]
    exigir(len(classificacao) == 36 and {row["B"] for row in classificacao} == por_slug.keys(), "Identidades divergentes entre CSV e XLSX.")
    for row in classificacao:
        item = por_slug[row["B"]]
        for coluna, campo in [("A", "id"), ("C", "nome"), ("D", "status"), ("H", "novoNumeroExibicao"), ("I", "novaOrdemExibicao"), ("J", "novaRegiaoSlug")]:
            exigir(row.get(coluna, "") == item[campo], f"CSV/XLSX divergentes: {item['slug']} / {campo}.")

    # Estes conjuntos apenas qualificam as linhas expressamente propostas.
    # Não geram pares, relações inversas ou vínculos pelo eixo temático.
    contextos_especificos = [
        {"antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao", "catedral-nossa-senhora-da-conceicao"},
        {"primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717", "igreja-de-nossa-senhora-do-rosario-dos-homens-pretos"},
        {"igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico", "festa-de-nossa-senhora-de-bonsucesso", "dia-da-carpicao"},
        {"estacao-ferroviaria-central-de-guarulhos", "casa-amarela-casa-do-chefe-da-estacao", "locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua"},
        {"antiga-fabrica-adamastor", "antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos"},
    ]
    ligacoes, pares = [], set()
    for linha, row in abas["Ligacoes_sugeridas"]:
        if linha == 1 or not row.get("B"):
            continue
        origem, destino = row["B"], row["D"]
        exigir(origem in por_slug and destino in por_slug, f"Destino/origem desconhecido na linha {linha}.")
        exigir(origem != destino and (origem, destino) not in pares, f"Autorrelação ou par repetido na linha {linha}.")
        exigir(all(por_slug[slug]["status"] == "PUBLICADO" for slug in (origem, destino)), f"Bem não publicado na linha {linha}.")
        exigir(0 < len(row.get("F", "").strip()) <= 2000, f"Texto inválido na linha {linha}.")
        pares.add((origem, destino))
        especifico = row.get("G") != "REVISAR" and any({origem, destino} <= grupo for grupo in contextos_especificos)
        ligacoes.append({
            "linhaPlanilha": linha, "origemSlug": origem, "destinoSlug": destino,
            "patrimonioOrigemId": por_slug[origem]["id"], "patrimonioDestinoId": por_slug[destino]["id"],
            "texto": row["F"], "situacaoFonte": row["G"], "observacaoFonte": row.get("H", ""),
            "revisao": "VALIDAR_VINCULO_ESPECIFICO" if especifico else "JUSTIFICAR_VINCULO_ALEM_DO_EIXO",
            "aprovada": False,
        })
    exigir(len(ligacoes) == 38, "Esperadas 38 propostas direcionais expressas na planilha.")
    return {
        "modo": "dry-run-offline", "gravacoesNoBanco": 0, "validadoNoBanco": False,
        "fontes": [{"arquivo": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()} for path in (csv_path, xlsx_path)],
        "resumo": {"patrimonios": len(itens), "numerosEOrdens": 33, "vinculosRegionais": 34,
                   "regioesIntencionalmenteVazias": 2, "porRegiao": dict(Counter(item["novaRegiaoSlug"] or "SEM_REGIAO" for item in itens)),
                   "relacoesPropostas": len(ligacoes), "porRevisao": dict(Counter(item["revisao"] for item in ligacoes))},
        "pendencias": [
            "Aprovação explícita antes de qualquer gravação editorial ou de relações.",
            "Conferir no banco IDs, slugs, status, regiões ativas e colisões de números antes da aplicação; resolver regiaoId pelo slug, sem criar regiões.",
            "Campos vazios são intencionais (null); não publicar rascunho nem arquivados, nem alterar categorias ou criar eixos.",
            "Validar historicamente cada texto e aprovar cada direção; afinidade temática isolada não basta.",
            "Comparar relações existentes por origem/destino, preservar textos e ordens atuais; somente após aprovação atribuir ordens livres às novas relações pelo CRUD existente.",
        ],
        "editorial": [{"id": item["id"], "slug": item["slug"], "statusEsperado": item["status"],
                       "regiaoSlug": item["novaRegiaoSlug"] or None,
                       "numeroExibicao": int(item["novoNumeroExibicao"]) if item["novoNumeroExibicao"] else None,
                       "ordemExibicao": int(item["novaOrdemExibicao"]) if item["novaOrdemExibicao"] else None} for item in itens],
        "ligacoesPropostas": ligacoes,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument("--saida", required=True, type=Path)
    args = parser.parse_args()
    exigir(args.saida.resolve() not in {args.csv.resolve(), args.xlsx.resolve()}, "A saída não pode sobrescrever as fontes.")
    plano = planejar(args.csv, args.xlsx)
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(plano, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(plano["resumo"], ensure_ascii=False))


if __name__ == "__main__":
    main()
