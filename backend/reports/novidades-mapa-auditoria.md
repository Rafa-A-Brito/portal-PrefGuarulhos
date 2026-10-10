# Auditoria adicional: novidades e Google Maps

Data: 09/10/2026. Nenhum apply foi executado no banco real.

## Resultado e causa

As páginas ConhecaMais e ConhecaMaisDetalhes já buscavam GET /api/novidades. A tabela real estava vazia; conectar novamente o mock ao frontend de produção esconderia a ausência dos registros. Foi criado um importador separado, usando o schema Zod atual e o mesmo mapeamento de campos da API. Não há alteração de schema, seed, pesquisa editorial ou layout.

O mapa usava MarkerF, que instancia google.maps.Marker. A versão instalada de @react-google-maps/api não oferece um componente Advanced Marker. O wrapper novo recebe a instância real do mapa e usa AdvancedMarkerElement, filhos DOM próprios e o evento gmp-click. A biblioteca marker é carregada pelo hook compartilhado. Não há nova chamada de geocoding.

## Comparação campo a campo

| Fonte editorial | Prisma / API | Tratamento |
| --- | --- | --- |
| id | slug único; UUID gerado pelo Prisma | Identidade estável do editorial; UUIDs existentes nunca são substituídos. |
| tipo | TipoNovidade / tipo | noticia/evento convertidos para NOTICIA/EVENTO. |
| tag | tag / tag | Preservada. |
| data | Date / data YYYY-MM-DD | Quatro notícias preservam a data. Eventos usam o primeiro dia do bloco e o mês do grupo em 2026, como o fallback existente. |
| bloco.dia | blocoDia / bloco.dia | Preservado inclusive intervalos, como 17–18. |
| bloco.mes | blocoMes / bloco.mes | Preservado inclusive Out/2026 na feira. |
| bloco.legenda | blocoLegenda / bloco.legenda | Preservada. |
| titulo | titulo / titulo | Preservado. |
| resumo | resumo / resumo | Preservado; ausência em eventos vira null, permitida pelo schema. |
| texto | texto / texto | Preservado integralmente. |
| quando | quando / quando | Preservado, sem inventar horários. |
| local | local / local | Preservado. |
| imagem | imagemUrl / imagemUrl | As quatro imagens existem. No apply, cópia exclusiva para uploads/novidades com nome SHA-256; /src/assets não é persistido como URL pública. |
| cta.rotulo, cta.url | ctaRotulo, ctaUrl / cta aninhado | Preservados; URLs passam pela validação HTTP(S) existente. |
| fontes | JSONB / fontes | Veículo, assunto e URL preservados. |

Total confirmado: 4 notícias de setembro, 5 eventos de outubro, 5 de novembro e 2 de dezembro = 16.

A feira não define dia exato. O responsável autorizou 01/10/2026 exclusivamente como referência de ordenação. O bloco “Out / 2026 — várias datas” e o texto quando permanecem originais; o relatório individual registra a ressalva.

## Importação operacional

Executar a partir de backend, com o checkout completo contendo o arquivo editorial e os assets do frontend:

~~~powershell
node scripts/import-novidades.js --created-by-email=admin@exemplo.com
node scripts/import-novidades.js --created-by-email=admin@exemplo.com --status=PUBLICADO --dry-run
~~~

O primeiro comando usa dry-run e RASCUNHO. ADMIN e EDITOR devem existir e estar ativos. PUBLICADO exige ADMIN, conforme a API. Rascunhos não aparecem no GET público.

O apply futuro exige, conjuntamente, --apply e --confirm-db=patrimonio_guarulhos. A CLI é restrita a esse banco e valida a URL sem imprimir credenciais. Nenhum apply foi executado nesta tarefa.

Todos os itens, autor, fontes, slugs e arquivos são verificados antes da primeira escrita. A transação usa isolamento Serializable. A conexão do dry-run é forçada a read-only pelo PostgreSQL. Itens idênticos são ignorados. Diferenças de conteúdo ou status e títulos encontrados sob outro slug geram conflito, impedem todo o lote e resultam em exit code 1 na CLI. Não existe opção force. O relatório mantém atualizar=0: este importador conservador não sobrescreve conteúdo administrativo diferente nem muda status de registros existentes.

Não há exclusões. Registros existentes preservam IDs, autoria, datas e conteúdo. Criações publicadas recebem publicadoEm conforme a regra atual. O service de Novidade não registra AuditLog; o importador registra createdBy para os novos registros.

Arquivos de imagem são imutáveis por hash e gravados com flag wx. Uma falha no banco desfaz todos os registros. Arquivos novos podem permanecer órfãos após rollback; não são removidos automaticamente, para evitar apagar arquivo que uma importação concorrente já use. O dry-run não copia imagens nem cria pastas.

## Dry-run real

Arquivo: novidades-import-dry-run.json.

- Banco: patrimonio_guarulhos, acesso somente leitura.
- Autor: admin@exemplo.com, ativo e ADMIN.
- Status planejado: PUBLICADO.
- Criar: 16; atualizar: 0; ignorar: 0; conflitos: 0; aplicados: 0.
- Tabela novidade: 0 registros antes e depois; checksums iguais.

