// venda.js - SISTEMA DE VENDAS PDV - VERSÃO MERCADINHO
console.log("🛒 Sistema PDV - Versão Mercadinho");

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
    modoAtual: 'venda',
    ultimoCodigo: '',
    historicoVendas: []
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
        
        // Criar instância dos serviços avançados
        window.servicosAvancados = new ServicosAvancadosPDV(vendaManager);
        
        atualizarInterfaceLoja();
        configurarEventos();
        carregarProdutos();
        
        esconderLoading();
        console.log("✅ PDV pronto para vendas");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de vendas', 'error');
        esconderLoading();
    }
});

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Input de scan (principal)
    const scanInput = document.getElementById('scanInput');
    if (scanInput) {
        scanInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                processarCodigo(this.value.trim());
                this.value = '';
            }
        });
        
        scanInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('scanClear');
            if (clearBtn) {
                clearBtn.style.display = this.value ? 'block' : 'none';
            }
        });
    }
    
    // Botão limpar scan
    const scanClear = document.getElementById('scanClear');
    if (scanClear) {
        scanClear.addEventListener('click', function() {
            const input = document.getElementById('scanInput');
            if (input) {
                input.value = '';
                input.focus();
                this.style.display = 'none';
            }
        });
    }
    
    // Botão buscar (abre modal)
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', abrirModalBusca);
    }
    
    // Botão consulta rápida
    const btnConsulta = document.getElementById('btnConsultaRapida');
    if (btnConsulta) {
        btnConsulta.addEventListener('click', abrirModalConsultaRapida);
    }
    
    // Botão histórico
    const btnHistorico = document.getElementById('btnHistorico');
    if (btnHistorico) {
        btnHistorico.addEventListener('click', abrirModalHistorico);
    }
    
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            if (vendaManager.carrinho.length > 0) {
                if (!confirm('Há itens no carrinho. Deseja realmente voltar?')) {
                    e.preventDefault();
                }
            }
        });
    }
    
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
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
    
    // Modos (Venda/Orçamento)
    const btnModoVenda = document.getElementById('btnModoVenda');
    const btnModoOrcamento = document.getElementById('btnModoOrcamento');
    
    if (btnModoVenda) {
        btnModoVenda.addEventListener('click', () => alternarModo('venda'));
    }
    
    if (btnModoOrcamento) {
        btnModoOrcamento.addEventListener('click', () => alternarModo('orcamento'));
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
    if (btnGerarOrcamento) {
        btnGerarOrcamento.addEventListener('click', gerarOrcamento);
    }
    
    // Botão cancelar
    const btnCancelar = document.getElementById('btnCancelarVenda');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0) {
                if (confirm('Cancelar a venda/orçamento atual?')) {
                    limparCarrinho();
                }
            }
        });
    }
}

// ============================================
// PROCESSAR CÓDIGO ESCANEADO
// ============================================
function processarCodigo(codigo) {
    // Limpar código (remover espaços, etc)
    codigo = codigo.trim();
    
    // Atualizar último código
    vendaManager.ultimoCodigo = codigo;
    const lastScanned = document.getElementById('lastScanned');
    const lastCode = document.getElementById('lastCode');
    if (lastScanned && lastCode) {
        lastCode.textContent = codigo;
        lastScanned.style.display = 'flex';
    }
    
    // Buscar produto
    const produto = vendaManager.produtos.find(p => 
        p.codigo === codigo || p.codigo_barras === codigo
    );
    
    if (produto) {
        // Verificar estoque se for venda
        if (vendaManager.modoAtual === 'venda' && produto.quantidade <= 0) {
            mostrarMensagem(`Produto ${produto.nome} sem estoque`, 'warning');
            const lastProduct = document.getElementById('lastProduct');
            if (lastProduct) {
                lastProduct.textContent = '⚠️ SEM ESTOQUE';
            }
            return;
        }
        
        // Adicionar ao carrinho
        adicionarAoCarrinho(produto, 1);
        
        // Atualizar último produto
        const lastProduct = document.getElementById('lastProduct');
        if (lastProduct) {
            lastProduct.textContent = produto.nome;
        }
        
        // Feedback sonoro (se quiser)
        // new Audio('beep.mp3').play().catch(() => {});
        
    } else {
        mostrarMensagem(`Produto não encontrado: ${codigo}`, 'error');
        const lastProduct = document.getElementById('lastProduct');
        if (lastProduct) {
            lastProduct.textContent = '❌ NÃO ENCONTRADO';
        }
        
        // Perguntar se quer buscar manualmente
        setTimeout(() => {
            if (confirm(`Produto com código ${codigo} não encontrado. Deseja buscar manualmente?`)) {
                abrirModalBusca();
            }
        }, 100);
    }
}

