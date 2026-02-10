// lojas.js - Configuração dinâmica das coleções de cada loja
const LOJAS_CONFIG = {

    // Loja 0: Template de Demonstração
    'template-exibicao': {
        banco_estoque: 'estoque_template_exibicao',
        banco_vendas: 'vendas_template_exibicao',
        imgbb_api_key: '2e945ff376b1da6fc0cf213bc1fc765f'
    },
    
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes',
        imgbb_api_key: '11e478e406a476361d50b30bb2360ce3'
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11',
        imgbb_api_key: '71bbc8880626560978424e17e0dcfdd1'
    }
    
    // TEMPLATE PARA ADICIONAR NOVA LOJA:
    // 1. Crie uma nova pasta dentro da pasta "lojas" com o mesmo ID da loja
    // 2. Copie todos os arquivos de "template_lojas" para a nova pasta
    // 'id-da-nova-loja': {
    //     banco_estoque: 'estoque_id_da_nova_loja',
    //     banco_vendas: 'vendas_id_da_nova_loja',
    //     imgbb_api_key: 'chave_api_imgbb_da_loja'
    // }
};

// Função para obter configuração da loja
function getLojaConfig(lojaId) {
    if (LOJAS_CONFIG[lojaId]) {
        return LOJAS_CONFIG[lojaId];
    }
    
    // Se não encontrar, criar configuração padrão
    return {
        banco_estoque: `estoque_${lojaId.replace(/-/g, '_')}`,
        banco_vendas: `vendas_${lojaId.replace(/-/g, '_')}`,
        imgbb_api_key: null // Sem chave por padrão
    };
}

// Função específica para obter chave do ImgBB
function getImgBBKey(lojaId) {
    const config = getLojaConfig(lojaId);
    return config.imgbb_api_key || null;
}

// Exportar
export { LOJAS_CONFIG, getLojaConfig, getImgBBKey };

console.log('✅ lojas.js carregado:', Object.keys(LOJAS_CONFIG).length, 'lojas configuradas');
