// firebase_config.js - CONFIGURAÇÃO DINÂMICA PARA TODAS AS LOJAS (SEM ÍNDICES)
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

// Classe principal para gerenciar sessão e serviços
class PdvManager {
    constructor() {
        this.lojaId = null;
        this.usuario = null;
        this.configLoja = null;
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
                this.carregarDadosLoja();
                console.log(`✅ Sessão carregada: ${this.lojaId}`);
                return;
            }
            
            // 2. Tentar do backup
            const backup = localStorage.getItem('pdv_sessao_backup');
            if (backup) {
                const dados = JSON.parse(backup);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.carregarDadosLoja();
                console.log(`⚠️ Sessão carregada do backup: ${this.lojaId}`);
                return;
            }
            
            // 3. Tentar da URL (fallback para desenvolvimento)
            const pathParts = window.location.pathname.split('/');
            const lojaIndex = pathParts.indexOf('lojas');
            if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
                this.lojaId = pathParts[lojaIndex + 1];
                console.log(`📍 Loja detectada da URL: ${this.lojaId}`);
                
                // Dados de usuário fake para desenvolvimento
                this.usuario = {
                    login: 'dev_user',
                    nome: 'Usuário Desenvolvimento',
                    perfil: 'admin'
                };
                
                this.carregarDadosLoja();
                return;
            }
            
            // 4. Redirecionar se não encontrou
            console.error('❌ Sessão não encontrada');
            this.redirecionarLogin();
            
        } catch (error) {
            console.error('❌ Erro ao carregar sessão:', error);
            this.redirecionarLogin();
        }
    }
    
    async carregarDadosLoja() {
        try {
            if (!this.lojaId) {
                console.warn('⚠️ Loja ID não definido');
                return null;
            }
            
            console.log(`🔍 Buscando dados da loja: ${this.lojaId}`);
            
            // 1. Primeiro, buscar configuração do lojas.js
            this.configLoja = getLojaConfig(this.lojaId);
            console.log('📋 Configuração do arquivo:', this.configLoja);
            
            // 2. Tentar buscar dados completos do Firebase
            try {
                const lojaRef = doc(db, "lojas", this.lojaId);
                const lojaDoc = await getDoc(lojaRef);
                
                if (lojaDoc.exists()) {
                    const dadosFirebase = lojaDoc.data();
                    console.log('🔥 Dados do Firebase:', dadosFirebase);
                    
                    // Mesclar dados: Firebase tem prioridade, arquivo tem fallback
                    this.configLoja = {
                        // Dados do arquivo (bancos)
                        banco_estoque: this.configLoja.banco_estoque,
                        banco_vendas: this.configLoja.banco_vendas,
                        // Dados do Firebase (sobrescrevem se existirem)
                        nome: dadosFirebase.nome || this.formatarNomeLoja(this.lojaId),
                        local: dadosFirebase.local || dadosFirebase.endereco || '',
                        telefone: dadosFirebase.telefone || dadosFirebase.contato?.telefone || '',
                        email: dadosFirebase.email || dadosFirebase.contato?.email || '',
                        cnpj: dadosFirebase.cnpj || dadosFirebase.documento || '',
                        tipo: dadosFirebase.tipo || 'padrao',
                        meta_mensal: dadosFirebase.meta_mensal || 10000,
                        // Outros dados do Firebase
                        ...dadosFirebase
                    };
                    
                } else {
                    console.log(`ℹ️ Loja ${this.lojaId} não encontrada no Firebase, usando dados locais`);
                    this.usarDadosLocais();
                }
            } catch (firebaseError) {
                console.warn('⚠️ Erro ao buscar do Firebase, usando dados locais:', firebaseError.message);
                this.usarDadosLocais();
            }
            
            console.log(`✅ Configuração final da loja:`, this.configLoja);
            return this.configLoja;
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados da loja:', error);
            this.usarDadosLocais();
            return this.configLoja;
        }
    }
    
    usarDadosLocais() {
        this.configLoja = {
            ...this.configLoja,
            nome: this.formatarNomeLoja(this.lojaId),
            local: '',
            telefone: '',
            email: '',
            cnpj: '',
            tipo: 'padrao',
            meta_mensal: 10000
        };
    }
    
    formatarNomeLoja(id) {
        return id
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\bmj\b/gi, 'MJ')
            .replace(/\bacai\b/gi, 'Açaí');
    }
    
    redirecionarLogin() {
        setTimeout(() => {
            window.location.href = '../../login.html';
        }, 1500);
    }
    
    // ========== GETTERS ==========
    get bancoEstoque() {
        return this.configLoja?.banco_estoque || `estoque_${this.lojaId?.replace(/-/g, '_')}`;
    }
    
    get bancoVendas() {
        return this.configLoja?.banco_vendas || `vendas_${this.lojaId?.replace(/-/g, '_')}`;
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
    
    // ========== SERVIÇOS (SEM ÍNDICES) ==========
    
    // Buscar dados da loja do Firebase
    async buscarDadosLoja() {
        try {
            if (!this.lojaId) {
                return { success: false, error: "Loja não identificada" };
            }
            
            return {
                success: true,
                data: {
                    id: this.lojaId,
                    nome: this.configLoja?.nome || this.formatarNomeLoja(this.lojaId),
                    local: this.configLoja?.local || '',
                    telefone: this.configLoja?.telefone || '',
                    email: this.configLoja?.email || '',
                    cnpj: this.configLoja?.cnpj || '',
                    tipo: this.configLoja?.tipo || 'padrao',
                    meta_mensal: this.configLoja?.meta_mensal || 10000
                }
            };
            
        } catch (error) {
            console.error('Erro ao buscar dados da loja:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    // ========== ESTOQUE ==========
    
    async buscarProdutos(filtro = {}) {
        try {
            console.log(`🔍 Buscando produtos em ${this.bancoEstoque}...`);
            const estoqueRef = collection(db, this.bancoEstoque);
            
            // Buscar TODOS os produtos (sem filtros complexos)
            const snapshot = await getDocs(estoqueRef);
            
            const produtos = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // FILTRAGEM LOCAL (para evitar índices)
                let deveIncluir = true;
                
                // Filtro por loja
                if (!this.isAdmin && data.loja_id !== this.lojaId) {
                    deveIncluir = false;
                }
                
                // Filtro por ativo
                if (filtro.ativo !== undefined && data.ativo !== filtro.ativo) {
                    deveIncluir = false;
                }
                
                // Filtro por categoria
                if (filtro.categoria && data.categoria !== filtro.categoria) {
                    deveIncluir = false;
                }
                
                // Filtro por baixo estoque
                if (filtro.baixo_estoque && data.quantidade > 10) {
                    deveIncluir = false;
                }
                
                if (deveIncluir) {
                    produtos.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // Ordenar localmente
            produtos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            
            console.log(`✅ ${produtos.length} produtos encontrados`);
            return { success: true, data: produtos };
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return { success: false, error: error.message };
        }
    }
    
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
    
    async atualizarProduto(produtoId, dadosAtualizacao) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            // Verificar se produto existe e pertence à loja
            const produtoDoc = await getDoc(produtoRef);
            if (!produtoDoc.exists()) {
                return { success: false, error: 'Produto não encontrado' };
            }
            
            const produtoData = produtoDoc.data();
            if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                return { 
                    success: false, 
                    error: "Produto não pertence a esta loja" 
                };
            }
            
            const dadosAtualizados = {
                ...dadosAtualizacao,
                data_atualizacao: serverTimestamp()
            };
            
            await updateDoc(produtoRef, dadosAtualizados);
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            return { success: false, error: error.message };
        }
    }
    
    async atualizarEstoque(produtoId, quantidade) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            await updateDoc(produtoRef, {
                quantidade: increment(quantidade),
                data_atualizacao: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarCategorias() {
        try {
            // Buscar todos produtos e extrair categorias localmente
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
    
    // ========== VENDAS ==========
    
    async buscarProdutosParaVenda() {
        try {
            console.log(`🔍 Buscando produtos para venda...`);
            
            // Buscar todos produtos ativos
            const resultado = await this.buscarProdutos({ ativo: true });
            
            if (!resultado.success) {
                return resultado;
            }
            
            // Filtrar localmente os com estoque > 0
            const produtosComEstoque = resultado.data.filter(produto => {
                return (produto.quantidade || 0) > 0;
            });
            
            // Ordenar por nome
            produtosComEstoque.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            
            console.log(`✅ ${produtosComEstoque.length} produtos disponíveis para venda`);
            return { 
                success: true, 
                data: produtosComEstoque.map(p => ({
                    ...p,
                    disponivel: true
                }))
            };
            
        } catch (error) {
            console.error('Erro ao buscar produtos para venda:', error);
            return { success: false, error: error.message };
        }
    }
    
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
                    loja_nome: this.configLoja?.nome || this.lojaId,
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
    
    async buscarVendas(limite = 10) {
        try {
            console.log(`🔍 Buscando últimas ${limite} vendas...`);
            const vendasRef = collection(db, this.bancoVendas);
            
            // Buscar TODAS as vendas e filtrar localmente
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
            
            // Ordenar por data (mais recente primeiro) - localmente
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
    
    async buscarEstatisticas() {
        try {
            console.log('📊 Calculando estatísticas...');
            
            // 1. Buscar todos produtos
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
            
            // 2. Buscar vendas do dia
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const vendasResult = await this.buscarVendas(100); // Buscar mais vendas para filtrar
            let totalVendasHoje = 0;
            let quantidadeVendasHoje = 0;
            
            if (vendasResult.success) {
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
            
            console.log(`📊 Estatísticas calculadas: ${quantidadeVendasHoje} vendas hoje`);
            
            return {
                success: true,
                data: {
                    totalProdutos: totalProdutos,
                    totalValorEstoque: totalValorEstoque.toFixed(2),
                    produtosBaixoEstoque: produtosBaixoEstoque,
                    vendasHoje: totalVendasHoje.toFixed(2),
                    quantidadeVendasHoje: quantidadeVendasHoje
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
                    quantidadeVendasHoje: 0
                }
            };
        }
    }
    
    // ========== UTILIDADES ==========
    
    logout() {
        sessionStorage.removeItem('pdv_sessao_temporaria');
        localStorage.removeItem('pdv_sessao_backup');
        window.location.href = '../../login.html';
    }
    
    formatarMoeda(valor) {
        const numero = parseFloat(valor) || 0;
        return numero.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    formatarData(dataFirebase) {
        if (!dataFirebase) return '';
        
        try {
            const data = dataFirebase.toDate();
            return data.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return String(dataFirebase);
        }
    }
}

// Criar instância global
const pdvManager = new PdvManager();

// Exportar para uso em outros arquivos
export { 
    db, 
    pdvManager,
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

// Para uso global (opcional)
window.pdvManager = pdvManager;
window.db = db;

console.log(`🏪 PDV Manager inicializado para: ${pdvManager.lojaId}`);
