// Revisao documental, item a item. IDs numericos sao apenas chaves da auditoria.
// D = duplicacao; C = contradicao/ressalva perdida; P = pendente de fonte; R = rejeicao editorial.
// O segundo campo aponta a evidencia canonica, nunca um endereco a sobrescrever.
export const REVISAO_FATOS = {
    '1': [
        ['D', 'Inauguração em 1915', 'A data completa ja esta explicitada no detalhe.'],
        ['D', 'Inauguração em 1915', 'O mesmo detalhe identifica o ramal e o Tramway.'],
        ['D', 'O fim do ramal', '1965 ja e informado como encerramento do ramal.'],
        ['R', '$descricao', 'Repete o decreto e o ano ja expostos na descricao; nao acrescenta informacao editorial.'],
    ],
    '2': [
        ['R', '$descricao', 'Tipo generico ja expresso no cadastro e na descricao.'],
        ['D', 'Mata Atlântica no centro', 'Bioma ja explicado no detalhe ambiental.'],
        ['D', 'Proteção paisagística e ambiental', 'Ano de protecao ja explicado; o fato perde o escopo paisagistico/ambiental.'],
    ],
    '3': [
        ['D', 'Sede da diocese', 'A funcao diocesana ja esta explicitada.'],
        ['D', 'Estilo neoclássico e eclético', 'Repete a classificacao arquitetonica.'],
        ['D', 'Estilo neoclássico e eclético', 'A datacao aproximada ja esta no detalhe; nao converter em data precisa.'],
    ],
    '4': [
        ['D', 'Um asilo-colônia', 'Decada e funcao historica ja contextualizadas.'],
        ['D', 'Art déco e neocolonial', 'Repete a explicacao arquitetonica.'],
        ['D', 'Proteção estadual e municipal', 'O processo ja consta no detalhe; a descricao delimita a protecao estadual ao Cine-Teatro/Capela. Nao ampliar a abrangencia.'],
    ],
    '6': [
        ['D', 'Fundada no século XVIII', 'Datacao ja explicada.'],
        ['D', 'Tombada em 2000', 'Ano e decreto ja explicados.'],
        ['R', 'Romarias e festa', 'Agosto e calendario da manifestacao, nao fato proprio do edificio. A ligacao editorial leva a ficha da Festa.'],
    ],
    '7': [
        ['D', 'Quase três séculos de tradição', 'Mes ja registrado; nao equivale a agenda confirmada de todas as edicoes.'],
        ['D', 'Quase três séculos de tradição', 'Origem aproximada ja contextualizada.'],
        ['D', 'Local de realização e referência', 'C2 distingue realizacao/referencia de endereco exclusivo. Nao reduzir o bem imaterial ao bairro/edificio.'],
    ],
    '8': [
        ['D', 'Taipa de pilão e bambu', 'A estimativa de 1825 ja consta com a ressalva provavelmente.'],
        ['D', 'Taipa de pilão e bambu', 'Tecnica construtiva ja descrita.'],
        ['D', 'A senzala que resiste', 'O tema ja esta explicado; nao transformar singularidade historica em nova verificacao de conservacao atual.'],
        ['D', 'Proteção', 'Ano e atos de protecao ja discriminados.'],
    ],
    '9': [
        ['C', 'Residência de um prefeito', '1925 absoluto elimina a divergencia 1925 (fontes municipais) / 1937 (AAPAH), preservada em C1/C2.'],
        ['P', '$descricao', 'O numero do decreto atribuido a este imovel nao e demonstrado pelos detalhes atuais. Exige ato com identificacao individual do bem.'],
        ['D', 'Abandono e compra pela prefeitura', 'Compra em junho de 2013 ja contextualizada.'],
        ['D', 'O lugar hoje', 'Reabertura em 2025 ja contextualizada.'],
    ],
    '10': [
        ['D', 'Casa do chefe da estação', 'Periodo e funcao original ja descritos.'],
        ['D', 'Depois da ferrovia', 'Tombamento conjunto em 2000 ja explicado; descricao cita o decreto.'],
        ['D', 'Depois da ferrovia', 'Usos historicos ja explicados; evitar confusao com o uso atual.'],
    ],
    '11': [
        ['C', 'Sede do poder municipal', '1919 a 1923 conflita com o inicio das obras em 1921 adotado na fonte canonica.'],
        ['D', 'Neoclássico, em tijolo maciço', 'Estilo ja descrito com caracteristicas construtivas.'],
        ['P', 'Depois da prefeitura', 'A saida do Paço nao e datada neste detalhe. A mudanca para a Praca em 1958 nao comprova, sozinha, ocupacao continua deste predio ate esse ano.'],
        ['D', 'Sede do poder municipal', 'Decreto ja identificado no detalhe.'],
    ],
    '12': [
        ['D', 'Antiga Fábrica Adamastor', 'Periodo aproximado ja descrito.'],
        ['P', '$descricao', 'A descricao protege elementos como chamine/pavilhao; nao sustenta por si so ano/decreto nem tombamento de todo o complexo. Exige ato e delimitacao.'],
        ['D', 'O lugar hoje', 'Funcao cultural/educacional ja exposta.'],
    ],
    '13': [
        ['C', 'Residência de um prefeito', 'Repete F-9-0 na mesma identidade e igualmente apaga a divergencia 1925/1937. Nao recriar o legado.'],
        ['D', 'O lugar hoje', 'Repete F-9-3 e o detalhe da mesma Casa Jose Mauricio; nenhuma segunda identidade.'],
        ['D', 'Numeração documental divergente', 'Esquina ja documentada na nota C2; preservar a distincao 150 historico / 207 atual sem converter a esquina em novo cadastro.'],
    ],
    '14': [
        ['D', 'Projeto de Vilanova Artigas', 'Ano do projeto ja explicitado.'],
        ['D', 'Projeto de Vilanova Artigas', 'Autoria ja exposta; a descricao tambem registra Carlos Cascaldi, que o fato isolado omite.'],
        ['D', 'Marco da arquitetura moderna', 'Processo ja citado; nao confundir numero de processo com data do ato.'],
    ],
    '15': [
        ['D', 'Arquitetura acadêmica em tijolos', 'Tecnica ja descrita.'],
        ['D', 'Expansão da rede pública', 'Tombamento em 2000 ja contextualizado; descricao informa decreto.'],
    ],
    '16': [['D', 'Tombada em 2012', 'Lei e data completas ja constam no detalhe; coordenadas SEDUC nao sao alteradas.']],
    '17': [
        ['C', 'Quase 200 anos na Rua Dom Pedro II', 'Rotulo Fundacao atribui ao edificio atual a origem do templo anterior. C2 separa a igreja atual do sitio primitivo de 1717; ha divergencia cronologica interna que nao deve ser achatada.'],
        ['D', 'Demolida e reconstruída em 1930', 'Transicao historica ja explicada; o fato isolado perde demolicao/realocacao e distincao dos dois bens.'],
        ['D', 'Memória e apagamento', 'Rua Dom Pedro II e sitio anterior/memorial, nao endereco atual. Detalhes e ficha primitiva preservam essa distincao.'],
    ],
    '18': [
        ['D', 'Tombada em 2000', 'Decreto e ano ja explicitados.'],
        ['R', '$bairro', 'Repete campo cadastral de bairro; nao e novo conteudo editorial.'],
    ],
    '19': [['D', 'Protegida desde 1990', 'A inclusao na Lei Organica ja esta explicada; nao ampliar para ato de tombamento especifico.']],
    '20': [
        ['D', 'Um conjunto ferroviário', 'Local do conjunto ja informado; nao confirmar coordenada/entrada exata.'],
        ['D', 'Memória do Trenzinho', 'A funcao de memoria do Tramway ja explicada.'],
        ['P', 'Memória do Trenzinho', 'O detalhe atribui operacao ate os anos 1960 ao Tramway; nao prova que a locomotiva numero 33 operou nessa linha ou ate essa data. Exige proveniencia do equipamento.'],
    ],
    '21': [
        ['D', 'Tradição centenária', 'Precedencia em relacao a Festa ja explicada; nao criar calendario fixo.'],
        ['D', 'Tradição centenária', 'Qualificacao temporal ja descrita, sem nova datacao documental.'],
    ],
    '24': [
        ['R', '$descricao', 'Decreto e ano ja presentes na descricao.'],
        ['D', 'Sede do poder municipal', 'O detalhe relata a mudanca em 1958. Desde poderia sugerir sede atual ininterrupta, que nao e certificada.'],
    ],
    '25': [
        ['D', 'O mais antigo da cidade', 'Periodo de fundacao ja informado.'],
        ['D', 'Um dos primeiros tombados', 'Lei e ano ja explicitados.'],
    ],
    '26': [
        ['P', 'Uma represa pioneira', 'Uso do perfil de Edward Wegmann nao comprova autoria direta do projeto da barragem. Exige fonte tecnica de autoria.'],
        ['D', 'Abastecimento e proteção', 'Processo estadual ja informado e vinculado a reserva.'],
        ['D', 'Abastecimento e proteção', 'Tombamento municipal ja descrito com abrangencia territorial.'],
    ],
    '32': [
        ['D', 'Um lago na Vila Galvão', 'Area aproximada ja explicitada; nao e nova medicao.'],
        ['D', 'Um lago na Vila Galvão', 'Denominacao alternativa ja explicada.'],
        ['D', 'Tombado desde 2019', 'Ano ja informado; descricao tambem registra o decreto.'],
    ],
    '28': [
        ['D', 'Tombado em 2000', 'Protecao historica ja explicada com posterior destombamento.'],
        ['D', 'Art Nouveau', 'Estilo ja descrito.'],
        ['D', 'A demolição', 'Data completa ja explicitada.'],
        ['D', 'Condenações em 2024', 'Evento judicial ja descrito; nao certificar situacao processual atual nem transito em julgado nesta curadoria.'],
    ],
    '29': [
        ['D', 'Pedido de tombamento', 'Ano e numero do processo ja informados.'],
        ['D', 'A demolição', 'Ano ja informado; sitio historico e navegacao aproximada permanecem intactos.'],
    ],
    '30': [
        ['C', 'Um casarão dos anos 1940', 'Omitir provavelmente transforma a datacao estimada em certeza. A ressalva consta tambem no detalhe Historia.'],
        ['D', 'Neocolonial Missões', 'Estilo ja explicitado.'],
        ['D', 'Pedido de tombamento', 'Data e processo ja explicitados.'],
        ['D', 'A demolição', 'Data completa e contexto ja explicitados.'],
    ],
    '31': [
        ['C', 'Datas históricas divergentes', '1923 nao e a data adotada: C1/C2 preservam divergencia entre 1917 e 2 de abril de 1925.'],
        ['D', 'O fim da fábrica', 'Periodo de fechamento ja informado.'],
        ['D', 'A demolição em 2009', 'Demolicao do ultimo casarao ja descrita; nao confundir com a fabrica.'],
    ],
    '34': [
        ['D', 'A missão jesuítica', 'Origem aproximada ja descrita; nao equiparar a data de todas as fases construtivas.'],
        ['D', 'A matriz em taipa de pilão', 'Periodo e tecnica ja explicados.'],
        ['D', 'Desmanchada em etapas', 'Demolicao gradual ja contextualizada; marcador continua referencia historica.'],
    ],
};

