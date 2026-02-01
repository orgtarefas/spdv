// venda.js - COM FIREBASE REAL
console.log("🛒 venda.js carregando...");

// Elementos DOM
const searchProduct = document.getElementById('searchProduct');
const productsGrid = document.getElementById('productsGrid');
const productCount = document.getElementById('productCount');
const emptyProducts = document.getElementById('emptyProducts');
const cartItems = document.getElementById('cartItems');
const btnClearCart = document.getElementById('btnClearCart');
const subtotalElement = document.getElementById('subtotal');
const descontoInput = document.getElementById('desconto');
const totalElement = document.getElementById('total');
const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
const btnCancelarVenda = document.getElementById('btnCancelarVenda');
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const currentDateTimeElement = document.getElementById('currentDateTime');

// Modal
const modalQuantidade = document.getElementById('modalQuantidade');
const modalProductInfo = document.getElementById('modalProductInfo');
const quantidadeInput = document.getElementById('quantidade');
const btnDecrease = document.getElementById('btnDecrease');
const btnIncrease = document.getElementById('btnIncrease');
const btnAddToCart = document.getElementById('btnAddToCart');

// Variáveis globais
let usuario = null;
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let produtoSelecionado = null;
let desconto = 0;

// Importações do Firebase
let db;
let collection, getDocs, query, where, orderBy;

// ============================================
// 1. INICIALIZAÇÃO - CARREGAR FIREBASE
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 venda.html carregada");
    
    try {
        // Carregar Firebase
        await carregarFirebase();
        
        // Verificar sessão
        if (!verificarSessao()) {
            console.log("❌ Sem sessão - redirecionando para login");
            return;
        }
        
        // Configurar página
        configurarPagina();
        
        // Carregar produtos do Firebase
        await carregarProdutosFirebase();
        
        console.log("✅ venda.js inicializado com Firebase");
        
    } catch (error) {
        console.error("❌ Erro ao inicializar:", error);
        mostrarErro("Erro ao carregar sistema");
    }
});

// ============================================
// 2. CARREGAR FIREBASE DINAMICAMENTE
// ============================================
async function carregarFirebase() {
    try {
        // Tentar importar do firebase_config.js
        if (typeof mjServices !== 'undefined') {
            console.log("✅ Usando mjServices do firebase_config.js");
            return;
        }
        
        // Se não tiver mjServices, carregar Firebase diretamente
        console.log("📡 Carregando Firebase diretamente...");
        
        // Carregar scripts do Firebase
        await carregarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        await carregarScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Configuração do Firebase (mesma do seu projeto)
        const firebaseConfig = {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        };
        
        // Inicializar Firebase
        const app = firebase.initializeApp(firebaseConfig, 'venda-app');
        db = firebase.getFirestore(app);
        
        // Obter funções do Firestore
        collection = firebase.collection;
        getDocs = firebase.getDocs;
        query = firebase.query;
        where = firebase.where;
        orderBy = firebase.orderBy;
        
        console.log("✅ Firebase carregado diretamente");
        
    } catch (error) {
        console.error("❌ Erro ao carregar Firebase:", error);
        throw error;
    }
}

function carregarScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============================================
// 3. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    console.log("🔍 Verificando sessão...");
    
    // Seu sistema salva a sessão como 'pdv_sessao_temporaria'
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        console.log("❌ Nenhuma sessão encontrada!");
        
        alert("Sessão não encontrada ou expirada.\nFaça login novamente.");
        
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário logado:", usuario);
        
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao ler sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        
        return false;
    }
}

