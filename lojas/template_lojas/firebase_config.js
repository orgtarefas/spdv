// firebase_config.js - CONFIGURAÇÃO DINÂMICA PARA TODAS AS LOJAS
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
                this.configLoja = getLojaConfig(this.lojaId);
                console.log(`✅ Sessão carregada: ${this.lojaId}`);
                return;
            }
            
            // 2. Tentar do backup
            const backup = localStorage.getItem('pdv_sessao_backup');
            if (backup) {
                const dados = JSON.parse(backup);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.configLoja = getLojaConfig(this.lojaId);
                console.log(`⚠️ Sessão carregada do backup: ${this.lojaId}`);
                return;
            }
            
            // 3. Redirecionar se não encontrou
            console.error('❌ Sessão não encontrada');
            this.redirecionarLogin();
            
        } catch (error) {
            console.error('❌ Erro ao carregar sessão:', error);
            this.redirecionarLogin();
        }
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
        return this.usuario?.nome || this.usuario?.login;
    }
    
    // ========== SERVIÇOS ==========
    
    // Buscar dados da loja do Firebase
    async buscarDadosLoja() {
        try {
            const lojaRef = doc(db, "lojas", this.lojaId);
            const lojaDoc = await getDoc(lojaRef);
            
            if (lojaDoc.exists()) {
                return { 
                    success: true, 
                    data: { id: lojaDoc.id, ...lojaDoc.data() } 
                };
            } else {
                return { 
                    success: false, 
                    error: "Dados da loja não encontrados no Firebase" 
                };
            }
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
            const estoqueRef = collection(db, this.bancoEstoque);
            let q = query(estoqueRef);
            
            // Filtros
            const whereConditions = [];
            
            // Filtrar por loja (sempre)
            whereConditions.push(where('loja_id', '==', this.lojaId));
            
            if (filtro.ativo !== undefined) {
                whereConditions.push(where('ativo', '==', filtro.ativo));
            }
            
            if (filtro.categoria) {
                whereConditions.push(where('categoria', '==', filtro.categoria));
            }
            
            if (filtro.baixo_estoque) {
                whereConditions.push(where('quantidade', '<=', 10));
            }
            
            if (filtro.nome) {
                // Para busca por nome, vamos filtrar no JavaScript
                // Firebase não suporta pesquisa por substring diretamente
            }
            
            q = query(estoqueRef, ...whereConditions, orderBy('nome'));
            const snapshot = await getDocs(q);
            
            const produtos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Filtro por nome (se especificado)
                if (filtro.nome) {
                    const nomeProduto = data.nome?.toLowerCase() || '';
                    const busca = filtro.nome.toLowerCase();
                    if (!nomeProduto.includes(busca)) {
                        return;
                    }
                }
                
                produtos.push({
                    id: doc.id,
                    ...data
                });
            });
            
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
            const estoqueRef = collection(db, this.bancoEstoque);
            const q = query(
                estoqueRef, 
                where('loja_id', '==', this.lojaId),
                where('ativo', '==', true)
            );
            
            const snapshot = await getDocs(q);
            const categorias = new Set();
            
            snapshot.forEach(doc => {
                const categoria = doc.data().categoria;
                if (categoria && categoria.trim() !== '') {
                    categorias.add(categoria);
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
            const estoqueRef = collection(db, this.bancoEstoque);
            const q = query(
                estoqueRef,
                where('loja_id', '==', this.lojaId),
                where('ativo', '==', true),
                where('quantidade', '>', 0),
                orderBy('nome')
            );
            
            const snapshot = await getDocs(q);
            const produtos = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                produtos.push({
                    id: doc.id,
                    ...data,
                    disponivel: true
                });
            });
            
            return { success: true, data: produtos };
            
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
    
    async buscarVendas(limite = 50) {
        try {
            const vendasRef = collection(db, this.bancoVendas);
            const q = query(
                vendasRef,
                where('loja_id', '==', this.lojaId),
                orderBy('data_venda', 'desc'),
                limit(limite)
            );
            
            const snapshot = await getDocs(q);
            const vendas = [];
            
            snapshot.forEach(doc => {
                vendas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return { success: true, data: vendas };
            
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarEstatisticas() {
        try {
            // Produtos em estoque
            const estoqueRef = collection(db, this.bancoEstoque);
            const produtosQuery = query(
                estoqueRef, 
                where('loja_id', '==', this.lojaId),
                where('ativo', '==', true)
            );
            const produtosSnapshot = await getDocs(produtosQuery);
            
            let totalProdutos = 0;
            let totalValorEstoque = 0;
            let produtosBaixoEstoque = 0;
            
            produtosSnapshot.forEach(doc => {
                const produto = doc.data();
                totalProdutos += produto.quantidade || 0;
                totalValorEstoque += (produto.preco_custo || 0) * (produto.quantidade || 0);
                
                if (produto.quantidade <= (produto.estoque_minimo || 5)) {
                    produtosBaixoEstoque++;
                }
            });
            
            // Vendas do dia
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);
            
            const vendasRef = collection(db, this.bancoVendas);
            const vendasQuery = query(
                vendasRef,
                where('loja_id', '==', this.lojaId),
                where('data_venda', '>=', hoje),
                where('data_venda', '<', amanha)
            );
            
            const vendasSnapshot = await getDocs(vendasQuery);
            let totalVendasHoje = 0;
            let quantidadeVendasHoje = 0;
            
            vendasSnapshot.forEach(doc => {
                const venda = doc.data();
                totalVendasHoje += venda.total || 0;
                quantidadeVendasHoje++;
            });
            
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
        return parseFloat(valor).toLocaleString('pt-BR', {
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
            return dataFirebase;
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
