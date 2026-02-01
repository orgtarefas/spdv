// venda.js - VERSÃO AJUSTADA PARA SUA ESTRUTURA
console.log("🛒 venda.js carregando...");

// Elementos DOM
const searchProduct = document.getElementById('searchProduct');
const productsGrid = document.getElementById('productsGrid');
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

// Variáveis globais
let usuario = null;
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let produtoSelecionado = null;
let desconto = 0;

// ============================================
// 1. INICIALIZAÇÃO - VERIFICAR SESSÃO PRIMEIRO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 venda.html carregada");
    
    // PRIMEIRO: Verificar sessão
    if (!verificarSessao()) {
        console.log("❌ Sem sessão - redirecionando para login");
        return;
    }
    
    // SEGUNDO: Configurar página
    configurarPagina();
    
    // TERCEIRO: Carregar produtos
    setTimeout(async function() {
        await carregarProdutosParaVenda();
    }, 500);
    
    console.log("✅ venda.js inicializado");
});

// ============================================
// 2. VERIFICAR SESSÃO (ADAPTADA PARA SEU SISTEMA)
// ============================================
function verificarSessao() {
    console.log("🔍 Verificando sessão...");
    
    // Seu sistema salva a sessão como 'pdv_sessao_temporaria'
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        console.log("❌ Nenhuma sessão encontrada!");
        
        // Mostrar alerta e redirecionar
        alert("Sessão não encontrada ou expirada.\nFaça login novamente.");
        
        // Voltar 2 níveis para login (raiz)
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário logado:", usuario);
        
        // Mostrar nome do usuário
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
// 3. CONFIGURAR PÁGINA
// ============================================
function configurarPagina() {
    console.log("⚙️ Configurando página...");
    
    // Configurar logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                // Limpar sessões
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                
                // Voltar para login (2 níveis acima)
                window.location.href = '../../login.html';
            }
        });
    }
    
    // Configurar botão voltar (se existir)
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
    
    // Configurar botão escanear (se existir)
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', function() {
            alert("Funcionalidade de scanner em desenvolvimento");
        });
    }
    
    // Configurar botão limpar carrinho
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
    
    // Configurar botão finalizar venda
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', function() {
            alert("Funcionalidade de finalizar venda em desenvolvimento");
        });
    }
    
    // Configurar botão cancelar
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Configurar modal (se existir)
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
// 4. CONFIGURAR MODAL
// ============================================
function configurarModal() {
    if (!modalQuantidade) return;
    
    // Botão fechar modal
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
    
    // Botão diminuir quantidade
    const btnDecrease = document.getElementById('btnDecrease');
    if (btnDecrease) {
        btnDecrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            if (qty > 1) {
                qty--;
                quantidadeInput.value = qty;
            }
        });
    }
    
    // Botão aumentar quantidade
    const btnIncrease = document.getElementById('btnIncrease');
    if (btnIncrease) {
        btnIncrease.addEventListener('click', function() {
            let qty = parseInt(quantidadeInput.value) || 1;
            qty++;
            quantidadeInput.value = qty;
        });
    }
    
    // Botão adicionar ao carrinho
    const btnAddToCart = document.getElementById('btnAddToCart');
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', function() {
            adicionarAoCarrinho();
        });
    }
}

// ============================================
// 5. CARREGAR PRODUTOS (SIMPLIFICADO)
// ============================================
async function carregarProdutosParaVenda() {
    console.log("📦 Carregando produtos...");
    
    try {
        // Se você tem o mjServices importado
        if (typeof mjServices !== 'undefined' && mjServices.buscarProdutosParaVenda) {
            const resultado = await mjServices.buscarProdutosParaVenda();
            
            if (resultado.success) {
                produtos = resultado.data;
                produtosFiltrados = [...produtos];
                renderizarProdutos();
            } else {
                throw new Error(resultado.error);
            }
        } else {
            // Fallback: produtos de exemplo
            produtos = [
                { id: '1', codigo: 'CIM001', nome: 'Cimento 50kg', preco: 28.90, quantidade: 50, categoria: 'Cimento' },
                { id: '2', codigo: 'ARE001', nome: 'Areia Média', preco: 45.00, quantidade: 30, categoria: 'Areia' },
                { id: '3', codigo: 'BR1101', nome: 'Brita 1', preco: 65.00, quantidade: 25, categoria: 'Brita' },
                { id: '4', codigo: 'TEL001', nome: 'Tijolo 8 furos', preco: 1.20, quantidade: 1000, categoria: 'Tijolo' },
                { id: '5', codigo: 'CAL001', nome: 'Cal Hidratada', preco: 12.50, quantidade: 40, categoria: 'Cal' }
            ];
            produtosFiltrados = [...produtos];
            renderizarProdutos();
        }
        
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        mostrarProdutosExemplo();
    }
}

