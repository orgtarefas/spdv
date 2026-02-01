// venda.js - SISTEMA COMPLETO DE VENDAS COM FIREBASE
console.log("🛒 Sistema de Vendas MJ - Iniciando...");

// ============================================
// CONFIGURAÇÃO FIREBASE
// ============================================
let db;
let firebaseApp;

// Inicializar Firebase
function inicializarFirebase() {
    // Configuração do seu projeto
    const firebaseConfig = {
        apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
        authDomain: "spdv-3872a.firebaseapp.com",
        projectId: "spdv-3872a",
        storageBucket: "spdv-3872a.firebasestorage.app",
        messagingSenderId: "552499245950",
        appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
    };
    
    try {
        // Se Firebase já estiver carregado
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig, 'pdv-vendas');
            db = firebase.firestore(firebaseApp);
            console.log("✅ Firebase inicializado");
            return true;
        }
    } catch (e) {
        console.error("Erro ao inicializar Firebase:", e);
    }
    return false;
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuario = null;
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let desconto = 0;

// Elementos DOM
let searchProduct, productsGrid, productCount, emptyProducts;
let cartItems, btnClearCart, subtotalElement, descontoInput, totalElement;
let btnFinalizarVenda, btnCancelarVenda, userNameElement, btnLogout;

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM carregado");
    
    // Inicializar elementos DOM
    inicializarElementos();
    
    // Verificar sessão
    if (!verificarSessao()) {
        return;
    }
    
    // Inicializar Firebase
    if (!inicializarFirebase()) {
        mostrarErro("Erro ao conectar com o banco de dados");
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos
    carregarProdutosReais();
    
    console.log("✅ Sistema de vendas pronto");
});

// ============================================
// 2. INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementos() {
    searchProduct = document.getElementById('searchProduct');
    productsGrid = document.getElementById('productsGrid');
    productCount = document.getElementById('productCount');
    emptyProducts = document.getElementById('emptyProducts');
    cartItems = document.getElementById('cartItems');
    btnClearCart = document.getElementById('btnClearCart');
    subtotalElement = document.getElementById('subtotal');
    descontoInput = document.getElementById('desconto');
    totalElement = document.getElementById('total');
    btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
    btnCancelarVenda = document.getElementById('btnCancelarVenda');
    userNameElement = document.getElementById('userName');
    btnLogout = document.getElementById('btnLogout');
}

// ============================================
// 3. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = '../../login.html';
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("👤 Usuário:", usuario.nome || usuario.login);
        
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("Erro na sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        window.location.href = '../../login.html';
        return false;
    }
}

// ============================================
// 4. CARREGAR PRODUTOS REAIS DO FIREBASE
// ============================================
async function carregarProdutosReais() {
    console.log("📦 Buscando produtos do Firebase...");
    mostrarLoading("Carregando produtos...");
    
    try {
        // Buscar produtos da coleção estoque_mj_construcoes
        // Apenas produtos ativos com estoque > 0
        const querySnapshot = await db.collection('estoque_mj_construcoes')
            .where('ativo', '==', true)
            .where('quantidade', '>', 0)
            .orderBy('nome')
            .get();
        
        produtos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            produtos.push({
                id: doc.id,
                codigo: data.codigo || '',
                nome: data.nome || 'Produto sem nome',
                preco: parseFloat(data.preco) || 0,
                quantidade: parseInt(data.quantidade) || 0,
                categoria: data.categoria || '',
                unidade: data.unidade || 'UN',
                estoque_minimo: parseInt(data.estoque_minimo) || 5,
                ativo: data.ativo !== false
            });
        });
        
        console.log(`✅ ${produtos.length} produtos carregados`);
        
        if (produtos.length === 0) {
            mostrarMensagem("Nenhum produto disponível no estoque", "info");
        }
        
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        atualizarContadorProdutos();
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        mostrarErro("Erro ao carregar produtos: " + error.message);
    } finally {
        esconderLoading();
    }
}

// ============================================
// 5. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    if (!productsGrid) return;
    
    if (produtosFiltrados.length === 0) {
        if (emptyProducts) emptyProducts.style.display = 'flex';
        productsGrid.innerHTML = '';
        return;
    }
    
    if (emptyProducts) emptyProducts.style.display = 'none';
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" 
                 onclick="selecionarProduto('${produto.id}')">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-footer">
                    <span class="product-price">R$ ${formatarMoeda(produto.preco)}</span>
                    <button class="btn-add-product" ${!temEstoque ? 'disabled' : ''} 
                            onclick="event.stopPropagation(); selecionarProduto('${produto.id}')">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
}

