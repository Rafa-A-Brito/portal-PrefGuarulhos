# D1B — auditoria documental para a futura D1C

Leitura do catálogo no ZIP da equipe e comparação com a fonte canônica atual. Nenhum script da equipe executado, nenhum dado importado e nenhuma consulta ao banco real. Os IDs numéricos abaixo são identificadores do catálogo da equipe, não UUIDs de banco.

## Contagens verificadas

- Registros na equipe: 34; identidades canônicas distintas resolvidas: 33.
- Fatos: 83; 80 vinculados diretamente a identidade canônica e 3 via alias consolidado.
- Ligações: 27; origens: 25 diretas e 2 via alias; destinos: 26 diretos e 1 via alias.
- Referências individuais (83 vínculos de fato + 54 pontas de ligação): 137; 131 diretas, 6 via alias.
- Destinos inexistentes: 0. IDs de destino ambíguos: 0 (IDs únicos no catálogo). Resoluções pendentes: 0.
- Autorrelações após consolidação: 2, 9 → 13 e 13 → 9 (Casa José Maurício ↔ Casarão da Nossa História).
- Duplicatas direcionadas adicionais após retirar autorrelações: 1; 13 → 11 repete 9 → 11 após consolidação.

“Direta” significa a mesma identidade na fonte atual, incluindo equivalências de slug já documentadas pelo importador atual. “Alias” nesta contagem significa exclusivamente consolidação de dois registros físicos em uma identidade, não mera variação de título/slug. A conferência é documental, não certifica UUIDs no banco real.

O registro 13 resolve para Casa José Maurício e não deve recriar o legado. Seus três fatos exigem revisão de conteúdo/deduplicação na D1C. Após excluir as duas autorrelações e tratar a duplicata, restam 24 pares direcionados candidatos, ainda sem aprovação de conteúdo ou importação.

Albertis (30) resolve para a identidade canônica atual; o catálogo não contém uma entrada separada para Casarão do Sítio Ponte Alta, portanto há zero referências desse alias nesta extração. A Primitiva Igreja do Rosário (1717), existente na fonte canônica, está ausente no catálogo da equipe. Os 34 registros da equipe não substituem os 34 canônicos.

## Mapeamento documental

| ID equipe | Nome equipe | Slug canônico atual | Resolução | Fatos | Ligações de saída |
| --- | --- | --- | --- | --- | --- |
| 1 | Estação Ferroviária de Guarulhos | estacao-ferroviaria-central-de-guarulhos | DIRETA | 4 | 2 |
| 2 | Parque Bosque Maia | bosque-maia | DIRETA | 3 | 0 |
| 3 | Catedral Nossa Senhora da Conceição | catedral-nossa-senhora-da-conceicao | DIRETA | 3 | 1 |
| 4 | Complexo Sanatório Padre Bento | sanatorio-padre-bento | DIRETA | 3 | 0 |
| 5 | Parque Ecológico do Tietê | parque-ecologico-do-tiete | DIRETA | 0 | 0 |
| 6 | Igreja de Nossa Senhora de Bonsucesso | igreja-de-nossa-senhora-de-bonsucesso-e-nucleo-historico | DIRETA | 3 | 2 |
| 7 | Festa de Nossa Senhora de Bonsucesso | festa-de-nossa-senhora-de-bonsucesso | DIRETA | 3 | 2 |
| 8 | Sítio da Candinha (Casa da Candinha) | sitio-da-candinha-casa-da-candinha | DIRETA | 4 | 0 |
| 9 | Casa José Maurício | casa-jose-mauricio | DIRETA | 4 | 2 |
| 10 | Casa Amarela (Casa do Chefe da Estação) | casa-amarela-casa-do-chefe-da-estacao | DIRETA | 3 | 2 |
| 11 | Antigo Paço Municipal | antigo-paco-municipal | DIRETA | 4 | 2 |
| 12 | Centro Municipal de Educação Adamastor | antiga-fabrica-adamastor | DIRETA | 3 | 0 |
| 13 | Casarão da Nossa História | casa-jose-mauricio | ALIAS | 3 | 2 |
| 14 | E.E. Conselheiro Crispiniano | escola-estadual-conselheiro-crispiniano | DIRETA | 3 | 0 |
| 15 | E.E. Capistrano de Abreu | escola-estadual-capistrano-de-abreu | DIRETA | 2 | 0 |
| 16 | E.E. Dulce Breves Neves | e-e-dulce-breves-neves | DIRETA | 1 | 0 |
| 17 | Igreja de N. Sra. do Rosário dos Homens Pretos | igreja-de-nossa-senhora-do-rosario-dos-homens-pretos | DIRETA | 3 | 0 |
| 18 | Igreja do Bom Jesus da Cabeça | igreja-do-bom-jesus-da-cabeca | DIRETA | 2 | 0 |
| 19 | Capela do Bom Jesus do Macedo | capela-do-bom-jesus-do-macedo | DIRETA | 1 | 0 |
| 20 | Locomotiva Maria Fumaça (Nº 33) e Vagão | locomotiva-maria-fumaca-n-33-vagao-e-caixa-d-agua | DIRETA | 3 | 2 |
| 21 | Dia da Carpição | dia-da-carpicao | DIRETA | 2 | 2 |
| 22 | Corporação Musical Banda Lira de Guarulhos | corporacao-musical-banda-lira-de-guarulhos | DIRETA | 0 | 0 |
| 23 | Cultura e Presença Indígena (Wassu Cocal e Krenak/Pankararu) | cultura-e-presenca-indigena-wassu-cocal-e-krenak-pankararu | DIRETA | 0 | 0 |
| 24 | Praça Getúlio Vargas | praca-getulio-vargas | DIRETA | 2 | 1 |
| 25 | Cemitério São João Batista | cemiterio-sao-joao-batista | DIRETA | 2 | 0 |
| 26 | Reserva e Represa do Cabuçu | represa-do-cabucu | DIRETA | 3 | 0 |
| 27 | Sítios Arqueológicos das Lavras Velhas do Geraldo | sitios-arqueologicos-das-lavras-velhas-do-geraldo | DIRETA | 0 | 0 |
| 32 | Complexo do Lago dos Patos | complexo-do-lago-dos-patos | DIRETA | 3 | 0 |
| 33 | Antigo Poço Municipal | antigo-poco-municipal | DIRETA | 0 | 0 |
| 28 | Casarão Saraceni (Demolido em 2010) | casarao-saraceni | DIRETA | 4 | 2 |
| 29 | Casarão Lima (Demolido em 2026) | casarao-lima | DIRETA | 2 | 2 |
| 30 | Casarão da Família Albertis (Demolido em 2023) | casarao-da-familia-albertis | DIRETA | 4 | 2 |
| 31 | Antiga Carbonell Fiação e Tecelagem e Casarões Gêmeos (Demolidos) | antiga-carbonell-fiacao-e-tecelagem-e-casaroes-gemeos-demolidos | DIRETA | 3 | 0 |
| 34 | Antiga Igreja Matriz Colonial de N. Sra. da Conceição (Demolida) | antiga-igreja-matriz-colonial-de-nossa-senhora-da-conceicao | DIRETA | 3 | 1 |

D1C não iniciada. Este relatório não autoriza persistir fatos/ligações nem substituir endereço, coordenada, descrição ou nota documental.