// Apenas relacoes sustentadas por vinculo funcional, sucessao historica ou realizacao.
// Os demais pares recebem decisao explicita no construtor da auditoria.
export const REVISAO_LIGACOES = {
    '1>10': ['APROVAR_COM_REESCRITA', 'Casa destinada originalmente à moradia do chefe da estação do Tramway da Cantareira.', 'Vinculo funcional ferroviario, nao apenas vizinhanca.', [[10, 'Casa do chefe da estação'], [1, 'Depois dos trens']]],
    '1>20': ['APROVAR', null, 'O conjunto preserva a memoria ferroviaria, sem afirmar que a locomotiva 33 operou neste ramal.', [[1, 'O lugar hoje'], [20, 'Memória do Trenzinho']]],
    '3>34': ['APROVAR_COM_REESCRITA', 'Antiga matriz colonial associada à história do sítio da Catedral atual.', 'Sucessao historica documentada; nao afirma coincidencia exata de implantacao ou coordenadas.', [[3, 'No lugar da primeira matriz'], [34, 'Sítio histórico e navegação']]],
    '6>7': ['APROVAR_COM_REESCRITA', 'Festa de Nossa Senhora de Bonsucesso, manifestação cultural vinculada ao Santuário e às áreas de celebração.', 'Relacao entre suporte religioso e manifestacao autonoma, sem endereco exclusivo.', [[6, 'Romarias e festa'], [7, 'Local de realização e referência']]],
    '6>21': ['APROVAR_COM_REESCRITA', 'Dia da Carpição, rito comunitário realizado no terreno e no entorno do Santuário.', 'Local de realizacao documentado; edificio nao substitui o bem imaterial.', [[21, 'Referência territorial'], [21, 'Limpeza como ato de fé']]],
    '7>6': ['APROVAR_COM_REESCRITA', 'Santuário de Bonsucesso, local de referência e realização associado à festa.', 'C2 documenta o vinculo e a distincao entre manifestacao e edificio.', [[7, 'Local de realização e referência']]],
    '7>21': ['APROVAR', null, 'Carpicao integra o ciclo ritual da Festa e a antecede; direcao avaliada separadamente.', [[7, 'A Benção da Terra'], [21, 'Tradição centenária']]],
    '10>1': ['APROVAR_COM_REESCRITA', 'Estação ferroviária à qual se vinculava a moradia do chefe da estação.', 'Vinculo funcional inverso documentado; nao criado por simetria automatica.', [[10, 'Casa do chefe da estação'], [1, 'Depois dos trens']]],
    '11>24': ['APROVAR_COM_REESCRITA', 'Praça Getúlio Vargas, que passou a sediar a Prefeitura em 1958, na história dos espaços administrativos da cidade.', 'Conecta referencias da administracao municipal; nao prova ocupacao continua do antigo Paco ate 1958.', [[11, 'Sede do poder municipal'], [24, 'Sede do poder municipal']]],
    '20>1': ['APROVAR_COM_REESCRITA', 'Antiga estação de Guarulhos, referência histórica do Tramway cuja memória o monumento ferroviário evoca.', 'Relacao memorial; nao certifica proveniencia ou operacao da locomotiva 33 na linha.', [[20, 'Memória do Trenzinho'], [1, 'O lugar hoje']]],
    '21>7': ['APROVAR', null, 'A precedencia ritual e explicitada no detalhe canonico.', [[21, 'Tradição centenária'], [7, 'A Benção da Terra']]],
    '21>6': ['APROVAR_COM_REESCRITA', 'Santuário de Bonsucesso, cujo terreno e entorno são referência de realização da Carpição.', 'Preserva a distincao entre rito e referencia territorial, sem rota exata.', [[21, 'Referência territorial']]],
    '24>11': ['APROVAR_COM_REESCRITA', 'Antigo Paço Municipal, outra referência da trajetória dos espaços da administração de Guarulhos.', 'Relacao institucional apoiada em ambas as fichas; retira afirmacao nao comprovada de saida deste predio em 1958.', [[24, 'Sede do poder municipal'], [11, 'Sede do poder municipal']]],
    '34>3': ['APROVAR_COM_REESCRITA', 'Catedral atual, sucessora da antiga matriz no sítio histórico associado à Praça Tereza Cristina.', 'Sucessao historica sem presumir mesmo perimetro de cada fase construtiva.', [[34, 'Desmanchada em etapas'], [34, 'Sítio histórico e navegação']]],
};