// ============================================
// 6. SELECIONAR PRODUTO E ABRIR MODAL
// ============================================
async function selecionarProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    // Abrir modal de quantidade
    const quantidade = prompt(
        `Quantidade de "${produto.nome}"?\n` +
        `Estoque disponível: ${produto.quantidade} ${produto.unidade || 'UN'}\n` +
        `Preço unitário: R$ ${formatarMoeda(produto.preco)}`,
        "1"
    );
    
    if (!quantidade || isNaN(quantidade) || quantidade <= 0) {
        return;
    }
    
    const qty = parseInt(quantidade);
    
    // Verificar estoque
    if (qty > produto.quantidade) {
        alert(`Estoque insuficiente!\nDisponível: ${produto.quantidade}`);
        return;
    }
    
    // Verificar se já está no carrinho
    const itemIndex = carrinho.findIndex(item => item.id === produtoId);
    
    if (itemIndex > -1) {
        // Atualizar quantidade
        const novaQty = carrinho[itemIndex].quantidade + qty;
        if (novaQty > produto.quantidade) {
            alert(`Estoque insuficiente para quantidade adicional!\nDisponível: ${produto.quantidade}`);
            return;
        }
        carrinho[itemIndex].quantidade = novaQty;
        carrinho[itemIndex].subtotal = carrinho[itemIndex].preco * novaQty;
    } else {
        // Adicionar novo item
        carrinho.push({
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: qty,
            subtotal: produto.preco * qty,
            estoque_disponivel: produto.quantidade
        });
    }
    
    renderizarCarrinho();
    atualizarTotal();
    
    mostrarMensagem(`${qty}x ${produto.nome} adicionado ao carrinho!`, "success");
}

