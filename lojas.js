// lojas.js

const LOJAS_CONFIG = {
    // Loja 0: Template de Demonstração
    'template-exibicao': {
        banco_estoque: 'estoque_template_exibicao',
        banco_vendas: 'vendas_template_exibicao',
        imgbb_api_key: 'f2973e71970b37c834a7f8eb5d5eeec4'
    },
    
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes',
        imgbb_api_key: '8600da39f5f43e08ade42fb77f880d9d'
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11',
        imgbb_api_key: '44efee2efa10458a73a2dc535098c9e4'
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
console.log('✅ lojas.js carregado SEM ALBUM');
