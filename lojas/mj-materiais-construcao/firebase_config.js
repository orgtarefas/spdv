import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, 
    setDoc, updateDoc, deleteDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, increment, runTransaction,
    limit, addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { imagemServices } from './imagem_api.js';
import { getLojaConfig } from '../../lojas.js';

const firebaseConfig = {
    apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
    authDomain: "spdv-3872a.firebaseapp.com",
    projectId: "spdv-3872a",
    storageBucket: "spdv-3872a.firebasestorage.app",
    messagingSenderId: "552499245950",
    appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado com sucesso');
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
}

class LojaManager {
    constructor() {
        this.lojaId = null;
        this.usuario = null;
        this.config = null;
        this.dadosLoja = null;
        this.imgbbKey = null;
        this.inicializar();
    }
    
    inicializar() {
        this.carregarSessao();
    }
    
    carregarSessao() {
        try {
            const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
            if (sessao) {
                const dados = JSON.parse(sessao);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key;
                console.log(`✅ Loja identificada: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB: ${this.imgbbKey ? 'Configurada' : 'Não configurada'}`);
                return;
            }
            
            const backup = localStorage.getItem('pdv_sessao_backup');
            if (backup) {
                const dados = JSON.parse(backup);
                this.lojaId = dados.banco_login;
                this.usuario = dados;
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key;
                console.log(`⚠️ Loja identificada do backup: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB: ${this.imgbbKey ? 'Configurada' : 'Não configurada'}`);
                return;
            }
            
            const pathParts = window.location.pathname.split('/');
            const lojaIndex = pathParts.indexOf('lojas');
            if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
                this.lojaId = pathParts[lojaIndex + 1];
                this.config = getLojaConfig(this.lojaId);
                this.imgbbKey = this.config?.imgbb_api_key;
                
                this.usuario = {
                    login: 'dev_user',
                    nome: 'Usuário Desenvolvimento',
                    perfil: 'admin',
                    id: 'dev_001'
                };
                
                console.log(`📍 Loja detectada da URL: ${this.lojaId}`);
                console.log(`🔑 Chave ImgBB: ${this.imgbbKey ? 'Configurada' : 'Não configurada'}`);
                return;
            }
            
            console.error('❌ Não foi possível identificar a loja');
            
        } catch (error) {
            console.error('❌ Erro ao carregar sessão:', error);
        }
    }
    
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
    
    get loginUsuario() {
        return this.usuario?.login || 'operador';
    }
    
    get perfil() {
        return this.usuario?.perfil || 'usuario';
    }
    
    async buscarDadosLoja() {
        try {
            console.log(`🔍 Buscando dados da loja no Firebase: ${this.lojaId}`);
            
            if (!this.lojaId) {
                return { 
                    success: false, 
                    error: "ID da loja não identificado" 
                };
            }
            
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
                
                this.dadosLoja = {
                    id: this.lojaId,
                    nome: this.formatarNomeLoja(this.lojaId),
                    local: '',
                    telefone: '',
                    email: '',
                    cnpj: '',
                    tipo: 'padrao',
                    meta_mensal: 10000,
                    imgbb_key: this.imgbbKey
                };
                
                return { 
                    success: false, 
                    error: "Dados da loja não encontrados",
                    data: this.dadosLoja 
                };
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar dados da loja:', error);
            
            this.dadosLoja = {
                id: this.lojaId,
                nome: this.formatarNomeLoja(this.lojaId),
                local: '',
                telefone: '',
                email: '',
                cnpj: '',
                tipo: 'padrao',
                meta_mensal: 10000,
                imgbb_key: this.imgbbKey
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
        
        return id
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\bmj\b/gi, 'MJ')
            .replace(/\bacai\b/gi, 'Açaí')
            .replace(/\bpadaria\b/gi, 'Padaria');
    }
    
    async buscarProdutos(filtro = {}) {
        try {
            console.log(`🔍 Buscando produtos em ${this.bancoEstoque}...`);
            const estoqueRef = collection(db, this.bancoEstoque);
            
            const snapshot = await getDocs(estoqueRef);
            
            const produtos = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                produtos.push({
                    id: doc.id,
                    ...data
                });
            });
            
            const produtosFiltrados = produtos.filter(produto => {
                if (!this.isAdmin && produto.loja_id !== this.lojaId) {
                    return false;
                }
                
                if (filtro.ativo !== undefined && produto.ativo !== filtro.ativo) {
                    return false;
                }
                
                if (filtro.categoria && produto.categoria !== filtro.categoria) {
                    return false;
                }
                
                if (filtro.baixo_estoque && produto.quantidade > 10) {
                    return false;
                }
                
                return true;
            });
            
            produtosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            
            console.log(`✅ ${produtosFiltrados.length} produtos encontrados`);
            return { success: true, data: produtosFiltrados };
            
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

    async excluirProduto(produtoId) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            const produtoDoc = await getDoc(produtoRef);
            
            if (!produtoDoc.exists()) {
                throw new Error('Produto não encontrado');
            }
            
            const produtoData = produtoDoc.data();
            
            if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Produto não pertence a esta loja');
            }
            
            if (produtoData.imagens && produtoData.imagens.delete_url) {
                try {
                    await imagemServices.deletarImagem(produtoData.imagens.delete_url);
                    console.log('🗑️ Imagem deletada do ImgBB');
                } catch (error) {
                    console.warn('⚠️ Erro ao deletar imagem do ImgBB:', error);
                }
            }
            
            await deleteDoc(produtoRef);
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            return { success: false, error: error.message };
        }
    }

    async atualizarVenda(vendaId, dadosAtualizados) {
        try {
            console.log(`📝 Atualizando venda: ${vendaId}`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            const vendaRef = doc(db, this.bancoVendas, vendaId);
            
            // Verificar se existe
            const vendaDoc = await getDoc(vendaRef);
            
            if (!vendaDoc.exists()) {
                return { success: false, error: 'Venda não encontrada' };
            }
            
            const vendaData = vendaDoc.data();
            
            // Verificar permissão
            if (vendaData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Venda não pertence a esta loja');
            }
            
            // Adicionar timestamp de atualização
            const dadosParaAtualizar = {
                ...dadosAtualizados,
                data_atualizacao: serverTimestamp()
            };
            
            await updateDoc(vendaRef, dadosParaAtualizar);
            
            console.log(`✅ Venda ${vendaId} atualizada com sucesso`);
            
            return { 
                success: true, 
                data: { id: vendaId, ...dadosParaAtualizar } 
            };
            
        } catch (error) {
            console.error('❌ Erro ao atualizar venda:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarProdutosParaVenda() {
        try {
            console.log(`🛒 Buscando produtos disponíveis para venda...`);
            
            const resultado = await this.buscarProdutos({ ativo: true });
            
            if (!resultado.success) {
                return resultado;
            }
            
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
    
    async cadastrarProduto(dadosProduto) {
        try {
            const estoqueRef = collection(db, this.bancoEstoque);
            const novoProdutoRef = doc(estoqueRef);
            
            const produtoData = {
                ...dadosProduto,
                id: novoProdutoRef.id,
                codigo: dadosProduto.codigo || `P${Date.now().toString().slice(-6)}`,
                loja_id: this.lojaId,
                loja_nome: this.dadosLoja?.nome || this.formatarNomeLoja(this.lojaId),
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
    
    async atualizarProduto(produtoId, dadosAtualizados) {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            const produtoAtual = await getDoc(produtoRef);
            
            if (!produtoAtual.exists()) {
                throw new Error('Produto não encontrado');
            }
            
            const produtoData = produtoAtual.data();
            
            if (produtoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Produto não pertence a esta loja');
            }
            
            const dadosParaAtualizar = {
                ...dadosAtualizados,
                data_atualizacao: serverTimestamp()
            };
            
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
    
    async atualizarEstoque(produtoId, quantidadeAlterar, tipo = 'entrada') {
        try {
            const produtoRef = doc(db, this.bancoEstoque, produtoId);
            
            await runTransaction(db, async (transaction) => {
                const produtoDoc = await transaction.get(produtoRef);
                
                if (!produtoDoc.exists()) {
                    throw new Error('Produto não encontrado');
                }
                
                const produtoData = produtoDoc.data();
                
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
    
    // ============================================
    // MÉTODOS PARA VENDAS
    // ============================================
    
    async criarVenda(dadosVenda) {
        try {
            const resultado = await runTransaction(db, async (transaction) => {
                // 1️⃣ PRIMEIRO: FAZER TODAS AS LEITURAS
                const produtosRefs = [];
                const produtosData = [];
                
                for (const item of dadosVenda.itens) {
                    const produtoRef = doc(db, this.bancoEstoque, item.produto_id);
                    const produtoDoc = await transaction.get(produtoRef);
                    
                    if (!produtoDoc.exists()) {
                        throw new Error(`Produto ${item.produto_id} não encontrado`);
                    }
                    
                    const produtoData = produtoDoc.data();
                    
                    if (produtoData.loja_id !== this.lojaId) {
                        throw new Error(`Produto não pertence a esta loja`);
                    }
                    
                    const estoqueAtual = produtoData.quantidade || 0;
                    const quantidadeVenda = item.quantidade || 0;
                    
                    if (estoqueAtual < quantidadeVenda) {
                        throw new Error(`Estoque insuficiente para ${produtoData.nome}`);
                    }
                    
                    produtosRefs.push({
                        ref: produtoRef,
                        quantidade: quantidadeVenda
                    });
                }
                
                // 2️⃣ DEPOIS: FAZER TODAS AS ESCRITAS
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
                    vendedor_login: this.loginUsuario,
                    status: 'concluida',
                    data_venda: serverTimestamp(),
                    data_criacao: serverTimestamp(),
                    total: parseFloat(dadosVenda.total) || 0
                };
                
                transaction.set(novaVendaRef, vendaData);
                
                // Atualizar estoque de todos os produtos
                for (const { ref, quantidade } of produtosRefs) {
                    transaction.update(ref, {
                        quantidade: increment(-quantidade),
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
            console.log(`📋 Buscando últimas vendas...`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            if (!this.lojaId) {
                throw new Error('Loja não identificada');
            }
            
            // Buscar todas as vendas e filtrar manualmente (SEM ÍNDICE)
            const vendasRef = collection(db, this.bancoVendas);
            const snapshot = await getDocs(vendasRef);
            
            let vendas = [];
            snapshot.forEach(doc => {
                vendas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Filtrar por loja_id manualmente
            vendas = vendas.filter(v => v.loja_id === this.lojaId);
            
            // Ordenar por data_venda manualmente (mais recentes primeiro)
            vendas.sort((a, b) => {
                const dataA = a.data_venda?.toDate ? a.data_venda.toDate() : new Date(a.data_criacao || 0);
                const dataB = b.data_venda?.toDate ? b.data_venda.toDate() : new Date(b.data_criacao || 0);
                return dataB - dataA;
            });
            
            // Aplicar limite
            vendas = vendas.slice(0, limite);
            
            console.log(`✅ ${vendas.length} vendas encontradas`);
            return { success: true, data: vendas };
            
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarVendasComFiltros(filtros = {}) {
        try {
            console.log('🔍 Buscando vendas com filtros...', filtros);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            if (!this.lojaId) {
                throw new Error('Loja não identificada');
            }
            
            // Buscar TODAS as vendas da coleção específica da loja
            const vendasRef = collection(db, this.bancoVendas);
            const snapshot = await getDocs(vendasRef);
            
            let vendas = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Log para debug
                console.log('📦 Documento encontrado:', doc.id, {
                    numero: data.numero_venda || data.numero,
                    loja_id: data.loja_id,
                    total: data.total,
                    data: data.data_venda
                });
                
                vendas.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Filtrar por loja_id (se existir nos dados)
            if (this.lojaId) {
                vendas = vendas.filter(v => {
                    // Se tem loja_id nos dados, usa ele
                    if (v.loja_id) {
                        return v.loja_id === this.lojaId;
                    }
                    // Se não tem loja_id, considera da loja atual (dados antigos)
                    return true;
                });
            }
            
            // Aplicar filtro por data
            if (filtros.data) {
                const dataFiltro = new Date(filtros.data);
                dataFiltro.setHours(0, 0, 0, 0);
                const dataFim = new Date(filtros.data);
                dataFim.setHours(23, 59, 59, 999);
                
                vendas = vendas.filter(v => {
                    const dataVenda = v.data_venda?.toDate ? 
                        v.data_venda.toDate() : 
                        (v.data_criacao?.toDate ? v.data_criacao.toDate() : new Date(v.timestamp || 0));
                    return dataVenda >= dataFiltro && dataVenda <= dataFim;
                });
            }
            
            // Aplicar filtro por número
            if (filtros.numero) {
                const numLower = filtros.numero.toLowerCase();
                vendas = vendas.filter(v => 
                    (v.numero_venda?.toLowerCase().includes(numLower)) ||
                    (v.numero?.toLowerCase().includes(numLower)) ||
                    (v.id?.toLowerCase().includes(numLower))
                );
            }
            
            // Ordenar por data (mais recentes primeiro)
            vendas.sort((a, b) => {
                const dataA = a.data_venda?.toDate ? a.data_venda.toDate() : 
                             (a.data_criacao?.toDate ? a.data_criacao.toDate() : 
                             new Date(a.timestamp || 0));
                const dataB = b.data_venda?.toDate ? b.data_venda.toDate() : 
                             (b.data_criacao?.toDate ? b.data_criacao.toDate() : 
                             new Date(b.timestamp || 0));
                return dataB - dataA;
            });
            
            console.log(`✅ ${vendas.length} vendas encontradas com filtros`);
            return { success: true, data: vendas };
            
        } catch (error) {
            console.error('❌ Erro ao buscar vendas com filtros:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarVendaPorId(vendaId) {
        try {
            console.log(`🔍 Buscando venda por ID: ${vendaId}`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            const vendaRef = doc(db, this.bancoVendas, vendaId);
            const vendaDoc = await getDoc(vendaRef);
            
            if (!vendaDoc.exists()) {
                return { success: false, error: 'Venda não encontrada' };
            }
            
            const data = vendaDoc.data();
            
            if (data.loja_id !== this.lojaId && !this.isAdmin) {
                return { success: false, error: 'Venda não pertence a esta loja' };
            }
            
            return { 
                success: true, 
                data: { id: vendaDoc.id, ...data } 
            };
            
        } catch (error) {
            console.error('Erro ao buscar venda:', error);
            return { success: false, error: error.message };
        }
    }
    
    // ============================================
    // MÉTODOS PARA ORÇAMENTOS
    // ============================================
    
    async criarOrcamento(orcamentoData) {
        try {
            console.log('📝 Criando novo orçamento...', orcamentoData.numero);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            if (!this.lojaId) {
                throw new Error('Loja não identificada');
            }
            
            // Referência para a coleção de orçamentos
            const orcamentosRef = collection(db, 'orcamentos');
            
            // Adicionar dados da loja e timestamps
            const orcamentoCompleto = {
                ...orcamentoData,
                loja_id: this.lojaId,
                loja_nome: this.dadosLoja?.nome || this.formatarNomeLoja(this.lojaId),
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            };
            
            // Salvar no Firebase
            const docRef = await addDoc(orcamentosRef, orcamentoCompleto);
            
            console.log(`✅ Orçamento ${orcamentoData.numero} criado com ID: ${docRef.id}`);
            
            return {
                success: true,
                id: docRef.id,
                data: { ...orcamentoCompleto, id: docRef.id }
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar orçamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async buscarOrcamentos(filtros = {}) {
        try {
            console.log('🔍 Buscando orçamentos...', filtros);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            if (!this.lojaId) {
                throw new Error('Loja não identificada');
            }
            
            // Buscar TODOS os orçamentos (SEM where com orderBy para evitar índice)
            const orcamentosRef = collection(db, 'orcamentos');
            const snapshot = await getDocs(orcamentosRef);
            
            let orcamentos = [];
            snapshot.forEach(doc => {
                orcamentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Filtrar por loja_id manualmente
            orcamentos = orcamentos.filter(o => o.loja_id === this.lojaId);
            
            // Aplicar filtros adicionais
            if (filtros.data) {
                const dataFiltro = new Date(filtros.data);
                dataFiltro.setHours(0, 0, 0, 0);
                const dataFim = new Date(filtros.data);
                dataFim.setHours(23, 59, 59, 999);
                
                orcamentos = orcamentos.filter(o => {
                    const dataCriacao = o.created_at?.toDate ? o.created_at.toDate() : new Date(o.data_criacao);
                    return dataCriacao >= dataFiltro && dataCriacao <= dataFim;
                });
            }
            
            if (filtros.numero) {
                const numLower = filtros.numero.toLowerCase();
                orcamentos = orcamentos.filter(o => 
                    o.numero?.toLowerCase().includes(numLower)
                );
            }
            
            if (filtros.status) {
                orcamentos = orcamentos.filter(o => o.status === filtros.status);
            }
            
            // Ordenar por data de criação (mais recentes primeiro)
            orcamentos.sort((a, b) => {
                const dataA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.data_criacao || 0);
                const dataB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.data_criacao || 0);
                return dataB - dataA;
            });
            
            console.log(`✅ ${orcamentos.length} orçamentos encontrados`);
            return { success: true, data: orcamentos };
            
        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            return { success: false, error: error.message };
        }
    }
    
    async buscarOrcamentoPorId(orcamentoId) {
        try {
            console.log(`🔍 Buscando orçamento por ID: ${orcamentoId}`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            const orcamentoRef = doc(db, 'orcamentos', orcamentoId);
            const orcamentoDoc = await getDoc(orcamentoRef);
            
            if (!orcamentoDoc.exists()) {
                return { success: false, error: 'Orçamento não encontrado' };
            }
            
            const data = orcamentoDoc.data();
            
            if (data.loja_id !== this.lojaId && !this.isAdmin) {
                return { success: false, error: 'Orçamento não pertence a esta loja' };
            }
            
            return { 
                success: true, 
                data: { id: orcamentoDoc.id, ...data } 
            };
            
        } catch (error) {
            console.error('Erro ao buscar orçamento:', error);
            return { success: false, error: error.message };
        }
    }
    
    async atualizarOrcamento(orcamentoId, dadosAtualizados) {
        try {
            console.log(`📝 Atualizando orçamento: ${orcamentoId}`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            const orcamentoRef = doc(db, 'orcamentos', orcamentoId);
            
            const orcamentoDoc = await getDoc(orcamentoRef);
            
            if (!orcamentoDoc.exists()) {
                throw new Error('Orçamento não encontrado');
            }
            
            const orcamentoData = orcamentoDoc.data();
            
            if (orcamentoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Orçamento não pertence a esta loja');
            }
            
            const dadosParaAtualizar = {
                ...dadosAtualizados,
                updated_at: serverTimestamp()
            };
            
            await updateDoc(orcamentoRef, dadosParaAtualizar);
            
            return { 
                success: true, 
                data: { id: orcamentoId, ...dadosParaAtualizar } 
            };
            
        } catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
            return { success: false, error: error.message };
        }
    }

    async excluirOrcamento(orcamentoId) {
        try {
            console.log(`🗑️ Excluindo orçamento: ${orcamentoId}`);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            const orcamentoRef = doc(db, 'orcamentos', orcamentoId);
            
            // Verificar se existe
            const orcamentoDoc = await getDoc(orcamentoRef);
            
            if (!orcamentoDoc.exists()) {
                return { success: false, error: 'Orçamento não encontrado' };
            }
            
            const orcamentoData = orcamentoDoc.data();
            
            // Verificar permissão (opcional)
            if (orcamentoData.loja_id !== this.lojaId && !this.isAdmin) {
                throw new Error('Orçamento não pertence a esta loja');
            }
            
            // EXCLUIR definitivamente
            await deleteDoc(orcamentoRef);
            
            console.log(`✅ Orçamento ${orcamentoId} excluído permanentemente`);
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao excluir orçamento:', error);
            return { success: false, error: error.message };
        }
    } 
    
    // ============================================
    // MÉTODOS PARA RECOLHIMENTOS
    // ============================================
    
    async criarRecolhimento(recolhimentoData) {
        try {
            console.log('💰 Registrando recolhimento...', recolhimentoData.numero);
            
            if (!db) {
                throw new Error('Banco de dados não inicializado');
            }
            
            if (!this.lojaId) {
                throw new Error('Loja não identificada');
            }
            
            // Referência para a coleção de recolhimentos
            const recolhimentosRef = collection(db, 'recolhimentos');
            
            // Adicionar dados da loja e timestamps
            const recolhimentoCompleto = {
                ...recolhimentoData,
                loja_id: this.lojaId,
                loja_nome: this.dadosLoja?.nome || this.formatarNomeLoja(this.lojaId),
                created_at: serverTimestamp()
            };
            
            // Salvar no Firebase
            const docRef = await addDoc(recolhimentosRef, recolhimentoCompleto);
            
            console.log(`✅ Recolhimento ${recolhimentoData.numero} criado com ID: ${docRef.id}`);
            
            return {
                success: true,
                id: docRef.id,
                data: { ...recolhimentoCompleto, id: docRef.id }
            };
            
        } catch (error) {
            console.error('❌ Erro ao criar recolhimento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ============================================
    // MÉTODOS PARA ESTATÍSTICAS
    // ============================================
    
    async buscarEstatisticas() {
        try {
            console.log('📊 Calculando estatísticas...');
            
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
    
    async testarConfigImgBB() {
        try {
            console.log('🔍 Testando configuração do ImgBB...');
            
            if (!this.imgbbKey) {
                return {
                    success: false,
                    error: 'Chave ImgBB não configurada para esta loja'
                };
            }
            
            const resultado = await imagemServices.testarConexao(this);
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Erro ao testar ImgBB:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
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
}

const lojaManager = new LojaManager();

const lojaServices = {
    buscarDadosLoja: () => lojaManager.buscarDadosLoja(),
    buscarProdutos: (filtro) => lojaManager.buscarProdutos(filtro),
    buscarProdutoPorId: (id) => lojaManager.buscarProdutoPorId(id),
    buscarProdutosParaVenda: () => lojaManager.buscarProdutosParaVenda(),
    cadastrarProduto: (dados) => lojaManager.cadastrarProduto(dados),
    buscarCategorias: () => lojaManager.buscarCategorias(),
    atualizarProduto: (id, dados) => lojaManager.atualizarProduto(id, dados),
    atualizarEstoque: (id, quantidade, tipo) => lojaManager.atualizarEstoque(id, quantidade, tipo),
    excluirProduto: (id) => lojaManager.excluirProduto(id),
    criarVenda: (dados) => lojaManager.criarVenda(dados),
    buscarVendas: (limite) => lojaManager.buscarVendas(limite),
    buscarVendasComFiltros: (filtros) => lojaManager.buscarVendasComFiltros(filtros),
    buscarVendaPorId: (id) => lojaManager.buscarVendaPorId(id),
    criarOrcamento: (dados) => lojaManager.criarOrcamento(dados),
    buscarOrcamentos: (filtros) => lojaManager.buscarOrcamentos(filtros),
    buscarOrcamentoPorId: (id) => lojaManager.buscarOrcamentoPorId(id),
    atualizarOrcamento: (id, dados) => lojaManager.atualizarOrcamento(id, dados),
    criarRecolhimento: (dados) => lojaManager.criarRecolhimento(dados),
    buscarEstatisticas: () => lojaManager.buscarEstatisticas(),
    testarConfigImgBB: () => lojaManager.testarConfigImgBB(),
    formatarMoeda: (valor) => lojaManager.formatarMoeda(valor),
    logout: () => lojaManager.logout(),
    excluirOrcamento: (id) => lojaManager.excluirOrcamento(id),
    atualizarVenda: (id, dados) => lojaManager.atualizarVenda(id, dados),
    
    get lojaId() { return lojaManager.lojaId; },
    get usuario() { return lojaManager.usuario; },
    get nomeUsuario() { return lojaManager.nomeUsuario; },
    get loginUsuario() { return lojaManager.loginUsuario; },
    get perfil() { return lojaManager.perfil; },
    get isAdmin() { return lojaManager.isAdmin; },
    get isLogged() { return lojaManager.isLogged; },
    get dadosLoja() { return lojaManager.dadosLoja; },
    get imgbbKey() { return lojaManager.imgbbKey; }
};

function obterURLImagem(produto, tamanho = 'thumb') {
    if (!produto || !produto.imagens) {
        return gerarImagemPlaceholderBase64();
    }
    
    const imagens = produto.imagens;
    
    switch(tamanho) {
        case 'thumb':
            return imagens.thumbnail || imagens.principal || gerarImagemPlaceholderBase64();
        case 'medium':
            return imagens.medium || imagens.principal || gerarImagemPlaceholderBase64();
        case 'large':
        case 'principal':
            return imagens.principal || gerarImagemPlaceholderBase64();
        default:
            return imagens.principal || gerarImagemPlaceholderBase64();
    }
}

function gerarImagemPlaceholderBase64() {
    return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#f8f9fa"/>
            <circle cx="50" cy="40" r="28" fill="none" stroke="#dee2e6" stroke-width="3"/>
            <line x1="30" y1="25" x2="70" y2="55" stroke="#6c757d" stroke-width="4" stroke-linecap="round"/>
            <line x1="70" y1="25" x2="30" y2="55" stroke="#6c757d" stroke-width="4" stroke-linecap="round"/>
            <text x="50" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#495057" font-weight="bold">
                SEM FOTO
            </text>
        </svg>
    `);
}

function formatarMoeda(valor) {
    return lojaManager.formatarMoeda(valor);
}

lojaServices.obterURLImagem = obterURLImagem;
lojaServices.gerarImagemPlaceholderBase64 = gerarImagemPlaceholderBase64;
lojaServices.formatarMoeda = formatarMoeda;

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
    limit,
    addDoc,
    obterURLImagem,
    gerarImagemPlaceholderBase64,
    formatarMoeda,
    imagemServices
};

window.lojaServices = lojaServices;
window.lojaManager = lojaManager;
window.obterURLImagem = obterURLImagem;
window.gerarImagemPlaceholderBase64 = gerarImagemPlaceholderBase64;
window.formatarMoeda = formatarMoeda;
window.imagemServices = imagemServices;

console.log(`🏪 Sistema configurado para loja: ${lojaManager.lojaId || 'Não identificada'}`);
console.log(`🔑 Chave ImgBB: ${lojaManager.imgbbKey ? 'CONFIGURADA' : 'NÃO CONFIGURADA'}`);
if (lojaManager.imgbbKey) {
    console.log(`🔑 Chave: ${lojaManager.imgbbKey.substring(0, 8)}...`);
}