// ============================================
// 4. CONFIGURAR PÁGINA
// ============================================
function configurarPagina() {
    console.log("⚙️ Configurando página...");
    
    // Configurar logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                window.location.href = '../../login.html';
            }
        });
    }
    
    // Configurar botão voltar
    const btnVoltar = document.querySelector('.btn-back');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
    
    // Configurar busca
    if (searchProduct) {
        searchProduct.addEventListener('input', function() {
            filtrarProdutos();
        });
    }
    
    // Configurar limpar carrinho
    if (btnClearCart) {
        btnClearCart.addEventListener('click', function() {
            if (carrinho.length > 0 && confirm("Limpar todo o carrinho?")) {
                limparCarrinho();
            }
        });
    }
    
    // Configurar desconto
    if (descontoInput) {
        descontoInput.addEventListener('input', function() {
            desconto = parseFloat(this.value) || 0;
            if (desconto < 0) desconto = 0;
            if (desconto > 100) desconto = 100;
            atualizarTotal();
        });
    }
    
    // Configurar finalizar venda (simulado)
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', function() {
            if (carrinho.length === 0) {
                alert("Adicione produtos ao carrinho primeiro!");
                return;
            }
            
            const total = calcularTotal();
            alert(`Venda simulada!\nTotal: R$ ${formatarMoeda(total)}\n\nEm produção, esta venda seria salva no Firebase.`);
        });
    }
    
    // Configurar cancelar
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Configurar modal
    configurarModal();
    
    // Configurar data/hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    
    // Esconder loading
    setTimeout(function() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.style.display = 'none';
    }, 800);
}

// ============================================
// 5. CARREGAR PRODUTOS DO FIREBASE
// ============================================
async function carregarProdutosFirebase() {
    console.log("📦 Carregando produtos do Firebase...");
    
    try {
        mostrarLoading("Carregando produtos...");
        
        let produtosData = [];
        
        // OPÇÃO A: Usar mjServices se disponível
        if (typeof mjServices !== 'undefined' && mjServices.buscarProdutosParaVenda) {
            console.log("📡 Buscando via mjServices...");
            const resultado = await mjServices.buscarProdutosParaVenda();
            
            if (resultado.success) {
                produtosData = resultado.data;
            } else {
                throw new Error(resultado.error);
            }
        }
        // OPÇÃO B: Buscar diretamente do Firebase
        else if (db && collection && getDocs) {
            console.log("📡 Buscando diretamente do Firestore...");
            
            // NOME DA COLEÇÃO: Verifique se é este mesmo
            const colecaoEstoque = 'estoque_mj_construcoes'; // Ajuste se necessário
            
            // Buscar produtos ATIVOS com quantidade > 0
            const estoqueRef = collection(db, colecaoEstoque);
            const q = query(
                estoqueRef,
                where('ativo', '==', true),
                where('quantidade', '>', 0),
                orderBy('nome')
            );
            
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                const produto = doc.data();
                produtosData.push({
                    id: doc.id,
                    nome: produto.nome || 'Sem nome',
                    codigo: produto.codigo || doc.id,
                    preco: parseFloat(produto.preco) || 0,
                    quantidade: parseInt(produto.quantidade) || 0,
                    categoria: produto.categoria || '',
                    unidade: produto.unidade || 'UN',
                    estoque_minimo: parseInt(produto.estoque_minimo) || 5
                });
            });
            
            console.log(`✅ ${produtosData.length} produtos carregados do Firebase`);
        }
        // OPÇÃO C: Fallback (dados de exemplo)
        else {
            console.warn("⚠️ Firebase não disponível, usando dados de exemplo");
            produtosData = obterProdutosExemplo();
        }
        
        // Processar produtos
        produtos = produtosData.filter(p => p.quantidade > 0);
        produtosFiltrados = [...produtos];
        
        renderizarProdutos();
        atualizarContadorProdutos();
        
        esconderLoading();
        
        if (produtos.length === 0) {
            mostrarAviso("Nenhum produto disponível no estoque");
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        esconderLoading();
        
        // Mostrar produtos de exemplo em caso de erro
        produtos = obterProdutosExemplo();
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        
        mostrarErro(`Erro ao carregar produtos: ${error.message}\nUsando dados de exemplo.`);
    }
}

