// venda.js - SISTEMA DE VENDAS DINÂMICO COM MÓDULOS 
console.log("🛒 Sistema de Vendas Dinâmico - Iniciando...");

import { lojaServices, db } from './firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let produtos = [];
let produtosFiltrados = [];
let carrinho = [];
let desconto = 0;

// Elementos DOM
let searchProduct, btnScan, productCount, productsGrid, emptyProducts;
let cartItems, btnClearCart, subtotalElement, totalElement, descontoInput;
let paymentMethods, btnFinalizarVenda, btnCancelarVenda;
let userNameElement, btnLogout, btnVoltar;
let nomeLojaElement, footerLojaElement;

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página de vendas carregada");
    
    try {
        // Mostrar loading inicial
        mostrarLoading('Inicializando PDV...', 'Carregando configurações...');
        
        // Verificar se a loja está carregada
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = '../../login.html';
            }, 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaServices.lojaId}`);
        console.log(`👤 Usuário: ${lojaServices.nomeUsuario}`);
        
        // Inicializar elementos DOM
        inicializarElementosDOM();
        
        // Atualizar interface com dados da loja
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar produtos disponíveis para venda
        await carregarProdutosParaVenda();
        
        // Atualizar data/hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000);
        
        // Esconder loading
        esconderLoading();
        
        console.log("✅ Sistema de vendas pronto para uso");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de vendas', 'error');
        esconderLoading();
    }
});

// ============================================
// 2. INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementosDOM() {
    console.log("🔍 Buscando elementos DOM...");
    
    // Elementos principais
    searchProduct = document.getElementById('searchProduct');
    btnScan = document.getElementById('btnScan');
    productCount = document.getElementById('productCount');
    productsGrid = document.getElementById('productsGrid');
    emptyProducts = document.getElementById('emptyProducts');
    
    // Carrinho
    cartItems = document.getElementById('cartItems');
    btnClearCart = document.getElementById('btnClearCart');
    subtotalElement = document.getElementById('subtotal');
    totalElement = document.getElementById('total');
    descontoInput = document.getElementById('desconto');
    
    // Pagamento
    paymentMethods = document.querySelectorAll('input[name="payment"]');
    btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
    btnCancelarVenda = document.getElementById('btnCancelarVenda');
    
    // Usuário e navegação
    userNameElement = document.getElementById('userName');
    btnLogout = document.getElementById('btnLogout');
    btnVoltar = document.getElementById('btnVoltar');
    
    // Informações da loja
    nomeLojaElement = document.getElementById('nomeLoja');
    footerLojaElement = document.getElementById('footerLojaNome');
    
    console.log("✅ Elementos DOM inicializados");
}

// ============================================
// 3. ATUALIZAR INTERFACE DA LOJA
// ============================================
function atualizarInterfaceLoja() {
    try {
        // Atualizar nome do usuário
        if (userNameElement) {
            userNameElement.textContent = lojaServices.nomeUsuario;
        }
        
        // Atualizar nome da loja
        const resultadoLoja = lojaServices.dadosLoja;
        const nomeLoja = resultadoLoja?.nome || lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Atualizar título da página
        document.title = `${nomeLoja} - PDV Vendas`;
        
        // Atualizar elementos de interface
        if (nomeLojaElement) nomeLojaElement.textContent = nomeLoja;
        if (footerLojaElement) footerLojaElement.textContent = nomeLoja;
        
        // Atualizar subtítulo se existir
        const pageSubtitle = document.querySelector('.page-subtitle');
        if (pageSubtitle) {
            pageSubtitle.textContent = nomeLoja;
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface da loja:', error);
    }
}

// ============================================
// 4. CARREGAR PRODUTOS PARA VENDA
// ============================================
async function carregarProdutosParaVenda() {
    try {
        mostrarLoading('Carregando produtos...', 'Buscando estoque disponível...');
        
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            console.log(`✅ ${produtos.length} produtos disponíveis para venda`);
            
            if (productsGrid) {
                const loadingProducts = document.getElementById('loadingProducts');
                if (loadingProducts) {
                    loadingProducts.style.display = 'none';
                }
            }
            
            renderizarProdutos();
            atualizarContadorProdutos();
            
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            produtos = [];
            produtosFiltrados = [];
            
            mostrarMensagem('Erro ao carregar produtos disponíveis', 'warning');
            
            if (productsGrid) {
                productsGrid.innerHTML = '';
                const loadingProducts = document.getElementById('loadingProducts');
                if (loadingProducts) {
                    loadingProducts.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar produtos</p>
                        <small>${resultado.error || 'Tente novamente'}</small>
                    `;
                }
            }
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos para venda:", error);
        produtos = [];
        produtosFiltrados = [];
        
        mostrarMensagem('Erro ao carregar produtos', 'error');
        
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
                 onclick="window.vendaManager.selecionarProdutoParaVenda('${produto.id}')"
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
                            onclick="event.stopPropagation(); window.vendaManager.selecionarProdutoParaVenda('${produto.id}')">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
}

