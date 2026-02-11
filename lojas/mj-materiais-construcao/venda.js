// venda.js - SISTEMA DE VENDAS PDV MULTILOJA COM IMAGENS NO MODAL
console.log("🛒 Sistema PDV - Página de Vendas");

import { lojaServices } from './firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let vendaManager = {
    produtos: [],
    carrinho: [],
    subtotal: 0,
    total: 0,
    desconto: 0,
    formaPagamento: 'dinheiro',
    isLeitorConectado: false,
    configImpressora: null
};

// ============================================
// IMAGEM PLACEHOLDER BASE64 (80x80 otimizada)
// ============================================
function obterImagemPlaceholderBase64() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjFmM2Y1Ii8+CjxjaXJjbGUgY3g9IjQwIiBjeT0iMzIiIHI9IjE2IiBmaWxsPSIjZTBlMGUwIi8+CjxwYXRoIGQ9Ik0xMiA2NEwxNiA1MkwyNCA0MEwzMiA0OEw0OCAzMkw2NCA0OEw2OCA2NEgxMloiIGZpbGw9IiNlMGUwZTAiLz4KPHJlY3QgeD0iMjgiIHk9IjU2IiB3aWR0aD0iMjQiIGhlaWdodD0iOCIgZmlsbD0iI2QwZDBkMCIvPgo8dGV4dCB4PSI0MCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzhhOTRhMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U0VNIEZPVE88L3RleHQ+Cjwvc3ZnPg==';
}

// ============================================
// OBTER URL DA IMAGEM DO PRODUTO
// ============================================
function obterURLImagem(produto, tamanho = 'thumb') {
    if (!produto) return obterImagemPlaceholderBase64();
    
    // Verificar se tem imagens definidas
    if (!produto.imagens) {
        return obterImagemPlaceholderBase64();
    }
    
    const imagens = produto.imagens;
    
    // Se não tem URL principal, retorna placeholder
    if (!imagens.principal) {
        return obterImagemPlaceholderBase64();
    }
    
    // Verificar se a imagem é um arquivo (File)
    if (imagens.principal instanceof File) {
        try {
            return URL.createObjectURL(imagens.principal);
        } catch (e) {
            return obterImagemPlaceholderBase64();
        }
    }
    
    // Verificar se a URL é válida
    const url = imagens.principal;
    
    // Se for URL vazia ou string vazia
    if (!url || url === '' || url.includes('sem-foto.png') || url.includes('no-image')) {
        return obterImagemPlaceholderBase64();
    }
    
    // Escolher tamanho baseado no parâmetro
    try {
        switch(tamanho) {
            case 'thumb':
                return imagens.thumbnail && imagens.thumbnail !== '' 
                    ? imagens.thumbnail 
                    : (imagens.principal || obterImagemPlaceholderBase64());
            case 'medium':
                return imagens.medium && imagens.medium !== '' 
                    ? imagens.medium 
                    : (imagens.principal || obterImagemPlaceholderBase64());
            case 'large':
            case 'principal':
                return imagens.principal || obterImagemPlaceholderBase64();
            default:
                return imagens.principal || obterImagemPlaceholderBase64();
        }
    } catch (error) {
        console.error('Erro ao processar URL da imagem:', error);
        return obterImagemPlaceholderBase64();
    }
}

// ============================================
// RENDERIZAR RESULTADOS DA BUSCA COM IMAGENS
// ============================================
function renderizarResultadosBusca(produtos) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (!produtos || produtos.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2;"></i>
                <p style="margin-top: 15px; color: var(--gray-color);">
                    Nenhum produto encontrado
                </p>
                <small style="color: var(--gray-light);">
                    Tente outro termo de busca
                </small>
            </div>
        `;
        return;
    }
    
    let html = '<div class="results-list">';
    
    produtos.forEach(produto => {
        const imagemURL = obterURLImagem(produto, 'thumb');
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        const precoFormatado = formatarMoeda(produto.preco);
        const isPlaceholder = imagemURL.includes('data:image/svg+xml');
        
        html += `
            <div class="product-result" data-id="${produto.id}">
                <!-- CONTAINER DA IMAGEM -->
                <div class="product-image-container">
                    <img src="${imagemURL}" 
                         alt="${produto.nome}"
                         class="${isPlaceholder ? 'no-image' : ''}"
                         loading="lazy"
                         onerror="this.src='${obterImagemPlaceholderBase64()}'; this.classList.add('no-image');">
                </div>
                
                <!-- CONTEÚDO DO PRODUTO -->
                <div class="product-content">
                    <div class="product-result-header">
                        <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                        <span class="product-stock ${estoqueBaixo ? 'low' : 'normal'}">
                            ${produto.quantidade} ${produto.unidade_venda || produto.unidade || 'UN'}
                        </span>
                    </div>
                    
                    <div class="product-name" title="${produto.nome}">
                        ${produto.nome}
                    </div>
                    
                    <div class="product-category">
                        ${produto.categoria || 'Sem categoria'}
                    </div>
                    
                    <div class="product-details">
                        <div class="product-price">
                            <strong>Preço:</strong> ${precoFormatado}
                        </div>
                        
                        <div class="product-actions">
                            <button class="btn-action btn-info" 
                                    onclick="window.adicionarProdutoCarrinho('${produto.id}')">
                                <i class="fas fa-cart-plus"></i> Vender
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

// ============================================
// CONTROLE DO MODAL DE BUSCA
// ============================================
function abrirModalBusca() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'flex';
        
        setTimeout(() => {
            const input = document.getElementById('searchProductInput');
            if (input) {
                input.value = '';
                input.focus();
            }
        }, 100);
        
        renderizarResultadosBusca(vendaManager.produtos);
    }
}

function fecharModalBusca() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        modal.style.display = 'none';
        
        const input = document.getElementById('searchProductInput');
        if (input) input.value = '';
        
        const searchMain = document.getElementById('searchProduct');
        if (searchMain) searchMain.focus();
    }
}