function obterProdutosExemplo() {
    return [
        { 
            id: 'ex1', 
            codigo: 'CIM001', 
            nome: 'Cimento 50kg', 
            preco: 28.90, 
            quantidade: 50, 
            categoria: 'Cimento',
            unidade: 'Saco'
        },
        { 
            id: 'ex2', 
            codigo: 'ARE001', 
            nome: 'Areia Média', 
            preco: 45.00, 
            quantidade: 30, 
            categoria: 'Areia',
            unidade: 'M³'
        },
        { 
            id: 'ex3', 
            codigo: 'BR1101', 
            nome: 'Brita 1', 
            preco: 65.00, 
            quantidade: 25, 
            categoria: 'Brita',
            unidade: 'M³'
        },
        { 
            id: 'ex4', 
            codigo: 'TEL001', 
            nome: 'Tijolo 8 furos', 
            preco: 1.20, 
            quantidade: 1000, 
            categoria: 'Tijolo',
            unidade: 'UN'
        },
        { 
            id: 'ex5', 
            codigo: 'CAL001', 
            nome: 'Cal Hidratada', 
            preco: 12.50, 
            quantidade: 40, 
            categoria: 'Cal',
            unidade: 'Saco'
        }
    ];
}

// ============================================
// 6. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    if (!productsGrid) return;
    
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
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" data-id="${produto.id}">
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
                    <button class="btn-add-product" ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
    
    // Adicionar eventos
    document.querySelectorAll('.btn-add-product:not([disabled])').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productId = card.dataset.id;
            abrirModalProduto(productId);
        });
    });
    
    document.querySelectorAll('.product-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.dataset.id;
            abrirModalProduto(productId);
        });
    });
}

// ============================================
// 7. FUNÇÕES DO MODAL
// ============================================
function configurarModal() {
    if (!modalQuantidade) return;
    
    // Botão fechar
    const modalClose = modalQuantidade.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            modalQuantidade.style.display = 'none';
        });
    }
    
    // Botão cancelar
    const btnCancel = modalQuantidade.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', function() {
            modalQuantidade.style.display = 'none';
        });
    }
    
    // Fechar ao clicar fora
    modalQuantidade.addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
    
    // Controles de quantidade
    if (btnDecrease) {
        btnDecrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            if (qty > 1) {
                qty--;
                quantidadeInput.value = qty;
            }
        });
    }
    
    if (btnIncrease) {
        btnIncrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            qty++;
            quantidadeInput.value = qty;
        });
    }
    
    // Adicionar ao carrinho
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', adicionarAoCarrinho);
    }
}

function abrirModalProduto(productId) {
    produtoSelecionado = produtosFiltrados.find(p => p.id === productId);
    
    if (!produtoSelecionado || !modalQuantidade) return;
    
    // Configurar informações
    if (modalProductInfo) {
        modalProductInfo.innerHTML = `
            <h4>${produtoSelecionado.nome}</h4>
            <p><strong>Código:</strong> ${produtoSelecionado.codigo || 'N/A'}</p>
            <p><strong>Estoque disponível:</strong> ${produtoSelecionado.quantidade} ${produtoSelecionado.unidade || 'UN'}</p>
            <p><strong>Preço unitário:</strong> R$ ${formatarMoeda(produtoSelecionado.preco)}</p>
        `;
    }
    
    // Configurar quantidade
    if (quantidadeInput) {
        quantidadeInput.value = 1;
        quantidadeInput.max = produtoSelecionado.quantidade;
    }
    
    // Mostrar modal
    modalQuantidade.style.display = 'flex';
}

function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(quantidadeInput?.value) || 1;
    const estoqueDisponivel = produtoSelecionado.quantidade;
    
    // Verificar estoque
    if (quantidade > estoqueDisponivel) {
        alert(`Estoque insuficiente!\nDisponível: ${estoqueDisponivel} ${produtoSelecionado.unidade || 'UN'}`);
        return;
    }
    
    // Verificar se já está no carrinho
    const itemExistente = carrinho.find(item => item.id === produtoSelecionado.id);
    
    if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + quantidade;
        
        if (novaQuantidade > estoqueDisponivel) {
            alert(`Estoque insuficiente para quantidade adicional!\nDisponível: ${estoqueDisponivel}`);
            return;
        }
        
        itemExistente.quantidade = novaQuantidade;
        itemExistente.subtotal = itemExistente.preco * novaQuantidade;
    } else {
        carrinho.push({
            id: produtoSelecionado.id,
            codigo: produtoSelecionado.codigo,
            nome: produtoSelecionado.nome,
            categoria: produtoSelecionado.categoria,
            unidade: produtoSelecionado.unidade,
            preco: produtoSelecionado.preco,
            quantidade: quantidade,
            subtotal: produtoSelecionado.preco * quantidade,
            estoque_disponivel: estoqueDisponivel
        });
    }
    
    // Fechar modal
    if (modalQuantidade) {
        modalQuantidade.style.display = 'none';
    }
    
    // Atualizar interface
    renderizarCarrinho();
    atualizarTotal();
    
    // Mensagem
    mostrarMensagem(`${quantidade}x ${produtoSelecionado.nome} adicionado ao carrinho!`, 'success');
}