Portanto, os 16 itens ainda não estão disponíveis na API real. A comprovação do fluxo completo foi feita no PostgreSQL descartável: importar, GET /api/novidades, comparar todos os campos dos 16 registros e consultar as quatro imagens por HTTP. As páginas foram testadas com o transporte Axios substituído por respostas de API; o componente e o serviço reais foram executados. Resposta vazia não aciona mock, e falha de rede em produção é propagada. O fallback continua restrito a DEV. O build não inclui conteudoMock/novidadesMock.

Nos detalhes, a escolha de ícones passou a usar slug, pois id da API é UUID. Navegação e âncoras continuam usando o ID retornado pela API.

## Advanced Markers

Configuração: VITE_GOOGLE_MAPS_MAP_ID no frontend ou no build Docker; encaminhada pelo Dockerfile e docker-compose.yml. O fallback DEMO_MAP_ID foi usado no smoke, conforme a documentação Google para testes. Para produção, configurar o Map ID JavaScript do projeto Google Cloud. A chave existente não foi alterada ou incluída no relatório.

Mantidos: formato/cor/tamanho dos pinos, coordenadas backend normalizadas, seleção controlada/interna, InfoWindow, filtros, enquadramento e estilos responsivos. O wrapper atualiza posição/título sem recriar o marcador, remove o listener gmp-click, desassocia map e limpa filhos no unmount. Cada marcador possui seu próprio elemento DOM.

Smoke reproduzível, a partir de frontend:

~~~powershell
node scripts/smoke-mapa.mjs
~~~

Requer Chrome/Edge (ou CHROME_PATH) e a configuração Google do ambiente. Inicia Vite em 5175 e navegador headless com perfil temporário. Usa dois patrimônios fictícios, não acessa backend/banco e não chama Geocoder. Fecha servidor e navegador ao terminar. O perfil temporário fica no diretório temporário do sistema. A página de teste não faz parte do build de produção.

Resultado real no Chrome: 2 Advanced Markers; clique físico via DevTools; InfoWindow aberto; filtro remove marcador; posição Decimal/string correta; viewport 390 px; unmount remove marcadores; nenhuma exceção JavaScript; nenhum warning de google.maps.Marker deprecated.

Contrato consultado: [migração Google](https://developers.google.com/maps/documentation/javascript/advanced-markers/migration) e [referência AdvancedMarkerElement](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers). Usados filhos DOM e addEventListener('gmp-click'), evitando também content/addListener depreciados na referência atual.

## Validações executadas

- Frontend: npm test — 39 testes aprovados em 5 arquivos (inclui a auditoria Admin Patrimônios).
- Frontend: npm run lint — aprovado.
- Frontend: npm run build — aprovado.
- Backend: suíte completa em PostgreSQL 17 descartável — 166 aprovados, 0 falhas, 0 ignorados; container removido.
- Importador PostgreSQL: dry-run sem gravação, permissões, conflito tardio sem escrita, rollback real por FK após quatro inserts, criação 16/16, repetição sem alterações, preservação de UUIDs/autoria/datas, GET público e imagens HTTP.
- Backend: npm run prisma:validate — aprovado. Sem migration nova.
- Google Maps: smoke com API e navegador reais aprovado.
- Avisos existentes não bloqueantes: chunk frontend acima de 500 kB e depreciação do driver pg.

## Arquivos desta etapa

Backend: scripts/import-novidades.js; src/utils/novidadeData.js; src/services/novidadeService.js; test/importNovidades.test.js; test/importNovidades.integration.test.js; reports/novidades-import-dry-run.json; este relatório.

Frontend: src/features/mapa/AdvancedMarker.jsx; src/features/mapa/MapaPatrimonios.jsx; src/hooks/useGoogleMaps.js; src/pages/ConheceMaisDetalhes/ConhecaMaisDetalhes.jsx; test/ConhecaMais.test.jsx; test/MapaPatrimonios.test.jsx; test/googleMapsLoader.test.jsx; test/mapa-smoke.html; scripts/smoke-mapa.mjs; .env.example; Dockerfile.

Raiz: .env.example e docker-compose.yml (encaminhamento do Map ID).

A auditoria anterior dos botões, causas, handlers, endpoints, correções e roteiro manual permanece em frontend/reports/admin-patrimonios-auditoria.md. A suíte completa desta etapa voltou a validar esse trabalho.

## Roteiro manual

1. Usar ambiente descartável de teste para importações. Executar dry-run, revisar os 16 slugs e a ressalva da feira. Testar conflito alterando uma fixture administrativa: o lote deve bloquear sem criar registros.
2. No ambiente de teste, importar como ADMIN com status PUBLICADO. Consultar GET /api/novidades?limite=100 e conferir 16 registros e quatro URLs de imagem acessíveis. Repetir o dry-run: 16 ignorados, 0 criações/atualizações/conflitos.
3. Abrir /conheca-mais e /conheca-mais/detalhes. Conferir 4 notícias, 12 eventos, texto, datas/blocos, local, CTA e fontes. Na aba Network, conferir /api/novidades. Clicar Leia mais e verificar rolagem para o UUID retornado. Em produção, backend indisponível deve exibir erro, sem exemplos editoriais locais.
4. Abrir /mapa com Google configurado. Selecionar pinos e cards, fechar InfoWindow, mudar filtros e testar largura de 390 px. Conferir ausência do warning Marker deprecated e de chamadas adicionais ao Geocoder. Sair e voltar à página: marcadores/listeners não devem duplicar.
5. Para lápis, salvar, publicação, arquivamento, upload e ADMIN/EDITOR, seguir o roteiro detalhado da auditoria administrativa anterior, somente com fixtures de teste.