// ============================================
// ADICIONAR AO CARRINHO
// ============================================
function adicionarAoCarrinho(produto, quantidade) {
    if (quantidade <= 0) {
        mostrarMensagem('Quantidade inválida', 'error');
        return;
    }
    
    const index = vendaManager.carrinho.findIndex(item => item.id === produto.id);
    
    if (index !== -1) {
        // Se já existe, aumentar quantidade
        vendaManager.carrinho[index].quantidade += quantidade;
        vendaManager.carrinho[index].subtotal = vendaManager.carrinho[index].quantidade * vendaManager.carrinho[index].preco_unitario;
    } else {
        // Novo item
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
    
    // Atualizar interfaces
    atualizarListaProdutos();
    atualizarResumoCarrinho();
    atualizarTotais();
    
    mostrarMensagem(`${quantidade}x ${produto.nome} adicionado`, 'success');
}

// ============================================
// ATUALIZAR LISTA DE PRODUTOS (TABELA)
// ============================================
function atualizarListaProdutos() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (vendaManager.carrinho.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Nenhum produto adicionado</p>
                        <small>Escaneie ou digite o código do produto</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    vendaManager.carrinho.forEach((item, index) => {
        html += `
            <tr class="product-row" data-index="${index}">
                <td class="product-code">${item.codigo || '---'}</td>
                <td class="product-name" title="${item.nome}">${item.nome}</td>
                <td>
                    <div class="product-qty">
                        <input type="number" class="qty-input" value="${item.quantidade}" 
                               min="1" step="1" onchange="atualizarQuantidadeItem(${index}, this.value)">
                    </div>
                </td>
                <td class="product-price">${formatarMoeda(item.preco_unitario)}</td>
                <td class="product-subtotal">${formatarMoeda(item.subtotal)}</td>
                <td>
                    <button class="btn-remove-row" onclick="removerItem(${index})" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Atualizar contador
    const productCount = document.getElementById('productCount');
    if (productCount) {
        productCount.textContent = `${vendaManager.carrinho.length} item${vendaManager.carrinho.length !== 1 ? 's' : ''}`;
    }
}

// ============================================
// ATUALIZAR RESUMO DO CARRINHO
// ============================================
function atualizarResumoCarrinho() {
    const summary = document.getElementById('cartItemsSummary');
    if (!summary) return;
    
    if (vendaManager.carrinho.length === 0) {
        summary.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
                <small>Escaneie produtos para começar</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    vendaManager.carrinho.forEach(item => {
        html += `
            <div class="cart-item-summary">
                <div class="item-qty">${item.quantidade}</div>
                <div class="item-info">
                    <div class="item-name">${item.nome}</div>
                    <div class="item-code">${item.codigo || '---'}</div>
                </div>
                <div class="item-total">${formatarMoeda(item.subtotal)}</div>
            </div>
        `;
    });
    
    summary.innerHTML = html;
}

// ============================================
// FUNÇÕES GLOBAIS PARA OS BOTÕES
// ============================================
window.atualizarQuantidadeItem = function(index, valor) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerItem(index);
        return;
    }
    
    vendaManager.carrinho[index].quantidade = novaQuantidade;
    vendaManager.carrinho[index].subtotal = novaQuantidade * vendaManager.carrinho[index].preco_unitario;
    
    atualizarListaProdutos();
    atualizarResumoCarrinho();
    atualizarTotais();
};

window.removerItem = function(index) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    if (confirm(`Remover ${item.nome} do carrinho?`)) {
        vendaManager.carrinho.splice(index, 1);
        atualizarListaProdutos();
        atualizarResumoCarrinho();
        atualizarTotais();
        mostrarMensagem('Item removido', 'info');
    }
};

// ============================================
// ATUALIZAR TOTAIS
// ============================================
function atualizarTotais() {
    vendaManager.subtotal = vendaManager.carrinho.reduce((total, item) => total + item.subtotal, 0);
    const valorDesconto = vendaManager.subtotal * (vendaManager.desconto / 100);
    vendaManager.total = vendaManager.subtotal - valorDesconto;
    
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');
    
    if (subtotalElement) subtotalElement.textContent = formatarMoeda(vendaManager.subtotal);
    if (totalElement) totalElement.textContent = formatarMoeda(vendaManager.total);
    
    // Habilitar/desabilitar botões
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    
    if (btnFinalizar) btnFinalizar.disabled = vendaManager.carrinho.length === 0;
    if (btnGerarOrcamento) btnGerarOrcamento.disabled = vendaManager.carrinho.length === 0;
}

// ============================================
// LIMPAR CARRINHO
// ============================================
function limparCarrinho() {
    vendaManager.carrinho = [];
    vendaManager.subtotal = 0;
    vendaManager.total = 0;
    vendaManager.desconto = 0;
    
    atualizarListaProdutos();
    atualizarResumoCarrinho();
    atualizarTotais();
    
    const descontoInput = document.getElementById('desconto');
    if (descontoInput) descontoInput.value = 0;
    
    // Esconder último escaneado
    const lastScanned = document.getElementById('lastScanned');
    if (lastScanned) lastScanned.style.display = 'none';
    
    mostrarMensagem('Carrinho limpo', 'info');
}

// ============================================
// ALTERNAR MODO
// ============================================
function alternarModo(modo) {
    vendaManager.modoAtual = modo;
    
    const btnModoVenda = document.getElementById('btnModoVenda');
    const btnModoOrcamento = document.getElementById('btnModoOrcamento');
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    const btnGerarOrcamento = document.getElementById('btnGerarOrcamento');
    
    if (btnModoVenda) btnModoVenda.classList.toggle('active', modo === 'venda');
    if (btnModoOrcamento) btnModoOrcamento.classList.toggle('active', modo === 'orcamento');
    
    if (btnFinalizar) btnFinalizar.style.display = modo === 'venda' ? 'flex' : 'none';
    if (btnGerarOrcamento) btnGerarOrcamento.style.display = modo === 'orcamento' ? 'flex' : 'none';
    
    limparCarrinho();
    mostrarMensagem(`Modo ${modo === 'venda' ? 'VENDA' : 'ORÇAMENTO'} ativado`, 'info');
}

// ============================================
// CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            vendaManager.produtos = resultado.data;
            console.log(`✅ ${vendaManager.produtos.length} produtos carregados`);
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            vendaManager.produtos = [];
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        vendaManager.produtos = [];
    }
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
// FUNÇÕES DOS MODAIS
// ============================================
function abrirModalBusca() {
    const modal = document.getElementById('searchModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
        const input = document.getElementById('searchProductInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }, 100);
    
    // Configurar busca
    configurarBuscaModal();
}

function configurarBuscaModal() {
    const input = document.getElementById('searchProductInput');
    const results = document.getElementById('searchResults');
    const clearBtn = document.getElementById('searchClear');
    
    if (!input || !results) return;
    
    input.addEventListener('input', function() {
        const termo = this.value.toLowerCase();
        
        if (!termo.trim()) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Digite para buscar produtos</p>
                </div>
            `;
            return;
        }
        
        const filtrados = vendaManager.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termo))
        );
        
        if (filtrados.length === 0) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="results-list">';
        
        filtrados.forEach(p => {
            html += `
                <div class="product-result" onclick="selecionarProdutoBusca('${p.id}')">
                    <div class="product-info">
                        <strong>${p.codigo || '---'}</strong> - ${p.nome}
                    </div>
                    <div class="product-price">${formatarMoeda(p.preco)}</div>
                </div>
            `;
        });
        
        html += '</div>';
        results.innerHTML = html;
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            input.value = '';
            input.focus();
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Digite para buscar produtos</p>
                </div>
            `;
        });
    }
    
    // Fechar modal
    document.getElementById('closeSearchModal')?.addEventListener('click', fecharModalBusca);
    document.getElementById('btnCloseSearch')?.addEventListener('click', fecharModalBusca);
}

window.selecionarProdutoBusca = function(produtoId) {
    const produto = vendaManager.produtos.find(p => p.id === produtoId);
    if (produto) {
        adicionarAoCarrinho(produto, 1);
        fecharModalBusca();
    }
};

function fecharModalBusca() {
    const modal = document.getElementById('searchModal');
    if (modal) modal.style.display = 'none';
}

function abrirModalConsultaRapida() {
    const modal = document.getElementById('consultaRapidaModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
        const input = document.getElementById('consultaInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }, 100);
    
    configurarConsultaRapida();
}

function configurarConsultaRapida() {
    const input = document.getElementById('consultaInput');
    const results = document.getElementById('consultaResults');
    const clearBtn = document.getElementById('consultaClear');
    
    if (!input || !results) return;
    
    input.addEventListener('input', function() {
        const termo = this.value.toLowerCase();
        
        if (!termo.trim()) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Digite para consultar preços</p>
                </div>
            `;
            return;
        }
        
        const filtrados = vendaManager.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo))
        );
        
        if (filtrados.length === 0) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="consulta-grid">';
        
        filtrados.forEach(p => {
            html += `
                <div class="consulta-card">
                    <div><strong>${p.codigo || '---'}</strong></div>
                    <div>${p.nome}</div>
                    <div class="consulta-preco">${formatarMoeda(p.preco)}</div>
                    <div>Estoque: ${p.quantidade || 0} ${p.unidade || 'UN'}</div>
                </div>
            `;
        });
        
        html += '</div>';
        results.innerHTML = html;
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            input.value = '';
            input.focus();
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p>Digite para consultar preços</p>
                </div>
            `;
        });
    }
    
    document.getElementById('closeConsultaModal')?.addEventListener('click', () => {
        document.getElementById('consultaRapidaModal').style.display = 'none';
    });
    
    document.getElementById('btnFecharConsulta')?.addEventListener('click', () => {
        document.getElementById('consultaRapidaModal').style.display = 'none';
    });
}

// ============================================
// FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho', 'warning');
        return;
    }
    
    if (!confirm(`Finalizar venda no valor de ${formatarMoeda(vendaManager.total)}?`)) return;
    
    try {
        mostrarLoading('Processando venda...');
        
        const vendaData = {
            numero: gerarNumeroVenda(),
            itens: vendaManager.carrinho,
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            total: vendaManager.total,
            forma_pagamento: vendaManager.formaPagamento,
            vendedor_nome: lojaServices.nomeUsuario,
            data_venda: new Date(),
            loja_id: lojaServices.lojaId
        };
        
        // Simular sucesso (aqui você chamaria a API)
        console.log('Venda finalizada:', vendaData);
        
        // Salvar no histórico
        const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
        vendas.push(vendaData);
        localStorage.setItem(`vendas_${lojaServices.lojaId}`, JSON.stringify(vendas));
        
        mostrarMensagem(`Venda finalizada! Total: ${formatarMoeda(vendaManager.total)}`, 'success');
        
        // Imprimir (se tiver configuração)
        if (window.servicosAvancados) {
            await window.servicosAvancados.imprimirNotaFiscalVenda(vendaData, lojaServices);
        }
        
        limparCarrinho();
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao finalizar venda', 'error');
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
    const min = data.getMinutes().toString().padStart(2, '0');
    const seg = data.getSeconds().toString().padStart(2, '0');
    return `${ano}${mes}${dia}${hora}${min}${seg}`;
}

// ============================================
// GERAR ORÇAMENTO
// ============================================
async function gerarOrcamento() {
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho', 'warning');
        return;
    }
    
    try {
        mostrarLoading('Gerando orçamento...');
        
        const orcamentoData = {
            numero: 'ORC-' + gerarNumeroVenda(),
            itens: vendaManager.carrinho,
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            total: vendaManager.total,
            vendedor_nome: lojaServices.nomeUsuario,
            data_criacao: new Date(),
            data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            loja_id: lojaServices.lojaId
        };
        
        // Salvar
        const orcamentos = JSON.parse(localStorage.getItem(`orcamentos_${lojaServices.lojaId}`) || '[]');
        orcamentos.push(orcamentoData);
        localStorage.setItem(`orcamentos_${lojaServices.lojaId}`, JSON.stringify(orcamentos));
        
        mostrarMensagem(`Orçamento ${orcamentoData.numero} gerado!`, 'success');
        
        // Imprimir
        if (window.servicosAvancados) {
            await window.servicosAvancados.imprimirOrcamento(orcamentoData, lojaServices);
        }
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao gerar orçamento', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// MODAL HISTÓRICO
// ============================================
function abrirModalHistorico() {
    const modal = document.getElementById('historicoModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('filtroData').value = hoje;
    
    carregarHistorico();
    configurarFiltrosHistorico();
}

function configurarFiltrosHistorico() {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnLimpar = document.getElementById('btnLimparFiltros');
    
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', carregarHistorico);
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            document.getElementById('filtroData').value = '';
            document.getElementById('filtroNumero').value = '';
            carregarHistorico();
        });
    }
    
    document.getElementById('closeHistoricoModal')?.addEventListener('click', () => {
        document.getElementById('historicoModal').style.display = 'none';
    });
    
    document.getElementById('btnFecharHistorico')?.addEventListener('click', () => {
        document.getElementById('historicoModal').style.display = 'none';
    });
}

function carregarHistorico() {
    const data = document.getElementById('filtroData')?.value;
    const numero = document.getElementById('filtroNumero')?.value?.toLowerCase();
    const results = document.getElementById('historicoResults');
    
    if (!results) return;
    
    const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
    
    let filtradas = vendas;
    
    if (data) {
        filtradas = filtradas.filter(v => 
            new Date(v.data_venda).toISOString().split('T')[0] === data
        );
    }
    
    if (numero) {
        filtradas = filtradas.filter(v => 
            v.numero?.toLowerCase().includes(numero)
        );
    }
    
    if (filtradas.length === 0) {
        results.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; opacity: 0.2;"></i>
                <p>Nenhuma venda encontrada</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    filtradas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
    
    filtradas.forEach(v => {
        const dataVenda = new Date(v.data_venda).toLocaleString('pt-BR');
        
        html += `
            <div class="historico-item">
                <div class="historico-header">
                    <div><strong>#${v.numero || 'N/A'}</strong> - ${dataVenda}</div>
                    <div class="historico-total">${formatarMoeda(v.total)}</div>
                </div>
                <div class="historico-detalhes">
                    <div>Vendedor: ${v.vendedor_nome || 'N/A'}</div>
                    <div>Itens: ${v.itens?.length || 0}</div>
                    <div>Pagamento: ${v.forma_pagamento || 'N/A'}</div>
                </div>
                <div class="historico-acoes">
                    <button class="btn-historico-print" onclick="window.reimprimirVenda('${v.numero}')">
                        <i class="fas fa-print"></i> Reimprimir
                    </button>
                    <button class="btn-historico-view" onclick="window.verDetalhesVenda('${v.numero}')">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </div>
            </div>
        `;
    });
    
    results.innerHTML = html;
}

window.reimprimirVenda = function(numero) {
    const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
    const venda = vendas.find(v => v.numero === numero);
    
    if (venda && window.servicosAvancados) {
        window.servicosAvancados.imprimirNotaFiscalVenda(venda, lojaServices, true);
        mostrarMensagem(`Reimpressão da venda ${numero} enviada`, 'success');
    }
};

window.verDetalhesVenda = function(numero) {
    const vendas = JSON.parse(localStorage.getItem(`vendas_${lojaServices.lojaId}`) || '[]');
    const venda = vendas.find(v => v.numero === numero);
    
    if (!venda) return;
    
    let detalhes = `VENDA #${venda.numero}\n`;
    detalhes += `Data: ${new Date(venda.data_venda).toLocaleString('pt-BR')}\n`;
    detalhes += `Vendedor: ${venda.vendedor_nome}\n`;
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
// CLASSE DE SERVIÇOS AVANÇADOS
// ============================================
class ServicosAvancadosPDV {
    constructor(vendaManager) {
        this.vendaManager = vendaManager;
        this.configImpressora = { largura: 48 };
    }

