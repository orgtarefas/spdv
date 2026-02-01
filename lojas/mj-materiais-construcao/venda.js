// venda.js - SISTEMA DE VENDAS COM FIREBASE 8.10.1
console.log("🛒 Sistema de Vendas MJ - Iniciando...");

// ============================================
// CONFIGURAÇÃO FIREBASE (Versão 8.10.1)
// ============================================
let db;

// Inicializar Firebase
function inicializarFirebase() {
    try {
        // Configuração do seu projeto
        const firebaseConfig = {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        };
        
        // Inicializar Firebase (versão 8.10.1)
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        } else {
            firebase.app(); // Se já inicializado, usar o existente
        }
        
        // Obter Firestore
        db = firebase.firestore();
        console.log("✅ Firebase inicializado com sucesso!");
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        return false;
    }
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuario = null;
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let desconto = 0;

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página carregada");
    
    // Esconder loading após 1 segundo
    setTimeout(function() {
        esconderLoading();
    }, 1000);
    
    // Verificar sessão primeiro
    if (!verificarSessao()) {
        return;
    }
    
    // Inicializar Firebase
    if (!inicializarFirebase()) {
        mostrarErro("Não foi possível conectar ao banco de dados. Recarregue a página.");
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos
    carregarProdutosReais();
    
    // Atualizar data/hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    
    console.log("✅ Sistema pronto para uso");
});

// ============================================
// 2. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        alert("⚠️ Sessão expirada! Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário:", usuario.nome || usuario.login);
        
        // Atualizar nome na interface
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro na sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        return false;
    }
}