function configurarModalBusca() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;
    
    // Botão fechar (X)
    const closeBtn = document.getElementById('closeSearchModal');
    if (closeBtn) closeBtn.addEventListener('click', fecharModalBusca);
    
    // Botão fechar do footer
    const closeFooterBtn = document.getElementById('btnCloseSearch');
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', fecharModalBusca);
    
    // Fechar ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === this) fecharModalBusca();
    });
    
    // Botão limpar busca
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            const input = document.getElementById('searchProductInput');
            if (input) {
                input.value = '';
                input.focus();
                renderizarResultadosBusca(vendaManager.produtos);
            }
        });
    }
    
    // Input de busca
    const searchInput = document.getElementById('searchProductInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const termo = this.value;
            if (!termo.trim()) {
                renderizarResultadosBusca(vendaManager.produtos);
                return;
            }
            
            const termoLower = termo.toLowerCase();
            const produtosFiltrados = vendaManager.produtos.filter(produto => 
                (produto.codigo && produto.codigo.toLowerCase().includes(termoLower)) ||
                (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
                (produto.categoria && produto.categoria.toLowerCase().includes(termoLower))
            );
            
            renderizarResultadosBusca(produtosFiltrados);
        });
    }
    
    // Filtros
    const filterBtns = modal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            let produtosFiltrados = [...vendaManager.produtos];
            
            if (filter === 'estoque') {
                produtosFiltrados = produtosFiltrados.filter(p => p.quantidade > 0);
            } else if (filter === 'baixo') {
                produtosFiltrados = produtosFiltrados.filter(p => 
                    p.quantidade > 0 && p.quantidade <= (p.estoque_minimo || 5)
                );
            }
            
            const searchInput = document.getElementById('searchProductInput');
            if (searchInput && searchInput.value.trim()) {
                const termo = searchInput.value.toLowerCase();
                produtosFiltrados = produtosFiltrados.filter(p => 
                    (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
                    (p.nome && p.nome.toLowerCase().includes(termo)) ||
                    (p.categoria && p.categoria.toLowerCase().includes(termo))
                );
            }
            
            renderizarResultadosBusca(produtosFiltrados);
        });
    });
}

// ============================================
// ADICIONAR PRODUTO AO CARRINHO (GLOBAL)
// ============================================
window.adicionarProdutoCarrinho = function(produtoId) {
    const produto = vendaManager.produtos.find(p => p.id === produtoId);
    if (produto) {
        if (produto.quantidade <= 0) {
            mostrarMensagem('Produto sem estoque disponível', 'warning');
            return;
        }
        abrirModalQuantidade(produto, 1);
        fecharModalBusca();
    }
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página de vendas carregada");
    
    try {
        mostrarLoading('Inicializando PDV...');
        
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaServices.lojaId}`);
        
        atualizarInterfaceLoja();
        configurarEventos();
        configurarModalBusca();
        verificarLeitorCodigoBarras();
        await carregarConfigImpressora();
        await carregarProdutos();
        verificarProdutoPreSelecionado();
        
        esconderLoading();
        console.log("✅ PDV pronto para vendas");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de vendas', 'error');
        esconderLoading();
    }
});

// ============================================
// ATUALIZAR INTERFACE DA LOJA
// ============================================
function atualizarInterfaceLoja() {
    try {
        const nomeLoja = lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const lojaElement = document.getElementById('nomeLoja');
        const footerLojaElement = document.getElementById('footerLojaNome');
        if (lojaElement) lojaElement.textContent = nomeLoja;
        if (footerLojaElement) footerLojaElement.textContent = nomeLoja;
        
        const userElement = document.getElementById('userName');
        if (userElement && lojaServices.nomeUsuario) userElement.textContent = lojaServices.nomeUsuario;
        
        atualizarDataHora();
        setInterval(atualizarDataHora, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface:', error);
    }
}

function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    elemento.textContent = agora.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            if (vendaManager.carrinho.length > 0) {
                if (!confirm('Há itens no carrinho. Deseja realmente voltar?')) e.preventDefault();
            }
        });
    }
    
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja sair do sistema?")) lojaServices.logout();
        });
    }
    
    // Busca de produtos
    const searchInput = document.getElementById('searchProduct');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const termo = this.value;
            if (!termo.trim()) {
                exibirProdutos(vendaManager.produtos);
            } else {
                const termoLower = termo.toLowerCase();
                const produtosFiltrados = vendaManager.produtos.filter(produto => 
                    (produto.codigo && produto.codigo.toLowerCase().includes(termoLower)) ||
                    (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
                    (produto.categoria && produto.categoria.toLowerCase().includes(termoLower))
                );
                exibirProdutos(produtosFiltrados);
                atualizarContadorProdutos(produtosFiltrados.length);
            }
        });
        
        // Duplo clique abre modal de busca
        searchInput.addEventListener('dblclick', abrirModalBusca);
    }
    
    // Botão scan
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', abrirModalBusca);
    }
    
    // Botão limpar carrinho
    const btnClearCart = document.getElementById('btnClearCart');
    if (btnClearCart) {
        btnClearCart.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0 && confirm('Tem certeza que deseja limpar o carrinho?')) {
                limparCarrinho();
            }
        });
    }
    
    // Desconto
    const descontoInput = document.getElementById('desconto');
    if (descontoInput) {
        descontoInput.addEventListener('change', function() {
            vendaManager.desconto = parseFloat(this.value) || 0;
            atualizarTotais();
        });
    }
    
    // Forma de pagamento
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            vendaManager.formaPagamento = this.value;
        });
    });
    
    // Botão finalizar venda
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', finalizarVenda);
    }
    
    // Botão cancelar venda
    const btnCancelar = document.getElementById('btnCancelarVenda');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0) {
                if (confirm('Cancelar a venda atual?')) limparCarrinho();
            }
        });
    }
}

// ============================================
// CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...');
        
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            vendaManager.produtos = resultado.data;
            exibirProdutos(vendaManager.produtos);
            atualizarContadorProdutos(vendaManager.produtos.length);
            console.log(`✅ ${vendaManager.produtos.length} produtos carregados`);
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            vendaManager.produtos = [];
            exibirProdutos([]);
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        vendaManager.produtos = [];
        exibirProdutos([]);
    } finally {
        esconderLoading();
    }
}

// ============================================
// EXIBIR PRODUTOS NA GRID
// ============================================
function exibirProdutos(produtos) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (!produtos || produtos.length === 0) {
        document.getElementById('loadingProducts').style.display = 'none';
        document.getElementById('emptyProducts').style.display = 'flex';
        return;
    }
    
    document.getElementById('loadingProducts').style.display = 'none';
    document.getElementById('emptyProducts').style.display = 'none';
    
    let html = '';
    produtos.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        const precoFormatado = formatarMoeda(produto.preco);
        const imagemURL = obterURLImagem(produto, 'thumb');
        const isPlaceholder = imagemURL.includes('data:image/svg+xml');
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" 
                 onclick="window.adicionarProdutoCarrinho('${produto.id}')">
                
                <div class="product-image">
                    <img src="${imagemURL}" 
                         alt="${produto.nome}"
                         class="${isPlaceholder ? 'no-image' : 'has-image'}"
                         onerror="this.src='${obterImagemPlaceholderBase64()}'; this.classList.add('no-image');">
                </div>
                
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade_venda || produto.unidade || 'UN'}
                    </span>
                </div>
                
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                
                <div class="product-footer">
                    <span class="product-price">${precoFormatado}</span>
                    <button class="btn-add-product" 
                            onclick="event.stopPropagation(); window.adicionarProdutoCarrinho('${produto.id}')"
                            ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
}

function atualizarContadorProdutos(total) {
    const countElement = document.getElementById('productCount');
    if (countElement) countElement.textContent = `${total} produto${total !== 1 ? 's' : ''}`;
}

function verificarProdutoPreSelecionado() {
    const produtoId = sessionStorage.getItem('produto_selecionado_venda');
    if (produtoId) {
        setTimeout(() => {
            window.adicionarProdutoCarrinho(produtoId);
            sessionStorage.removeItem('produto_selecionado_venda');
        }, 500);
    }
}

// ============================================
// MODAL DE QUANTIDADE
// ============================================
function abrirModalQuantidade(produto, quantidadeAtual = 1) {
    const maxQuantidade = produto.quantidade;
    
    const modalHTML = `
        <div id="quantidadeModal" class="modal modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-cart-plus"></i> Adicionar ao Carrinho</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="product-info">
                        <h4>${produto.nome}</h4>
                        <p>Código: ${produto.codigo || 'N/A'}</p>
                        <p>Estoque: ${produto.quantidade} ${produto.unidade_venda || produto.unidade || 'UN'}</p>
                        <p>Preço: ${formatarMoeda(produto.preco)}</p>
                    </div>
                    
                    <div class="quantity-control">
                        <label for="quantidade">Quantidade:</label>
                        <div class="quantity-input">
                            <button class="qty-btn" onclick="alterarQuantidadeModal(-1, ${maxQuantidade})">-</button>
                            <input type="number" id="quantidade" value="${quantidadeAtual}" min="1" max="${maxQuantidade}" step="1">
                            <button class="qty-btn" onclick="alterarQuantidadeModal(1, ${maxQuantidade})">+</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btnCancelQuantidade" class="btn-cancel">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button id="btnAddQuantidade" class="btn-add">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('quantidadeModal');
    const quantidadeInput = modal.querySelector('#quantidade');
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#btnCancelQuantidade').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#btnAddQuantidade').addEventListener('click', () => {
        const quantidade = parseInt(quantidadeInput.value) || 1;
        adicionarAoCarrinho(produto, quantidade);
        modal.remove();
    });
    
    quantidadeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const quantidade = parseInt(this.value) || 1;
            adicionarAoCarrinho(produto, quantidade);
            modal.remove();
        }
    });
    
    quantidadeInput.addEventListener('change', function() {
        let valor = parseInt(this.value) || 1;
        if (valor < 1) valor = 1;
        if (valor > maxQuantidade) valor = maxQuantidade;
        this.value = valor;
    });
    
    modal.style.display = 'flex';
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
    
    setTimeout(() => quantidadeInput.select(), 100);
}

