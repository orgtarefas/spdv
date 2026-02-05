// lojas.js - SISTEMA DINÂMICO DE LOJAS PDV
console.log('🏪 Sistema de Lojas PDV - Iniciando...');

const SISTEMA_LOJAS = {
    // ============================================
    // CONFIGURAÇÃO DO SISTEMA
    // ============================================
    configGeral: {
        nomeSistema: "Sistema PDV Multi-Lojas",
        versao: "2.0",
        desenvolvedor: "Seu Nome",
        firebaseConfig: {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        }
    },

    // ============================================
    // CONFIGURAÇÃO DE TODAS AS LOJAS
    // ============================================
    lojas: {
        // LOJA 1: MJ Materiais de Construção
        'mj-materiais-construcao': {
            id: 'mj-materiais-construcao',
            nome: 'MJ Materiais de Construção',
            tipo: 'construcao',
            descricao: 'Materiais de construção em geral',
            
            // Configurações específicas da loja
            config: {
                logo: 'lojas/mj-materiais-construcao/logo.png',
                corPrimaria: '#2196F3',
                corSecundaria: '#FF9800',
                tema: 'claro',
                
                // Configurações de banco de dados
                colecao_estoque: 'estoque_mj_construcoes',
                colecao_vendas: 'vendas_mj_construcoes',
                colecao_usuarios: 'usuarios_mj_construcoes',
                
                // Configurações da loja
                cnpj: '12.345.678/0001-99',
                endereco: 'Rua das Construções, 123 - Cajazeiras 11, Salvador/BA',
                telefone: '(71) 99999-9999',
                email: 'contato@mjmateriais.com.br',
                horario_funcionamento: 'Seg-Sex: 8h-18h, Sáb: 8h-12h',
                
                // Configurações de negócio
                meta_mensal: 50000,
                taxa_desconto_maxima: 20,
                permite_parcelamento: true,
                max_parcelas: 12,
                
                // Configurações de unidades
                unidades_medida: ['UN', 'PC', 'MT', 'M2', 'M3', 'KG', 'SC', 'CX', 'LT'],
                categorias_padrao: ['Cimento', 'Areia', 'Brita', 'Tijolo', 'Telha', 'Tinta', 'Ferragem', 'Hidráulica', 'Elétrica']
            },
            
            // Permissões de usuário
            permissoes: {
                admin: ['tudo'],
                gerente: ['vender', 'ver_estoque', 'ver_relatorios'],
                vendedor: ['vender', 'ver_estoque'],
                caixa: ['vender', 'fechar_caixa']
            },
            
            // Links para os arquivos da loja
            arquivos: {
                home: 'lojas/mj-materiais-construcao/home.html',
                estoque: 'lojas/mj-materiais-construcao/estoque.html',
                venda: 'lojas/mj-materiais-construcao/venda.html',
                css_home: 'lojas/mj-materiais-construcao/home.css',
                css_estoque: 'lojas/mj-materiais-construcao/estoque.css',
                css_venda: 'lojas/mj-materiais-construcao/venda.css',
                js_home: 'lojas/mj-materiais-construcao/home.js',
                js_estoque: 'lojas/mj-materiais-construcao/estoque.js',
                js_venda: 'lojas/mj-materiais-construcao/venda.js',
                firebase_config: 'lojas/mj-materiais-construcao/firebase_config.js'
            }
        },

        // LOJA 2: Açaí Ponto 11 (EXEMPLO DE NOVA LOJA)
        'acai-ponto-11': {
            id: 'acai-ponto-11',
            nome: 'Açaí Ponto 11',
            tipo: 'alimentacao',
            descricao: 'Açaí e complementos',
            
            config: {
                logo: 'lojas/acai-ponto-11/logo.png',
                corPrimaria: '#9C27B0',
                corSecundaria: '#4CAF50',
                tema: 'claro',
                
                colecao_estoque: 'estoque_acai_ponto_11',
                colecao_vendas: 'vendas_acai_ponto_11',
                colecao_usuarios: 'usuarios_acai_ponto_11',
                
                cnpj: '98.765.432/0001-00',
                endereco: 'Av. Principal, 456 - Centro, Salvador/BA',
                telefone: '(71) 98888-8888',
                email: 'contato@acaiponto11.com.br',
                horario_funcionamento: 'Todos os dias: 10h-22h',
                
                meta_mensal: 20000,
                taxa_desconto_maxima: 10,
                permite_parcelamento: false,
                max_parcelas: 1,
                
                unidades_medida: ['UN', 'LT', 'ML', 'G', 'KG'],
                categorias_padrao: ['Açaí', 'Complementos', 'Frutas', 'Calda', 'Cobertura']
            },
            
            permissoes: {
                admin: ['tudo'],
                gerente: ['vender', 'ver_estoque', 'ver_relatorios'],
                vendedor: ['vender', 'ver_estoque']
            },
            
            arquivos: {
                home: 'lojas/acai-ponto-11/home.html',
                estoque: 'lojas/acai-ponto-11/estoque.html',
                venda: 'lojas/acai-ponto-11/venda.html',
                css_home: 'lojas/acai-ponto-11/home.css',
                css_estoque: 'lojas/acai-ponto-11/estoque.css',
                css_venda: 'lojas/acai-ponto-11/venda.css',
                js_home: 'lojas/acai-ponto-11/home.js',
                js_estoque: 'lojas/acai-ponto-11/estoque.js',
                js_venda: 'lojas/acai-ponto-11/venda.js',
                firebase_config: 'lojas/acai-ponto-11/firebase_config.js'
            }
        }
    },

    // ============================================
    // FUNÇÕES DO SISTEMA
    // ============================================

    // 1. Obter todas as lojas disponíveis
    listarLojas: function() {
        const lojasArray = [];
        
        for (const lojaId in this.lojas) {
            const loja = this.lojas[lojaId];
            lojasArray.push({
                id: loja.id,
                nome: loja.nome,
                tipo: loja.tipo,
                descricao: loja.descricao
            });
        }
        
        return lojasArray;
    },

    // 2. Obter configuração de uma loja específica
    obterLoja: function(lojaId) {
        return this.lojas[lojaId] || null;
    },

    // 3. Verificar se loja existe
    lojaExiste: function(lojaId) {
        return this.lojas.hasOwnProperty(lojaId);
    },

    // 4. Adicionar nova loja dinamicamente
    adicionarLoja: function(novaLoja) {
        if (!novaLoja.id) {
            console.error('❌ Erro: Loja precisa ter um ID');
            return false;
        }
        
        if (this.lojaExiste(novaLoja.id)) {
            console.error(`❌ Erro: Loja ${novaLoja.id} já existe`);
            return false;
        }
        
        // Configuração padrão para nova loja
        const lojaConfigurada = {
            id: novaLoja.id,
            nome: novaLoja.nome || 'Nova Loja',
            tipo: novaLoja.tipo || 'geral',
            descricao: novaLoja.descricao || '',
            
            config: {
                logo: novaLoja.config?.logo || 'lojas/template/logo.png',
                corPrimaria: novaLoja.config?.corPrimaria || '#3498db',
                corSecundaria: novaLoja.config?.corSecundaria || '#2ecc71',
                tema: novaLoja.config?.tema || 'claro',
                
                colecao_estoque: novaLoja.config?.colecao_estoque || `estoque_${novaLoja.id.replace(/-/g, '_')}`,
                colecao_vendas: novaLoja.config?.colecao_vendas || `vendas_${novaLoja.id.replace(/-/g, '_')}`,
                colecao_usuarios: novaLoja.config?.colecao_usuarios || `usuarios_${novaLoja.id.replace(/-/g, '_')}`,
                
                cnpj: novaLoja.config?.cnpj || '',
                endereco: novaLoja.config?.endereco || '',
                telefone: novaLoja.config?.telefone || '',
                email: novaLoja.config?.email || '',
                horario_funcionamento: novaLoja.config?.horario_funcionamento || 'Seg-Sex: 8h-18h',
                
                meta_mensal: novaLoja.config?.meta_mensal || 10000,
                taxa_desconto_maxima: novaLoja.config?.taxa_desconto_maxima || 15,
                permite_parcelamento: novaLoja.config?.permite_parcelamento || false,
                max_parcelas: novaLoja.config?.max_parcelas || 1,
                
                unidades_medida: novaLoja.config?.unidades_medida || ['UN', 'PC', 'KG', 'LT'],
                categorias_padrao: novaLoja.config?.categorias_padrao || ['Geral']
            },
            
            permissoes: novaLoja.permissoes || {
                admin: ['tudo'],
                gerente: ['vender', 'ver_estoque', 'ver_relatorios'],
                vendedor: ['vender', 'ver_estoque']
            },
            
            arquivos: {
                home: `lojas/${novaLoja.id}/home.html`,
                estoque: `lojas/${novaLoja.id}/estoque.html`,
                venda: `lojas/${novaLoja.id}/venda.html`,
                css_home: `lojas/${novaLoja.id}/home.css`,
                css_estoque: `lojas/${novaLoja.id}/estoque.css`,
                css_venda: `lojas/${novaLoja.id}/venda.css`,
                js_home: `lojas/${novaLoja.id}/home.js`,
                js_estoque: `lojas/${novaLoja.id}/estoque.js`,
                js_venda: `lojas/${novaLoja.id}/venda.js`,
                firebase_config: `lojas/${novaLoja.id}/firebase_config.js`
            }
        };
        
        // Adicionar ao sistema
        this.lojas[novaLoja.id] = lojaConfigurada;
        console.log(`✅ Loja ${novaLoja.nome} adicionada com sucesso!`);
        
        return true;
    },

    // 5. Remover loja
    removerLoja: function(lojaId) {
        if (!this.lojaExiste(lojaId)) {
            console.error(`❌ Erro: Loja ${lojaId} não existe`);
            return false;
        }
        
        delete this.lojas[lojaId];
        console.log(`✅ Loja ${lojaId} removida`);
        return true;
    },

    // 6. Atualizar loja
    atualizarLoja: function(lojaId, novosDados) {
        if (!this.lojaExiste(lojaId)) {
            console.error(`❌ Erro: Loja ${lojaId} não existe`);
            return false;
        }
        
        // Mesclar dados antigos com novos
        this.lojas[lojaId] = {
            ...this.lojas[lojaId],
            ...novosDados,
            config: {
                ...this.lojas[lojaId].config,
                ...(novosDados.config || {})
            },
            arquivos: {
                ...this.lojas[lojaId].arquivos,
                ...(novosDados.arquivos || {})
            }
        };
        
        console.log(`✅ Loja ${lojaId} atualizada`);
        return true;
    },

    // 7. Obter configuração do Firebase (comum a todas as lojas)
    obterFirebaseConfig: function() {
        return this.configGeral.firebaseConfig;
    },

    // 8. Salvar loja selecionada no localStorage/sessionStorage
    salvarLojaSelecionada: function(lojaId, usuario) {
        if (!this.lojaExiste(lojaId)) {
            console.error(`❌ Erro: Loja ${lojaId} não existe`);
            return false;
        }
        
        const loja = this.obterLoja(lojaId);
        
        // Salvar dados da sessão
        const sessao = {
            loja: {
                id: loja.id,
                nome: loja.nome,
                config: loja.config
            },
            usuario: usuario,
            data_login: new Date().toISOString(),
            expiracao: Date.now() + (8 * 60 * 60 * 1000) // 8 horas
        };
        
        // Salvar em ambos storages para redundância
        sessionStorage.setItem('pdv_sessao_temporaria', JSON.stringify(sessao));
        localStorage.setItem('pdv_sessao_backup', JSON.stringify(sessao));
        
        // Salvar configuração da loja separadamente para acesso rápido
        localStorage.setItem('config_loja_pdv', JSON.stringify(loja.config));
        
        console.log(`✅ Sessão iniciada para ${usuario.nome || usuario.login} na loja ${loja.nome}`);
        return true;
    },

    // 9. Carregar loja da sessão
    carregarLojaDaSessao: function() {
        const sessaoString = sessionStorage.getItem('pdv_sessao_temporaria') || 
                           localStorage.getItem('pdv_sessao_backup');
        
        if (!sessaoString) {
            return null;
        }
        
        try {
            const sessao = JSON.parse(sessaoString);
            
            // Verificar se a sessão expirou
            if (sessao.expiracao && sessao.expiracao < Date.now()) {
                this.limparSessao();
                return null;
            }
            
            return sessao;
            
        } catch (error) {
            console.error('❌ Erro ao carregar sessão:', error);
            return null;
        }
    },

    // 10. Limpar sessão
    limparSessao: function() {
        sessionStorage.removeItem('pdv_sessao_temporaria');
        localStorage.removeItem('pdv_sessao_backup');
        localStorage.removeItem('config_loja_pdv');
        console.log('✅ Sessão limpa');
    },

    // 11. Verificar permissões do usuário
    verificarPermissao: function(lojaId, usuarioTipo, permissaoRequerida) {
        const loja = this.obterLoja(lojaId);
        
        if (!loja || !loja.permissoes[usuarioTipo]) {
            return false;
        }
        
        const permissoes = loja.permissoes[usuarioTipo];
        
        // Se tem permissão "tudo", permite tudo
        if (permissoes.includes('tudo')) {
            return true;
        }
        
        return permissoes.includes(permissaoRequerida);
    },

    // 12. Gerar template para nova loja
    gerarTemplateLoja: function(lojaId, dadosLoja) {
        const template = `
// firebase_config.js - CONFIGURAÇÃO PARA LOJA: ${dadosLoja.nome || 'Nova Loja'}

// Configuração do Firebase (comum a todas as lojas)
const firebaseConfig = {
    apiKey: "${this.configGeral.firebaseConfig.apiKey}",
    authDomain: "${this.configGeral.firebaseConfig.authDomain}",
    projectId: "${this.configGeral.firebaseConfig.projectId}",
    storageBucket: "${this.configGeral.firebaseConfig.storageBucket}",
    messagingSenderId: "${this.configGeral.firebaseConfig.messagingSenderId}",
    appId: "${this.configGeral.firebaseConfig.appId}"
};

// Configurações específicas da loja
const CONFIG_LOJA = {
    id: "${lojaId}",
    nome: "${dadosLoja.nome || 'Nova Loja'}",
    tipo: "${dadosLoja.tipo || 'geral'}",
    
    // Coleções do Firebase
    colecoes: {
        estoque: "${dadosLoja.config?.colecao_estoque || \`estoque_\${lojaId.replace(/-/g, '_')}\`}",
        vendas: "${dadosLoja.config?.colecao_vendas || \`vendas_\${lojaId.replace(/-/g, '_')}\`}",
        usuarios: "${dadosLoja.config?.colecao_usuarios || \`usuarios_\${lojaId.replace(/-/g, '_')}\`}"
    },
    
    // Configurações da loja
    endereco: "${dadosLoja.config?.endereco || ''}",
    telefone: "${dadosLoja.config?.telefone || ''}",
    cnpj: "${dadosLoja.config?.cnpj || ''}",
    
    // Configurações de negócio
    meta_mensal: ${dadosLoja.config?.meta_mensal || 10000},
    taxa_desconto_maxima: ${dadosLoja.config?.taxa_desconto_maxima || 15},
    permite_parcelamento: ${dadosLoja.config?.permite_parcelamento || false},
    max_parcelas: ${dadosLoja.config?.max_parcelas || 1},
    
    // Unidades e categorias
    unidades_medida: ${JSON.stringify(dadosLoja.config?.unidades_medida || ['UN', 'PC', 'KG', 'LT'])},
    categorias_padrao: ${JSON.stringify(dadosLoja.config?.categorias_padrao || ['Geral'])}
};

// Exportar configurações
window.CONFIG_LOJA = CONFIG_LOJA;
console.log('✅ Configuração da loja carregada:', CONFIG_LOJA.nome);
`;
        
        return template;
    },

    // 13. Criar estrutura de arquivos para nova loja
    criarEstruturaLoja: function(lojaId) {
        const loja = this.obterLoja(lojaId);
        
        if (!loja) {
            console.error(`❌ Loja ${lojaId} não encontrada`);
            return false;
        }
        
        // Caminho base para a loja
        const caminhoBase = \`lojas/\${lojaId}\`;
        
        // Estrutura de diretórios
        const estrutura = {
            diretorios: [
                caminhoBase,
                \`\${caminhoBase}/css\`,
                \`\${caminhoBase}/js\`,
                \`\${caminhoBase}/img\`
            ],
            
            arquivos: {
                // Páginas HTML
                \`\${caminhoBase}/home.html\`: this.gerarTemplateHTML('home', loja),
                \`\${caminhoBase}/estoque.html\`: this.gerarTemplateHTML('estoque', loja),
                \`\${caminhoBase}/venda.html\`: this.gerarTemplateHTML('venda', loja),
                
                // Estilos CSS
                \`\${caminhoBase}/home.css\`: this.gerarTemplateCSS('home', loja),
                \`\${caminhoBase}/estoque.css\`: this.gerarTemplateCSS('estoque', loja),
                \`\${caminhoBase}/venda.css\`: this.gerarTemplateCSS('venda', loja),
                
                // JavaScript
                \`\${caminhoBase}/home.js\`: this.gerarTemplateJS('home', loja),
                \`\${caminhoBase}/estoque.js\`: this.gerarTemplateJS('estoque', loja),
                \`\${caminhoBase}/venda.js\`: this.gerarTemplateJS('venda', loja),
                \`\${caminhoBase}/firebase_config.js\`: this.gerarTemplateLoja(lojaId, loja)
            }
        };
        
        return estrutura;
    }
};

// ============================================
// FUNÇÕES DE TEMPLATE (simplificadas)
// ============================================

SISTEMA_LOJAS.gerarTemplateHTML = function(tipo, loja) {
    // Templates básicos - na prática você teria arquivos reais
    const templates = {
        home: \`<!DOCTYPE html><html><head><title>\${loja.nome} - Home</title></head><body>Home da \${loja.nome}</body></html>\`,
        estoque: \`<!DOCTYPE html><html><head><title>\${loja.nome} - Estoque</title></head><body>Estoque da \${loja.nome}</body></html>\`,
        venda: \`<!DOCTYPE html><html><head><title>\${loja.nome} - Vendas</title></head><body>Vendas da \${loja.nome}</body></html>\`
    };
    
    return templates[tipo] || '';
};

SISTEMA_LOJAS.gerarTemplateCSS = function(tipo, loja) {
    return \`/* CSS da loja \${loja.nome} - \${tipo} */\nbody { color: \${loja.config.corPrimaria}; }\`;
};

SISTEMA_LOJAS.gerarTemplateJS = function(tipo, loja) {
    return \`// JS da loja \${loja.nome} - \${tipo}\nconsole.log('\${loja.nome} - \${tipo}');\`;
};

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================

// Torna disponível globalmente
window.SISTEMA_LOJAS = SISTEMA_LOJAS;

// Inicialização
console.log('✅ Sistema de Lojas carregado:', SISTEMA_LOJAS.listarLojas().length, 'lojas disponíveis');

// Exportar para módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SISTEMA_LOJAS;
}
