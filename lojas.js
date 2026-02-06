// lojas.js - Configuração dinâmica de todas as lojas
const LOJAS_CONFIG = {
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        nome: 'MJ Materiais de Construção',
        banco_estoque: 'estoque_mj_construcoes',
        banco_vendas: 'vendas_mj_construcoes',
        local: 'Rua Principal, 123',
        telefone: '(11) 99999-9999'
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        nome: 'Açaí Ponto 11',
        banco_estoque: 'estoque_acai_ponto_11',
        banco_vendas: 'vendas_acai_ponto_11',
        local: 'Avenida Central, 456',
        telefone: '(11) 98888-8888'
    },
    
    // Loja 3: Padaria Pão Quente (exemplo)
    'padaria-pao-quente': {
        nome: 'Padaria Pão Quente',
        banco_estoque: 'estoque_padaria_pao_quente',
        banco_vendas: 'vendas_padaria_pao_quente',
        local: 'Praça da Matriz, 789',
        telefone: '(11) 97777-7777'
    }
    
    // PARA ADICIONAR NOVA LOJA:
    // 1. Crie uma nova pasta dentro da pasta "lojas" com o mesmo ID
    // 2. Copie todos os arquivos de "template_lojas" para a nova pasta
    // 3. Adicione a configuração aqui abaixo:
    // 'id-da-nova-loja': {
    //     nome: 'Nome da Nova Loja',
    //     banco_estoque: 'estoque_id_da_nova_loja',
    //     banco_vendas: 'vendas_id_da_nova_loja',
    //     local: 'Endereço da loja',
    //     telefone: 'Telefone da loja'
    // }
};

// Função para obter configuração da loja atual
function obterConfiguracaoLoja(lojaId) {
    return LOJAS_CONFIG[lojaId] || {
        nome: lojaId,
        banco_estoque: `estoque_${lojaId.replace(/-/g, '_')}`,
        banco_vendas: `vendas_${lojaId.replace(/-/g, '_')}`,
        local: '',
        telefone: ''
    };
}

// Função para listar todas as lojas (para o login)
function listarLojas() {
    return Object.entries(LOJAS_CONFIG).map(([id, config]) => ({
        id: id,
        nome: config.nome
    }));
}

// Função para adicionar nova loja dinamicamente
function adicionarNovaLoja(id, nome, local = '', telefone = '') {
    if (!LOJAS_CONFIG[id]) {
        LOJAS_CONFIG[id] = {
            nome: nome,
            banco_estoque: `estoque_${id.replace(/-/g, '_')}`,
            banco_vendas: `vendas_${id.replace(/-/g, '_')}`,
            local: local,
            telefone: telefone
        };
        console.log(`✅ Nova loja adicionada: ${nome} (${id})`);
        return true;
    }
    console.log(`⚠️ Loja ${id} já existe`);
    return false;
}

console.log('✅ lojas.js carregado:', Object.keys(LOJAS_CONFIG).length, 'lojas configuradas');