window.alterarQuantidadeModal = function(mudanca, maximo) {
    const input = document.getElementById('quantidade');
    if (!input) return;
    
    let valor = parseInt(input.value) || 1;
    valor += mudanca;
    
    if (valor < 1) valor = 1;
    if (valor > maximo) valor = maximo;
    
    input.value = valor;
};

// ============================================
// CARRINHO DE COMPRAS
// ============================================
function adicionarAoCarrinho(produto, quantidade) {
    if (quantidade <= 0) {
        mostrarMensagem('Quantidade inválida', 'error');
        return;
    }
    
    if (quantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    const index = vendaManager.carrinho.findIndex(item => item.id === produto.id);
    
    if (index !== -1) {
        vendaManager.carrinho[index].quantidade += quantidade;
        vendaManager.carrinho[index].subtotal = vendaManager.carrinho[index].quantidade * vendaManager.carrinho[index].preco_unitario;
    } else {
        vendaManager.carrinho.push({
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade,
            unidade: produto.unidade_venda || produto.unidade || 'UN'
        });
    }
    
    atualizarCarrinho();
    atualizarTotais();
    
    mostrarMensagem(`${quantidade}x ${produto.nome} adicionado ao carrinho`, 'success');
}

function atualizarCarrinho() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    
    if (vendaManager.carrinho.length === 0) {
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
    
    vendaManager.carrinho.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>Código: ${item.codigo || 'N/A'}</span>
                        <span>Preço: ${formatarMoeda(item.preco_unitario)}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="alterarQuantidadeCarrinho(${index}, -1)">-</button>
                        <input type="number" class="qty-input" value="${item.quantidade}" 
                               min="1" max="999" onchange="atualizarQuantidadeCarrinho(${index}, this.value)">
                        <button class="qty-btn" onclick="alterarQuantidadeCarrinho(${index}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">${formatarMoeda(item.subtotal)}</div>
                    <button class="btn-remove-item" onclick="removerDoCarrinho(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

window.alterarQuantidadeCarrinho = function(index, mudanca) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    const produto = vendaManager.produtos.find(p => p.id === item.id);
    if (!produto) return;
    
    const novaQuantidade = item.quantidade + mudanca;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    vendaManager.carrinho[index].quantidade = novaQuantidade;
    vendaManager.carrinho[index].subtotal = novaQuantidade * item.preco_unitario;
    
    atualizarCarrinho();
    atualizarTotais();
};

window.atualizarQuantidadeCarrinho = function(index, valor) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    const produto = vendaManager.produtos.find(p => p.id === item.id);
    if (!produto) return;
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        vendaManager.carrinho[index].quantidade = 1;
    } else {
        vendaManager.carrinho[index].quantidade = novaQuantidade;
    }
    
    vendaManager.carrinho[index].subtotal = vendaManager.carrinho[index].quantidade * item.preco_unitario;
    
    atualizarCarrinho();
    atualizarTotais();
};

