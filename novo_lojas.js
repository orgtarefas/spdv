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
        banco_vendas: 'vendas_template_exibicao',
        imgbb_api_key: 'f2973e71970b37c834a7f8eb5d5eeec4'
    },
    
    // Loja 1: MJ Materiais de Construção
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
        banco_vendas: 'vendas_mj_construcoes',
        imgbb_api_key: '8600da39f5f43e08ade42fb77f880d9d'
    },
    
    // Loja 2: Açaí Ponto 11
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
        banco_vendas: 'vendas_acai_ponto_11',
        imgbb_api_key: '44efee2efa10458a73a2dc535098c9e4'
    },

    // Loja 3: Teste Operacional
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
        banco_vendas: 'vendas_teste_operacional',
        imgbb_api_key: '8672a2a27a3fc040c576910255d18dc0'
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


