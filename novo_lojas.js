// novo_lojas.js

const LOJAS_CONFIG = {
    // Loja 0: Template de Demonstração
    'template-exibicao': {
        nome: 'Template de Exibição',
        contato: {
            telefone: '',
            whatsapp: '(71)98510-1828',
            instagram: '@lojasite',   
            email: 'lojasite@gmail.com',       
            endereco: {
                rua: 'Geraldo Brasil',
                numero: '53',
                complemento: 'B',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41347-278'
                
            },    
        },
        banco_estoque: 'estoque_template_exibicao',
        banco_vendas: 'vendas_template_exibicao'
    },


    // Loja 1: Espaço Vip
    'espaco-vip': {
        nome: 'Espaço Vip',
        contato: {
            telefone: '',
            whatsapp: '',
            instagram: '@lojasite',   
            email: 'lojasite-espaco-vip@proton.me',       
            endereco: {
                rua: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: 'Salvador',
                uf: 'BA',
                cep: ''
                
            },    
        },
        banco_estoque: 'estoque_espaco_vip',
        banco_vendas: 'vendas_espaco_vip'
    },    
    
    // Loja 2: MJ Materiais de Construção
    'mj-materiais-construcao': {
        nome: 'MJ Materiais de Construção',
        contato: {
            telefone: '',
            whatsapp: '(71)99205-1778',
            instagram: '@mjmateriaisdecontrucao',   
            email: 'mjmateriaisdeconstrucaocaj7@gmail.com',       
            endereco: {
                rua: 'Juscelino Kubitscheck',
                numero: '83',
                complemento: '',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41330-500'
                
            },    
        },
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes'
    },
    
    // Loja 3: Açaí Ponto 11
    'acai-ponto-11': {
        nome: 'Açaí Ponto 11',
        contato: {
            telefone: '',
            whatsapp: '(71)99205-1778',
            instagram: '@acaiponto11',   
            email: 'acaiponto11@gmail.com',       
            endereco: {
                rua: 'Juscelino Kubitscheck',
                numero: '82',
                complemento: '',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41330-500'
                
            },    
        },
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11'
    },

    // Loja 4: Teste Operacional
    'teste_operacional': {
        nome: 'Teste Operacional',
        contato: {
            telefone: '',
            whatsapp: '(71)98510-1828',
            instagram: '@lojasite',   
            email: 'lojasite@gmail.com',       
            endereco: {
                rua: 'Geraldo Brasil',
                numero: '53',
                complemento: 'B',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41347-278'
                
            },    
        },
        banco_estoque: 'estoque_teste_operacional',
        banco_vendas: 'vendas_teste_operacional'
    },

    // Loja 5: Casa do Borracheiro
    'casa-do-borracheiro': {
        nome: 'Casa do Borracheiro',
        contato: {
            telefone: '',
            whatsapp: '(71)99999-9999',
            instagram: '@casa.doborracheiro',   
            email: 'contatos@lojasite.com.br',       
            endereco: {
                rua: 'Estrada Campinas de Pirajá',
                numero: '2548',
                complemento: 'Térreo, Loja 03',
                bairro: 'Campinas de Pirajá',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41295-720'
                
            },    
        },
        banco_estoque: 'estoque_casa_do_borracheiro',
        banco_vendas: 'vendas_casa_do_borracheiro'
    }
};

function getLojaConfig(lojaId) {
    if (LOJAS_CONFIG[lojaId]) {
        return LOJAS_CONFIG[lojaId];
    }
    
    return {
        banco_estoque: `estoque_${lojaId.replace(/-/g, '_')}`,
        banco_vendas: `vendas_${lojaId.replace(/-/g, '_')}`,
        imgbb_api_key: null
    };
}

function getImgBBKey(lojaId) {
    const config = getLojaConfig(lojaId);
    return config.imgbb_api_key;
}

function lojaTemImgBB(lojaId) {
    const config = getLojaConfig(lojaId);
    const temChave = config.imgbb_api_key && config.imgbb_api_key.length > 20;
    return {
        temChave: temChave,
        chave: config.imgbb_api_key,
        lojaId: lojaId
    };
}

export { LOJAS_CONFIG, getLojaConfig, getImgBBKey, lojaTemImgBB };
window.getLojaConfig = getLojaConfig;
console.log('✅ novo_lojas.js carregado SEM ALBUM');