window.removerDoCarrinho = function(index) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    if (confirm(`Remover ${item.nome} do carrinho?`)) {
        vendaManager.carrinho.splice(index, 1);
        atualizarCarrinho();
        atualizarTotais();
        mostrarMensagem('Item removido do carrinho', 'info');
    }
};

function limparCarrinho() {
    vendaManager.carrinho = [];
    vendaManager.subtotal = 0;
    vendaManager.total = 0;
    vendaManager.desconto = 0;
    
    atualizarCarrinho();
    atualizarTotais();
    
    const descontoInput = document.getElementById('desconto');
    if (descontoInput) descontoInput.value = 0;
    
    mostrarMensagem('Carrinho limpo', 'info');
}

function atualizarTotais() {
    vendaManager.subtotal = vendaManager.carrinho.reduce((total, item) => total + item.subtotal, 0);
    const valorDesconto = vendaManager.subtotal * (vendaManager.desconto / 100);
    vendaManager.total = vendaManager.subtotal - valorDesconto;
    
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');
    if (subtotalElement) subtotalElement.textContent = formatarMoeda(vendaManager.subtotal);
    if (totalElement) totalElement.textContent = formatarMoeda(vendaManager.total);
    
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    if (btnFinalizar) {
        btnFinalizar.disabled = vendaManager.carrinho.length === 0;
    }
}

