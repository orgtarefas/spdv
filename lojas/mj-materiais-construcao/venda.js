// venda.js - SISTEMA DE VENDAS PDV MULTILOJA COM ORÇAMENTOS E VENDAS
console.log("🛒 Sistema PDV - Página de Vendas com Orçamentos e Vendas");

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
    configImpressora: null,
    // Controle de modo
    modoAtual: 'venda', // 'venda' ou 'orcamento'
    orcamentoAtual: null,
    vendaAtual: null,
    historicoVendas: [],
    dataInicio: new Date()
};

// ============================================
// FUNÇÕES DE FORMATAÇÃO
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL',
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
}

function formatarDataHora(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
}

function formatarQuantidadeComUnidade(produto) {
    if (!produto) return '0 UN';
    
    const quantidade = produto.quantidade || 0;
    const unidadeVenda = produto.unidade_venda || produto.unidade || 'UN';
    const valorUnidade = produto.valor_unidade || produto.peso_por_unidade || 1;
    const tipoUnidade = produto.tipo_unidade || produto.unidade_peso || '';
    
    if (valorUnidade === 1 || !tipoUnidade) {
        return `${quantidade} ${unidadeVenda}`;
    }
    
    const valorFormatado = valorUnidade % 1 === 0 
        ? valorUnidade 
        : valorUnidade.toFixed(1).replace(/\.0$/, '');
    
    const abreviacoes = {
        'unidade': 'unid', 'unid': 'unid',
        'quilograma': 'kg', 'kg': 'kg',
        'grama': 'g', 'g': 'g',
        'litro': 'L', 'l': 'L',
        'mililitro': 'mL', 'ml': 'mL',
        'metro': 'm', 'm': 'm'
    };
    
    const unidadeAbreviada = abreviacoes[tipoUnidade.toLowerCase()] || tipoUnidade;
    return `${quantidade} ${unidadeVenda} - ${valorFormatado}${unidadeAbreviada}`;
}

// ============================================
// IMAGEM PLACEHOLDER
// ============================================
function obterImagemPlaceholderBase64() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjFmM2Y1Ii8+CjxjaXJjbGUgY3g9IjQwIiBjeT0iMzIiIHI9IjE2IiBmaWxsPSIjZTBlMGUwIi8+CjxwYXRoIGQ9Ik0xMiA2NEwxNiA1MkwyNCA0MEwzMiA0OEw0OCAzMkw2NCA0OEw2OCA2NEgxMloiIGZpbGw9IiNlMGUwZTAiLz4KPHJlY3QgeD0iMjgiIHk9IjU2IiB3aWR0aD0iMjQiIGhlaWdodD0iOCIgZmlsbD0iI2QwZDBkMCIvPgo8dGV4dCB4PSI0MCIgeT0iNzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzhhOTRhMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U0VNIEZPVE88L3RleHQ+Cjwvc3ZnPg==';
}

function obterURLImagem(produto, tamanho = 'thumb') {
    if (!produto) return obterImagemPlaceholderBase64();
    
    if (!produto.imagens) return obterImagemPlaceholderBase64();
    
    const imagens = produto.imagens;
    
    if (!imagens.principal) return obterImagemPlaceholderBase64();
    
    if (imagens.principal instanceof File) {
        try {
            return URL.createObjectURL(imagens.principal);
        } catch (e) {
            return obterImagemPlaceholderBase64();
        }
    }
    
    const url = imagens.principal;
    
    if (!url || url === '' || url.includes('sem-foto.png') || url.includes('no-image')) {
        return obterImagemPlaceholderBase64();
    }
    
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
// CONTROLE DE MODO (VENDA x ORÇAMENTO)
// ============================================
function alternarModo(modo) {
    vendaManager.modoAtual = modo;
    
    const btnModoVenda = document.getElementById('btnModoVenda');
    const btnModoOrcamento = document.getElementById('btnModoOrcamento');
    const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    
    if (btnModoVenda) {
        btnModoVenda.classList.toggle('active', modo === 'venda');
    }
    if (btnModoOrcamento) {
        btnModoOrcamento.classList.toggle('active', modo === 'orcamento');
    }
    
    if (btnFinalizarVenda) {
        btnFinalizarVenda.style.display = modo === 'venda' ? 'flex' : 'none';
    }
    if (btnGerarOrcamento) {
        btnGerarOrcamento.style.display = modo === 'orcamento' ? 'flex' : 'none';
    }
    
    // Atualizar título
    const modoTitle = document.querySelector('.modo-title');
    if (modoTitle) {
        modoTitle.textContent = modo === 'venda' ? 'MODO VENDA' : 'MODO ORÇAMENTO';
    }
    
    limparCarrinho();
}

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
        
        // CRIAR INSTÂNCIA DOS SERVIÇOS AVANÇADOS
        window.servicosAvancados = new ServicosAvancadosPDV(vendaManager);
        
        // CRIAR OS BOTÕES DE MODO DINAMICAMENTE
        criarBotoesModo();
        
        atualizarInterfaceLoja();
        configurarEventos();
        configurarModalBusca();
        verificarLeitorCodigoBarras();
        
        // CARREGAR CONFIGURAÇÃO DA IMPRESSORA
        await window.servicosAvancados.carregarConfigImpressora(lojaServices.lojaId);
        
        await carregarProdutos();
        verificarProdutoPreSelecionado();
        
        esconderLoading();
        console.log("✅ PDV pronto para vendas e orçamentos");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de vendas', 'error');
        esconderLoading();
    }
});

