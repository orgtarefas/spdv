// venda.js - USANDO mjServices DO firebase_config.js
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

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 venda.html carregada");
    
    // PRIMEIRO: Verificar sessão
    if (!verificarSessao()) {
        return;
    }
    
    // SEGUNDO: Configurar página
    configurarPagina();
    
    // TERCEIRO: Carregar produtos via mjServices
    await carregarProdutosMJ();
    
    console.log("✅ venda.js inicializado com sucesso!");
});

// ============================================
// 2. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    console.log("🔍 Verificando sessão...");
    
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
// 3. CONFIGURAR PÁGINA
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
    
    // Configurar finalizar venda
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', function() {
            if (carrinho.length === 0) {
                mostrarMensagem("Adicione produtos ao carrinho primeiro!", "warning");
                return;
            }
            
            finalizarVendaMJ();
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
    }, 500);
}

// ============================================
// 4. CONFIGURAR MODAL
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

// ============================================
// 5. CARREGAR PRODUTOS VIA mjServices
// ============================================
async function carregarProdutosMJ() {
    console.log("📦 Carregando produtos via mjServices...");
    
    try {
        mostrarLoading("Carregando produtos do estoque...");
        
        // Verificar se mjServices está disponível
        if (typeof mjServices === 'undefined') {
            throw new Error("mjServices não está disponível. Verifique o import do firebase_config.js");
        }
        
        console.log("✅ mjServices disponível:", mjServices);
        
        // Usar a função buscarProdutosParaVenda do mjServices
        const resultado = await mjServices.buscarProdutosParaVenda();
        
        console.log("📊 Resultado da busca:", resultado);
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            console.log(`✅ ${produtos.length} produtos carregados`);
            console.log("Primeiro produto:", produtos[0]);
            
            renderizarProdutos();
            atualizarContadorProdutos();
            
            if (produtos.length === 0) {
                mostrarMensagem("Nenhum produto disponível no estoque", "info");
            }
            
        } else {
            throw new Error(resultado.error || "Erro ao buscar produtos");
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        mostrarMensagem(`Erro: ${error.message}`, "error");
        
        // Mostrar produtos de exemplo para teste
        produtos = obterProdutosExemplo();
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        
    } finally {
        esconderLoading();
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
            unidade: 'Saco',
            ativo: true
        },
        { 
            id: 'ex2', 
            codigo: 'ARE001', 
            nome: 'Areia Média', 
            preco: 45.00, 
            quantidade: 30, 
            categoria: 'Areia',
            unidade: 'M³',
            ativo: true
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
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" data-id="${produto.id}" data-nome="${produto.nome}">
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name" title="${produto.nome}">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-footer">
                    <span class="product-price">R$ ${formatarMoeda(produto.preco)}</span>
                    <button class="btn-add-product" ${!temEstoque ? 'disabled' : ''} title="Adicionar ao carrinho">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.btn-add-product:not([disabled])').forEach(btn => {
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
            <p><strong>Estoque disponível:</strong> ${produtoSelecionado.quantidade} ${produtoSelecionado.unidade || 'UN'}</p>
            <p><strong>Preço unitário:</strong> R$ ${formatarMoeda(produtoSelecionado.preco)}</p>
            ${produtoSelecionado.categoria ? `<p><strong>Categoria:</strong> ${produtoSelecionado.categoria}</p>` : ''}
        `;
    }
    
    // Configurar quantidade
    if (quantidadeInput) {
        quantidadeInput.value = 1;
        quantidadeInput.max = produtoSelecionado.quantidade;
        quantidadeInput.min = 1;
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
        mostrarMensagem(`Estoque insuficiente! Disponível: ${estoqueDisponivel}`, "warning");
        return;
    }
    
    // Verificar se já está no carrinho
    const itemExistente = carrinho.find(item => item.id === produtoSelecionado.id);
    
    if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + quantidade;
        
        if (novaQuantidade > estoqueDisponivel) {
            mostrarMensagem(`Estoque insuficiente para quantidade adicional! Disponível: ${estoqueDisponivel}`, "warning");
            return;
        }
        
        itemExistente.quantidade = novaQuantidade;
        itemExistente.subtotal = itemExistente.preco * novaQuantidade;
        mostrarMensagem(`Quantidade atualizada: ${novaQuantidade}x ${produtoSelecionado.nome}`, "success");
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
        mostrarMensagem(`${quantidade}x ${produtoSelecionado.nome} adicionado ao carrinho!`, "success");
    }
    
    // Fechar modal
    if (modalQuantidade) {
        modalQuantidade.style.display = 'none';
    }
    
    // Atualizar interface
    renderizarCarrinho();
    atualizarTotal();
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
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>Código: ${item.codigo || 'N/A'}</span>
                        ${item.categoria ? `<span>${item.categoria}</span>` : ''}
                    </div>
                </div>
                
                <div class="cart-item-controls">
                    <div class="cart-item-qty">
                        <button class="qty-btn minus" data-action="decrease" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="qty-input" value="${item.quantidade}" 
                               min="1" max="${item.estoque_disponivel}" data-index="${index}">
                        <button class="qty-btn plus" data-action="increase" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <div class="cart-item-price">
                        R$ ${formatarMoeda(item.subtotal)}
                    </div>
                    
                    <button class="btn-remove-item" data-index="${index}" title="Remover item">
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
        mostrarMensagem(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, "warning");
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
        mostrarMensagem(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`, "warning");
        return;
    }
    
    item.quantidade = novaQuantidade;
    item.subtotal = item.preco * novaQuantidade;
    
    renderizarCarrinho();
    atualizarTotal();
}

