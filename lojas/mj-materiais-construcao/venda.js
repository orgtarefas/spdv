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
                            ${formatarQuantidadeComUnidade(produto)}
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
        
        // CRIAR INSTÂNCIA DOS SERVIÇOS AVANÇADOS PRIMEIRO
        window.servicosAvancados = new ServicosAvancadosPDV(vendaManager);
        
        atualizarInterfaceLoja();
        configurarEventos();
        configurarModalBusca();
        verificarLeitorCodigoBarras();
        
        // CARREGAR CONFIGURAÇÃO DA IMPRESSORA
        await window.servicosAvancados.carregarConfigImpressora(lojaServices.lojaId);
        
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
                        ${formatarQuantidadeComUnidade(produto)}
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

// ============================================
// ATUALIZAR CARRINHO
// ============================================
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
        // Buscar o produto original para pegar o valor fixo da unidade
        const produtoOriginal = vendaManager.produtos.find(p => p.id === item.id);
        
        // Pegar o valor da unidade (175g, 500ml, 1kg, etc)
        const valorUnidade = produtoOriginal?.valor_unidade || produtoOriginal?.peso_por_unidade || 1;
        const tipoUnidade = produtoOriginal?.tipo_unidade || produtoOriginal?.unidade_peso || '';
        const unidadeVenda = item.unidade || 'UN';
        
        // Formatar o valor da unidade
        const valorFormatado = valorUnidade % 1 === 0 
            ? valorUnidade 
            : valorUnidade.toFixed(1).replace(/\.0$/, '');
        
        // Abreviações
        const abreviacoes = {
            'unidade': 'unid', 'unid': 'unid',
            'quilograma': 'kg', 'kg': 'kg',
            'grama': 'g', 'g': 'g',
            'litro': 'L', 'l': 'L',
            'mililitro': 'mL', 'ml': 'mL',
            'metro': 'm', 'm': 'm',
            'centimetro': 'cm', 'cm': 'cm',
            'metro_quadrado': 'm²', 'm2': 'm²',
            'metro_cubico': 'm³', 'm3': 'm³'
        };
        
        const unidadeAbreviada = abreviacoes[tipoUnidade.toLowerCase()] || tipoUnidade;
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span><i class="fas fa-barcode"></i> ${item.codigo || 'N/A'}</span>
                        <span><i class="fas fa-tag"></i> Preço Individual: ${formatarMoeda(item.preco_unitario)}</span>
                        <span class="produto-unidade">
                            <i class="fas fa-weight-hanging"></i> 
                            ${item.quantidade} ${unidadeVenda} - ${valorFormatado}${unidadeAbreviada}
                        </span>
                        <span class="produto-subtotal">
                            <i class="fas fa-calculator"></i> Sub Total: ${formatarMoeda(item.subtotal)}
                        </span>
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
        
        const resultado = await lojaServices.criarVenda(vendaData);
        
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
                await lojaServices.atualizarEstoque(
                    item.id, 
                    item.quantidade, 
                    'saida'  // ou 'entrada' dependendo da implementação
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
// FORMATAR QUANTIDADE COM VALOR DA UNIDADE
// ============================================
function formatarQuantidadeComUnidade(produto) {
    if (!produto) return '0 UN';
    
    const quantidade = produto.quantidade || 0;
    const unidadeVenda = produto.unidade_venda || produto.unidade || 'UN';
    
    // Verificar se tem valor por unidade (peso, medida, etc)
    const valorUnidade = produto.valor_unidade || produto.peso_por_unidade || 1;
    const tipoUnidade = produto.tipo_unidade || produto.unidade_peso || '';
    
    // Se o valor da unidade for 1, não precisa exibir (é unidade padrão)
    if (valorUnidade === 1 || !tipoUnidade) {
        return `${quantidade} ${unidadeVenda}`;
    }
    
    // Formatar o valor (remover .0 se for inteiro)
    const valorFormatado = valorUnidade % 1 === 0 
        ? valorUnidade 
        : valorUnidade.toFixed(1).replace(/\.0$/, '');
    
    // Abreviações comuns
    const abreviacoes = {
        'unidade': 'unid',
        'unid': 'unid',
        'quilograma': 'kg',
        'kg': 'kg',
        'grama': 'g',
        'g': 'g',
        'tonelada': 't',
        'ton': 't',
        'litro': 'L',
        'l': 'L',
        'mililitro': 'mL',
        'ml': 'mL',
        'metro': 'm',
        'm': 'm',
        'centimetro': 'cm',
        'cm': 'cm',
        'metro_quadrado': 'm²',
        'm2': 'm²',
        'metro_cubico': 'm³',
        'm3': 'm³'
    };
    
    const unidadeAbreviada = abreviacoes[tipoUnidade.toLowerCase()] || tipoUnidade;
    
    return `${quantidade} ${unidadeVenda} - ${valorFormatado}${unidadeAbreviada}`;
}

// ============================================
// CLASSE: ServicosAvancadosPDV
// ============================================
// Funcionalidades avançadas para o PDV:
// - Impressão de notas fiscais
// - Leitor de código de barras (USB, Bluetooth, Serial)
// - Configuração de impressora
// - Modo scan avançado
// ============================================

// ============================================
// CLASSE: ServicosAvancadosPDV - APENAS IMPRESSÃO
// ============================================
// Funcionalidades APENAS de impressão
// ============================================

class ServicosAvancadosPDV {
    constructor(vendaManager) {
        this.vendaManager = vendaManager;
        this.configImpressora = null;
    }

    // ========================================
    // IMPRESSÃO - FUNCIONALIDADE ÚNICA
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
                    tipo: 'sistema',
                    modelo: 'padrao',
                    largura: 48,
                    imprimirLogo: true
                };
                this.vendaManager.configImpressora = this.configImpressora;
                
                // Salvar configuração padrão
                localStorage.setItem(`impressora_config_${lojaId}`, JSON.stringify(this.configImpressora));
            }
            
            this.atualizarBotaoImpressao();
            return { success: true, config: this.configImpressora };
            
        } catch (error) {
            console.error('❌ Erro ao carregar config impressora:', error);
            this.configImpressora = {
                tipo: 'sistema',
                modelo: 'padrao',
                largura: 48
            };
            this.vendaManager.configImpressora = this.configImpressora;
            return { success: false, error: error.message };
        }
    }

    atualizarBotaoImpressao() {
        const btnImprimir = document.getElementById('btnImprimirNota');
        if (btnImprimir) {
            // SEMPRE HABILITADO - usa impressora do Windows
            btnImprimir.disabled = false;
            btnImprimir.removeAttribute('disabled');
            btnImprimir.title = "Imprimir Nota Fiscal (impressora padrão do Windows)";
            btnImprimir.style.opacity = '1';
            btnImprimir.style.pointerEvents = 'auto';
            
            // Adicionar evento se não existir
            if (!btnImprimir.hasAttribute('data-print-listener')) {
                btnImprimir.setAttribute('data-print-listener', 'true');
                btnImprimir.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await this.imprimirNotaFiscal(
                        this.vendaManager.carrinho,
                        this.vendaManager.subtotal,
                        this.vendaManager.total,
                        this.vendaManager.desconto,
                        this.vendaManager.formaPagamento,
                        lojaServices
                    );
                });
            }
        }
    }

    async imprimirNotaFiscal(carrinho, subtotal, total, desconto, formaPagamento, lojaServices) {
        if (!carrinho || carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho para imprimir', 'warning');
            return;
        }
        
        try {
            mostrarLoading('Preparando impressão...', 'Gerando nota fiscal...');
            
            const conteudoNota = this.gerarConteudoNotaFiscal(
                carrinho, subtotal, total, desconto, formaPagamento, lojaServices
            );
            
            // Único método de impressão - via navegador
            this.imprimirNoNavegador(conteudoNota);
            
            esconderLoading();
            mostrarMensagem('Nota fiscal enviada para impressão!', 'success');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao imprimir:', error);
            esconderLoading();
            mostrarMensagem('Erro ao imprimir nota fiscal', 'error');
            return { success: false, error: error.message };
        }
    }

    gerarConteudoNotaFiscal(carrinho, subtotal, total, desconto, formaPagamento, lojaServices) {
        const config = this.configImpressora || { largura: 48 };
        const largura = config.largura || 48;
        
        // Dados da loja
        const nomeLoja = lojaServices.dadosLoja?.nome || 
                         lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const cnpj = lojaServices.dadosLoja?.cnpj || '00.000.000/0000-00';
        const endereco = lojaServices.dadosLoja?.endereco || 'Endereço da Loja';
        const telefone = lojaServices.dadosLoja?.telefone || '(00) 0000-0000';
        
        const dataHora = new Date().toLocaleString('pt-BR');
        const numeroVenda = this.gerarNumeroVenda();
        const vendedor = lojaServices.nomeUsuario || 'Vendedor';
        
        let conteudo = '';
        
        // CABEÇALHO
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar(nomeLoja, largura) + '\n';
        conteudo += this.centralizar('CNPJ: ' + cnpj, largura) + '\n';
        conteudo += this.centralizar(endereco, largura) + '\n';
        conteudo += this.centralizar('Tel: ' + telefone, largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar('CUPOM NÃO FISCAL', largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += `Data: ${dataHora}\n`;
        conteudo += `Venda: ${numeroVenda}\n`;
        conteudo += `Vendedor: ${vendedor}\n`;
        conteudo += '-'.repeat(largura) + '\n';
        
        // CABEÇALHO DOS ITENS
        conteudo += 'ITEM  DESCRIÇÃO                QTD    UNIT     TOTAL\n';
        conteudo += '-'.repeat(largura) + '\n';
        
        // ITENS
        carrinho.forEach((item, index) => {
            const numItem = (index + 1).toString().padStart(2, '0');
            const nome = this.truncarTexto(item.nome, 22);
            const qtd = item.quantidade.toString().padStart(3, ' ');
            const preco = this.formatarMoedaResumida(item.preco_unitario).padStart(8, ' ');
            const subtotalItem = this.formatarMoedaResumida(item.subtotal).padStart(8, ' ');
            
            conteudo += `${numItem} ${nome}\n`;
            conteudo += `         ${qtd}x ${preco} = ${subtotalItem}\n`;
        });
        
        // TOTAIS
        conteudo += '-'.repeat(largura) + '\n';
        
        const subtotalStr = this.formatarMoedaResumida(subtotal).padStart(largura - 10);
        conteudo += `Subtotal:${subtotalStr}\n`;
        
        if (desconto > 0) {
            const valorDesconto = this.formatarMoedaResumida(subtotal * (desconto / 100)).padStart(largura - 16);
            conteudo += `Desconto (${desconto}%):${valorDesconto}\n`;
        }
        
        const totalStr = this.formatarMoedaResumida(total).padStart(largura - 7);
        conteudo += `TOTAL:${totalStr}\n`;
        
        // FORMA DE PAGAMENTO
        const formaPagamentoStr = this.traduzirFormaPagamento(formaPagamento);
        conteudo += `Pagamento: ${formaPagamentoStr}\n`;
        
        if (formaPagamento === 'dinheiro') {
            const troco = this.calcularTroco(total);
            if (troco > 0) {
                conteudo += `Troco: ${this.formatarMoedaResumida(troco)}\n`;
            }
        }
        
        // RODAPÉ
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('OBRIGADO PELA PREFERÊNCIA!', largura) + '\n';
        conteudo += this.centralizar('VOLTE SEMPRE!', largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += '\n';
        conteudo += this.centralizar(new Date().toLocaleDateString('pt-BR'), largura) + '\n';
        conteudo += this.centralizar(new Date().toLocaleTimeString('pt-BR'), largura) + '\n';
        conteudo += '\n\n\n\n';
        
        return conteudo;
    }

    // ========================================
    // MÉTODOS AUXILIARES DE FORMATAÇÃO
    // ========================================

    centralizar(texto, largura) {
        if (texto.length >= largura) return texto;
        const espacos = Math.floor((largura - texto.length) / 2);
        return ' '.repeat(espacos) + texto;
    }

    truncarTexto(texto, tamanho) {
        if (texto.length <= tamanho) return texto.padEnd(tamanho, ' ');
        return texto.substring(0, tamanho - 3) + '...';
    }

    formatarMoedaResumida(valor) {
        const numero = parseFloat(valor) || 0;
        return numero.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    gerarNumeroVenda() {
        const data = new Date();
        const ano = data.getFullYear().toString().slice(-2);
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const dia = data.getDate().toString().padStart(2, '0');
        const hora = data.getHours().toString().padStart(2, '0');
        const minuto = data.getMinutes().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${ano}${mes}${dia}${hora}${minuto}-${random}`;
    }

    traduzirFormaPagamento(forma) {
        const traducoes = {
            'dinheiro': 'DINHEIRO',
            'cartao_credito': 'CARTÃO DE CRÉDITO',
            'cartao_debito': 'CARTÃO DE DÉBITO',
            'pix': 'PIX',
            'credito_loja': 'CRÉDITO DA LOJA',
            'vale': 'VALE'
        };
        return traducoes[forma] || forma.toUpperCase();
    }

    calcularTroco(total) {
        // Implementar se necessário
        return 0;
    }

    // ========================================
    // MÉTODO DE IMPRESSÃO PRINCIPAL
    // ========================================

    imprimirNoNavegador(conteudo) {
        // Criar janela de impressão
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        const estilo = `
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    background: white;
                    padding: 0;
                    margin: 0;
                }
                
                .nota-fiscal {
                    width: 100%;
                    max-width: 300px;
                    margin: 0 auto;
                    padding: 15px 10px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    background: white;
                }
                
                @media print {
                    body {
                        background: white;
                    }
                    .nota-fiscal {
                        padding: 5px;
                        max-width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                
                .print-controls {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.1), transparent);
                    padding: 20px;
                    text-align: center;
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    backdrop-filter: blur(5px);
                }
                
                .btn-print {
                    background: #27ae60;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s;
                    border: 1px solid rgba(255,255,255,0.2);
                }
                
                .btn-print:hover {
                    background: #219a52;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
                }
                
                .btn-close {
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s;
                }
                
                .btn-close:hover {
                    background: #c0392b;
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
                }
                
                .print-header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #ccc;
                }
            </style>
        `;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Nota Fiscal - PDV</title>
                    ${estilo}
                </head>
                <body>
                    <div class="nota-fiscal">${conteudo}</div>
                    <div class="print-controls no-print">
                        <button class="btn-print" onclick="window.print();">
                            <i class="fas fa-print"></i> Imprimir
                        </button>
                        <button class="btn-close" onclick="window.close()">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                    <script>
                        // Auto-imprimir após 500ms
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    <\/script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    // ========================================
    // MODAL DE CONFIGURAÇÃO DA IMPRESSORA
    // ========================================

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
                            <!-- INFORMAÇÃO IMPORTANTE -->
                            <div class="info-box" style="background: #e8f4fd; border-left: 4px solid #3498db; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="display: flex; gap: 15px; align-items: flex-start;">
                                    <i class="fas fa-info-circle" style="color: #3498db; font-size: 24px;"></i>
                                    <div>
                                        <strong style="color: #2c3e50; font-size: 16px;">Impressora do Windows</strong>
                                        <p style="margin: 8px 0 0 0; color: #34495e;">
                                            O sistema usará a impressora PADRÃO configurada no Windows.<br>
                                            Para imprimir, basta clicar no botão "Imprimir" e selecionar sua impressora.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- CONFIGURAÇÕES -->
                            <div style="display: grid; gap: 15px;">
                                <div class="config-group">
                                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                        <i class="fas fa-newspaper"></i> Modelo da Nota:
                                    </label>
                                    <select id="modeloImpressora" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                                        <option value="padrao">Padrão (80mm - 48 colunas)</option>
                                        <option value="pequeno">Pequeno (58mm - 32 colunas)</option>
                                        <option value="grande">Grande (80mm - com detalhes)</option>
                                    </select>
                                </div>
                                
                                <div class="config-group">
                                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">
                                        <i class="fas fa-arrows-alt-h"></i> Largura da Nota:
                                    </label>
                                    <input type="number" id="larguraImpressora" 
                                           style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
                                           min="30" max="80" value="48" step="1">
                                    <small style="display: block; margin-top: 5px; color: #7f8c8d;">
                                        Número de caracteres por linha (48 = papel 80mm, 32 = papel 58mm)
                                    </small>
                                </div>
                                
                                <div class="config-options" style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                        <input type="checkbox" id="imprimirLogo" checked style="width: 18px; height: 18px;">
                                        <span style="font-weight: 500;">Incluir cabeçalho completo da loja</span>
                                    </label>
                                </div>
                            </div>

                            <!-- AÇÕES -->
                            <div style="display: flex; gap: 10px; margin-top: 25px;">
                                <button id="btnTestImpressora" 
                                        style="flex: 1; padding: 14px; background: #f39c12; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i class="fas fa-print"></i> Testar Impressão
                                </button>
                                <button id="btnSalvarImpressora" 
                                        style="flex: 1; padding: 14px; background: #27ae60; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i class="fas fa-save"></i> Salvar
                                </button>
                                <button id="btnCancelImpressora" 
                                        style="padding: 14px 20px; background: #e74c3c; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar modal ao DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        const modal = document.getElementById('impressoraConfigModal');
        const config = this.configImpressora || {};
        
        // Preencher valores atuais
        if (config.modelo) document.getElementById('modeloImpressora').value = config.modelo;
        if (config.largura) document.getElementById('larguraImpressora').value = config.largura;
        
        const imprimirLogoCheck = document.getElementById('imprimirLogo');
        if (imprimirLogoCheck) {
            imprimirLogoCheck.checked = config.imprimirLogo !== false;
        }
        
        // Eventos
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#btnCancelImpressora').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#btnSalvarImpressora').addEventListener('click', () => {
            const novaConfig = {
                tipo: 'sistema',
                modelo: document.getElementById('modeloImpressora').value,
                largura: parseInt(document.getElementById('larguraImpressora').value) || 48,
                imprimirLogo: document.getElementById('imprimirLogo')?.checked || true
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
        
        // Fechar ao clicar fora
        modal.addEventListener('click', function(e) {
            if (e.target === this) modal.remove();
        });
        
        modal.style.display = 'flex';
    }

    // ========================================
    // TESTE DE IMPRESSÃO
    // ========================================

    async testarImpressao() {
        const config = this.configImpressora || { largura: 48 };
        const largura = config.largura || 48;
        
        const conteudoTeste = 
            '='.repeat(largura) + '\n' +
            this.centralizar('TESTE DE IMPRESSÃO', largura) + '\n' +
            '='.repeat(largura) + '\n' +
            '\n' +
            this.centralizar('PDV - SISTEMA DE VENDAS', largura) + '\n' +
            '\n' +
            '-'.repeat(largura) + '\n' +
            'Data: ' + new Date().toLocaleString('pt-BR') + '\n' +
            'Loja: ' + lojaServices.lojaId + '\n' +
            'Impressora: ' + (this.configImpressora?.modelo || 'Padrão') + '\n' +
            'Largura: ' + largura + ' colunas\n' +
            '-'.repeat(largura) + '\n' +
            '\n' +
            this.centralizar('✅ IMPRESSÃO OK!', largura) + '\n' +
            '\n' +
            'Se você está lendo esta mensagem,\n' +
            'sua impressora está configurada\n' +
            'corretamente no Windows!\n' +
            '\n' +
            '='.repeat(largura) + '\n' +
            this.centralizar('FIM DO TESTE', largura) + '\n' +
            '='.repeat(largura) + '\n' +
            '\n\n';
        
        this.imprimirNoNavegador(conteudoTeste);
        mostrarMensagem('Teste de impressão enviado!', 'success');
    }
}




