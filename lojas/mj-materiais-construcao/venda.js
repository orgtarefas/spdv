// venda.js - MJ Materiais de Construção
import { mjServices } from './firebase_config.js';

// Elementos DOM
const searchProduct = document.getElementById('searchProduct');
const btnScan = document.getElementById('btnScan');
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

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛒 PDV MJ Materiais - Inicializando...');
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Carregar dados do usuário
    carregarDadosUsuario();
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos para venda
    await carregarProdutosParaVenda();
    
    // Atualizar data/hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
    
    console.log('✅ PDV MJ Materiais carregado com sucesso!');
});

// ============================================
// 2. VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('pdv_autenticado');
    const usuarioData = localStorage.getItem('pdv_usuario');
    
    if (autenticado !== 'true' || !usuarioData) {
        // Redirecionar para login
        window.location.href = '../../login.html';
        return false;
    }
    
    usuario = JSON.parse(usuarioData);
    return true;
}

// ============================================
// 3. CARREGAR DADOS DO USUÁRIO
// ============================================
function carregarDadosUsuario() {
    if (usuario) {
        userNameElement.textContent = usuario.nomeCompleto || usuario.login;
    }
    
    // Configurar logout
    btnLogout.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '../../login.html';
    });
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Busca de produtos
    searchProduct.addEventListener('input', function() {
        filtrarProdutos();
    });
    
    // Botão scan (simulado)
    btnScan.addEventListener('click', function() {
        showMessage('Funcionalidade de scanner em desenvolvimento', 'info');
    });
    
    // Limpar carrinho
    btnClearCart.addEventListener('click', function() {
        if (carrinho.length > 0) {
            if (confirm('Deseja realmente limpar o carrinho?')) {
                limparCarrinho();
            }
        }
    });
    
    // Desconto
    descontoInput.addEventListener('input', function() {
        desconto = parseFloat(this.value) || 0;
        if (desconto < 0) desconto = 0;
        if (desconto > 100) desconto = 100;
        this.value = desconto;
        atualizarTotal();
    });
    
    // Finalizar venda
    btnFinalizarVenda.addEventListener('click', finalizarVenda);
    
    // Cancelar venda
    btnCancelarVenda.addEventListener('click', function() {
        if (carrinho.length > 0) {
            if (confirm('Deseja realmente cancelar esta venda?')) {
                window.location.href = 'home.html';
            }
        } else {
            window.location.href = 'home.html';
        }
    });
    
    // Modal eventos
    const modalClose = modalQuantidade?.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            fecharModal(modalQuantidade);
        });
    }
    
    const btnCancel = modalQuantidade?.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            fecharModal(modalQuantidade);
        });
    }
    
    // Fechar modal ao clicar fora
    if (modalQuantidade) {
        modalQuantidade.addEventListener('click', function(e) {
            if (e.target === this) {
                fecharModal(this);
            }
        });
    }
    
    // Controles de quantidade no modal
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
    
    // Atalhos de teclado
    document.addEventListener('keydown', function(e) {
        // F1 - Nova venda (recarregar página)
        if (e.key === 'F1') {
            e.preventDefault();
            location.reload();
        }
        
        // F2 - Focar na busca
        if (e.key === 'F2') {
            e.preventDefault();
            searchProduct.focus();
            searchProduct.select();
        }
        
        // F3 - Limpar carrinho
        if (e.key === 'F3' && e.ctrlKey) {
            e.preventDefault();
            limparCarrinho();
        }
        
        // F9 - Finalizar venda
        if (e.key === 'F9') {
            e.preventDefault();
            btnFinalizarVenda.click();
        }
        
        // F12 - Cancelar venda
        if (e.key === 'F12') {
            e.preventDefault();
            btnCancelarVenda.click();
        }
    });
}

// ============================================
// 5. CARREGAR PRODUTOS PARA VENDA
// ============================================
async function carregarProdutosParaVenda() {
    try {
        showLoading('Carregando produtos...');
        
        const resultado = await mjServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            renderizarProdutos();
            atualizarContadorProdutos();
            
            hideLoading();
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
        showMessage('Erro ao carregar produtos', 'error');
        
        emptyProducts.style.display = 'flex';
        productsGrid.innerHTML = '';
    }
}