// ============================================
// 3. CARREGAR PRODUTOS REAIS DO FIREBASE
// ============================================
async function carregarProdutosReais() {
    console.log("📦 Buscando produtos do estoque...");
    mostrarLoading("Carregando produtos...");
    
    try {
        // Método SIMPLES: Buscar todos e filtrar localmente
        const querySnapshot = await db.collection('estoque_mj_construcoes').get();
        
        produtos = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const quantidade = parseInt(data.quantidade) || 0;
            
            // Filtrar localmente: ativos e com estoque > 0
            if (data.ativo !== false && quantidade > 0) {
                produtos.push({
                    id: doc.id,
                    codigo: data.codigo || doc.id,
                    nome: data.nome || 'Produto sem nome',
                    preco: parseFloat(data.preco) || 0,
                    quantidade: quantidade,
                    categoria: data.categoria || '',
                    unidade: data.unidade || 'UN',
                    estoque_minimo: parseInt(data.estoque_minimo) || 5,
                    ativo: data.ativo !== false,
                    descricao: data.descricao || '',
                    fornecedor: data.fornecedor || ''
                });
            }
        });
        
        // Ordenar localmente por nome (sem precisar de índice)
        produtos.sort((a, b) => {
            if (a.nome && b.nome) {
                return a.nome.localeCompare(b.nome);
            }
            return 0;
        });
        
        console.log(`✅ ${produtos.length} produtos carregados (de ${querySnapshot.size} no total)`);
        
        if (produtos.length === 0) {
            mostrarMensagem("ℹ️ Nenhum produto disponível no estoque", "info");
        }
        
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        atualizarContadorProdutos();
        
    } catch (error) {
        console.error("❌ Erro crítico ao carregar produtos:", error);
        mostrarErro("Não foi possível carregar os produtos. Verifique sua conexão.");
        
        // Mostrar estado vazio
        const productsGrid = document.getElementById('productsGrid');
        const emptyProducts = document.getElementById('emptyProducts');
        
        if (productsGrid) {
            productsGrid.innerHTML = '';
        }
        if (emptyProducts) {
            emptyProducts.style.display = 'flex';
            emptyProducts.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar produtos</p>
                <small>${error.message}</small>
            `;
        }
        
    } finally {
        esconderLoading();
    }
}

// ============================================
// 4. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    const productsGrid = document.getElementById('productsGrid');
    const emptyProducts = document.getElementById('emptyProducts');
    
    if (!productsGrid) {
        console.error("❌ Elemento productsGrid não encontrado");
        return;
    }
    
    if (produtosFiltrados.length === 0) {
        if (emptyProducts) {
            emptyProducts.style.display = 'flex';
        }
        productsGrid.innerHTML = '';
        return;
    }
    
    if (emptyProducts) {
        emptyProducts.style.display = 'none';
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
        const precoFormatado = formatarMoeda(produto.preco);
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" 
                 onclick="selecionarProdutoParaVenda('${produto.id}')"
                 title="${produto.nome} - Estoque: ${produto.quantidade} ${produto.unidade || 'UN'}">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-footer">
                    <span class="product-price">R$ ${precoFormatado}</span>
                    <button class="btn-add-product" ${!temEstoque ? 'disabled' : ''} 
                            onclick="event.stopPropagation(); selecionarProdutoParaVenda('${produto.id}')">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
}

// ============================================
// 5. SELECIONAR PRODUTO PARA VENDA
// ============================================
function selecionarProdutoParaVenda(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
        mostrarMensagem("Produto não encontrado", "warning");
        return;
    }
    
    if (produto.quantidade <= 0) {
        mostrarMensagem("Produto sem estoque disponível", "warning");
        return;
    }
    
    const quantidade = prompt(
        `Quantidade de "${produto.nome}"?\n\n` +
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
        mostrarMensagem(`Estoque insuficiente! Disponível: ${produto.quantidade}`, "warning");
        return;
    }
    
    // Verificar se já está no carrinho
    const itemIndex = carrinho.findIndex(item => item.id === produtoId);
    
    if (itemIndex > -1) {
        // Atualizar quantidade
        const novaQty = carrinho[itemIndex].quantidade + qty;
        if (novaQty > produto.quantidade) {
            mostrarMensagem(`Estoque insuficiente para quantidade adicional! Disponível: ${produto.quantidade}`, "warning");
            return;
        }
        carrinho[itemIndex].quantidade = novaQty;
        carrinho[itemIndex].subtotal = carrinho[itemIndex].preco * novaQty;
        mostrarMensagem(`Quantidade atualizada: ${novaQty}x ${produto.nome}`, "success");
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
        mostrarMensagem(`${qty}x ${produto.nome} adicionado ao carrinho!`, "success");
    }
    
    renderizarCarrinho();
    atualizarTotal();
}

// ============================================
// 6. FUNÇÕES DO CARRINHO
// ============================================
function renderizarCarrinho() {
    const cartItems = document.getElementById('cartItems');
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
                    <button class="btn-remove-item" onclick="removerDoCarrinho(${index})" title="Remover item">
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
        const itemRemovido = carrinho[index].nome;
        carrinho.splice(index, 1);
        renderizarCarrinho();
        atualizarTotal();
        mostrarMensagem(`${itemRemovido} removido do carrinho`, "info");
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
// 7. FINALIZAR VENDA (SALVA NO FIREBASE)
// ============================================
async function finalizarVenda() {
    if (carrinho.length === 0) {
        mostrarMensagem("Adicione produtos ao carrinho primeiro!", "warning");
        return;
    }
    
    // Calcular totais
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoInput = document.getElementById('desconto');
    const descontoPercentual = parseFloat(descontoInput ? descontoInput.value : 0) || 0;
    const valorDesconto = subtotal * (descontoPercentual / 100);
    const total = subtotal - valorDesconto;
    
    // Obter forma de pagamento
    const formaPagamentoElement = document.querySelector('input[name="payment"]:checked');
    const formaPagamento = formaPagamentoElement ? formaPagamentoElement.value : 'dinheiro';
    const formaPagamentoNome = obterNomeFormaPagamento(formaPagamento);
    
    // Confirmar venda
    const confirmacao = confirm(
        `CONFIRMAR VENDA\n\n` +
        `Itens: ${carrinho.length}\n` +
        `Subtotal: R$ ${formatarMoeda(subtotal)}\n` +
        `Desconto: R$ ${formatarMoeda(valorDesconto)} (${descontoPercentual}%)\n` +
        `Total: R$ ${formatarMoeda(total)}\n` +
        `Forma de pagamento: ${formaPagamentoNome}\n\n` +
        `Deseja finalizar esta venda?`
    );
    
    if (!confirmacao) return;
    
    mostrarLoading("Processando venda...");
    
    try {
        // Criar número da venda
        const numeroVenda = 'VENDA-' + Date.now().toString().slice(-8);
        const vendedorNome = usuario.nome || usuario.login || 'Vendedor';
        const vendedorId = usuario.id || 'user-id';
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // 1. Criar documento de venda
        const vendaRef = db.collection('vendas_mj_construcoes').doc();
        const vendaData = {
            id: vendaRef.id,
            numero_venda: numeroVenda,
            loja_id: 'mj-materiais-construcao',
            loja_nome: 'MJ Materiais de Construção',
            vendedor: vendedorNome,
            vendedor_id: vendedorId,
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
            data_venda: timestamp,
            data_criacao: timestamp,
            created_at: new Date().toISOString()
        };
        
        // Criar batch para transação
        const batch = db.batch();
        
        // Adicionar venda ao batch
        batch.set(vendaRef, vendaData);
        
        // Atualizar estoque de cada produto
        for (const item of carrinho) {
            const produtoRef = db.collection('estoque_mj_construcoes').doc(item.id);
            batch.update(produtoRef, {
                quantidade: firebase.firestore.FieldValue.increment(-item.quantidade),
                data_atualizacao: timestamp
            });
        }
        
        // Executar batch
        await batch.commit();
        
        // Sucesso
        mostrarMensagem(
            `✅ Venda #${numeroVenda} finalizada com sucesso!\n` +
            `Total: R$ ${formatarMoeda(total)}`,
            "success",
            5000
        );
        
        // Limpar carrinho
        carrinho = [];
        renderizarCarrinho();
        atualizarTotal();
        
        // Recarregar produtos (estoque atualizado)
        setTimeout(() => {
            carregarProdutosReais();
        }, 1500);
        
    } catch (error) {
        console.error("❌ Erro ao finalizar venda:", error);
        mostrarErro(`Erro ao finalizar venda: ${error.message}\nTente novamente.`);
    } finally {
        esconderLoading();
    }
}