    async imprimirNotaFiscalVenda(venda, lojaServices, isReimpressao = false) {
        const largura = 48;
        
        let conteudo = '';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('NOTA FISCAL', largura) + '\n';
        conteudo += this.centralizar(isReimpressao ? '2ª VIA' : 'CUPOM NÃO FISCAL', largura) + '\n';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += `Venda: ${venda.numero}\n`;
        conteudo += `Data: ${new Date(venda.data_venda).toLocaleString('pt-BR')}\n`;
        conteudo += `Vendedor: ${venda.vendedor_nome}\n`;
        conteudo += '-'.repeat(largura) + '\n';
        
        venda.itens.forEach((item, i) => {
            conteudo += `${i+1}. ${item.nome.substring(0, 20)}\n`;
            conteudo += `   ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}\n`;
        });
        
        conteudo += '-'.repeat(largura) + '\n';
        conteudo += `Subtotal: ${formatarMoeda(venda.subtotal)}\n`;
        if (venda.desconto > 0) {
            conteudo += `Desconto: ${venda.desconto}%\n`;
        }
        conteudo += `TOTAL: ${formatarMoeda(venda.total)}\n`;
        conteudo += '='.repeat(largura) + '\n';
        
        this.imprimirNoNavegador(conteudo);
    }

    async imprimirOrcamento(orcamento, lojaServices) {
        const largura = 48;
        const validade = new Date(orcamento.data_validade).toLocaleDateString('pt-BR');
        
        let conteudo = '';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += this.centralizar('ORÇAMENTO', largura) + '\n';
        conteudo += this.centralizar(orcamento.numero, largura) + '\n';
        conteudo += '='.repeat(largura) + '\n';
        conteudo += `Data: ${new Date(orcamento.data_criacao).toLocaleString('pt-BR')}\n`;
        conteudo += `Vendedor: ${orcamento.vendedor_nome}\n`;
        conteudo += `Validade: ${validade} (10 dias)\n`;
        conteudo += '-'.repeat(largura) + '\n';
        
        orcamento.itens.forEach((item, i) => {
            conteudo += `${i+1}. ${item.nome.substring(0, 20)}\n`;
            conteudo += `   ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}\n`;
        });
        
        conteudo += '-'.repeat(largura) + '\n';
        conteudo += `Subtotal: ${formatarMoeda(orcamento.subtotal)}\n`;
        if (orcamento.desconto > 0) {
            conteudo += `Desconto: ${orcamento.desconto}%\n`;
        }
        conteudo += `TOTAL: ${formatarMoeda(orcamento.total)}\n`;
        conteudo += '='.repeat(largura) + '\n';
        
        this.imprimirNoNavegador(conteudo);
    }

    centralizar(texto, largura) {
        if (texto.length >= largura) return texto;
        const espacos = Math.floor((largura - texto.length) / 2);
        return ' '.repeat(espacos) + texto;
    }

    imprimirNoNavegador(conteudo) {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Impressão</title>
                    <style>
                        body { font-family: monospace; font-size: 12px; padding: 20px; white-space: pre; }
                    </style>
                </head>
                <body>${conteudo}</body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

console.log("✅ Sistema PDV - Versão Mercadinho carregado!");