// ============================================
// 8. FUNÇÕES DO CARRINHO (continuação similar...)
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
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>Código: ${item.codigo || 'N/A'}</span>
                        <span>${item.categoria || ''}</span>
                    </div>
                </div>
                
                <div class="cart-item-controls">
                    <div class="cart-item-qty">
                        <button class="qty-btn minus" data-action="decrease" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="qty-input" value="${item.quantidade}" min="1" max="${item.estoque_disponivel}" data-index="${index}">
                        <button class="qty-btn plus" data-action="increase" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <div class="cart-item-price">
                        R$ ${formatarMoeda(item.subtotal)}
                    </div>
                    
                    <button class="btn-remove-item" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
    
    // Adicionar eventos aos controles
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const action = this.dataset.action;
            alterarQuantidadeItem(index, action);
        });
    });
    
    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const novaQuantidade = parseInt(this.value) || 1;
            atualizarQuantidadeItem(index, novaQuantidade);
        });
    });
    
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removerItemCarrinho(index);
        });
    });
}

function alterarQuantidadeItem(index, action) {
    const item = carrinho[index];
    if (!item) return;
    
    let novaQuantidade = item.quantidade;
    
    if (action === 'increase') {
        novaQuantidade++;
    } else if (action === 'decrease') {
        novaQuantidade--;
    }
    
    if (novaQuantidade < 1) {
        removerItemCarrinho(index);
        return;
    }
    
    if (novaQuantidade > item.estoque_disponivel) {
        mostrarMensagem(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, 'warning');
        return;
    }
    
    atualizarQuantidadeItem(index, novaQuantidade);
}

function atualizarQuantidadeItem(index, novaQuantidade) {
    if (novaQuantidade < 1) {
        removerItemCarrinho(index);
        return;
    }
    
    const item = carrinho[index];
    if (!item) return;
    
    if (novaQuantidade > item.estoque_disponivel) {
        mostrarMensagem(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, 'warning');
        return;
    }
    
    item.quantidade = novaQuantidade;
    item.subtotal = item.preco * novaQuantidade;
    
    renderizarCarrinho();
    atualizarTotal();
}

function removerItemCarrinho(index) {
    if (confirm('Remover item do carrinho?')) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
        atualizarTotal();
        mostrarMensagem('Item removido do carrinho', 'info');
    }
}

function limparCarrinho() {
    carrinho = [];
    renderizarCarrinho();
    atualizarTotal();
    mostrarMensagem('Carrinho limpo', 'info');
}

function calcularTotal() {
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    return subtotal - descontoValor;
}

function atualizarTotal() {
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

// ============================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================
function filtrarProdutos() {
    if (!searchProduct) return;
    
    const termo = searchProduct.value.toLowerCase().trim();
    
    if (termo === '') {
        produtosFiltrados = [...produtos];
    } else {
        produtosFiltrados = produtos.filter(produto => 
            (produto.codigo && produto.codigo.toLowerCase().includes(termo)) ||
            (produto.nome && produto.nome.toLowerCase().includes(termo)) ||
            (produto.categoria && produto.categoria.toLowerCase().includes(termo))
        );
    }
    
    renderizarProdutos();
    atualizarContadorProdutos();
}

function atualizarContadorProdutos() {
    if (productCount) {
        productCount.textContent = `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? 's' : ''}`;
    }
}

function atualizarDataHora() {
    if (!currentDateTimeElement) return;
    
    const agora = new Date();
    currentDateTimeElement.textContent = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
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

function mostrarMensagem(texto, tipo = 'info') {
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
    }, 3000);
}

function mostrarAviso(texto) {
    mostrarMensagem(texto, 'warning');
}

function mostrarErro(texto) {
    mostrarMensagem(texto, 'error');
}

console.log("✅ venda.js carregado com sucesso!");