function removerItemCarrinho(index) {
    if (confirm('Remover item do carrinho?')) {
        const itemRemovido = carrinho[index].nome;
        carrinho.splice(index, 1);
        renderizarCarrinho();
        atualizarTotal();
        mostrarMensagem(`${itemRemovido} removido do carrinho`, "info");
    }
}

function limparCarrinho() {
    carrinho = [];
    renderizarCarrinho();
    atualizarTotal();
    mostrarMensagem("Carrinho limpo", "info");
}

// ============================================
// 9. FINALIZAR VENDA COM mjServices
// ============================================
async function finalizarVendaMJ() {
    try {
        // Calcular totais
        const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
        const valorDesconto = subtotal * (desconto / 100);
        const total = subtotal - valorDesconto;
        
        // Obter forma de pagamento
        const formaPagamento = document.querySelector('input[name="payment"]:checked')?.value || 'dinheiro';
        const formaPagamentoNome = getFormaPagamentoNome(formaPagamento);
        
        const confirmar = confirm(
            `CONFIRMAR VENDA\n\n` +
            `Itens: ${carrinho.length}\n` +
            `Subtotal: R$ ${formatarMoeda(subtotal)}\n` +
            `Desconto: R$ ${formatarMoeda(valorDesconto)}\n` +
            `Total: R$ ${formatarMoeda(total)}\n` +
            `Forma de pagamento: ${formaPagamentoNome}\n\n` +
            `Deseja finalizar esta venda?`
        );
        
        if (!confirmar) return;
        
        mostrarLoading("Processando venda...");
        
        // Preparar dados da venda
        const dadosVenda = {
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
            vendedor: usuario.nome || usuario.login,
            observacoes: ''
        };
        
        console.log("📤 Enviando venda para mjServices:", dadosVenda);
        
        // Usar mjServices para criar a venda
        const resultado = await mjServices.criarVenda(dadosVenda);
        
        console.log("📥 Resultado da venda:", resultado);
        
        if (resultado.success) {
            // Limpar carrinho
            carrinho = [];
            renderizarCarrinho();
            atualizarTotal();
            
            // Mostrar mensagem de sucesso
            const numeroVenda = resultado.data?.numero_venda || 'N/A';
            mostrarMensagem(
                `✅ Venda finalizada com sucesso!\n` +
                `Número: ${numeroVenda}\n` +
                `Total: R$ ${formatarMoeda(total)}`,
                "success",
                5000
            );
            
            // Recarregar produtos (estoque foi atualizado)
            setTimeout(async () => {
                await carregarProdutosMJ();
            }, 2000);
            
        } else {
            throw new Error(resultado.error || "Erro ao criar venda");
        }
        
    } catch (error) {
        console.error("❌ Erro ao finalizar venda:", error);
        mostrarMensagem(`Erro: ${error.message}`, "error");
        
    } finally {
        esconderLoading();
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
// 10. FUNÇÕES UTILITÁRIAS
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

function atualizarTotal() {
    if (!subtotalElement || !totalElement) return;
    
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    const total = subtotal - descontoValor;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalElement.textContent = `R$ ${formatarMoeda(total)}`;
}

function calcularTotal() {
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (desconto / 100);
    return subtotal - descontoValor;
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

// ============================================
// 11. FUNÇÕES DE UI
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

// ============================================
// 12. TESTE DE FUNCIONAMENTO
// ============================================
console.log("✅ venda.js carregado com sucesso!");
