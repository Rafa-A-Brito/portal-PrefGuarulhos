# Dry-run: publicação operacional de 14 patrimônios

Data: 09/10/2026. Banco: patrimonio_guarulhos. Responsável: admin@exemplo.com.

Modo: dry-run. Selecionados: 14. Aplicados: 0. Todos os slugs existem em RASCUNHO e passaram na validação do service administrativo.

| Status | Antes | Previsto após apply |
| --- | ---: | ---: |
| PUBLICADO | 19 | 33 |
| RASCUNHO | 15 | 1 |
| ARQUIVADO | 2 | 2 |

antigo-poco-municipal permanece obrigatoriamente RASCUNHO e não integra a allowlist.

Cada item passará de RASCUNHO para PUBLICADO pelo service changePatrimonioStatus. publicadoEm (published_at) será preenchido na publicação, updatedBy apontará para o ADMIN responsável e updatedAt será atualizado pelo Prisma. IDs, slugs, createdBy, createdAt, conteúdo e relacionamentos serão preservados.

O service atual não registra AuditLog de publicação; atualiza updatedBy e publicadoEm.

160 testes aprovados: 153 unitários e 7 integrações em PostgreSQL 17 descartável; nenhum ignorado. Prisma validate aprovado. A integração cobre preflight antes da primeira escrita, rollback após falha no meio do lote, preservação dos dados, datas de publicação e recusa de repetição.

Nenhum apply executado no banco real. A CLI usou conexão PostgreSQL somente leitura. As nove coleções verificadas via Prisma mantiveram as contagens e os hashes antes e depois, registrados no JSON.

## Allowlist validada

- antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos — e578c50a-15a9-46b9-8542-f7d21c521a19 — RASCUNHO → PUBLICADO
- capela-do-bom-jesus-do-macedo — bf3a1eda-cace-420d-8498-632ce8d786a0 — RASCUNHO → PUBLICADO
- catedral-nossa-senhora-da-conceicao — 097bf643-7695-410c-8e82-d19c5625ceb1 — RASCUNHO → PUBLICADO
- cemiterio-sao-joao-batista — abf4351a-b8e3-4d73-8349-bdfc71bf1edc — RASCUNHO → PUBLICADO
- complexo-do-lago-dos-patos — 4d40a562-4a68-49a7-8b78-b19efe0b4038 — RASCUNHO → PUBLICADO
- corporacao-musical-banda-lira-de-guarulhos — 76088bd7-3dd9-4964-97dc-f903dd2272d6 — RASCUNHO → PUBLICADO
- cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu — 322b6f30-533b-4dde-b1b0-4ddada7f2228 — RASCUNHO → PUBLICADO
- dia-da-carpicao — e2c31ddc-113e-48c4-a65d-b52671af4f5b — RASCUNHO → PUBLICADO
- e-e-dulce-breves-neves — 6d8a1066-7fdf-4393-8cd2-6c9d891ed005 — RASCUNHO → PUBLICADO
- festa-de-nossa-senhora-de-bonsucesso — f2cd70ec-f28f-4257-9045-60446e01b31e — RASCUNHO → PUBLICADO
- parque-ecologico-do-tiete — 7061ac85-5251-4f58-b2b3-ca4e6b533b7e — RASCUNHO → PUBLICADO
- praca-getulio-vargas — 0b3ce18c-8eed-4366-927c-88593b775306 — RASCUNHO → PUBLICADO
- primitiva-igreja-de-nossa-senhora-do-rosario-dos-homens-pretos-1717 — 558965e3-a5af-4682-9b45-3526eb49c838 — RASCUNHO → PUBLICADO
- sitios-arqueologicos-das-lavras-velhas-do-geraldo — 455ea7a1-af41-46a5-8837-bbc6a2be6e83 — RASCUNHO → PUBLICADO