// ============================================
// 8. FUNÇÕES AUXILIARES
// ============================================
function configurarEventos() {
    // Busca de produtos
    const searchProduct = document.getElementById('searchProduct');
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
    
    // Botão escanear
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', function() {
            mostrarMensagem("Digite o código do produto na busca", "info");
        });
    }
    
    // Limpar carrinho
    const btnClearCart = document.getElementById('btnClearCart');
    if (btnClearCart) {
        btnClearCart.addEventListener('click', limparCarrinho);
    }
    
    // Desconto
    const descontoInput = document.getElementById('desconto');
    if (descontoInput) {
        descontoInput.addEventListener('input', function() {
            desconto = parseFloat(this.value) || 0;
            if (desconto < 0) desconto = 0;
            if (desconto > 100) desconto = 100;
            this.value = desconto;
            atualizarTotal();
        });
    }
    
    // Finalizar venda
    const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', finalizarVenda);
    }
    
    // Cancelar venda
    const btnCancelarVenda = document.getElementById('btnCancelarVenda');
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Logout
    const btnLogout = document.getElementById('btnLogout');
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
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
}

function atualizarTotal() {
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');
    
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

function atualizarContadorProdutos() {
    const productCount = document.getElementById('productCount');
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
// 9. FUNÇÕES DE UI
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
    const closeBtn = alert.querySelector('.message-close');
    
    // Configurar alerta
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
    
    // Botão fechar
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    // Auto-ocultar
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

function mostrarErro(texto) {
    mostrarMensagem(texto, 'error', 5000);
}

// ============================================
// 10. ATUALIZAR DATA E HORA
// ============================================
function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    elemento.textContent = dataFormatada;
}

// ============================================
// INICIAR SISTEMA
// ============================================
console.log("✅ Sistema de vendas completamente carregado!");

