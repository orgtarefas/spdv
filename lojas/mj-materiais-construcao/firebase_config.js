// firebase_config.js - ATUALIZADO COM ESTOQUE E VENDAS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig, 'mj-materiais-app');
const db = getFirestore(app);

// Funções específicas para Material de Construção
const lojaServices = {
    // ========== ESTOQUE ==========
    // Buscar todos os produtos
    buscarProdutos: async (filtro = {}) => {
        try {
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'estoque');
            let q = query(produtosRef);
            
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
            
            // Construir query dinamicamente
            if (whereConditions.length > 0) {
                q = query(produtosRef, ...whereConditions, orderBy('nome'));
            } else {
                q = query(produtosRef, orderBy('nome'));
            }
            
            const snapshot = await getDocs(q);
            const produtos = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                produtos.push({ 
                    id: doc.id, 
                    ...data,
                    // Garantir tipos numéricos
                    preco: parseFloat(data.preco) || 0,
                    preco_custo: parseFloat(data.preco_custo) || 0,
                    quantidade: parseInt(data.quantidade) || 0,
                    estoque_minimo: parseInt(data.estoque_minimo) || 0
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
            const produtoRef = doc(db, 'lojas', 'mj-materiais-construcao', 'estoque', produtoId);
            const docSnap = await getDoc(produtoRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return { 
                    success: true, 
                    data: { 
                        id: docSnap.id, 
                        ...data,
                        preco: parseFloat(data.preco) || 0,
                        preco_custo: parseFloat(data.preco_custo) || 0,
                        quantidade: parseInt(data.quantidade) || 0,
                        estoque_minimo: parseInt(data.estoque_minimo) || 0
                    } 
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
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'estoque');
            const novoProdutoRef = doc(produtosRef);
            
            const produtoData = {
                ...dadosProduto,
                id: novoProdutoRef.id,
                codigo: dadosProduto.codigo || `MJ-${Date.now()}`,
                ativo: true,
                data_cadastro: serverTimestamp(),
                data_atualizacao: serverTimestamp(),
                // Converter para números
                preco: parseFloat(dadosProduto.preco) || 0,
                preco_custo: parseFloat(dadosProduto.preco_custo) || 0,
                quantidade: parseInt(dadosProduto.quantidade) || 0,
                estoque_minimo: parseInt(dadosProduto.estoque_minimo) || 0
            };
            
            await setDoc(novoProdutoRef, produtoData);
            
            return { 
                success: true, 
                data: { id: novoProdutoRef.id, ...produtoData } 
            };
            
        } catch (error) {
            console.error('Erro ao cadastrar produto:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Atualizar produto
    atualizarProduto: async (produtoId, dadosAtualizacao) => {
        try {
            const produtoRef = doc(db, 'lojas', 'mj-materiais-construcao', 'estoque', produtoId);
            
            const dadosAtualizados = {
                ...dadosAtualizacao,
                data_atualizacao: serverTimestamp()
            };
            
            // Converter valores numéricos
            if (dadosAtualizados.preco) {
                dadosAtualizados.preco = parseFloat(dadosAtualizados.preco);
            }
            if (dadosAtualizados.preco_custo) {
                dadosAtualizados.preco_custo = parseFloat(dadosAtualizados.preco_custo);
            }
            if (dadosAtualizados.quantidade !== undefined) {
                dadosAtualizados.quantidade = parseInt(dadosAtualizados.quantidade);
            }
            if (dadosAtualizados.estoque_minimo) {
                dadosAtualizados.estoque_minimo = parseInt(dadosAtualizados.estoque_minimo);
            }
            
            await updateDoc(produtoRef, dadosAtualizados);
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Remover produto (marcar como inativo)
    removerProduto: async (produtoId) => {
        try {
            const produtoRef = doc(db, 'lojas', 'mj-materiais-construcao', 'estoque', produtoId);
            
            await updateDoc(produtoRef, {
                ativo: false,
                data_atualizacao: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao remover produto:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Atualizar estoque (incrementar/decrementar)
    atualizarEstoque: async (produtoId, quantidade, operacao = 'adicionar') => {
        try {
            const produtoRef = doc(db, 'lojas', 'mj-materiais-construcao', 'estoque', produtoId);
            
            const incremento = operacao === 'adicionar' ? 
                increment(parseInt(quantidade)) : 
                increment(-parseInt(quantidade));
            
            await updateDoc(produtoRef, {
                quantidade: incremento,
                data_atualizacao: serverTimestamp()
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar categorias de produtos
    buscarCategorias: async () => {
        try {
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'estoque');
            const snapshot = await getDocs(query(produtosRef, where('ativo', '==', true)));
            
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
            // Usar transaction para garantir consistência entre estoque e venda
            const resultado = await runTransaction(db, async (transaction) => {
                // 1. Criar documento de venda
                const vendasRef = collection(db, 'lojas', 'mj-materiais-construcao', 'vendas');
                const novaVendaRef = doc(vendasRef);
                
                const vendaData = {
                    ...dadosVenda,
                    id: novaVendaRef.id,
                    numero_venda: `VENDA-${Date.now()}`,
                    status: 'concluida',
                    data_venda: serverTimestamp(),
                    data_criacao: serverTimestamp(),
                    loja_id: 'mj-materiais-construcao'
                };
                
                transaction.set(novaVendaRef, vendaData);
                
                // 2. Atualizar estoque para cada item da venda
                for (const item of dadosVenda.itens) {
                    const produtoRef = doc(db, 'lojas', 'mj-materiais-construcao', 'estoque', item.produto_id);
                    
                    // Buscar produto para verificar estoque
                    const produtoDoc = await transaction.get(produtoRef);
                    if (!produtoDoc.exists()) {
                        throw new Error(`Produto ${item.produto_id} não encontrado`);
                    }
                    
                    const produtoData = produtoDoc.data();
                    const estoqueAtual = produtoData.quantidade || 0;
                    const quantidadeVenda = item.quantidade || 0;
                    
                    if (estoqueAtual < quantidadeVenda) {
                        throw new Error(`Estoque insuficiente para ${produtoData.nome}. Disponível: ${estoqueAtual}, Solicitado: ${quantidadeVenda}`);
                    }
                    
                    // Atualizar estoque
                    transaction.update(produtoRef, {
                        quantidade: increment(-quantidadeVenda),
                        data_atualizacao: serverTimestamp()
                    });
                }
                
                return { id: novaVendaRef.id, ...vendaData };
            });
            
            return { success: true, data: resultado };
            
        } catch (error) {
            console.error('Erro ao criar venda:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar vendas
    buscarVendas: async (filtro = {}) => {
        try {
            const vendasRef = collection(db, 'lojas', 'mj-materiais-construcao', 'vendas');
            let q;
            
            if (filtro.data_inicio && filtro.data_fim) {
                q = query(
                    vendasRef,
                    where('data_venda', '>=', filtro.data_inicio),
                    where('data_venda', '<=', filtro.data_fim),
                    orderBy('data_venda', 'desc')
                );
            } else {
                q = query(vendasRef, orderBy('data_venda', 'desc'));
            }
            
            const snapshot = await getDocs(q);
            const vendas = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                vendas.push({ 
                    id: doc.id, 
                    ...data,
                    total: parseFloat(data.total) || 0
                });
            });
            
            return { success: true, data: vendas };
            
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Buscar estatísticas
    buscarEstatisticas: async () => {
        try {
            // Buscar totais do dia
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const amanha = new Date(hoje);
            amanha.setDate(amanha.getDate() + 1);
            
            // Total vendas hoje
            const vendasRef = collection(db, 'lojas', 'mj-materiais-construcao', 'vendas');
            const q = query(
                vendasRef,
                where('data_venda', '>=', hoje),
                where('data_venda', '<', amanha),
                where('status', '==', 'concluida')
            );
            
            const snapshot = await getDocs(q);
            let totalVendasHoje = 0;
            let quantidadeVendasHoje = 0;
            
            snapshot.forEach(doc => {
                const venda = doc.data();
                totalVendasHoje += parseFloat(venda.total) || 0;
                quantidadeVendasHoje++;
            });
            
            // Total produtos em estoque
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'estoque');
            const produtosSnapshot = await getDocs(query(produtosRef, where('ativo', '==', true)));
            
            let totalProdutos = 0;
            let produtosBaixoEstoque = 0;
            
            produtosSnapshot.forEach(doc => {
                const produto = doc.data();
                totalProdutos += parseInt(produto.quantidade) || 0;
                
                if (produto.quantidade <= (produto.estoque_minimo || 5)) {
                    produtosBaixoEstoque++;
                }
            });
            
            // Meta mensal (exemplo fixo por enquanto)
            const metaMensal = 50000; // R$ 50.000,00
            const hojeData = new Date();
            const diasNoMes = new Date(hojeData.getFullYear(), hojeData.getMonth() + 1, 0).getDate();
            const diasPassados = hojeData.getDate();
            const metaDiaria = metaMensal / diasNoMes;
            const metaEsperadaAteHoje = metaDiaria * diasPassados;
            
            return {
                success: true,
                data: {
                    vendasHoje: totalVendasHoje,
                    quantidadeVendasHoje: quantidadeVendasHoje,
                    totalProdutos: totalProdutos,
                    produtosBaixoEstoque: produtosBaixoEstoque,
                    metaMensal: metaMensal,
                    metaEsperadaAteHoje: metaEsperadaAteHoje,
                    metaAlcancada: totalVendasHoje
                }
            };
            
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return { 
                success: true, 
                data: {
                    vendasHoje: 0,
                    quantidadeVendasHoje: 0,
                    totalProdutos: 0,
                    produtosBaixoEstoque: 0,
                    metaMensal: 0,
                    metaEsperadaAteHoje: 0,
                    metaAlcancada: 0
                }
            };
        }
    },
    
    // Buscar produtos para venda (com estoque disponível)
    buscarProdutosParaVenda: async () => {
        try {
            const produtosRef = collection(db, 'lojas', 'mj-materiais-construcao', 'estoque');
            const q = query(
                produtosRef,
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
                    preco: parseFloat(data.preco) || 0,
                    quantidade: parseInt(data.quantidade) || 0,
                    disponivel: true
                });
            });
            
            return { success: true, data: produtos };
            
        } catch (error) {
            console.error('Erro ao buscar produtos para venda:', error);
            return { success: false, error: error.message };
        }
    }
};

// Exportar tudo
export { 
    db, 
    lojaServices,
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
    limit,
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction
};

console.log('✅ Firebase configurado para MJ Materiais de Construção');