// ============================================
// CRIAR BOTÕES DE MODO
// ============================================
function criarBotoesModo() {
    const paymentSection = document.querySelector('.payment-section');
    if (!paymentSection) return;
    
    const modoHTML = `
        <div class="modo-container" style="margin-bottom: 15px; background: #f8f9fa; border-radius: 8px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="modo-title" style="font-weight: bold; color: #2c3e50;">MODO VENDA</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btnModoVenda" class="btn-modo active" data-modo="venda" 
                        style="flex: 1; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-cash-register"></i> Venda
                </button>
                <button id="btnModoOrcamento" class="btn-modo" data-modo="orcamento"
                        style="flex: 1; padding: 10px; background: #f39c12; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-file-invoice"></i> Orçamento
                </button>
            </div>
        </div>
    `;
    
    paymentSection.insertAdjacentHTML('afterbegin', modoHTML);
    
    document.getElementById('btnModoVenda')?.addEventListener('click', () => alternarModo('venda'));
    document.getElementById('btnModoOrcamento')?.addEventListener('click', () => alternarModo('orcamento'));
}

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
        
        // Enter adiciona ao carrinho
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                const termo = this.value.trim();
                const produto = vendaManager.produtos.find(p => 
                    p.codigo === termo || p.codigo_barras === termo
                );
                
                if (produto) {
                    window.adicionarProdutoCarrinho(produto.id);
                    this.value = '';
                } else {
                    abrirModalBusca();
                }
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
    
    // Botão consulta rápida
    const btnConsultaRapida = document.getElementById('btnConsultaRapida');
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', abrirModalConsultaRapida);
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
    
    // Botão gerar orçamento
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    if (!btnGerarOrcamento) {
        criarBotaoGerarOrcamento();
    }
    
    // Botão cancelar venda
    const btnCancelar = document.getElementById('btnCancelarVenda');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0) {
                if (confirm('Cancelar a venda/orçamento atual?')) limparCarrinho();
            }
        });
    }
    
    // Botão histórico de vendas
    const btnHistorico = document.getElementById('btnHistorico');
    if (!btnHistorico) {
        criarBotaoHistorico();
    }
}

// ============================================
// CRIAR BOTÃO GERAR ORÇAMENTO
// ============================================
function criarBotaoGerarOrcamento() {
    const paymentActions = document.querySelector('.payment-actions');
    if (!paymentActions) return;
    
    const btnHTML = `
        <button id="btnGerarOrcamento" class="btn-orcamento" style="display: none;">
            <i class="fas fa-file-invoice"></i>
            Gerar Orçamento
        </button>
    `;
    
    paymentActions.insertAdjacentHTML('afterbegin', btnHTML);
    
    document.getElementById('btnGerarOrcamento')?.addEventListener('click', gerarOrcamento);
}

