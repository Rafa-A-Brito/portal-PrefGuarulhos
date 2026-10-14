# Testes da equipe adiados na R1

Os tres arquivos `.reference` preservam integralmente as versoes recebidas no
merge, inclusive imports relativos originais. Sao referencias, nao executaveis
da suite atual. Nao foram apagados nem marcados como testes aprovados.

- `seed.patrimonios.test.js.reference`: planejamento do catalogo secundario.
- `seed.patrimonios.integration.test.js.reference`: executa carga de secoes,
  numeracao, 83 fatos e 27 ligacoes; fora do escopo aprovado, nao executado.
- `dashboard.integration.test.js.reference`: contrato territorial/regional adiado.

Os testes ativos de patrimonio/dashboard/documentacao foram reconciliados com
os contratos C2/D1A/D1B; suas versoes anteriores permanecem no commit `cfca905`.
O dashboard aprovado e validado por `dashboard.test.js` e `d1a.integration.test.js`,
incluindo fotografia transacional durante escrita concorrente.
