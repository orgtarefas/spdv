// lojas.js - Configuração dinâmica de todas as lojas
const LOJAS_CONFIG = {
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        nome: 'MJ Materiais de Construção',
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes'
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        nome: 'Açaí Ponto 11',
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11'
    },
    
    // Loja 3: Padaria Pão Quente (exemplo)
    'padaria-pao-quente': {
        nome: 'Padaria Pão Quente',
        banco_estoque: 'estoque_padaria_pao_quente',
        banco_vendas: 'vendas_padaria_pao_quente'
    }
    
    // Adicione novas lojas aqui seguindo o padrão
};

// Função para obter configuração da loja atual
function obterConfiguracaoLoja(lojaId) {
    return LOJAS_CONFIG[lojaId] || LOJAS_CONFIG['mj-materiais-construcao']; // Fallback
}

// Função para listar todas as lojas (para o login)
function listarLojas() {
    return Object.entries(LOJAS_CONFIG).map(([id, config]) => ({
        id: id,
        nome: config.nome
    }));
}