// ============================================
// 7. FUNÇÕES DO CARRINHO
// ============================================
function renderizarCarrinho() {
    if (!cartItems) return;
    
    if (carrinho.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
                <small>Adicione produtos para iniciar a venda</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    carrinho.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>Código: ${item.codigo || 'N/A'}</span>
                        <span>${item.quantidade} x R$ ${formatarMoeda(item.preco)}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-price">
                        R$ ${formatarMoeda(item.subtotal)}
                    </div>
                    <button class="btn-remove-item" onclick="removerDoCarrinho(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

function removerDoCarrinho(index) {
    if (confirm("Remover item do carrinho?")) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
        atualizarTotal();
    }
}

function limparCarrinho() {
    if (carrinho.length === 0) return;
    
    if (confirm("Limpar todo o carrinho?")) {
        carrinho = [];
        renderizarCarrinho();
        atualizarTotal();
        mostrarMensagem("Carrinho limpo", "info");
    }
}

// ============================================
// 8. FINALIZAR VENDA (SALVA NO FIREBASE)
// ============================================
async function finalizarVenda() {
    if (carrinho.length === 0) {
        mostrarMensagem("Adicione produtos ao carrinho primeiro!", "warning");
        return;
    }
    
    // Calcular totais
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const valorDesconto = subtotal * (desconto / 100);
    const total = subtotal - valorDesconto;
    
    // Obter forma de pagamento
    const formaPagamentoElement = document.querySelector('input[name="payment"]:checked');
    const formaPagamento = formaPagamentoElement ? formaPagamentoElement.value : 'dinheiro';
    
    // Confirmar venda
    const confirmacao = confirm(
        `CONFIRMAR VENDA\n\n` +
        `Itens: ${carrinho.length}\n` +
        `Subtotal: R$ ${formatarMoeda(subtotal)}\n` +
        `Desconto: R$ ${formatarMoeda(valorDesconto)}\n` +
        `Total: R$ ${formatarMoeda(total)}\n` +
        `Forma de pagamento: ${obterNomeFormaPagamento(formaPagamento)}\n\n` +
        `Deseja finalizar esta venda?`
    );
    
    if (!confirmacao) return;
    
    mostrarLoading("Processando venda...");
    
    try {
        // Usar transaction para garantir consistência
        const resultado = await db.runTransaction(async (transaction) => {
            const vendasRef = db.collection('vendas_mj_construcoes').doc();
            const numeroVenda = `VENDA-${Date.now().toString().slice(-8)}`;
            
            // 1. Criar documento de venda
            const vendaData = {
                id: vendasRef.id,
                numero_venda: numeroVenda,
                loja_id: 'mj-materiais-construcao',
                vendedor: usuario.nome || usuario.login,
                vendedor_id: usuario.id,
                itens: carrinho.map(item => ({
                    produto_id: item.id,
                    codigo: item.codigo,
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco,
                    subtotal: item.subtotal
                })),
                subtotal: subtotal,
                desconto: valorDesconto,
                total: total,
                forma_pagamento: formaPagamento,
                status: 'concluida',
                data_venda: firebase.firestore.FieldValue.serverTimestamp(),
                data_criacao: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            transaction.set(vendasRef, vendaData);
            
            // 2. Atualizar estoque de cada produto
            for (const item of carrinho) {
                const produtoRef = db.collection('estoque_mj_construcoes').doc(item.id);
                const produtoDoc = await transaction.get(produtoRef);
                
                if (!produtoDoc.exists()) {
                    throw new Error(`Produto ${item.id} não encontrado`);
                }
                
                const produtoData = produtoDoc.data();
                const estoqueAtual = produtoData.quantidade || 0;
                
                if (estoqueAtual < item.quantidade) {
                    throw new Error(`Estoque insuficiente para ${produtoData.nome}`);
                }
                
                transaction.update(produtoRef, {
                    quantidade: firebase.firestore.FieldValue.increment(-item.quantidade),
                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return { numeroVenda, vendaData };
        });
        
        // Sucesso
        mostrarMensagem(
            `✅ Venda finalizada com sucesso!\n` +
            `Número: ${resultado.numeroVenda}\n` +
            `Total: R$ ${formatarMoeda(total)}`,
            "success",
            5000
        );
        
        // Limpar carrinho
        carrinho = [];
        renderizarCarrinho();
        atualizarTotal();
        
        // Recarregar produtos (estoque foi atualizado)
        setTimeout(() => {
            carregarProdutosReais();
        }, 2000);
        
    } catch (error) {
        console.error("❌ Erro ao finalizar venda:", error);
        mostrarErro(`Erro: ${error.message}`);
    } finally {
        esconderLoading();
    }
}

// ============================================
// 9. FUNÇÕES AUXILIARES
// ============================================
function configurarEventos() {
    // Busca
    if (searchProduct) {
        searchProduct.addEventListener('input', function() {
            const termo = this.value.toLowerCase().trim();
            
            if (termo === '') {
                produtosFiltrados = [...produtos];
            } else {
                produtosFiltrados = produtos.filter(p =>
                    (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
                    (p.nome && p.nome.toLowerCase().includes(termo)) ||
                    (p.categoria && p.categoria.toLowerCase().includes(termo))
                );
            }
            
            renderizarProdutos();
            atualizarContadorProdutos();
        });
    }
    
    // Limpar carrinho
    if (btnClearCart) {
        btnClearCart.addEventListener('click', limparCarrinho);
    }
    
    // Desconto
    if (descontoInput) {
        descontoInput.addEventListener('input', function() {
            desconto = parseFloat(this.value) || 0;
            if (desconto < 0) desconto = 0;
            if (desconto > 100) desconto = 100;
            atualizarTotal();
        });
    }
    
    // Finalizar venda
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', finalizarVenda);
    }
    
    // Cancelar
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                window.location.href = '../../login.html';
            }
        });
    }
    
    // Botão voltar
    const btnVoltar = document.querySelector('.btn-back');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
}

function atualizarTotal() {
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

function atualizarContadorProdutos() {
    if (productCount) {
        productCount.textContent = `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? 's' : ''}`;
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

function obterNomeFormaPagamento(codigo) {
    const formas = {
        'dinheiro': 'Dinheiro',
        'cartao_debito': 'Cartão Débito',
        'cartao_credito': 'Cartão Crédito',
        'pix': 'PIX'
    };
    return formas[codigo] || codigo;
}

// ============================================
// 10. FUNÇÕES DE UI
// ============================================
function mostrarLoading(mensagem) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = mensagem || 'Carregando...';
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo}] ${texto}`);
        return;
    }
    
    const icon = alert.querySelector('.message-icon');
    const text = alert.querySelector('.message-text');
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Ícone
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    if (text) text.textContent = texto;
    
    // Auto-ocultar
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

function mostrarErro(texto) {
    mostrarMensagem(texto, 'error', 5000);
}

// ============================================
// 11. INICIAR
// ============================================
console.log("✅ venda.js carregado com sucesso!");