// ============================================
// 6. FUNÇÕES DE GERENCIAMENTO DE VENDAS
// ============================================
class VendaManager {
    constructor() {
        this.carrinho = [];
        this.desconto = 0;
    }
    
    // Selecionar produto para venda
    async selecionarProdutoParaVenda(produtoId) {
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
        const itemIndex = this.carrinho.findIndex(item => item.id === produtoId);
        
        if (itemIndex > -1) {
            // Atualizar quantidade
            const novaQty = this.carrinho[itemIndex].quantidade + qty;
            if (novaQty > produto.quantidade) {
                mostrarMensagem(`Estoque insuficiente para quantidade adicional! Disponível: ${produto.quantidade}`, "warning");
                return;
            }
            this.carrinho[itemIndex].quantidade = novaQty;
            this.carrinho[itemIndex].subtotal = this.carrinho[itemIndex].preco * novaQty;
            mostrarMensagem(`Quantidade atualizada: ${novaQty}x ${produto.nome}`, "success");
        } else {
            // Adicionar novo item
            this.carrinho.push({
                id: produto.id,
                codigo: produto.codigo,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: qty,
                subtotal: produto.preco * qty,
                estoque_disponivel: produto.quantidade,
                produto_data: produto // Salvar dados completos para referência
            });
            mostrarMensagem(`${qty}x ${produto.nome} adicionado ao carrinho!`, "success");
        }
        
        this.renderizarCarrinho();
        this.atualizarTotal();
    }
    
