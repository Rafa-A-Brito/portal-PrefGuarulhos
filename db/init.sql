-- Executado automaticamente pelo container do MySQL na primeira vez que o
-- volume de dados é criado (docker-entrypoint-initdb.d). Cria as tabelas e
-- semeia os mesmos dados usados nos mocks do front (usuarios de
-- frontend/db.json e patrimônios de frontend/src/features/mocks/patrimoniosMock.js),
-- para que o admin de teste funcione e o backend tenha dados reais no MySQL.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(30) NOT NULL DEFAULT 'tecnico'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patrimonios (
  id VARCHAR(10) PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  bairro VARCHAR(100) NOT NULL,
  endereco VARCHAR(200),
  cep VARCHAR(12),
  resumo TEXT,
  imagem_principal VARCHAR(255),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ===== Usuários (credenciais de teste do painel admin) =====
INSERT INTO usuarios (nome, email, senha, perfil) VALUES
  ('Administrador', 'admin@guarulhos.sp.gov.servidor.br', 'admin123', 'admin'),
  ('Técnico de Patrimônio', 'tecnico@guarulhos.sp.gov.br', 'tecnico123', 'tecnico')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- ===== Patrimônios =====
INSERT INTO patrimonios (id, nome, categoria, bairro, endereco, cep, resumo, imagem_principal, lat, lng) VALUES
('1', 'Estação Ferroviária de Guarulhos', 'arquitetonico', 'Centro', 'Praça Vereador Vicente Alves de Souza, s/n', '07011-040', 'Antiga estação que integrou Guarulhos ao Tramway da Cantareira, marco arquitetônico do Centro.', 'estacao_ferroviaria.png', -23.4543000, -46.5333000),
('2', 'Parque Bosque Maia', 'natural', 'Jardim Maia', 'Rua Alberto Byington, s/n', '07097-030', 'Maior parque urbano de Guarulhos, considerado o pulmão verde do município e área de convivência.', 'bosque_maia.jpg', -23.4565000, -46.5292000),
('3', 'Catedral Nossa Senhora da Conceição', 'arquitetonico', 'Centro', 'Praça Tereza Cristina, 60', '07011-040', 'Sede da Diocese de Guarulhos em estilo neoclássico, construída no local da primitiva matriz colonial.', 'catedral_conceicao.png', -23.4550000, -46.5325000),
('4', 'Complexo Sanatório Padre Bento', 'arquitetonico', 'Jardim Tranquilidade', 'Rua Doutor Ramos de Azevedo, s/n', '07020-030', 'Antigo leprosário em estilo art déco/neocolonial, abriga o Teatro Padre Bento e a Igreja São João Batista.', 'sanatorio_padre_bento.jpg', -23.4530000, -46.5310000),
('5', 'Parque Ecológico do Tietê', 'natural', 'Cumbica', 'Av. Tancredo Neves, s/n', '07231-000', 'Área verde às margens do Rio Tietê, essencial para a preservação e equilíbrio ambiental da região.', 'parque_eco_tiete.png', -23.4368000, -46.4614000),
('6', 'Igreja de Nossa Senhora de Bonsucesso', 'arquitetonico', 'Bonsucesso', 'Rua Silva Bueno, s/n', '07162-160', 'Construção do século XVIII, polo religioso mais tradicional da cidade associado à Festa do Bonsucesso.', 'capela_bonsucesso.png', -23.4182000, -46.4111000),
('7', 'Festa de Nossa Senhora de Bonsucesso', 'imaterial', 'Bonsucesso', 'Rua Silva Bueno, s/n', '07162-160', 'Celebrada há mais de 280 anos, une religiosidade popular, romarias, gastronomia e feira de artesanato.', 'festa_bonsucesso.jpg', -23.4190000, -46.4105000),
('8', 'Sítio da Candinha (Casa da Candinha)', 'arquitetonico', 'Bonsucesso', 'Região do Bairro de Bonsucesso / Bananal, s/n', '07175-000', 'Raro exemplar em taipa de pilão (séc. XVIII/XIX) vinculado ao ciclo da mineração e agricultura escravagista.', 'casa_da_candinha.jpg', -23.4051000, -46.4020000),
('9', 'Casa José Maurício', 'arquitetonico', 'Centro', 'Rua Sete de Setembro, s/n', '07011-020', 'Remanescente em taipa de pilão do século XIX no centro histórico, antiga residência de personalidades locais.', 'casa_jose_mauricio.jpg', -23.4688000, -46.5312000),
('10', 'Casa Amarela (Casa do Chefe da Estação)', 'arquitetonico', 'Centro', 'Praça IV Centenário, s/n', '07011-040', 'Moradia do chefe da estação do Tramway da Cantareira, construída no início do século XX.', 'casa_amarela.jpg', -23.4545000, -46.5330000),
('11', 'Antigo Paço Municipal', 'arquitetonico', 'Centro', 'Rua Dom Pedro II, s/n', '07011-030', 'Edificação neoclássica/eclética que foi sede da Prefeitura e da Câmara Municipal ao longo do século XX.', 'antigo_paco_municipal.jpg', -23.4670000, -46.5320000),
('12', 'Centro Municipal de Educação Adamastor', 'arquitetonico', 'Macedo', 'Av. Monteiro Lobato, 734', '07112-000', 'Antigo complexo fabril reciclado para uso cultural, educacional e centro de convenções da prefeitura.', 'centro_adamastor.jpg', -23.4632000, -46.5251000),
('13', 'Casarão da Nossa História', 'arquitetonico', 'Centro', 'Rua Sete de Setembro, s/n', '07011-020', 'Imóvel restaurado com porão histórico, dedicado à preservação do acervo e memória de Guarulhos.', 'casarao_nossa_historia.jpg', -23.4680000, -46.5305000),
('14', 'E.E. Conselheiro Crispiniano', 'arquitetonico', 'Centro', 'Rua Arminda de Lima, 57', '07095-010', 'Primeira escola secundária pública da cidade, projetada em 1960 pelo arquiteto Vilanova Artigas.', 'escola_crispiniano.jpg', -23.4658000, -46.5300000),
('15', 'E.E. Capistrano de Abreu', 'arquitetonico', 'Centro', 'Rua Capitão Gabriel, s/n', '07011-010', 'Um dos primeiros grupos escolares do município, construído em alvenaria de tijolos no século XX.', 'escola_capistrano.jpg', -23.4661000, -46.5315000),
('16', 'E.E. Dulce Breves Neves', 'arquitetonico', 'Vila Galvão', 'Rua Riolândia, s/n', '07071-020', 'Prédio escolar tradicional e marco arquitetônico da expansão da rede pública de ensino.', 'escola_dulce_breves.jpg', -23.4589000, -46.5501000),
('17', 'Igreja de N. Sra. do Rosário dos Homens Pretos', 'arquitetonico', 'Centro', 'Praça do Rosário, s/n', '07011-000', 'Templo herdado da antiga irmandade colonial, símbolo da resistência e da fé afro-brasileira.', 'igreja_rosario_pretos.jpg', -23.4665000, -46.5332000),
('18', 'Igreja do Bom Jesus da Cabeça (Capelinha)', 'arquitetonico', 'Vila Augusta', 'Rua Santa Maria, s/n', '07023-000', 'Templo de devoção popular com origens rurais, marco nos caminhos de fé tradicionais.', 'igreja_bom_jesus_cabeca.jpg', -23.4750000, -46.5380000),
('19', 'Capela do Bom Jesus do Macedo', 'arquitetonico', 'Macedo', 'Av. Monteiro Lobato, s/n', '07112-000', 'Templo católico comunitário que atuou como núcleo de povoamento na primeira metade do século XX.', 'capela_macedo.jpg', -23.4620000, -46.5210000),
('20', 'Locomotiva Maria Fumaça (Nº 33) e Vagão', 'arquitetonico', 'Centro', 'Praça IV Centenário, s/n', '07011-040', 'Monumento ferroviário preservado que homenageia a memória do ''Trenzinho de Guarulhos''.', 'locomotiva_maria_fumaca.jpg', -23.4544000, -46.5328000),
('21', 'Dia da Carpição', 'imaterial', 'Bonsucesso', 'Entorno da Igreja de Bonsucesso', '07162-160', 'Tradição centenária de mutirão comunitário onde fiéis limpam o entorno da igreja como ato de fé.', 'dia_da_carpicao.jpg', -23.4182000, -46.4111000),
('22', 'Corporação Musical Banda Lira de Guarulhos', 'imaterial', 'Centro', 'Praça Getúlio Vargas, s/n', '07011-000', 'Centenária banda registrada como Bem Imaterial, conhecida pelas tradicionais retretas em praças.', 'banda_lira_guarulhos.jpg', -23.4660000, -46.5310000),
('23', 'Cultura e Presença Indígena (Wassu Cocal e Krenak/Pankararu)', 'imaterial', 'Cabuçu', 'Aldeias e territórios urbanos de Guarulhos', '07084-000', 'Memória e ritos ancestrais vivos dos povos indígenas originários que deram nome ao município.', 'cultura_indigena_guarulhos.jpg', -23.4100000, -46.5400000),
('24', 'Praça Getúlio Vargas', 'natural', 'Centro', 'Praça Getúlio Vargas, s/n', '07011-000', 'Praça pública central projetada em meados do século XX, polo de eventos culturais e sociais.', 'praca_getulio_vargas.jpg', -23.4660000, -46.5310000),
('25', 'Cemitério São João Batista', 'arquitetonico', 'Centro', 'Rua Felício Marcondes, s/n', '07010-030', 'Cemitério municipal mais antigo (séc. XIX), com acervo de arte tumular neoclássica.', 'cemiterio_sao_joao_batista.jpg', -23.4640000, -46.5320000),
('26', 'Reserva e Represa do Cabuçu', 'natural', 'Cabuçu', 'Av. Pedro de Souza Lopes, s/n', '07084-000', 'Trecho da Serra da Cantareira com a barragem de 1908, a 1ª grande obra em concreto armado do Brasil.', 'reserva_cabucu.jpg', -23.4020000, -46.5350000),
('28', 'Casarão Saraceni (Demolido em 2010)', 'arquitetonico', 'Itapegica', 'Antiga Chácara Saraceni (Anexo ao Internacional Shopping)', '07042-040', 'Imóvel eclético do início do século XX, tombado em 2000 e demolido para expansão de estacionamento.', 'casarao_saraceni_demolido.jpg', -23.4790000, -46.5450000),
('29', 'Casarão Lima (Demolido em 2026)', 'arquitetonico', 'Centro', 'Av. Monteiro Lobato, 136', '07112-000', 'Residência histórica da primeira metade do século XX demolida durante tramitação de tombamento.', 'casarao_jorge_lima.jpg', -23.4668000, -46.5290000),
('30', 'Casarão da Família Albertis (Demolido em 2023)', 'arquitetonico', 'Gopouva', 'Rua Zumbi dos Palmares, s/n', '07090-000', 'Imóvel dos anos 1940 que possuía vitrais da Casa Conrado e painel de Lisbeth Forell (resgatados antes da demolição).', 'casarao_albertis_demolido.jpg', -23.4710000, -46.5350000)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);
