// firebase_config.js - CONFIGURAÇÃO ESPECÍFICA PARA MJ MATERIAIS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, getDocs, 
    setDoc, updateDoc, deleteDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, increment, runTransaction 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração do Firebase (mesma configuração)
const firebaseConfig = {
    apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
    authDomain: "spdv-3872a.firebaseapp.com",
    projectId: "spdv-3872a",
    storageBucket: "spdv-3872a.firebasestorage.app",
    messagingSenderId: "552499245950",
    appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
};

// Inicializar Firebase para esta loja específica
const app = initializeApp(firebaseConfig, 'mj-materiais-app');
const db = getFirestore(app);

// Nome da loja no Firebase
const LOJA_ID = 'mj-materiais-construcao';

// Serviços específicos para MJ Materiais
const mjServices = {
    // ========== ESTOQUE ==========
    
    // Buscar todos os produtos do estoque
    buscarProdutos: async (filtro = {}) => {
        try {
            const estoqueRef = collection(db, 'estoque_mj_construcoes');
            let q = query(estoqueRef);
            
            // Aplicar filtros
            const whereConditions = [];
            
            if (filtro.ativo !== undefined) {
                whereConditions.push(where('ativo', '==', filtro.ativo));
            }
            
            if (filtro.categoria) {
                whereConditions.push(where('categoria', '==', filtro.categoria));
            }
            
            if (filtro.baixo_estoque) {
                whereConditions.push(where('quantidade', '<=', 10));
            }
            
            // Construir query
            if (whereConditions.length > 0) {
                q = query(estoqueRef, ...whereConditions, orderBy('nome'));
            } else {
                q = query(estoqueRef, orderBy('nome'));
            }
            
            const snapshot = await getDocs(q);
            const produtos = [];
            
            snapshot.forEach(doc => {
                produtos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return { success: true, data: produtos };
            
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar produto por ID
    buscarProdutoPorId: async (produtoId) => {
        try {
            const produtoRef = doc(db, 'estoque_mj_construcoes', produtoId);
            const produtoDoc = await getDoc(produtoRef);
            
            if (produtoDoc.exists()) {
                return { 
                    success: true, 
                    data: { id: produtoDoc.id, ...produtoDoc.data() } 
                };
            } else {
                return { success: false, error: 'Produto não encontrado' };
            }
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Cadastrar novo produto
    cadastrarProduto: async (dadosProduto) => {
        try {
            const estoqueRef = collection(db, 'estoque_mj_construcoes');
            const novoProdutoRef = doc(estoqueRef);
            
            const produtoData = {
                ...dadosProduto,
                id: novoProdutoRef.id,
                codigo: dadosProduto.codigo || `MJ-${Date.now().toString().slice(-6)}`,
                loja_id: LOJA_ID,
                data_cadastro: serverTimestamp(),
                data_atualizacao: serverTimestamp(),
                // Garantir tipos numéricos
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
    },
    
    // Atualizar produto
    atualizarProduto: async (produtoId, dadosAtualizacao) => {
        try {
            const produtoRef = doc(db, 'estoque_mj_construcoes', produtoId);
            
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
    },
    
    // Alterar status do produto (ativo/inativo)
    alterarStatusProduto: async (produtoId, ativo) => {
        try {
            const produtoRef = doc(db, 'estoque_mj_construcoes', produtoId);
            
            await updateDoc(produtoRef, {
                ativo: ativo,
                data_atualizacao: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Atualizar estoque
    atualizarEstoque: async (produtoId, quantidade) => {
        try {
            const produtoRef = doc(db, 'estoque_mj_construcoes', produtoId);
            
            await updateDoc(produtoRef, {
                quantidade: increment(quantidade),
                data_atualizacao: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar categorias únicas
    buscarCategorias: async () => {
        try {
            const estoqueRef = collection(db, 'estoque_mj_construcoes');
            const q = query(estoqueRef, where('ativo', '==', true));
            const snapshot = await getDocs(q);
            
            const categorias = new Set();
            snapshot.forEach(doc => {
                const categoria = doc.data().categoria;
                if (categoria) {
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
    },
    
    // ========== VENDAS ==========
    
    // Criar nova venda
    criarVenda: async (dadosVenda) => {
        try {
            // Usar transaction para garantir consistência
            const resultado = await runTransaction(db, async (transaction) => {
                // 1. Criar documento de venda
                const vendasRef = collection(db, 'vendas_mj_construcoes');
                const novaVendaRef = doc(vendasRef);
                
                const vendaData = {
                    ...dadosVenda,
                    id: novaVendaRef.id,
                    numero_venda: `VENDA-${Date.now().toString().slice(-8)}`,
                    loja_id: LOJA_ID,
                    status: 'concluida',
                    data_venda: serverTimestamp(),
                    data_criacao: serverTimestamp(),
                    total: parseFloat(dadosVenda.total) || 0
                };
                
                transaction.set(novaVendaRef, vendaData);
                
                // 2. Atualizar estoque para cada item
                for (const item of dadosVenda.itens) {
                    const produtoRef = doc(db, 'estoque_mj_construcoes', item.produto_id);
                    
                    // Buscar produto atual
                    const produtoDoc = await transaction.get(produtoRef);
                    if (!produtoDoc.exists()) {
                        throw new Error(`Produto ${item.produto_id} não encontrado`);
                    }
                    
                    const produtoData = produtoDoc.data();
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
    },
    
    // Buscar produtos disponíveis para venda
    buscarProdutosParaVenda: async () => {
        try {
            const estoqueRef = collection(db, 'estoque_mj_construcoes');
            const q = query(
                estoqueRef,
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
    },
    
    // Buscar vendas recentes
    buscarVendas: async (limite = 50) => {
        try {
            const vendasRef = collection(db, 'vendas_mj_construcoes');
            const q = query(vendasRef, orderBy('data_venda', 'desc'), limit(limite));
            
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
    },
    
    // ========== DADOS DA LOJA ==========
    
    // Buscar informações da loja
    buscarDadosLoja: async () => {
        try {
            // Informações fixas da loja MJ Materiais
            return {
                success: true,
                data: {
                    id: LOJA_ID,
                    nome: "MJ Materiais de Construção",
                    local: "Cajazeiras 11 - Salvador/BA",
                    telefone: "(71) 99999-9999",
                    cnpj: "12.345.678/0001-99",
                    email: "contato@mjmateriais.com.br"
                }
            };
            
        } catch (error) {
            console.error('Erro ao buscar dados da loja:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar estatísticas
    buscarEstatisticas: async () => {
        try {
            // Buscar total de produtos
            const estoqueRef = collection(db, 'estoque_mj_construcoes');
            const produtosQuery = query(estoqueRef, where('ativo', '==', true));
            const produtosSnapshot = await getDocs(produtosQuery);
            
            let totalProdutos = 0;
            let totalValorEstoque = 0;
            let produtosBaixoEstoque = 0;
            
            produtosSnapshot.forEach(doc => {
                const produto = doc.data();
                totalProdutos += produto.quantidade || 0;
                totalValorEstoque += (produto.preco_custo || 0) * (produto.quantidade || 0);
                
                if (produto.quantidade <= produto.estoque_minimo) {
                    produtosBaixoEstoque++;
                }
            });
            
            // Buscar vendas do dia
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);
            
            const vendasRef = collection(db, 'vendas_mj_construcoes');
            const vendasQuery = query(
                vendasRef,
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
                    totalValorEstoque: totalValorEstoque,
                    produtosBaixoEstoque: produtosBaixoEstoque,
                    vendasHoje: totalVendasHoje,
                    quantidadeVendasHoje: quantidadeVendasHoje,
                    metaMensal: 50000,
                    metaAlcancada: totalVendasHoje
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
                    metaMensal: 50000,
                    metaAlcancada: 0
                }
            };
        }
    }
};

// Exportar tudo
export { 
    db, 
    mjServices,
    LOJA_ID,
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    increment
};

console.log('✅ Firebase configurado para MJ Materiais de Construção');
