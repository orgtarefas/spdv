// lojas.js - SEM EXPORT, usando variáveis globais

// Configuração global das lojas
window.LOJAS_CONFIG = {
    // Loja 0: Template de Demonstração
    'template-exibicao': {
        nome: 'Template de Demonstração',
        local: 'Ambiente de Testes',
        telefone: '(71) 99999-9999',
        banco_estoque: 'estoque_template_exibicao',
        banco_vendas: 'vendas_template_exibicao',
        imgbb_api_key: 'f2973e71970b37c834a7f8eb5d5eeec4',
        ativo: true
    },
    
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        nome: 'MJ Materiais de Construção',
        local: 'Av. Construção, 123 - Centro',
        telefone: '(71) 3333-4444',
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes',
        imgbb_api_key: '8600da39f5f43e08ade42fb77f880d9d',
        ativo: true
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        nome: 'Açaí Ponto 11',
        local: 'Av. Beira Mar, 500 - Barra',
        telefone: '(71) 3444-5555',
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11',
        imgbb_api_key: '44efee2efa10458a73a2dc535098c9e4',
        ativo: true
    }
};

// Função global para obter configuração de uma loja
window.getLojaConfig = function(lojaId) {
    if (window.LOJAS_CONFIG[lojaId]) {
        return window.LOJAS_CONFIG[lojaId];
    }
    
    return {
        nome: lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        local: '',
        telefone: '',
        banco_estoque: `estoque_${lojaId.replace(/-/g, '_')}`,
        banco_vendas: `vendas_${lojaId.replace(/-/g, '_')}`,
        imgbb_api_key: null,
        ativo: true
    };
};

// Função global para obter chave do ImgBB
window.getImgBBKey = function(lojaId) {
    const config = window.getLojaConfig(lojaId);
    return config.imgbb_api_key || null;
};

// Função global para verificar se loja tem ImgBB
window.lojaTemImgBB = function(lojaId) {
    const config = window.getLojaConfig(lojaId);
    const temChave = config.imgbb_api_key && config.imgbb_api_key.length > 20;
    return {
        temChave: temChave,
        chave: config.imgbb_api_key || null,
        lojaId: lojaId,
        nome: config.nome
    };
};

// Função para listar todas as lojas ativas
window.getLojasAtivas = function() {
    const lojas = [];
    for (const [id, config] of Object.entries(window.LOJAS_CONFIG)) {
        if (config.ativo !== false) {
            lojas.push({
                id: id,
                banco_login: id,
                nome: config.nome,
                local: config.local,
                telefone: config.telefone,
                banco_estoque: config.banco_estoque,
                banco_vendas: config.banco_vendas,
                imgbb_api_key: config.imgbb_api_key
            });
        }
    }
    return lojas;
};

// Disponibilizar também como variável global direta (atalho)
const LOJAS_CONFIG = window.LOJAS_CONFIG;
const getLojaConfig = window.getLojaConfig;
const getImgBBKey = window.getImgBBKey;
const lojaTemImgBB = window.lojaTemImgBB;
const getLojasAtivas = window.getLojasAtivas;

console.log('✅ lojas.js carregado SEM EXPORT -', Object.keys(window.LOJAS_CONFIG).length, 'lojas configuradas');
console.log('🏪 Lojas disponíveis:', Object.keys(window.LOJAS_CONFIG).join(', '));