// ============================================
// 6. RENDERIZAR PRODUTOS (SIMPLIFICADO)
// ============================================
function renderizarProdutos() {
    if (!productsGrid) return;
    
    if (produtosFiltrados.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" data-id="${produto.id}">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${produto.quantidade < 10 ? 'low' : ''}">
                        ${produto.quantidade} UN
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
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.btn-add-product').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productId = card.dataset.id;
            abrirModalProduto(productId);
        });
    });
    
    // Adicionar evento aos cards
    document.querySelectorAll('.product-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.dataset.id;
            abrirModalProduto(productId);
        });
    });
}

function mostrarProdutosExemplo() {
    if (!productsGrid) return;
    
    productsGrid.innerHTML = `
        <div class="product-card">
            <div class="product-header">
                <span class="product-code">EX001</span>
                <span class="product-stock">50 UN</span>
            </div>
            <div class="product-name">Produto de Exemplo 1</div>
            <div class="product-category">Exemplo</div>
            <div class="product-footer">
                <span class="product-price">R$ 25,00</span>
                <button class="btn-add-product">
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        </div>
        
        <div class="product-card">
            <div class="product-header">
                <span class="product-code">EX002</span>
                <span class="product-stock">30 UN</span>
            </div>
            <div class="product-name">Produto de Exemplo 2</div>
            <div class="product-category">Exemplo</div>
            <div class="product-footer">
                <span class="product-price">R$ 45,00</span>
                <button class="btn-add-product">
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        </div>
    `;
    
    // Configurar eventos para os exemplos
    document.querySelectorAll('.btn-add-product').forEach(btn => {
        btn.addEventListener('click', function() {
            alert("Produto adicionado ao carrinho (exemplo)");
        });
    });
}

// ============================================
// 7. FUNÇÕES DO MODAL
// ============================================
function abrirModalProduto(productId) {
    produtoSelecionado = produtosFiltrados.find(p => p.id === productId);
    
    if (!produtoSelecionado || !modalQuantidade) return;
    
    // Configurar informações no modal
    if (modalProductInfo) {
        modalProductInfo.innerHTML = `
            <h4>${produtoSelecionado.nome}</h4>
            <p><strong>Código:</strong> ${produtoSelecionado.codigo || 'N/A'}</p>
            <p><strong>Estoque:</strong> ${produtoSelecionado.quantidade || 0} UN</p>
            <p><strong>Preço:</strong> R$ ${formatarMoeda(produtoSelecionado.preco)}</p>
        `;
    }
    
    // Configurar quantidade inicial
    if (quantidadeInput) {
        quantidadeInput.value = 1;
        quantidadeInput.max = produtoSelecionado.quantidade || 1;
    }
    
    // Mostrar modal
    modalQuantidade.style.display = 'flex';
}

function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(quantidadeInput?.value) || 1;
    
    // Verificar estoque
    if (quantidade > produtoSelecionado.quantidade) {
        alert(`Estoque insuficiente! Disponível: ${produtoSelecionado.quantidade}`);
        return;
    }
    
    // Adicionar ao carrinho
    carrinho.push({
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        preco: produtoSelecionado.preco,
        quantidade: quantidade,
        subtotal: produtoSelecionado.preco * quantidade
    });
    
    // Fechar modal
    if (modalQuantidade) {
        modalQuantidade.style.display = 'none';
    }
    
    // Atualizar carrinho
    renderizarCarrinho();
    atualizarTotal();
    
    // Mensagem
    alert(`${quantidade}x ${produtoSelecionado.nome} adicionado ao carrinho!`);
}

// ============================================
// 8. FUNÇÕES DO CARRINHO
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
                        <span>${item.quantidade} x R$ ${formatarMoeda(item.preco)}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
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
    
    // Adicionar eventos aos botões de remover
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (confirm("Remover item do carrinho?")) {
                carrinho.splice(index, 1);
                renderizarCarrinho();
                atualizarTotal();
            }
        });
    });
}

function limparCarrinho() {
    carrinho = [];
    renderizarCarrinho();
    atualizarTotal();
}

// ============================================
// 9. FUNÇÕES DE CÁLCULO
// ============================================
function atualizarTotal() {
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

// ============================================
// 10. FUNÇÕES UTILITÁRIAS
// ============================================
function filtrarProdutos() {
    if (!searchProduct) return;
    
    const termo = searchProduct.value.toLowerCase().trim();
    
    if (termo === '') {
        produtosFiltrados = [...produtos];
    } else {
        produtosFiltrados = produtos.filter(produto => 
            produto.codigo?.toLowerCase().includes(termo) ||
            produto.nome?.toLowerCase().includes(termo) ||
            produto.categoria?.toLowerCase().includes(termo)
        );
    }
    
    renderizarProdutos();
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
// 11. TESTE DE FUNCIONAMENTO
// ============================================
console.log("✅ venda.js carregado com sucesso!");
