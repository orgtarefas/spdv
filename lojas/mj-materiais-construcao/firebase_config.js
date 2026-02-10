// firebase_config.js - CONFIGURAÇÃO DINÂMICA PARA QUALQUER LOJA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, 
    setDoc, updateDoc, deleteDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, increment, runTransaction,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Importar configurações das lojas (arquivo na raiz)
import { getLojaConfig } from '../../lojas.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
    authDomain: "spdv-3872a.firebaseapp.com",
    projectId: "spdv-3872a",
    storageBucket: "spdv-3872a.firebasestorage.app",
    messagingSenderId: "552499245950",
    appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Inicializar Firebase
let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado com sucesso');
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
}

// Sistema de gerenciamento de loja atual
class LojaManager {
    constructor() {
        this.lojaId = null;
        this.usuario = null;
        this.config = null;
        this.dadosLoja = null;
        this.imgbbKey = null; // ← ADICIONE ESTA LINHA
        this.inicializar();
    }
    
    inicializar() {
        this.carregarSessao();
    }
    
    carregarSessao() {
        try {
            // 1. Tentar da sessão
            const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
            if (sessao) {
                const dados = JSON.parse(sessao);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key; // ← ADICIONE ESTA LINHA
                console.log(`✅ Loja identificada: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB configurada: ${this.imgbbKey ? 'SIM' : 'NÃO'}`);
                return;
            }
            
            // 2. Tentar do backup
            const backup = localStorage.getItem('pdv_sessao_backup');
            if (backup) {
                const dados = JSON.parse(backup);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key; // ← ADICIONE ESTA LINHA
                console.log(`⚠️ Loja identificada do backup: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB configurada: ${this.imgbbKey ? 'SIM' : 'NÃO'}`);
                return;
            }
            
            // 3. Tentar da URL (fallback)
            const pathParts = window.location.pathname.split('/');
            const lojaIndex = pathParts.indexOf('lojas');
            if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
                this.lojaId = pathParts[lojaIndex + 1];
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key; // ← ADICIONE ESTA LINHA
                
                // Dados mock para desenvolvimento
                this.usuario = {
                    login: 'dev_user',
                    nome: 'Usuário Desenvolvimento',
                    perfil: 'admin',
                    id: 'dev_001'
                };
                
                console.log(`📍 Loja detectada da URL: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB configurada: ${this.imgbbKey ? 'SIM' : 'NÃO'}`);
                return;
            }
            
            console.error('❌ Não foi possível identificar a loja');
            
        } catch (error) {
            console.error('❌ Erro ao carregar sessão:', error);
        }
    }
    
    // ========== GETTERS IMPORTANTES ==========
    get bancoEstoque() {
        return this.config?.banco_estoque || `estoque_${this.lojaId?.replace(/-/g, '_')}`;
    }
    
    get bancoVendas() {
        return this.config?.banco_vendas || `vendas_${this.lojaId?.replace(/-/g, '_')}`;
    }
    
    get isLogged() {
        return !!this.lojaId && !!this.usuario;
    }
    
    get isAdmin() {
        return this.usuario?.is_admin_global || this.usuario?.perfil?.includes('admin');
    }
    
    get nomeUsuario() {
        return this.usuario?.nome || this.usuario?.login || 'Usuário';
    }
    
    get perfil() {
        return this.usuario?.perfil || 'usuario';
    }
    
    // ========== SERVIÇOS DA LOJA ==========
    
    // Buscar dados da loja do Firebase
    async buscarDadosLoja() {
        try {
            console.log(`🔍 Buscando dados da loja no Firebase: ${this.lojaId}`);
            
            if (!this.lojaId) {
                return { 
                    success: false, 
                    error: "ID da loja não identificado" 
                };
            }
            
            // Buscar documento da loja
            const lojaRef = doc(db, "lojas", this.lojaId);
            const lojaDoc = await getDoc(lojaRef);
            
            if (lojaDoc.exists()) {
                this.dadosLoja = {
                    id: lojaDoc.id,
                    ...lojaDoc.data()
                };
                
                console.log('✅ Dados da loja encontrados:', this.dadosLoja);
                
                return { 
                    success: true, 
                    data: this.dadosLoja 
                };
            } else {
                console.warn(`⚠️ Documento da loja não encontrado: ${this.lojaId}`);
                
                // Criar estrutura básica se não existir
                this.dadosLoja = {
                    id: this.lojaId,
                    nome: this.formatarNomeLoja(this.lojaId),
                    local: '',
                    telefone: '',
                    email: '',
                    cnpj: '',
                    tipo: 'padrao',
                    meta_mensal: 10000,
                    imgbb_key: this.imgbbKey // ← INCLUIR A CHAVE AQUI TAMBÉM
                };
                
                return { 
                    success: false, 
                    error: "Dados da loja não encontrados",
                    data: this.dadosLoja 
                };
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar dados da loja:', error);
            
            // Fallback básico
            this.dadosLoja = {
                id: this.lojaId,
                nome: this.formatarNomeLoja(this.lojaId),
                local: '',
                telefone: '',
                email: '',
                cnpj: '',
                tipo: 'padrao',
                meta_mensal: 10000,
                imgbb_key: this.imgbbKey // ← INCLUIR A CHAVE AQUI TAMBÉM
            };
            
            return { 
                success: false, 
                error: error.message,
                data: this.dadosLoja
            };
        }
    }
    
    formatarNomeLoja(id) {
        if (!id) return 'Loja';
        
        // Formatar nome bonito
        return id
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\bmj\b/gi, 'MJ')
            .replace(/\bacai\b/gi, 'Açaí')
            .replace(/\bpadaria\b/gi, 'Padaria');
    }
    
    // Buscar produtos do estoque (FILTRAGEM LOCAL para evitar índices)
    async buscarProdutos(filtro = {}) {
        try {
            console.log(`🔍 Buscando produtos em ${this.bancoEstoque}...`);
            const estoqueRef = collection(db, this.bancoEstoque);
            
            // Buscar TODOS os produtos
            const snapshot = await getDocs(estoqueRef);
            
            const produtos = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                produtos.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Filtrar localmente
            const produtosFiltrados = produtos.filter(produto => {
                // Filtro por loja (para admin mostrar todas)
                if (!this.isAdmin && produto.loja_id !== this.lojaId) {
                    return false;
                }
                
                // Filtro por ativo
                if (filtro.ativo !== undefined && produto.ativo !== filtro.ativo) {
                    return false;
                }
                
                // Filtro por categoria
                if (filtro.categoria && produto.categoria !== filtro.categoria) {
                    return false;
                }
                
                // Filtro por baixo estoque
                if (filtro.baixo_estoque && produto.quantidade > 10) {
                    return false;
                }
                
                return true;
            });
            
            // Ordenar localmente
            produtosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            
            console.log(`✅ ${produtosFiltrados.length} produtos encontrados`);
            return { success: true, data: produtosFiltrados };
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Buscar produto específico
    async buscarProdutoPorId(produtoId) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            const produtoDoc = await getDoc(produtoRef);
            
            if (produtoDoc.exists()) {
                const data = produtoDoc.data();
                
                // Verificar se produto pertence à loja
                if (data.loja_id !== this.lojaId && !this.isAdmin) {
                    return { 
                        success: false, 
                        error: "Produto não pertence a esta loja" 
                    };
                }
                
                return { 
                    success: true, 
                    data: { id: produtoDoc.id, ...data } 
                };
            } else {
                return { success: false, error: 'Produto não encontrado' };
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            return { success: false, error: error.message };
        }
    }

    // Excluir produto permanentemente
    async excluirProduto(produtoId) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            // Verificar se produto existe e pertence à loja
            const produtoDoc = await getDoc(produtoRef);
            
            if (!produtoDoc.exists()) {
                throw new Error('Produto não encontrado');
            }
            
            const produtoData = produtoDoc.data();
            
            // Verificar se produto pertence à loja
            if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Produto não pertence a esta loja');
            }
            
            // EXCLUIR O PRODUTO - SEM VERIFICAÇÃO DE ESTOQUE
            await deleteDoc(produtoRef);
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Buscar produtos para venda (com estoque)
    async buscarProdutosParaVenda() {
        try {
            console.log(`🛒 Buscando produtos disponíveis para venda...`);
            
            // Buscar produtos ativos
            const resultado = await this.buscarProdutos({ ativo: true });
            
            if (!resultado.success) {
                return resultado;
            }
            
            // Filtrar os que têm estoque
            const produtosComEstoque = resultado.data.filter(produto => {
                return (produto.quantidade || 0) > 0;
            });
            
            console.log(`✅ ${produtosComEstoque.length} produtos disponíveis para venda`);
            return { 
                success: true, 
                data: produtosComEstoque 
            };
            
        } catch (error) {
            console.error('Erro ao buscar produtos para venda:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Cadastrar novo produto
    async cadastrarProduto(dadosProduto) {
        try {
            const estoqueRef = collection(db, this.bancoEstoque);
            const novoProdutoRef = doc(estoqueRef);
            
            const produtoData = {
                ...dadosProduto,
                id: novoProdutoRef.id,
                codigo: dadosProduto.codigo || `P${Date.now().toString().slice(-6)}`,
                loja_id: this.lojaId,
                data_cadastro: serverTimestamp(),
                data_atualizacao: serverTimestamp(),
                ativo: true,
                preco: parseFloat(dadosProduto.preco) || 0,
                preco_custo: parseFloat(dadosProduto.preco_custo) || 0,
                quantidade: parseInt(dadosProduto.quantidade) || 0,
                estoque_minimo: parseInt(dadosProduto.estoque_minimo) || 5
            };
            
            await setDoc(novoProdutoRef, produtoData);
            
            return { 
                success: true, 
                data: produtoData 
            };
            
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Atualizar produto existente
    async atualizarProduto(produtoId, dadosAtualizados) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            // Buscar produto atual primeiro para verificar permissões
            const produtoAtual = await getDoc(produtoRef);
            
            if (!produtoAtual.exists()) {
                throw new Error('Produto não encontrado');
            }
            
            const produtoData = produtoAtual.data();
            
            // Verificar se produto pertence à loja (exceto para admin)
            if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Produto não pertence a esta loja');
            }
            
            // Preparar dados para atualização
            const dadosParaAtualizar = {
                ...dadosAtualizados,
                data_atualizacao: serverTimestamp()
            };
            
            // Garantir que números sejam convertidos corretamente
            if (dadosParaAtualizar.preco !== undefined) {
                dadosParaAtualizar.preco = parseFloat(dadosParaAtualizar.preco) || 0;
            }
            
            if (dadosParaAtualizar.preco_custo !== undefined) {
                dadosParaAtualizar.preco_custo = parseFloat(dadosParaAtualizar.preco_custo) || 0;
            }
            
            if (dadosParaAtualizar.quantidade !== undefined) {
                dadosParaAtualizar.quantidade = parseInt(dadosParaAtualizar.quantidade) || 0;
            }
            
            if (dadosParaAtualizar.estoque_minimo !== undefined) {
                dadosParaAtualizar.estoque_minimo = parseInt(dadosParaAtualizar.estoque_minimo) || 5;
            }
            
            if (dadosParaAtualizar.peso_por_unidade !== undefined) {
                dadosParaAtualizar.peso_por_unidade = parseFloat(dadosParaAtualizar.peso_por_unidade) || 0;
            }
            
            await updateDoc(produtoRef, dadosParaAtualizar);
            
            return { 
                success: true, 
                data: { id: produtoId, ...dadosParaAtualizar } 
            };
            
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Atualizar estoque (entrada/saída)
    async atualizarEstoque(produtoId, quantidadeAlterar, tipo = 'entrada') {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            // Usar transação para garantir consistência
            await runTransaction(db, async (transaction) => {
                const produtoDoc = await transaction.get(produtoRef);
                
                if (!produtoDoc.exists()) {
                    throw new Error('Produto não encontrado');
                }
                
                const produtoData = produtoDoc.data();
                
                // Verificar se produto pertence à loja
                if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                    throw new Error('Produto não pertence a esta loja');
                }
                
                const quantidadeAtual = produtoData.quantidade || 0;
                const quantidadeNova = tipo === 'entrada' 
                    ? quantidadeAtual + quantidadeAlterar
                    : quantidadeAtual - quantidadeAlterar;
                
                if (quantidadeNova < 0) {
                    throw new Error('Estoque não pode ficar negativo');
                }
                
                transaction.update(produtoRef, {
                    quantidade: quantidadeNova,
                    data_atualizacao: serverTimestamp()
                });
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Criar nova venda
    async criarVenda(dadosVenda) {
        try {
            const resultado = await runTransaction(db, async (transaction) => {
                // 1. Criar documento de venda
                const vendasRef = collection(db, this.bancoVendas);
                const novaVendaRef = doc(vendasRef);
                
                const vendaData = {
                    ...dadosVenda,
                    id: novaVendaRef.id,
                    numero_venda: `V${Date.now().toString().slice(-8)}`,
                    loja_id: this.lojaId,
                    loja_nome: this.dadosLoja?.nome || this.formatarNomeLoja(this.lojaId),
                    vendedor_id: this.usuario?.id,
                    vendedor_nome: this.nomeUsuario,
                    status: 'concluida',
                    data_venda: serverTimestamp(),
                    data_criacao: serverTimestamp(),
                    total: parseFloat(dadosVenda.total) || 0
                };
                
                transaction.set(novaVendaRef, vendaData);
                
                // 2. Atualizar estoque para cada item
                for (const item of dadosVenda.itens) {
                    const produtoRef = doc(db, this.bancoEstoque, item.produto_id);
                    
                    // Buscar produto atual
                    const produtoDoc = await transaction.get(produtoRef);
                    if (!produtoDoc.exists()) {
                        throw new Error(`Produto ${item.produto_id} não encontrado`);
                    }
                    
                    const produtoData = produtoDoc.data();
                    
                    // Verificar se produto pertence à loja
                    if (produtoData.loja_id !== this.lojaId) {
                        throw new Error(`Produto não pertence a esta loja`);
                    }
                    
                    const estoqueAtual = produtoData.quantidade || 0;
                    const quantidadeVenda = item.quantidade || 0;
                    
                    if (estoqueAtual < quantidadeVenda) {
                        throw new Error(`Estoque insuficiente para ${produtoData.nome}`);
                    }
                    
                    // Atualizar estoque
                    transaction.update(produtoRef, {
                        quantidade: increment(-quantidadeVenda),
                        data_atualizacao: serverTimestamp()
                    });
                }
                
                return vendaData;
            });
            
            return { success: true, data: resultado };
            
        } catch (error) {
            console.error('Erro ao criar venda:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Buscar vendas recentes
    async buscarVendas(limite = 10) {
        try {
            console.log(`📋 Buscando últimas vendas...`);
            const vendasRef = collection(db, this.bancoVendas);
            
            // Buscar TODAS as vendas
            const snapshot = await getDocs(vendasRef);
            
            const vendas = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Filtrar por loja
                if (data.loja_id === this.lojaId || this.isAdmin) {
                    vendas.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // Ordenar por data (mais recente primeiro)
            vendas.sort((a, b) => {
                const dataA = a.data_venda?.toDate ? a.data_venda.toDate() : new Date(a.data_criacao || 0);
                const dataB = b.data_venda?.toDate ? b.data_venda.toDate() : new Date(b.data_criacao || 0);
                return dataB - dataA;
            });
            
            // Limitar quantidade
            const vendasLimitadas = vendas.slice(0, limite);
            
            console.log(`✅ ${vendasLimitadas.length} vendas encontradas`);
            return { success: true, data: vendasLimitadas };
            
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Buscar estatísticas
    async buscarEstatisticas() {
        try {
            console.log('📊 Calculando estatísticas...');
            
            // 1. Buscar produtos
            const produtosResult = await this.buscarProdutos({ ativo: true });
            let totalProdutos = 0;
            let totalValorEstoque = 0;
            let produtosBaixoEstoque = 0;
            
            if (produtosResult.success) {
                produtosResult.data.forEach(produto => {
                    const quantidade = produto.quantidade || 0;
                    const precoCusto = produto.preco_custo || 0;
                    
                    totalProdutos += quantidade;
                    totalValorEstoque += precoCusto * quantidade;
                    
                    if (quantidade <= (produto.estoque_minimo || 5)) {
                        produtosBaixoEstoque++;
                    }
                });
            }
            
            // 2. Buscar vendas
            const vendasResult = await this.buscarVendas(100);
            let totalVendasHoje = 0;
            let quantidadeVendasHoje = 0;
            
            if (vendasResult.success) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                vendasResult.data.forEach(venda => {
                    const dataVenda = venda.data_venda?.toDate ? 
                        venda.data_venda.toDate() : 
                        new Date(venda.data_criacao || 0);
                    
                    if (dataVenda >= hoje) {
                        totalVendasHoje += parseFloat(venda.total) || 0;
                        quantidadeVendasHoje++;
                    }
                });
            }
            
            console.log(`📊 Estatísticas: ${quantidadeVendasHoje} vendas hoje`);
            
            return {
                success: true,
                data: {
                    totalProdutos: totalProdutos,
                    totalValorEstoque: totalValorEstoque.toFixed(2),
                    produtosBaixoEstoque: produtosBaixoEstoque,
                    vendasHoje: totalVendasHoje.toFixed(2),
                    quantidadeVendasHoje: quantidadeVendasHoje,
                    meta_mensal: this.dadosLoja?.meta_mensal || 10000
                }
            };
            
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return { 
                success: true, 
                data: {
                    totalProdutos: 0,
                    totalValorEstoque: 0,
                    produtosBaixoEstoque: 0,
                    vendasHoje: 0,
                    quantidadeVendasHoje: 0,
                    meta_mensal: this.dadosLoja?.meta_mensal || 10000
                }
            };
        }
    }
    
    // Buscar categorias
    async buscarCategorias() {
        try {
            const resultado = await this.buscarProdutos({ ativo: true });
            
            if (!resultado.success) {
                return { success: false, error: resultado.error };
            }
            
            const categorias = new Set();
            resultado.data.forEach(produto => {
                if (produto.categoria && produto.categoria.trim() !== '') {
                    categorias.add(produto.categoria);
                }
            });
            
            return { 
                success: true, 
                data: Array.from(categorias).sort() 
            };
            
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Logout
    logout() {
        sessionStorage.removeItem('pdv_sessao_temporaria');
        localStorage.removeItem('pdv_sessao_backup');
        window.location.href = '../../login.html';
    }
    
    // Formatar moeda
    formatarMoeda(valor) {
        const numero = parseFloat(valor) || 0;
        return numero.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
}

// Criar instância global
const lojaManager = new LojaManager();

// Criar objeto de serviços (similar ao mjServices)
const lojaServices = {
    // Dados da loja
    buscarDadosLoja: () => lojaManager.buscarDadosLoja(),
    
    // Estoque
    buscarProdutos: (filtro) => lojaManager.buscarProdutos(filtro),
    buscarProdutoPorId: (id) => lojaManager.buscarProdutoPorId(id),
    buscarProdutosParaVenda: () => lojaManager.buscarProdutosParaVenda(),
    cadastrarProduto: (dados) => lojaManager.cadastrarProduto(dados),
    buscarCategorias: () => lojaManager.buscarCategorias(),
    atualizarProduto: (id, dados) => lojaManager.atualizarProduto(id, dados),
    atualizarEstoque: (id, quantidade, tipo) => lojaManager.atualizarEstoque(id, quantidade, tipo),
    excluirProduto: (id) => lojaManager.excluirProduto(id), 
    
    // Vendas
    criarVenda: (dados) => lojaManager.criarVenda(dados),
    buscarVendas: (limite) => lojaManager.buscarVendas(limite),
    
    // Estatísticas
    buscarEstatisticas: () => lojaManager.buscarEstatisticas(),
    
    // Utilitários
    formatarMoeda: (valor) => lojaManager.formatarMoeda(valor),
    logout: () => lojaManager.logout(),
    
    // ========== GETTERS COMPLETOS - COM imgbbKey ==========
    get lojaId() { return lojaManager.lojaId; },
    get usuario() { return lojaManager.usuario; },
    get nomeUsuario() { return lojaManager.nomeUsuario; },
    get perfil() { return lojaManager.perfil; },
    get isAdmin() { return lojaManager.isAdmin; },
    get isLogged() { return lojaManager.isLogged; },
    get dadosLoja() { return lojaManager.dadosLoja; },
    
    // ========== CHAVE IMGBB - ESSA É A PARTE CRÍTICA ==========
    get imgbbKey() { 
        // Primeiro tenta pegar do lojaManager
        if (lojaManager.imgbbKey) {
            return lojaManager.imgbbKey;
        }
        
        // Se não tiver, tenta pegar da configuração da loja
        if (lojaManager.config?.imgbb_api_key) {
            lojaManager.imgbbKey = lojaManager.config.imgbb_api_key;
            return lojaManager.imgbbKey;
        }
        
        // Se não tiver, tenta pegar do dadosLoja
        if (lojaManager.dadosLoja?.imgbb_key) {
            lojaManager.imgbbKey = lojaManager.dadosLoja.imgbb_key;
            return lojaManager.imgbbKey;
        }
        
        console.warn('⚠️ imgbbKey não encontrada em nenhuma fonte');
        return null;
    },
    
    // ========== MÉTODO PARA CONFIGURAR A CHAVE ==========
    configurarImgBBKey: (chave) => {
        lojaManager.imgbbKey = chave;
        if (!lojaManager.dadosLoja) lojaManager.dadosLoja = {};
        lojaManager.dadosLoja.imgbb_key = chave;
        console.log(`✅ Chave ImgBB configurada: ${chave?.substring(0, 8)}...`);
    }
};

// Função auxiliar para configurar automaticamente
async function configurarChaveImgBBAutomaticamente() {
    try {
        console.log('🔑 Configurando chave ImgBB automaticamente...');
        
        if (lojaManager.lojaId && !lojaManager.imgbbKey) {
            // Importar função getImgBBKey
            const { getImgBBKey } = await import('../../lojas.js');
            const chave = getImgBBKey(lojaManager.lojaId);
            
            if (chave) {
                lojaManager.imgbbKey = chave;
                console.log(`✅ Chave ImgBB configurada automaticamente: ${chave.substring(0, 8)}...`);
            } else {
                console.warn('⚠️ Não foi possível obter chave ImgBB automaticamente');
            }
        } else if (lojaManager.imgbbKey) {
            console.log(`✅ Chave ImgBB já configurada: ${lojaManager.imgbbKey.substring(0, 8)}...`);
        }
    } catch (error) {
        console.error('❌ Erro ao configurar chave ImgBB:', error);
    }
}

// Executar configuração automática após um breve delay
setTimeout(configurarChaveImgBBAutomaticamente, 500);

// Exportar tudo
export { 
    db, 
    lojaServices,
    lojaManager,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    limit
};

// Para uso global
window.lojaServices = lojaServices;
window.lojaManager = lojaManager;

// Exportar serviços de imagem
import { imagemServices } from './imagem_api.js';
export { imagemServices };
window.imagemServices = imagemServices;

console.log(`🏪 Sistema configurado para loja: ${lojaManager.lojaId || 'Não identificada'}`);
console.log(`🔑 Status ImgBB: ${lojaManager.imgbbKey ? 'CONFIGURADA' : 'NÃO CONFIGURADA'}`);