    // Renderizar carrinho
    renderizarCarrinho() {
        if (!cartItems) return;
        
        if (this.carrinho.length === 0) {
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
        
        this.carrinho.forEach((item, index) => {
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
                        <button class="btn-remove-item" onclick="window.vendaManager.removerDoCarrinho(${index})" title="Remover item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        cartItems.innerHTML = html;
    }
    
    // Remover item do carrinho
    removerDoCarrinho(index) {
        if (confirm("Remover item do carrinho?")) {
            const itemRemovido = this.carrinho[index].nome;
            this.carrinho.splice(index, 1);
            this.renderizarCarrinho();
            this.atualizarTotal();
            mostrarMensagem(`${itemRemovido} removido do carrinho`, "info");
        }
    }
    
    // Limpar carrinho
    limparCarrinho() {
        if (this.carrinho.length === 0) return;
        
        if (confirm("Limpar todo o carrinho?")) {
            this.carrinho = [];
            this.renderizarCarrinho();
            this.atualizarTotal();
            mostrarMensagem("Carrinho limpo", "info");
        }
    }
    
    // Atualizar total
    atualizarTotal() {
        if (!subtotalElement || !totalElement) return;
        
        const subtotal = this.carrinho.reduce((total, item) => total + item.subtotal, 0);
        const descontoValor = subtotal * (this.desconto / 100);
        const total = subtotal - descontoValor;
        
        subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
        totalElement.textContent = `R$ ${formatarMoeda(total)}`;
    }
    
    // Finalizar venda
    async finalizarVenda() {
        if (this.carrinho.length === 0) {
            mostrarMensagem("Adicione produtos ao carrinho primeiro!", "warning");
            return;
        }
        
        // Calcular totais
        const subtotal = this.carrinho.reduce((total, item) => total + item.subtotal, 0);
        const valorDesconto = subtotal * (this.desconto / 100);
        const total = subtotal - valorDesconto;
        
        // Obter forma de pagamento
        const formaPagamentoElement = document.querySelector('input[name="payment"]:checked');
        const formaPagamento = formaPagamentoElement ? formaPagamentoElement.value : 'dinheiro';
        const formaPagamentoNome = this.obterNomeFormaPagamento(formaPagamento);
        
        // Confirmar venda
        const confirmacao = confirm(
            `CONFIRMAR VENDA\n\n` +
            `Itens: ${this.carrinho.length}\n` +
            `Subtotal: R$ ${formatarMoeda(subtotal)}\n` +
            `Desconto: R$ ${formatarMoeda(valorDesconto)} (${this.desconto}%)\n` +
            `Total: R$ ${formatarMoeda(total)}\n` +
            `Forma de pagamento: ${formaPagamentoNome}\n\n` +
            `Deseja finalizar esta venda?`
        );
        
        if (!confirmacao) return;
        
        mostrarLoading("Processando venda...", "Registrando no sistema...");
        
        try {
            // Preparar dados da venda
            const dadosVenda = {
                itens: this.carrinho.map(item => ({
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
                forma_pagamento: formaPagamento
            };
            
            // Usar lojaServices para criar venda
            const resultado = await lojaServices.criarVenda(dadosVenda);
            
            if (resultado.success) {
                const vendaData = resultado.data;
                
                mostrarMensagem(
                    `✅ Venda #${vendaData.numero_venda} finalizada com sucesso!\n` +
                    `Total: R$ ${formatarMoeda(total)}`,
                    "success",
                    5000
                );
                
                // Limpar carrinho
                this.carrinho = [];
                this.renderizarCarrinho();
                this.atualizarTotal();
                
                // Recarregar produtos (estoque atualizado)
                setTimeout(() => {
                    carregarProdutosParaVenda();
                }, 1500);
                
            } else {
                mostrarMensagem(`Erro ao finalizar venda: ${resultado.error}`, "error");
            }
            
        } catch (error) {
            console.error("❌ Erro ao finalizar venda:", error);
            mostrarMensagem(`Erro ao finalizar venda: ${error.message}`, "error");
        } finally {
            esconderLoading();
        }
    }
    
    // Obter nome da forma de pagamento
    obterNomeFormaPagamento(codigo) {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'pix': 'PIX'
        };
        return formas[codigo] || codigo;
    }
}

// ============================================
// 7. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    // Busca de produtos
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
    if (btnScan) {
        btnScan.addEventListener('click', function() {
            mostrarMensagem("Digite o código do produto na busca", "info");
        });
    }
    
    // Desconto
    if (descontoInput) {
        descontoInput.addEventListener('input', function() {
            vendaManager.desconto = parseFloat(this.value) || 0;
            if (vendaManager.desconto < 0) vendaManager.desconto = 0;
            if (vendaManager.desconto > 100) vendaManager.desconto = 100;
            this.value = vendaManager.desconto;
            vendaManager.atualizarTotal();
        });
    }
    
    // Limpar carrinho
    if (btnClearCart) {
        btnClearCart.addEventListener('click', () => vendaManager.limparCarrinho());
    }
    
    // Finalizar venda
    if (btnFinalizarVenda) {
        btnFinalizarVenda.addEventListener('click', () => vendaManager.finalizarVenda());
    }
    
    // Cancelar venda
    if (btnCancelarVenda) {
        btnCancelarVenda.addEventListener('click', function() {
            if (vendaManager.carrinho.length === 0 || confirm("Cancelar esta venda?")) {
                window.location.href = 'home.html';
            }
        });
    }
    
    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
    }
    
    // Botão voltar
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
    
    console.log("✅ Eventos configurados com sucesso");
}

// ============================================
// 8. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarContadorProdutos() {
    if (productCount) {
        productCount.textContent = `${produtosFiltrados.length} produto${produtosFiltrados.length !== 1 ? 's' : ''}`;
    }
}

function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

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
// 9. FUNÇÕES DE UI
// ============================================
function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail') || loading.querySelector('p');
        
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 4000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    // Configurar alerta
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Ícone
    const icon = alert.querySelector('.message-icon');
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    
    // Texto
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    // Botão fechar
    const closeBtn = alert.querySelector('.message-close');
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

// ============================================
// 10. INICIAR SISTEMA
// ============================================

// Criar instância do gerenciador de vendas
const vendaManager = new VendaManager();

// Disponibilizar globalmente para acesso do HTML
window.vendaManager = vendaManager;

console.log("✅ Sistema de vendas dinâmico completamente carregado!");