// ============================================
// 6. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    if (produtosFiltrados.length === 0) {
        emptyProducts.style.display = 'flex';
        productsGrid.innerHTML = '';
        return;
    }
    
    emptyProducts.style.display = 'none';
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
        const semEstoque = produto.quantidade <= 0;
        
        html += `
            <div class="product-card ${semEstoque ? 'disabled' : ''}" data-id="${produto.id}">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'N/A'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-footer">
                    <span class="product-price">R$ ${formatarMoeda(produto.preco)}</span>
                    <button class="btn-add-product" ${semEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
    
    // Adicionar eventos aos botões de adicionar
    document.querySelectorAll('.btn-add-product').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.id;
            abrirModalQuantidade(productId);
        });
    });
    
    // Adicionar evento de clique no card inteiro
    document.querySelectorAll('.product-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.dataset.id;
            abrirModalQuantidade(productId);
        });
    });
}

// ============================================
// 7. FILTRAR PRODUTOS
// ============================================
function filtrarProdutos() {
    const termo = searchProduct.value.toLowerCase().trim();
    
    if (termo === '') {
        produtosFiltrados = [...produtos];
    } else {
        produtosFiltrados = produtos.filter(produto => 
            produto.codigo?.toLowerCase().includes(termo) ||
            produto.nome.toLowerCase().includes(termo) ||
            produto.categoria?.toLowerCase().includes(termo)
        );
    }
    
    renderizarProdutos();
    atualizarContadorProdutos();
}

// ============================================
// 8. MODAL DE QUANTIDADE
// ============================================
function abrirModalQuantidade(productId) {
    produtoSelecionado = produtos.find(p => p.id === productId);
    
    if (!produtoSelecionado) return;
    
    // Configurar quantidade máxima baseada no estoque
    const estoqueMaximo = produtoSelecionado.quantidade;
    quantidadeInput.max = estoqueMaximo;
    quantidadeInput.value = 1;
    
    // Atualizar informações do produto no modal
    modalProductInfo.innerHTML = `
        <h4>${produtoSelecionado.nome}</h4>
        <p><strong>Código:</strong> ${produtoSelecionado.codigo || 'N/A'}</p>
        <p><strong>Estoque disponível:</strong> ${estoqueMaximo} ${produtoSelecionado.unidade || 'UN'}</p>
        <p><strong>Preço unitário:</strong> R$ ${formatarMoeda(produtoSelecionado.preco)}</p>
    `;
    
    abrirModal(modalQuantidade);
}

// ============================================
// 9. CARRINHO DE COMPRAS
// ============================================
function adicionarAoCarrinho() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(quantidadeInput.value) || 1;
    const estoqueDisponivel = produtoSelecionado.quantidade;
    
    // Verificar estoque
    if (quantidade > estoqueDisponivel) {
        showMessage(`Estoque insuficiente. Disponível: ${estoqueDisponivel}`, 'warning');
        return;
    }
    
    // Verificar se produto já está no carrinho
    const itemExistente = carrinho.find(item => item.produto_id === produtoSelecionado.id);
    
    if (itemExistente) {
        // Atualizar quantidade
        const novaQuantidade = itemExistente.quantidade + quantidade;
        
        if (novaQuantidade > estoqueDisponivel) {
            showMessage(`Estoque insuficiente. Disponível: ${estoqueDisponivel}`, 'warning');
            return;
        }
        
        itemExistente.quantidade = novaQuantidade;
        itemExistente.subtotal = itemExistente.preco * novaQuantidade;
    } else {
        // Adicionar novo item
        carrinho.push({
            produto_id: produtoSelecionado.id,
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
    
    fecharModal(modalQuantidade);
    renderizarCarrinho();
    atualizarTotal();
    
    showMessage('Produto adicionado ao carrinho!', 'success');
}

function renderizarCarrinho() {
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
    
    // Adicionar eventos aos controles do carrinho
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
        showMessage(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, 'warning');
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
        showMessage(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, 'warning');
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
        showMessage('Item removido do carrinho', 'info');
    }
}

function limparCarrinho() {
    carrinho = [];
    renderizarCarrinho();
    atualizarTotal();
    showMessage('Carrinho limpo', 'info');
}

// ============================================
// 10. CÁLCULOS DE VALORES
// ============================================
function atualizarTotal() {
    // Calcular subtotal
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    
    // Calcular desconto
    const valorDesconto = subtotal * (desconto / 100);
    const total = subtotal - valorDesconto;
    
    // Atualizar elementos
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

// ============================================
// 11. FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (carrinho.length === 0) {
        showMessage('Adicione produtos ao carrinho para finalizar a venda', 'warning');
        return;
    }
    
    // Calcular totais
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const valorDesconto = subtotal * (desconto / 100);
    const total = subtotal - valorDesconto;
    
    // Obter forma de pagamento
    const formaPagamento = document.querySelector('input[name="payment"]:checked')?.value || 'dinheiro';
    
    const confirmar = confirm(
        `Confirmar venda?\n\n` +
        `Itens: ${carrinho.length}\n` +
        `Subtotal: R$ ${formatarMoeda(subtotal)}\n` +
        `Desconto: R$ ${formatarMoeda(valorDesconto)}\n` +
        `Total: R$ ${formatarMoeda(total)}\n` +
        `Forma de pagamento: ${getFormaPagamentoNome(formaPagamento)}`
    );
    
    if (!confirmar) return;
    
    try {
        showLoading('Processando venda...');
        
        // Preparar dados da venda
        const dadosVenda = {
            itens: carrinho.map(item => ({
                produto_id: item.produto_id,
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
            vendedor: usuario.nomeCompleto || usuario.login,
            observacoes: ''
        };
        
        // Enviar para o Firebase
        const resultado = await mjServices.criarVenda(dadosVenda);
        
        if (resultado.success) {
            hideLoading();
            
            // Limpar carrinho
            carrinho = [];
            renderizarCarrinho();
            atualizarTotal();
            
            // Mostrar recibo
            const numeroVenda = resultado.data.numero_venda;
            const mensagem = `
                ✅ Venda finalizada com sucesso!\n
                Número da venda: ${numeroVenda}\n
                Total: R$ ${formatarMoeda(total)}\n
                Forma de pagamento: ${getFormaPagamentoNome(formaPagamento)}
            `;
            
            showMessage(mensagem, 'success', 8000);
            
            // Atualizar lista de produtos (estoque foi atualizado)
            setTimeout(async () => {
                await carregarProdutosParaVenda();
            }, 1000);
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao finalizar venda:', error);
        showMessage(`Erro ao finalizar venda: ${error.message}`, 'error');
    }
}

function getFormaPagamentoNome(codigo) {
    const formas = {
        'dinheiro': 'Dinheiro',
        'cartao_debito': 'Cartão de Débito',
        'cartao_credito': 'Cartão de Crédito',
        'pix': 'PIX'
    };
    
    return formas[codigo] || codigo;
}

// ============================================
// 12. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarContadorProdutos() {
    productCount.textContent = `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? 's' : ''}`;
}

function atualizarDataHora() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR');
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = `${dataFormatada} ${horaFormatada}`;
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function abrirModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLoading(mensagem = 'Carregando...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = loadingOverlay?.querySelector('h3');
    
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = mensagem;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showMessage(text, type = 'info', tempo = 5000) {
    const messageAlert = document.getElementById('messageAlert');
    const messageText = messageAlert?.querySelector('.message-text');
    const messageIcon = messageAlert?.querySelector('.message-icon');
    
    if (!messageAlert || !messageText) return;
    
    messageText.textContent = text;
    messageAlert.className = `message-alert ${type}`;
    messageAlert.style.display = 'block';
    messageAlert.style.animation = 'slideInRight 0.3s ease';
    
    // Fechar ao clicar no botão
    const messageClose = messageAlert.querySelector('.message-close');
    if (messageClose) {
        messageClose.onclick = () => {
            messageAlert.style.display = 'none';
        };
    }
    
    // Auto-fechar
    setTimeout(() => {
        if (messageAlert.style.display === 'block') {
            messageAlert.style.display = 'none';
        }
    }, tempo);
}