export const REJEICOES_LIGACOES = {
    '9>13': ['REJEITAR_AUTORRELACAO', 'As duas pontas resolvem para casa-jose-mauricio.'],
    '13>9': ['REJEITAR_AUTORRELACAO', 'As duas pontas resolvem para casa-jose-mauricio.'],
    '13>11': ['REJEITAR_DUPLICATA', 'Repete o par canonico 9>11 apos consolidacao, independentemente da rejeicao editorial desse par.'],
    '9>11': ['RELACAO_FRACA', 'Mesma esquina nao demonstra relacao editorial especifica alem da proximidade; residencia de prefeito nao prova vinculo com este Paco.'],
    '11>9': ['RELACAO_FRACA', 'Vizinhanca e referencia generica ao ex-prefeito nao sustentam vinculo funcional individual com este edificio.'],
    '10>20': ['RELACAO_FRACA', 'Mesma praca e tema ferroviario nao provam vinculo direto entre esta casa e o equipamento exposto; a Estacao ja serve de referencia documentada.'],
    '20>10': ['RELACAO_FRACA', 'Titulo da moradia nao demonstra vinculo direto com esta locomotiva; nao inferir proveniencia do equipamento.'],
    '28>29': ['RELACAO_FRACA', 'Analogia entre demolicoes/processos nao demonstra vinculo historico individual entre os bens.'],
    '28>30': ['RELACAO_FRACA', 'Data da demolicao e resgate de acervo de outro bem nao demonstram relacao direta.'],
    '29>28': ['RELACAO_FRACA', 'Nao ha apoio especifico para a causalidade abriu o debate entre estes dois casos.'],
    '29>30': ['RELACAO_FRACA', 'Semelhanca de conflitos de preservacao nao basta para uma ligacao individual.'],
    '30>28': ['RELACAO_FRACA', 'Referencia generica a outro caso de demolicao, sem vinculo especifico.'],
    '30>29': ['RELACAO_FRACA', 'Mesma situacao de demolicao durante protecao pendente nao comprova relacao direta.'],
};