// ============================================
// CRIAR BOTÃO HISTÓRICO
// ============================================
function criarBotaoHistorico() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;
    
    const btnHTML = `
        <button id="btnHistorico" class="btn-historico" style="margin-right: 10px; background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
            <i class="fas fa-history"></i>
            Histórico
        </button>
    `;
    
    headerRight.insertAdjacentHTML('afterbegin', btnHTML);
    
    document.getElementById('btnHistorico')?.addEventListener('click', abrirModalHistorico);
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
    
    const loadingProducts = document.getElementById('loadingProducts');
    const emptyProducts = document.getElementById('emptyProducts');
    
    if (!produtos || produtos.length === 0) {
        if (loadingProducts) loadingProducts.style.display = 'none';
        if (emptyProducts) emptyProducts.style.display = 'flex';
        return;
    }
    
    if (loadingProducts) loadingProducts.style.display = 'none';
    if (emptyProducts) emptyProducts.style.display = 'none';
    
    let html = '';
    produtos.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        const precoFormatado = formatarMoeda(produto.preco);
        const imagemURL = obterURLImagem(produto, 'thumb');
        const isPlaceholder = imagemURL.includes('data:image/svg+xml');
        const quantidadeFormatada = formatarQuantidadeComUnidade(produto);
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" 
                 onclick="window.adicionarProdutoCarrinho('${produto.id}')">
                
                <div class="product-image">
                    <img src="${imagemURL}" 
                         alt="${produto.nome ? produto.nome.replace(/['"]/g, '') : 'Produto'}"
                         class="${isPlaceholder ? 'no-image' : 'has-image'}"
                         loading="lazy"
                         onerror="this.src='${obterImagemPlaceholderBase64()}'; this.classList.add('no-image');">
                </div>
                
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}" 
                          title="${temEstoque ? 'Em estoque' : 'Sem estoque'}">
                        <i class="fas ${temEstoque ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${quantidadeFormatada}
                    </span>
                </div>
                
                <div class="product-name" title="${produto.nome || 'Sem nome'}">
                    ${produto.nome || 'Produto sem nome'}
                </div>
                
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                
                <div class="product-footer">
                    <span class="product-price">${precoFormatado}</span>
                    <button class="btn-add-product" 
                            onclick="event.stopPropagation(); window.adicionarProdutoCarrinho('${produto.id}')"
                            ${!temEstoque ? 'disabled' : ''}
                            title="${temEstoque ? 'Adicionar ao carrinho' : 'Produto sem estoque'}">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    productsGrid.innerHTML = html;
    
    const productCount = document.getElementById('productCount');
    if (productCount) {
        productCount.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;
    }
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
// MODAL DE CONSULTA RÁPIDA
// ============================================
function abrirModalConsultaRapida() {
    const modalHTML = `
        <div id="consultaRapidaModal" class="modal modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-search"></i> Consulta Rápida de Preços</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-box" style="margin-bottom: 20px;">
                        <i class="fas fa-search"></i>
                        <input type="text" id="consultaInput" placeholder="Digite código ou nome do produto..." autofocus>
                        <button class="search-clear" id="consultaClear">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="consulta-results" id="consultaResults">
                        <div class="empty-state" style="padding: 30px;">
                            <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                            <p style="margin-top: 15px;">Digite para consultar preços</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btnFecharConsulta" class="btn-cancel">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('consultaRapidaModal');
    const input = document.getElementById('consultaInput');
    const results = document.getElementById('consultaResults');
    
    // Eventos
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    document.getElementById('btnFecharConsulta').addEventListener('click', () => modal.remove());
    
    document.getElementById('consultaClear').addEventListener('click', () => {
        input.value = '';
        input.focus();
        results.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                <p style="margin-top: 15px;">Digite para consultar preços</p>
            </div>
        `;
    });
    
    input.addEventListener('input', function() {
        const termo = this.value.toLowerCase();
        
        if (!termo.trim()) {
            results.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p style="margin-top: 15px;">Digite para consultar preços</p>
                </div>
            `;
            return;
        }
        
        const produtosFiltrados = vendaManager.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termo))
        );
        
        if (produtosFiltrados.length === 0) {
            results.innerHTML = `
                <div class="empty-state" style="padding: 30px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p style="margin-top: 15px;">Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="consulta-grid">';
        
        produtosFiltrados.forEach(p => {
            const imagemURL = obterURLImagem(p, 'thumb');
            const isPlaceholder = imagemURL.includes('data:image/svg+xml');
            
            html += `
                <div class="consulta-card">
                    <div class="consulta-image">
                        <img src="${imagemURL}" 
                             alt="${p.nome}"
                             class="${isPlaceholder ? 'no-image' : ''}"
                             onerror="this.src='${obterImagemPlaceholderBase64()}';">
                    </div>
                    <div class="consulta-info">
                        <div class="consulta-code">${p.codigo || 'SEM CÓDIGO'}</div>
                        <div class="consulta-name">${p.nome}</div>
                        <div class="consulta-price">${formatarMoeda(p.preco)}</div>
                        <div class="consulta-stock">Estoque: ${formatarQuantidadeComUnidade(p)}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        results.innerHTML = html;
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
    
    setTimeout(() => input.focus(), 100);
    modal.style.display = 'flex';
}

// ============================================
// MODAL DE BUSCA DE PRODUTOS
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
                <div class="product-image-container">
                    <img src="${imagemURL}" 
                         alt="${produto.nome}"
                         class="${isPlaceholder ? 'no-image' : ''}"
                         loading="lazy"
                         onerror="this.src='${obterImagemPlaceholderBase64()}'; this.classList.add('no-image');">
                </div>
                
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
                            <button class="btn-action btn-secondary" 
                                    onclick="window.consultarPreco('${produto.id}')">
                                <i class="fas fa-search"></i> Consultar
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

window.consultarPreco = function(produtoId) {
    const produto = vendaManager.produtos.find(p => p.id === produtoId);
    if (produto) {
        mostrarMensagem(`${produto.nome}: ${formatarMoeda(produto.preco)}`, 'info', 5000);
    }
    fecharModalBusca();
};

function configurarModalBusca() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;
    
    const closeBtn = document.getElementById('closeSearchModal');
    if (closeBtn) closeBtn.addEventListener('click', fecharModalBusca);
    
    const closeFooterBtn = document.getElementById('btnCloseSearch');
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', fecharModalBusca);
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) fecharModalBusca();
    });
    
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
// ADICIONAR PRODUTO AO CARRINHO
// ============================================
window.adicionarProdutoCarrinho = function(produtoId) {
    const produto = vendaManager.produtos.find(p => p.id === produtoId);
    if (produto) {
        if (vendaManager.modoAtual === 'venda' && produto.quantidade <= 0) {
            mostrarMensagem('Produto sem estoque disponível', 'warning');
            return;
        }
        abrirModalQuantidade(produto, 1);
        fecharModalBusca();
    }
};

// ============================================
// MODAL DE QUANTIDADE
// ============================================
function abrirModalQuantidade(produto, quantidadeAtual = 1) {
    const maxQuantidade = vendaManager.modoAtual === 'venda' ? produto.quantidade : 9999;
    
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
                        ${vendaManager.modoAtual === 'venda' ? 
                            `<p>Estoque: ${produto.quantidade} ${produto.unidade_venda || produto.unidade || 'UN'}</p>` : 
                            '<p>Modo ORÇAMENTO - Estoque não verificado</p>'}
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
    
    if (vendaManager.modoAtual === 'venda' && quantidade > produto.quantidade) {
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
            unidade: produto.unidade_venda || produto.unidade || 'UN',
            valor_unidade: produto.valor_unidade || produto.peso_por_unidade || 1,
            tipo_unidade: produto.tipo_unidade || produto.unidade_peso || ''
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
                <small>Adicione produtos para iniciar a venda/orçamento</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    vendaManager.carrinho.forEach((item, index) => {
        const valorFormatado = item.valor_unidade % 1 === 0 
            ? item.valor_unidade 
            : item.valor_unidade.toFixed(1).replace(/\.0$/, '');
        
        const abreviacoes = {
            'unidade': 'unid', 'unid': 'unid',
            'quilograma': 'kg', 'kg': 'kg',
            'grama': 'g', 'g': 'g',
            'litro': 'L', 'l': 'L',
            'mililitro': 'mL', 'ml': 'mL',
            'metro': 'm', 'm': 'm'
        };
        
        const unidadeAbreviada = abreviacoes[item.tipo_unidade?.toLowerCase()] || item.tipo_unidade || '';
        
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span><i class="fas fa-barcode"></i> ${item.codigo || 'N/A'}</span>
                        <span><i class="fas fa-tag"></i> Preço Unit: ${formatarMoeda(item.preco_unitario)}</span>
                        ${valorFormatado && unidadeAbreviada ? 
                            `<span class="produto-unidade">
                                <i class="fas fa-weight-hanging"></i> 
                                ${item.quantidade} ${item.unidade} - ${valorFormatado}${unidadeAbreviada}
                            </span>` : ''}
                        <span class="produto-subtotal">
                            <i class="fas fa-calculator"></i> Subtotal: ${formatarMoeda(item.subtotal)}
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
    
    const novaQuantidade = item.quantidade + mudanca;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (vendaManager.modoAtual === 'venda' && produto && novaQuantidade > produto.quantidade) {
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
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (vendaManager.modoAtual === 'venda' && produto && novaQuantidade > produto.quantidade) {
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
    vendaManager.orcamentoAtual = null;
    vendaManager.vendaAtual = null;
    
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
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    
    if (btnFinalizar) {
        btnFinalizar.disabled = vendaManager.carrinho.length === 0;
    }
    if (btnGerarOrcamento) {
        btnGerarOrcamento.disabled = vendaManager.carrinho.length === 0;
    }
}

// ============================================
// GERAR ORÇAMENTO
// ============================================
async function gerarOrcamento() {
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho primeiro', 'warning');
        return;
    }
    
    if (!confirm(`Gerar orçamento no valor de ${formatarMoeda(vendaManager.total)}?`)) return;
    
    try {
        mostrarLoading('Gerando orçamento...');
        
        const orcamentoData = {
            numero: gerarNumeroOrcamento(),
            itens: vendaManager.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal,
                unidade: item.unidade,
                valor_unidade: item.valor_unidade,
                tipo_unidade: item.tipo_unidade
            })),
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            valor_desconto: vendaManager.subtotal * (vendaManager.desconto / 100),
            total: vendaManager.total,
            vendedor_id: lojaServices.usuarioId,
            vendedor_nome: lojaServices.nomeUsuario,
            data_criacao: new Date(),
            data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 dias
            status: 'ativo',
            loja_id: lojaServices.lojaId
        };
        
        // Salvar no localStorage
        const orcamentos = JSON.parse(localStorage.getItem(`orcamentos_${lojaServices.lojaId}`) || '[]');
        orcamentos.push(orcamentoData);
        localStorage.setItem(`orcamentos_${lojaServices.lojaId}`, JSON.stringify(orcamentos));
        
        vendaManager.orcamentoAtual = orcamentoData;
        
        mostrarMensagem(`Orçamento #${orcamentoData.numero} gerado com sucesso!`, 'success');
        
        // Imprimir orçamento
        await window.servicosAvancados.imprimirOrcamento(
            orcamentoData,
            lojaServices
        );
        
        setTimeout(() => {
            limparCarrinho();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao gerar orçamento:', error);
        mostrarMensagem('Erro ao gerar orçamento: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

function gerarNumeroOrcamento() {
    const data = new Date();
    const ano = data.getFullYear().toString().slice(-2);
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');
    const hora = data.getHours().toString().padStart(2, '0');
    const minuto = data.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORC-${ano}${mes}${dia}-${hora}${minuto}-${random}`;
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
        
        const numeroVenda = gerarNumeroVenda();
        
        const vendaData = {
            numero: numeroVenda,
            itens: vendaManager.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal,
                unidade: item.unidade,
                valor_unidade: item.valor_unidade,
                tipo_unidade: item.tipo_unidade
            })),
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            valor_desconto: vendaManager.subtotal * (vendaManager.desconto / 100),
            total: vendaManager.total,
            forma_pagamento: vendaManager.formaPagamento,
            vendedor_id: lojaServices.usuarioId,
            vendedor_nome: lojaServices.nomeUsuario,
            data_venda: new Date(),
            status: 'concluida',
            loja_id: lojaServices.lojaId
        };
        
        const resultado = await lojaServices.criarVenda(vendaData);
        
        if (resultado.success) {
            await atualizarEstoqueProdutos();
            
            // Salvar no histórico local
            const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
            vendas.push(vendaData);
            localStorage.setItem(`vendas_${lojaServices.lojaId}`, JSON.stringify(vendas));
            
            vendaManager.vendaAtual = vendaData;
            
            mostrarMensagem(`Venda #${numeroVenda} finalizada! Total: ${formatarMoeda(vendaManager.total)}`, 'success');
            
            // Imprimir nota fiscal
            await window.servicosAvancados.imprimirNotaFiscalVenda(
                vendaData,
                lojaServices
            );
            
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

function gerarNumeroVenda() {
    const data = new Date();
    const ano = data.getFullYear().toString().slice(-2);
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const dia = data.getDate().toString().padStart(2, '0');
    const hora = data.getHours().toString().padStart(2, '0');
    const minuto = data.getMinutes().toString().padStart(2, '0');
    const segundo = data.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${ano}${mes}${dia}${hora}${minuto}${segundo}${random}`;
}

async function atualizarEstoqueProdutos() {
    try {
        for (const item of vendaManager.carrinho) {
            const produto = vendaManager.produtos.find(p => p.id === item.id);
            if (produto) {
                await lojaServices.atualizarEstoque(
                    item.id, 
                    item.quantidade, 
                    'saida'
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
// MODAL HISTÓRICO DE VENDAS
// ============================================
function abrirModalHistorico() {
    const modalHTML = `
        <div id="historicoModal" class="modal modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Histórico de Vendas</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="historico-filtros" style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="date" id="filtroData" style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
                        <input type="text" id="filtroNumero" placeholder="Número da venda" style="flex: 2; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px;">
                        <button id="btnFiltrar" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-search"></i> Filtrar
                        </button>
                        <button id="btnLimparFiltros" style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    </div>
                    
                    <div class="historico-results" id="historicoResults">
                        <div class="empty-state" style="padding: 40px;">
                            <i class="fas fa-shopping-cart" style="font-size: 3rem; opacity: 0.2;"></i>
                            <p style="margin-top: 15px;">Nenhuma venda encontrada</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btnFecharHistorico" class="btn-cancel">
                        <i class="fas fa-times"></i> Fechar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('historicoModal');
    const filtroData = document.getElementById('filtroData');
    const filtroNumero = document.getElementById('filtroNumero');
    const historicoResults = document.getElementById('historicoResults');
    
    // Preencher data atual
    const hoje = new Date().toISOString().split('T')[0];
    filtroData.value = hoje;
    
    // Carregar vendas
    carregarHistoricoVendas(hoje, '', historicoResults);
    
    // Eventos
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    document.getElementById('btnFecharHistorico').addEventListener('click', () => modal.remove());
    
    document.getElementById('btnFiltrar').addEventListener('click', () => {
        carregarHistoricoVendas(filtroData.value, filtroNumero.value, historicoResults);
    });
    
    document.getElementById('btnLimparFiltros').addEventListener('click', () => {
        filtroData.value = hoje;
        filtroNumero.value = '';
        carregarHistoricoVendas(hoje, '', historicoResults);
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
    
    modal.style.display = 'flex';
}

function carregarHistoricoVendas(data, numero, container) {
    try {
        // Buscar do localStorage
        const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
        
        let vendasFiltradas = vendas;
        
        // Filtrar por data
        if (data) {
            const dataFiltro = new Date(data).toDateString();
            vendasFiltradas = vendasFiltradas.filter(v => 
                new Date(v.data_venda).toDateString() === dataFiltro
            );
        }
        
        // Filtrar por número
        if (numero) {
            vendasFiltradas = vendasFiltradas.filter(v => 
                v.numero?.toLowerCase().includes(numero.toLowerCase())
            );
        }
        
        // Ordenar por data (mais recente primeiro)
        vendasFiltradas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
        
        if (vendasFiltradas.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p style="margin-top: 15px;">Nenhuma venda encontrada para este período</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="historico-lista">';
        
        vendasFiltradas.forEach(venda => {
            const dataVenda = new Date(venda.data_venda);
            const dataFormatada = dataVenda.toLocaleDateString('pt-BR') + ' ' + dataVenda.toLocaleTimeString('pt-BR');
            
            html += `
                <div class="historico-item">
                    <div class="historico-header">
                        <div>
                            <strong>#${venda.numero || 'N/A'}</strong>
                            <span style="margin-left: 15px; color: #7f8c8d;">${dataFormatada}</span>
                        </div>
                        <span class="historico-total">${formatarMoeda(venda.total)}</span>
                    </div>
                    
                    <div class="historico-detalhes">
                        <div><strong>Vendedor:</strong> ${venda.vendedor_nome || 'N/A'}</div>
                        <div><strong>Forma pagamento:</strong> ${traduzirFormaPagamento(venda.forma_pagamento)}</div>
                        <div><strong>Itens:</strong> ${venda.itens?.length || 0}</div>
                        ${venda.desconto > 0 ? `<div><strong>Desconto:</strong> ${venda.desconto}%</div>` : ''}
                    </div>
                    
                    <div class="historico-acoes">
                        <button class="btn-historico-print" onclick="window.reimprimirVenda('${venda.numero}')">
                            <i class="fas fa-print"></i> Reimprimir
                        </button>
                        <button class="btn-historico-view" onclick="window.verDetalhesVenda('${venda.numero}')">
                            <i class="fas fa-eye"></i> Detalhes
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem;"></i>
                <p style="margin-top: 15px;">Erro ao carregar histórico</p>
            </div>
        `;
    }
}

function traduzirFormaPagamento(forma) {
    const traducoes = {
        'dinheiro': 'Dinheiro',
        'cartao_credito': 'Cartão de Crédito',
        'cartao_debito': 'Cartão de Débito',
        'pix': 'PIX',
        'credito_loja': 'Crédito da Loja',
        'vale': 'Vale'
    };
    return traducoes[forma] || forma || 'N/A';
}

window.reimprimirVenda = async function(numeroVenda) {
    try {
        const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
        const venda = vendas.find(v => v.numero === numeroVenda);
        
        if (venda) {
            await window.servicosAvancados.imprimirNotaFiscalVenda(
                venda,
                lojaServices,
                true // reimpressão
            );
            mostrarMensagem(`Reimpressão da venda #${numeroVenda} enviada!`, 'success');
        } else {
            mostrarMensagem('Venda não encontrada', 'error');
        }
    } catch (error) {
        console.error('Erro ao reimprimir:', error);
        mostrarMensagem('Erro ao reimprimir venda', 'error');
    }
};

window.verDetalhesVenda = function(numeroVenda) {
    const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
    const venda = vendas.find(v => v.numero === numeroVenda);
    
    if (!venda) return;
    
    let detalhes = `VENDA #${venda.numero}\n`;
    detalhes += `Data: ${new Date(venda.data_venda).toLocaleString('pt-BR')}\n`;
    detalhes += `Vendedor: ${venda.vendedor_nome}\n`;
    detalhes += `Forma Pagamento: ${traduzirFormaPagamento(venda.forma_pagamento)}\n`;
    detalhes += `----------------------------------------\n`;
    detalhes += `ITENS:\n`;
    
    venda.itens?.forEach((item, i) => {
        detalhes += `${i+1}. ${item.nome}\n`;
        detalhes += `   ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}\n`;
    });
    
    detalhes += `----------------------------------------\n`;
    detalhes += `Subtotal: ${formatarMoeda(venda.subtotal)}\n`;
    if (venda.desconto > 0) {
        detalhes += `Desconto: ${venda.desconto}%\n`;
    }
    detalhes += `TOTAL: ${formatarMoeda(venda.total)}\n`;
    
    alert(detalhes);
};

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
// FUNÇÕES UTILITÁRIAS
// ============================================
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

// ============================================
// CLASSE: ServicosAvancadosPDV
// ============================================
class ServicosAvancadosPDV {
    constructor(vendaManager) {
        this.vendaManager = vendaManager;
        this.configImpressora = null;
    }

    async carregarConfigImpressora(lojaId) {
        try {
            const configSalva = localStorage.getItem(`impressora_config_${lojaId}`);
            
            if (configSalva) {
                this.configImpressora = JSON.parse(configSalva);
                this.vendaManager.configImpressora = this.configImpressora;
            } else {
                this.configImpressora = {
                    tipo: 'sistema',
                    modelo: 'padrao',
                    largura: 48,
                    imprimirLogo: true
                };
                this.vendaManager.configImpressora = this.configImpressora;
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
            btnImprimir.disabled = false;
            btnImprimir.removeAttribute('disabled');
            btnImprimir.title = "Imprimir Orçamento (impressora padrão do Windows)";
            btnImprimir.style.opacity = '1';
            btnImprimir.style.pointerEvents = 'auto';
            
            if (!btnImprimir.hasAttribute('data-print-listener')) {
                btnImprimir.setAttribute('data-print-listener', 'true');
                btnImprimir.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (this.vendaManager.modoAtual === 'orcamento') {
                        await this.gerarEImprimirOrcamento();
                    } else {
                        mostrarMensagem('Mude para modo ORÇAMENTO para imprimir orçamento', 'info');
                    }
                });
            }
        }
    }

    async gerarEImprimirOrcamento() {
        if (this.vendaManager.carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho para gerar orçamento', 'warning');
            return;
        }
        
        try {
            mostrarLoading('Gerando orçamento...');
            
            const orcamentoData = {
                numero: gerarNumeroOrcamento(),
                itens: this.vendaManager.carrinho.map(item => ({
                    produto_id: item.id,
                    codigo: item.codigo,
                    nome: item.nome,
                    preco_unitario: item.preco_unitario,
                    quantidade: item.quantidade,
                    subtotal: item.subtotal,
                    unidade: item.unidade,
                    valor_unidade: item.valor_unidade,
                    tipo_unidade: item.tipo_unidade
                })),
                subtotal: this.vendaManager.subtotal,
                desconto: this.vendaManager.desconto,
                valor_desconto: this.vendaManager.subtotal * (this.vendaManager.desconto / 100),
                total: this.vendaManager.total,
                vendedor_id: lojaServices.usuarioId,
                vendedor_nome: lojaServices.nomeUsuario,
                data_criacao: new Date(),
                data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                status: 'ativo',
                loja_id: lojaServices.lojaId
            };
            
            const orcamentos = JSON.parse(localStorage.getItem(`orcamentos_${lojaServices.lojaId}`) || '[]');
            orcamentos.push(orcamentoData);
            localStorage.setItem(`orcamentos_${lojaServices.lojaId}`, JSON.stringify(orcamentos));
            
            this.vendaManager.orcamentoAtual = orcamentoData;
            
            await this.imprimirOrcamento(orcamentoData, lojaServices);
            
            esconderLoading();
            mostrarMensagem(`Orçamento #${orcamentoData.numero} gerado e impresso!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao gerar orçamento:', error);
            esconderLoading();
            mostrarMensagem('Erro ao gerar orçamento', 'error');
        }
    }

    async imprimirOrcamento(orcamento, lojaServices) {
        const config = this.configImpressora || { largura: 48 };
        const largura = config.largura || 48;
        
        const nomeLoja = lojaServices.dadosLoja?.nome || 
                         lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const cnpj = lojaServices.dadosLoja?.cnpj || '00.000.000/0000-00';
        const endereco = lojaServices.dadosLoja?.endereco || 'Endereço da Loja';
        const telefone = lojaServices.dadosLoja?.telefone || '(00) 0000-0000';
        
        const dataCriacao = new Date(orcamento.data_criacao).toLocaleString('pt-BR');
        const dataValidade = new Date(orcamento.data_validade).toLocaleDateString('pt-BR');
        
        let conteudo = '';
        
        // CABEÇALHO
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar(nomeLoja, largura) + '\n';
        conteudo += this.centralizar('CNPJ: ' + cnpj, largura) + '\n';
        conteudo += this.centralizar(endereco, largura) + '\n';
        conteudo += this.centralizar('Tel: ' + telefone, largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar('ORÇAMENTO', largura) + '\n';
        conteudo += this.centralizar(`Nº ${orcamento.numero}`, largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += `Data: ${dataCriacao}\n`;
        conteudo += `Vendedor: ${orcamento.vendedor_nome}\n`;
        conteudo += `VALIDADE: ${dataValidade} (10 dias conforme Lei)\n`;
        conteudo += '-'.repeat(largura) + '\n';
        
        // CABEÇALHO DOS ITENS
        conteudo += 'ITEM  DESCRIÇÃO                QTD    UNIT     TOTAL\n';
        conteudo += '-'.repeat(largura) + '\n';
        
        // ITENS
        orcamento.itens.forEach((item, index) => {
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
        
        const subtotalStr = this.formatarMoedaResumida(orcamento.subtotal).padStart(largura - 10);
        conteudo += `Subtotal:${subtotalStr}\n`;
        
        if (orcamento.desconto > 0) {
            const valorDesconto = this.formatarMoedaResumida(orcamento.valor_desconto).padStart(largura - 16);
            conteudo += `Desconto (${orcamento.desconto}%):${valorDesconto}\n`;
        }
        
        const totalStr = this.formatarMoedaResumida(orcamento.total).padStart(largura - 7);
        conteudo += `TOTAL:${totalStr}\n`;
        
        // RODAPÉ
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('ORÇAMENTO VÁLIDO POR 10 DIAS', largura) + '\n';
        conteudo += this.centralizar('Lei Federal nº 8.078/90', largura) + '\n';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('OBRIGADO PELA PREFERÊNCIA!', largura) + '\n';
        conteudo += this.centralizar('VOLTE SEMPRE!', largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += '\n';
        conteudo += this.centralizar(new Date().toLocaleDateString('pt-BR'), largura) + '\n';
        conteudo += this.centralizar(new Date().toLocaleTimeString('pt-BR'), largura) + '\n';
        conteudo += '\n\n\n\n';
        
        this.imprimirNoNavegador(conteudo, 'ORÇAMENTO');
    }

    async imprimirNotaFiscalVenda(venda, lojaServices, isReimpressao = false) {
        const config = this.configImpressora || { largura: 48 };
        const largura = config.largura || 48;
        
        const nomeLoja = lojaServices.dadosLoja?.nome || 
                         lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const cnpj = lojaServices.dadosLoja?.cnpj || '00.000.000/0000-00';
        const endereco = lojaServices.dadosLoja?.endereco || 'Endereço da Loja';
        const telefone = lojaServices.dadosLoja?.telefone || '(00) 0000-0000';
        
        const dataVenda = new Date(venda.data_venda).toLocaleString('pt-BR');
        
        let conteudo = '';
        
        // CABEÇALHO
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar(nomeLoja, largura) + '\n';
        conteudo += this.centralizar('CNPJ: ' + cnpj, largura) + '\n';
        conteudo += this.centralizar(endereco, largura) + '\n';
        conteudo += this.centralizar('Tel: ' + telefone, largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += this.centralizar(isReimpressao ? '2ª VIA - CUPOM NÃO FISCAL' : 'CUPOM NÃO FISCAL', largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += `Data: ${dataVenda}\n`;
        conteudo += `Venda: ${venda.numero}\n`;
        conteudo += `Vendedor: ${venda.vendedor_nome}\n`;
        conteudo += '-'.repeat(largura) + '\n';
        
        // CABEÇALHO DOS ITENS
        conteudo += 'ITEM  DESCRIÇÃO                QTD    UNIT     TOTAL\n';
        conteudo += '-'.repeat(largura) + '\n';
        
        // ITENS
        venda.itens.forEach((item, index) => {
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
        
        const subtotalStr = this.formatarMoedaResumida(venda.subtotal).padStart(largura - 10);
        conteudo += `Subtotal:${subtotalStr}\n`;
        
        if (venda.desconto > 0) {
            const valorDesconto = this.formatarMoedaResumida(venda.valor_desconto).padStart(largura - 16);
            conteudo += `Desconto (${venda.desconto}%):${valorDesconto}\n`;
        }
        
        const totalStr = this.formatarMoedaResumida(venda.total).padStart(largura - 7);
        conteudo += `TOTAL:${totalStr}\n`;
        
        // FORMA DE PAGAMENTO
        const formaPagamentoStr = this.traduzirFormaPagamento(venda.forma_pagamento);
        conteudo += `Pagamento: ${formaPagamentoStr}\n`;
        
        // RODAPÉ
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('OBRIGADO PELA PREFERÊNCIA!', largura) + '\n';
        conteudo += this.centralizar('VOLTE SEMPRE!', largura) + '\n';
        conteudo += this.centralizar('='.repeat(largura), largura) + '\n';
        conteudo += '\n';
        conteudo += this.centralizar(new Date().toLocaleDateString('pt-BR'), largura) + '\n';
        conteudo += this.centralizar(new Date().toLocaleTimeString('pt-BR'), largura) + '\n';
        
        if (isReimpressao) {
            conteudo += '\n';
            conteudo += this.centralizar('*** REIMPRESSÃO ***', largura) + '\n';
        }
        
        conteudo += '\n\n\n\n';
        
        this.imprimirNoNavegador(conteudo, isReimpressao ? 'REIMPRESSÃO' : 'VENDA');
    }

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

    imprimirNoNavegador(conteudo, titulo = 'NOTA FISCAL') {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        const estilo = `
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    background: white;
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
                }
                @media print {
                    body { background: white; }
                    .nota-fiscal { padding: 5px; max-width: 100%; }
                    .no-print { display: none !important; }
                }
                .print-controls {
                    position: fixed; bottom: 0; left: 0; right: 0;
                    background: linear-gradient(to top, rgba(0,0,0,0.1), transparent);
                    padding: 20px; text-align: center; display: flex; gap: 10px;
                    justify-content: center; backdrop-filter: blur(5px);
                }
                .btn-print {
                    background: #27ae60; color: white; border: none;
                    padding: 12px 30px; border-radius: 8px; font-size: 14px;
                    font-weight: bold; cursor: pointer; display: flex;
                    align-items: center; gap: 8px; transition: all 0.3s;
                }
                .btn-print:hover {
                    background: #219a52; transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
                }
                .btn-close {
                    background: #e74c3c; color: white; border: none;
                    padding: 12px 30px; border-radius: 8px; font-size: 14px;
                    font-weight: bold; cursor: pointer; display: flex;
                    align-items: center; gap: 8px; transition: all 0.3s;
                }
                .btn-close:hover {
                    background: #c0392b; transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
                }
            </style>
        `;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${titulo} - PDV</title>
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
                        setTimeout(() => { window.print(); }, 500);
                    <\/script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    mostrarModalConfigImpressora() {
        // Implementar se necessário
    }
}

console.log("✅ Sistema de vendas PDV com orçamentos e histórico carregado!");