// ============================================
// FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho primeiro', 'warning');
        return;
    }
    
    if (!confirm(`Finalizar venda no valor de ${formatarMoeda(vendaManager.total)}?`)) return;
    
    try {
        mostrarLoading('Processando venda...');
        
        const vendaData = {
            itens: vendaManager.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal
            })),
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            valor_desconto: vendaManager.subtotal * (vendaManager.desconto / 100),
            total: vendaManager.total,
            forma_pagamento: vendaManager.formaPagamento,
            vendedor_id: lojaServices.usuarioId,
            vendedor_nome: lojaServices.nomeUsuario,
            data_venda: new Date(),
            status: 'concluida'
        };
        
        const resultado = await lojaServices.registrarVenda(vendaData);
        
        if (resultado.success) {
            await atualizarEstoqueProdutos();
            
            mostrarMensagem(`Venda finalizada! Total: ${formatarMoeda(vendaManager.total)}`, 'success');
            
            setTimeout(() => {
                limparCarrinho();
                document.getElementById('searchProduct')?.focus();
            }, 2000);
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        mostrarMensagem('Erro ao finalizar venda: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

async function atualizarEstoqueProdutos() {
    try {
        for (const item of vendaManager.carrinho) {
            const produto = vendaManager.produtos.find(p => p.id === item.id);
            if (produto) {
                await lojaServices.atualizarEstoqueProduto(
                    item.id, 
                    produto.quantidade - item.quantidade
                );
            }
        }
        await carregarProdutos();
    } catch (error) {
        console.error('❌ Erro ao atualizar estoque:', error);
        throw error;
    }
}

// ============================================
// LEITOR DE CÓDIGO DE BARRAS
// ============================================
async function verificarLeitorCodigoBarras() {
    try {
        if ('usb' in navigator) {
            const dispositivos = await navigator.usb.getDevices();
            vendaManager.isLeitorConectado = dispositivos.some(d => 
                d.vendorId === 0x067b || d.vendorId === 0x0403 ||
                d.productName?.toLowerCase().includes('barcode') ||
                d.productName?.toLowerCase().includes('scanner')
            );
        }
        
        const btnScan = document.getElementById('btnScan');
        if (btnScan) {
            btnScan.title = vendaManager.isLeitorConectado 
                ? "Leitor conectado. Clique para buscar produtos"
                : "Leitor não detectado. Clique para buscar produtos manualmente";
        }
    } catch (error) {
        console.error('❌ Erro ao verificar leitor:', error);
        vendaManager.isLeitorConectado = false;
    }
}

// ============================================
// IMPRESSÃO (BÁSICO)
// ============================================
async function carregarConfigImpressora() {
    try {
        const configSalva = localStorage.getItem(`impressora_config_${lojaServices.lojaId}`);
        vendaManager.configImpressora = configSalva ? JSON.parse(configSalva) : null;
        
        const btnImprimir = document.getElementById('btnImprimirNota');
        if (btnImprimir) {
            btnImprimir.disabled = !vendaManager.configImpressora;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configuração da impressora:', error);
        vendaManager.configImpressora = null;
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL',
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail');
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info', tempo = 4000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    const closeBtn = alert.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.onclick = () => alert.style.display = 'none';
    }
    
    setTimeout(() => {
        if (alert.style.display === 'block') alert.style.display = 'none';
    }, tempo);
}

console.log("✅ Sistema de vendas PDV com imagens carregado!");


// ============================================
// CLASSE: ServicosAvancadosPDV
// ============================================
// Funcionalidades avançadas para o PDV:
// - Impressão de notas fiscais
// - Leitor de código de barras (USB, Bluetooth, Serial)
// - Configuração de impressora
// - Modo scan avançado
// ============================================

class ServicosAvancadosPDV {
    constructor(vendaManager) {
        this.vendaManager = vendaManager;
        this.isLeitorConectado = false;
        this.modoScanAtivo = false;
        this.bufferScan = '';
        this.scanTimer = null;
        this.configImpressora = null;
    }

    // ========================================
    // 1. IMPRESSÃO DE NOTA FISCAL
    // ========================================

    async carregarConfigImpressora(lojaId) {
        try {
            const configSalva = localStorage.getItem(`impressora_config_${lojaId}`);
            if (configSalva) {
                this.configImpressora = JSON.parse(configSalva);
                this.vendaManager.configImpressora = this.configImpressora;
            } else {
                // Configuração padrão
                this.configImpressora = {
                    tipo: 'usb',
                    modelo: 'epson',
                    largura: 80,
                    cortarAutomatico: true,
                    abrirGaveta: false,
                    imprimirLogo: true
                };
                this.vendaManager.configImpressora = this.configImpressora;
            }
            
            this.atualizarBotaoImpressao();
            return { success: true, config: this.configImpressora };
            
        } catch (error) {
            console.error('❌ Erro ao carregar config impressora:', error);
            return { success: false, error: error.message };
        }
    }

    atualizarBotaoImpressao() {
        const btnImprimir = document.getElementById('btnImprimirNota');
        if (btnImprimir) {
            btnImprimir.disabled = !this.configImpressora;
            btnImprimir.title = this.configImpressora ? 
                `Impressora: ${this.configImpressora.modelo.toUpperCase()}` :
                'Configure a impressora primeiro';
        }
    }

    async imprimirNotaFiscal(carrinho, subtotal, total, desconto, formaPagamento, lojaServices) {
        if (!this.configImpressora) {
            this.mostrarModalConfigImpressora();
            return;
        }
        
        if (!carrinho || carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho para imprimir', 'warning');
            return;
        }
        
        try {
            mostrarLoading('Preparando impressão...', 'Gerando nota fiscal...');
            
            const conteudoNota = this.gerarConteudoNotaFiscal(carrinho, subtotal, total, desconto, formaPagamento, lojaServices);
            
            switch (this.configImpressora.tipo) {
                case 'usb': await this.imprimirViaUSB(conteudoNota); break;
                case 'bluetooth': await this.imprimirViaBluetooth(conteudoNota); break;
                case 'serial': await this.imprimirViaSerial(conteudoNota); break;
                case 'rede': await this.imprimirViaRede(conteudoNota); break;
                case 'nuvem': await this.imprimirViaNuvem(conteudoNota); break;
                default: this.imprimirNoNavegador(conteudoNota); break;
            }
            
            esconderLoading();
            mostrarMensagem('Nota fiscal impressa com sucesso!', 'success');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao imprimir:', error);
            esconderLoading();
            mostrarMensagem('Erro ao imprimir nota fiscal', 'error');
            return { success: false, error: error.message };
        }
    }

    gerarConteudoNotaFiscal(carrinho, subtotal, total, desconto, formaPagamento, lojaServices) {
        const config = this.configImpressora;
        const largura = config.largura || 48;
        const nomeLoja = lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const dataHora = new Date().toLocaleString('pt-BR');
        const numeroVenda = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const vendedor = lojaServices.nomeUsuario || 'Vendedor';
        
        let conteudo = '';
        
        // Cabeçalho
        conteudo += '='.repeat(largura) + '\n';
        conteudo += nomeLoja.padStart((largura + nomeLoja.length) / 2).trim() + '\n';
        conteudo += 'PDV - SISTEMA DE VENDAS\n';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += `Data: ${dataHora}\n`;
        conteudo += `Venda: #${numeroVenda}\n`;
        conteudo += `Vendedor: ${vendedor}\n`;
        conteudo += '-'.repeat(largura) + '\n';
        conteudo += 'PRODUTOS\n';
        conteudo += '-'.repeat(largura) + '\n';
        
        // Itens
        carrinho.forEach(item => {
            const nome = item.nome.length > 30 ? item.nome.substring(0, 27) + '...' : item.nome;
            conteudo += `${nome}\n`;
            conteudo += `  ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}\n`;
        });
        
        // Totais
        conteudo += '-'.repeat(largura) + '\n';
        conteudo += `Subtotal: ${' '.repeat(largura - 20)}${formatarMoeda(subtotal)}\n`;
        conteudo += `Desconto: ${' '.repeat(largura - 20)}${formatarMoeda(subtotal * (desconto / 100))}\n`;
        conteudo += `TOTAL: ${' '.repeat(largura - 20)}${formatarMoeda(total)}\n`;
        conteudo += `Pagamento: ${formaPagamento.replace('_', ' ').toUpperCase()}\n`;
        conteudo += '-'.repeat(largura) + '\n';
        conteudo += 'Obrigado pela preferência!\n';
        conteudo += 'Volte sempre!\n';
        conteudo += '*'.repeat(largura) + '\n';
        
        // Comandos específicos da impressora
        if (config.modelo === 'epson') {
            conteudo += '\x1B\x40'; // Inicializar
            if (config.cortarAutomatico) conteudo += '\x1D\x56\x41\x03'; // Cortar papel
            if (config.abrirGaveta) conteudo += '\x1B\x70\x00\x19\x19'; // Abrir gaveta
        }
        
        return conteudo;
    }

    async imprimirViaUSB(conteudo) {
        try {
            if ('usb' in navigator) {
                const device = await navigator.usb.requestDevice({
                    filters: [
                        { vendorId: 0x04b8 }, // Epson
                        { vendorId: 0x067b }, // Prolific
                        { vendorId: 0x0403 }  // FTDI
                    ]
                });
                
                await device.open();
                await device.selectConfiguration(1);
                await device.claimInterface(0);
                
                const encoder = new TextEncoder();
                const data = encoder.encode(conteudo);
                
                await device.transferOut(1, data);
                await device.close();
                
                return true;
            }
            throw new Error('WebUSB não suportado neste navegador');
        } catch (error) {
            console.error('Erro impressão USB:', error);
            throw error;
        }
    }

    async imprimirViaBluetooth(conteudo) {
        try {
            if ('bluetooth' in navigator) {
                const device = await navigator.bluetooth.requestDevice({
                    filters: [
                        { namePrefix: 'Printer' },
                        { namePrefix: 'EPSON' },
                        { namePrefix: 'Bematech' },
                        { namePrefix: 'Elgin' }
                    ],
                    optionalServices: ['generic_access', '000018f0-0000-1000-8000-00805f9b34fb']
                });
                
                const server = await device.gatt.connect();
                const service = await server.getPrimaryService('generic_access');
                const characteristic = await service.getCharacteristic('device_name');
                
                const encoder = new TextEncoder();
                const data = encoder.encode(conteudo);
                
                await characteristic.writeValue(data);
                
                return true;
            }
            throw new Error('Web Bluetooth não suportado neste navegador');
        } catch (error) {
            console.error('Erro impressão Bluetooth:', error);
            throw error;
        }
    }

    async imprimirViaSerial(conteudo) {
        try {
            if ('serial' in navigator) {
                const port = await navigator.serial.requestPort();
                await port.open({ baudRate: 9600 });
                
                const encoder = new TextEncoder();
                const writer = port.writable.getWriter();
                const data = encoder.encode(conteudo);
                
                await writer.write(data);
                writer.releaseLock();
                await port.close();
                
                return true;
            }
            throw new Error('Web Serial não suportado neste navegador');
        } catch (error) {
            console.error('Erro impressão Serial:', error);
            throw error;
        }
    }

    async imprimirViaRede(conteudo) {
        try {
            const endereco = this.configImpressora.endereco || '192.168.1.100';
            const porta = this.configImpressora.porta || 9100;
            
            // Simulação de impressão em rede
            console.log(`📡 Enviando para impressora em ${endereco}:${porta}`);
            console.log('📄 Conteúdo da nota:', conteudo);
            
            mostrarMensagem('Impressão em rede simulada', 'info');
            return true;
            
        } catch (error) {
            console.error('Erro impressão em rede:', error);
            throw error;
        }
    }

    async imprimirViaNuvem(conteudo) {
        try {
            const apiKey = this.configImpressora.apiKey || '';
            const printerId = this.configImpressora.printerId || '';
            
            // Aqui você integraria com Google Cloud Print, etc.
            console.log('☁️ Enviando para impressora na nuvem');
            console.log('📄 Conteúdo da nota:', conteudo);
            
            mostrarMensagem('Impressão em nuvem simulada', 'info');
            return true;
            
        } catch (error) {
            console.error('Erro impressão em nuvem:', error);
            throw error;
        }
    }

    imprimirNoNavegador(conteudo) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Nota Fiscal</title>
                    <style>
                        body {
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            line-height: 1.2;
                            margin: 0;
                            padding: 10px;
                            width: ${this.configImpressora.largura * 6}px;
                        }
                        .nota-fiscal {
                            white-space: pre;
                            word-wrap: break-word;
                        }
                        @media print {
                            body { margin: 0; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <pre class="nota-fiscal">${conteudo}</pre>
                    <button onclick="window.print()">Imprimir</button>
                    <button onclick="window.close()">Fechar</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    mostrarModalConfigImpressora() {
        const modalHTML = `
            <div id="impressoraConfigModal" class="modal modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-print"></i> Configurar Impressora</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="printer-config">
                            <div class="config-group">
                                <label>Tipo de Conexão:</label>
                                <select id="tipoImpressora">
                                    <option value="usb">USB</option>
                                    <option value="bluetooth">Bluetooth</option>
                                    <option value="serial">Serial (COM)</option>
                                    <option value="rede">Rede</option>
                                    <option value="nuvem">Impressora na Nuvem</option>
                                </select>
                            </div>
                            
                            <div class="config-group">
                                <label>Modelo da Impressora:</label>
                                <select id="modeloImpressora">
                                    <option value="epson">Epson TM-T20/T81</option>
                                    <option value="bematech">Bematech MP-4200 TH</option>
                                    <option value="daruma">Daruma DR700</option>
                                    <option value="elgin">Elgin i9</option>
                                    <option value="sweda">Sweda SI-300</option>
                                    <option value="outro">Outro Modelo</option>
                                </select>
                            </div>
                            
                            <div class="config-group">
                                <label>Largura da Nota (colunas):</label>
                                <input type="number" id="larguraImpressora" min="40" max="120" value="80">
                            </div>
                            
                            <div class="config-options">
                                <label>
                                    <input type="checkbox" id="cortarAutomatico" checked>
                                    Cortar papel automaticamente
                                </label>
                                <label>
                                    <input type="checkbox" id="abrirGaveta">
                                    Abrir gaveta de dinheiro
                                </label>
                                <label>
                                    <input type="checkbox" id="imprimirLogo" checked>
                                    Imprimir logo da loja
                                </label>
                            </div>
                            
                            <div class="config-group">
                                <label>Endereço/Porta (se necessário):</label>
                                <input type="text" id="enderecoImpressora" placeholder="Ex: COM3, 192.168.1.100, 00:11:22:33:44:55">
                            </div>
                            
                            <div class="config-actions">
                                <button id="btnTestImpressora" class="btn-test">
                                    <i class="fas fa-print"></i> Testar Impressão
                                </button>
                                <button id="btnSalvarImpressora" class="btn-save">
                                    <i class="fas fa-save"></i> Salvar Configuração
                                </button>
                                <button id="btnCancelImpressora" class="btn-cancel">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.getElementById('impressoraConfigModal');
        const config = this.configImpressora || {};
        
        // Preencher valores atuais
        if (config.tipo) document.getElementById('tipoImpressora').value = config.tipo;
        if (config.modelo) document.getElementById('modeloImpressora').value = config.modelo;
        if (config.largura) document.getElementById('larguraImpressora').value = config.largura;
        if (config.endereco) document.getElementById('enderecoImpressora').value = config.endereco;
        
        document.getElementById('cortarAutomatico').checked = config.cortarAutomatico !== false;
        document.getElementById('abrirGaveta').checked = config.abrirGaveta === true;
        document.getElementById('imprimirLogo').checked = config.imprimirLogo !== false;
        
        // Eventos
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#btnCancelImpressora').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#btnSalvarImpressora').addEventListener('click', () => {
            const novaConfig = {
                tipo: document.getElementById('tipoImpressora').value,
                modelo: document.getElementById('modeloImpressora').value,
                largura: parseInt(document.getElementById('larguraImpressora').value) || 80,
                endereco: document.getElementById('enderecoImpressora').value,
                cortarAutomatico: document.getElementById('cortarAutomatico').checked,
                abrirGaveta: document.getElementById('abrirGaveta').checked,
                imprimirLogo: document.getElementById('imprimirLogo').checked
            };
            
            this.configImpressora = novaConfig;
            this.vendaManager.configImpressora = novaConfig;
            localStorage.setItem(`impressora_config_${lojaServices.lojaId}`, JSON.stringify(novaConfig));
            
            this.atualizarBotaoImpressao();
            mostrarMensagem('Configuração da impressora salva!', 'success');
            modal.remove();
        });
        
        modal.querySelector('#btnTestImpressora').addEventListener('click', () => {
            this.testarImpressao();
        });
        
        modal.style.display = 'flex';
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) modal.remove();
        });
    }

    async testarImpressao() {
        try {
            const conteudoTeste = 
                '='.repeat(48) + '\n' +
                'TESTE DE IMPRESSORA\n' +
                '='.repeat(48) + '\n' +
                'Data: ' + new Date().toLocaleString('pt-BR') + '\n' +
                'Loja: ' + lojaServices.lojaId + '\n' +
                '='.repeat(48) + '\n' +
                'Esta é uma página de teste.\n' +
                'Se esta mensagem apareceu,\n' +
                'sua impressora está configurada\n' +
                'corretamente.\n' +
                '='.repeat(48) + '\n';
            
            await this.imprimirViaUSB(conteudoTeste);
            mostrarMensagem('Teste de impressão enviado!', 'success');
            
        } catch (error) {
            mostrarMensagem('Erro no teste de impressão', 'error');
        }
    }

    // ========================================
    // 2. LEITOR DE CÓDIGO DE BARRAS AVANÇADO
    // ========================================

    async verificarLeitorCodigoBarras() {
        try {
            let conectado = false;
            
            if ('usb' in navigator) {
                const dispositivos = await navigator.usb.getDevices();
                conectado = dispositivos.some(d => 
                    d.vendorId === 0x067b || 
                    d.vendorId === 0x0403 || 
                    d.productName?.toLowerCase().includes('barcode') ||
                    d.productName?.toLowerCase().includes('scanner')
                );
            }
            
            if ('serial' in navigator && !conectado) {
                try {
                    const port = await navigator.serial.getPorts();
                    conectado = port.length > 0;
                } catch (e) {}
            }
            
            this.isLeitorConectado = conectado;
            this.vendaManager.isLeitorConectado = conectado;
            
            this.atualizarBotaoScan();
            
            return { success: true, conectado };
            
        } catch (error) {
            console.error('❌ Erro ao verificar leitor:', error);
            this.isLeitorConectado = false;
            return { success: false, error: error.message };
        }
    }

    atualizarBotaoScan() {
        const btnScan = document.getElementById('btnScan');
        if (btnScan) {
            if (this.isLeitorConectado) {
                btnScan.title = "Leitor de código de barras conectado. Clique para ativar modo scan.";
                btnScan.style.background = 'linear-gradient(135deg, #27ae60, #219653)';
            } else {
                btnScan.title = "Leitor de código de barras não detectado. Clique para configurar.";
                btnScan.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            }
        }
    }

    ativarModoScan() {
        this.modoScanAtivo = !this.modoScanAtivo;
        this.bufferScan = '';
        
        const btnScan = document.getElementById('btnScan');
        const searchInput = document.getElementById('searchProduct');
        
        if (this.modoScanAtivo) {
            btnScan.innerHTML = '<i class="fas fa-stop-circle"></i> Parar Scan';
            btnScan.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            searchInput.placeholder = "MODO SCAN ATIVO - Aponte o leitor...";
            searchInput.disabled = true;
            
            mostrarMensagem('Modo scan ativado. Aponte o leitor de código de barras.', 'info');
        } else {
            btnScan.innerHTML = '<i class="fas fa-barcode"></i> Escanear';
            btnScan.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
            searchInput.placeholder = "Buscar produto por código ou nome...";
            searchInput.disabled = false;
            searchInput.focus();
        }
    }

    processarCodigoBarras(produtos, callback) {
        if (!this.bufferScan || this.bufferScan.length < 3) {
            this.bufferScan = '';
            return;
        }
        
        const codigo = this.bufferScan.trim();
        this.bufferScan = '';
        
        console.log(`📷 Código de barras lido: ${codigo}`);
        
        const produto = produtos.find(p => 
            p.codigo === codigo || 
            p.id === codigo ||
            (p.codigo_barras && p.codigo_barras === codigo)
        );
        
        if (produto && callback) {
            callback(produto);
        } else {
            mostrarMensagem('Produto não encontrado com este código', 'error');
        }
    }

    iniciarEscutaTeclado() {
        document.addEventListener('keydown', (e) => {
            if (this.modoScanAtivo && e.key !== 'Enter') {
                this.bufferScan += e.key;
                clearTimeout(this.scanTimer);
                this.scanTimer = setTimeout(() => {
                    this.processarCodigoBarras(this.vendaManager.produtos, (produto) => {
                        if (produto.quantidade > 0) {
                            window.adicionarProdutoCarrinho(produto.id);
                        } else {
                            mostrarMensagem('Produto sem estoque', 'warning');
                        }
                    });
                }, 100);
            }
        });
    }

    mostrarModalConfigLeitor() {
        const modalHTML = `
            <div id="leitorConfigModal" class="modal">
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h3><i class="fas fa-barcode"></i> Configurar Leitor</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Leitor de código de barras não detectado automaticamente.</p>
                        <p>Opções de conexão:</p>
                        <div class="config-options" style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
                            <button id="btnConfigUSB" class="btn-action" style="padding: 10px; background: var(--secondary-color); color: white; border: none; border-radius: 6px;">
                                <i class="fas fa-usb"></i> Conectar via USB
                            </button>
                            <button id="btnConfigBluetooth" class="btn-action" style="padding: 10px; background: var(--info-color); color: white; border: none; border-radius: 6px;">
                                <i class="fas fa-bluetooth"></i> Conectar via Bluetooth
                            </button>
                            <button id="btnConfigSerial" class="btn-action" style="padding: 10px; background: var(--warning-color); color: white; border: none; border-radius: 6px;">
                                <i class="fas fa-plug"></i> Conectar via Serial (COM)
                            </button>
                            <button id="btnConfigManual" class="btn-action" style="padding: 10px; background: var(--success-color); color: white; border: none; border-radius: 6px;">
                                <i class="fas fa-keyboard"></i> Modo Manual (Teclado)
                            </button>
                        </div>
                        <p class="help-text">
                            <small>
                                <i class="fas fa-info-circle"></i>
                                No modo manual, o sistema irá detectar automaticamente a entrada rápida do teclado.
                            </small>
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button id="btnCancelConfig" class="btn-cancel">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.getElementById('leitorConfigModal');
        
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#btnCancelConfig').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#btnConfigUSB').addEventListener('click', async () => {
            try {
                if ('usb' in navigator) {
                    const device = await navigator.usb.requestDevice({
                        filters: [{ vendorId: 0x067b }, { vendorId: 0x0403 }]
                    });
                    this.isLeitorConectado = true;
                    this.atualizarBotaoScan();
                    mostrarMensagem('Leitor USB configurado com sucesso!', 'success');
                    modal.remove();
                } else {
                    mostrarMensagem('API WebUSB não suportada', 'error');
                }
            } catch (error) {
                console.error('Erro ao configurar USB:', error);
                mostrarMensagem('Erro ao configurar leitor USB', 'error');
            }
        });
        
        modal.querySelector('#btnConfigBluetooth').addEventListener('click', async () => {
            try {
                if ('bluetooth' in navigator) {
                    const device = await navigator.bluetooth.requestDevice({
                        filters: [{ namePrefix: 'Barcode' }, { namePrefix: 'Scanner' }]
                    });
                    this.isLeitorConectado = true;
                    this.atualizarBotaoScan();
                    mostrarMensagem('Leitor Bluetooth configurado!', 'success');
                    modal.remove();
                } else {
                    mostrarMensagem('API Bluetooth não suportada', 'error');
                }
            } catch (error) {
                console.error('Erro ao configurar Bluetooth:', error);
                mostrarMensagem('Erro ao configurar leitor Bluetooth', 'error');
            }
        });
        
        modal.querySelector('#btnConfigSerial').addEventListener('click', async () => {
            try {
                if ('serial' in navigator) {
                    const port = await navigator.serial.requestPort();
                    this.isLeitorConectado = true;
                    this.atualizarBotaoScan();
                    mostrarMensagem('Leitor Serial configurado!', 'success');
                    modal.remove();
                } else {
                    mostrarMensagem('API Serial não suportada', 'error');
                }
            } catch (error) {
                console.error('Erro ao configurar Serial:', error);
                mostrarMensagem('Erro ao configurar leitor Serial', 'error');
            }
        });
        
        modal.querySelector('#btnConfigManual').addEventListener('click', () => {
            this.isLeitorConectado = true;
            this.atualizarBotaoScan();
            mostrarMensagem('Modo manual ativado. Digite rapidamente os códigos.', 'success');
            modal.remove();
        });
        
        modal.style.display = 'flex';
        
        modal.addEventListener('click', function(e) {
            if (e.target === this) modal.remove();
        });
    }

    // ========================================
    // 3. RELATÓRIOS E EXPORTAÇÕES
    // ========================================

    gerarRelatorioVendas(vendas, periodo = 'diario') {
        try {
            const dataAtual = new Date();
            let vendasFiltradas = vendas;
            
            switch(periodo) {
                case 'diario':
                    vendasFiltradas = vendas.filter(v => {
                        const dataVenda = new Date(v.data_venda);
                        return dataVenda.toDateString() === dataAtual.toDateString();
                    });
                    break;
                case 'semanal':
                    const umaSemanaAtras = new Date(dataAtual.setDate(dataAtual.getDate() - 7));
                    vendasFiltradas = vendas.filter(v => new Date(v.data_venda) >= umaSemanaAtras);
                    break;
                case 'mensal':
                    const umMesAtras = new Date(dataAtual.setMonth(dataAtual.getMonth() - 1));
                    vendasFiltradas = vendas.filter(v => new Date(v.data_venda) >= umMesAtras);
                    break;
            }
            
            const totalVendas = vendasFiltradas.length;
            const valorTotal = vendasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
            const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
            
            const relatorio = {
                periodo,
                data_geracao: new Date().toISOString(),
                total_vendas: totalVendas,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                vendas: vendasFiltradas
            };
            
            return { success: true, relatorio };
            
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            return { success: false, error: error.message };
        }
    }

    exportarParaCSV(dados, nomeArquivo = 'relatorio.csv') {
        try {
            if (!dados || dados.length === 0) {
                throw new Error('Não há dados para exportar');
            }
            
            const headers = Object.keys(dados[0]).join(',');
            const rows = dados.map(item => Object.values(item).join(',')).join('\n');
            const csv = `${headers}\n${rows}`;
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nomeArquivo;
            a.click();
            window.URL.revokeObjectURL(url);
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao exportar CSV:', error);
            return { success: false, error: error.message };
        }
    }

    exportarParaPDF(dados, nomeArquivo = 'relatorio.pdf') {
        try {
            // Aqui você integraria bibliotecas como jsPDF
            console.log('📄 Exportando para PDF:', nomeArquivo);
            console.log('📊 Dados:', dados);
            
            mostrarMensagem('Exportação para PDF simulada', 'info');
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao exportar PDF:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // 4. BACKUP E RESTAURAÇÃO
    // ========================================

    async gerarBackupDados(lojaServices) {
        try {
            mostrarLoading('Gerando backup...', 'Coletando dados...');
            
            const produtos = await lojaServices.buscarProdutos();
            const categorias = await lojaServices.buscarCategorias();
            
            const backup = {
                loja_id: lojaServices.lojaId,
                loja_nome: lojaServices.dadosLoja?.nome || lojaServices.lojaId,
                data_backup: new Date().toISOString(),
                versao: '1.0.0',
                produtos: produtos.data || [],
                categorias: categorias.data || [],
                estatisticas: {
                    total_produtos: produtos.data?.length || 0,
                    total_categorias: categorias.data?.length || 0
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${lojaServices.lojaId}_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            esconderLoading();
            mostrarMensagem('Backup gerado com sucesso!', 'success');
            
            return { success: true, backup };
            
        } catch (error) {
            console.error('❌ Erro ao gerar backup:', error);
            esconderLoading();
            mostrarMensagem('Erro ao gerar backup', 'error');
            return { success: false, error: error.message };
        }
    }

    async restaurarBackup(arquivo, lojaServices) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    
                    if (!backup.loja_id || !backup.produtos) {
                        throw new Error('Arquivo de backup inválido');
                    }
                    
                    if (backup.loja_id !== lojaServices.lojaId) {
                        const confirmar = confirm(`Este backup é da loja "${backup.loja_nome}". Deseja restaurar mesmo assim?`);
                        if (!confirmar) {
                            resolve({ success: false, message: 'Restauração cancelada' });
                            return;
                        }
                    }
                    
                    mostrarLoading('Restaurando backup...', 'Isso pode levar alguns minutos...');
                    
                    let produtosRestaurados = 0;
                    for (const produto of backup.produtos) {
                        delete produto.id;
                        delete produto.createdAt;
                        delete produto.updatedAt;
                        
                        const resultado = await lojaServices.cadastrarProduto(produto);
                        if (resultado.success) produtosRestaurados++;
                    }
                    
                    esconderLoading();
                    mostrarMensagem(`Backup restaurado! ${produtosRestaurados} produtos importados.`, 'success');
                    
                    resolve({ success: true, produtos_importados: produtosRestaurados });
                    
                } catch (error) {
                    console.error('❌ Erro ao restaurar backup:', error);
                    esconderLoading();
                    mostrarMensagem('Erro ao restaurar backup', 'error');
                    reject(error);
                }
            };
            
            reader.readAsText(arquivo);
        });
    }
}

// ============================================
// INSTANCIAR SERVIÇOS AVANÇADOS
// ============================================
// Adicione esta linha no final do arquivo, APÓS a declaração da classe
const servicosAvancados = new ServicosAvancadosPDV(vendaManager);

// Exportar para uso global
window.servicosAvancados = servicosAvancados;

console.log("✅ Serviços avançados do PDV carregados!");

