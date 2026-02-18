// venda.js - Sistema PDV Profissional
console.log("🚀 Inicializando PDV...");

import { lojaServices } from './firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let pdv = {
    produtos: [],
    carrinho: [],
    subtotal: 0,
    total: 0,
    descontoTotal: 0,
    formaPagamento: 'dinheiro',
    ultimoProduto: null,
    lojaId: lojaServices?.lojaId || 'loja-padrao'
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página carregada");
    
    try {
        mostrarLoading();
        
        // Verificar loja
        if (!lojaServices || !lojaServices.lojaId) {
            mostrarMensagem('Erro ao identificar loja', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }
        
        pdv.lojaId = lojaServices.lojaId;
        
        // Atualizar interface
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar produtos
        await carregarProdutos();
        
        // Foco no input
        document.getElementById('barcodeInput')?.focus();
        
        esconderLoading();
        console.log("✅ PDV pronto!");
        
    } catch (error) {
        console.error("❌ Erro:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        esconderLoading();
    }
});

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Input de código de barras
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                processarCodigo(this.value.trim());
            }
        });
        
        barcodeInput.addEventListener('input', function() {
            const clearBtn = document.getElementById('barcodeClear');
            if (clearBtn) {
                clearBtn.style.display = this.value ? 'block' : 'none';
            }
        });
    }
    
    // Botão limpar input
    document.getElementById('barcodeClear')?.addEventListener('click', function() {
        const input = document.getElementById('barcodeInput');
        if (input) {
            input.value = '';
            input.focus();
            this.style.display = 'none';
        }
    });
    
    // Botão adicionar
    document.getElementById('btnAddBarcode')?.addEventListener('click', function() {
        const input = document.getElementById('barcodeInput');
        if (input && input.value.trim()) {
            processarCodigo(input.value.trim());
        }
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', function(e) {
        // F2 - Consulta rápida
        if (e.key === 'F2') {
            e.preventDefault();
            abrirConsultaRapida();
        }
        
        // F4 - Focar no desconto do último produto
        if (e.key === 'F4') {
            e.preventDefault();
            document.getElementById('lastProductDiscount')?.focus();
        }
        
        // F8 - Finalizar venda
        if (e.key === 'F8') {
            e.preventDefault();
            if (pdv.carrinho.length > 0) {
                finalizarVenda();
            }
        }
    });
    
    // Botões de ação rápida
    document.getElementById('btnConsultaRapida')?.addEventListener('click', abrirConsultaRapida);
    document.getElementById('btnBuscaManual')?.addEventListener('click', abrirBuscaManual);
    document.getElementById('btnLimparCarrinho')?.addEventListener('click', limparTudo);
    document.getElementById('btnClearCart')?.addEventListener('click', limparTudo);
    
    // Desconto total
    document.getElementById('totalDesconto')?.addEventListener('change', function() {
        pdv.descontoTotal = parseFloat(this.value) || 0;
        atualizarTotais();
        recalcularTodosItens();
    });
    
    // Forma de pagamento
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            pdv.formaPagamento = this.value;
        });
    });
    
    // Botões principais
    document.getElementById('btnFinalizar')?.addEventListener('click', finalizarVenda);
    document.getElementById('btnImprimir')?.addEventListener('click', imprimir);
    document.getElementById('btnCancelar')?.addEventListener('click', cancelarVenda);
    
    // Desconto do último produto
    document.getElementById('lastProductDiscount')?.addEventListener('change', function() {
        if (pdv.ultimoProduto) {
            atualizarDescontoUltimoProduto(parseFloat(this.value) || 0);
        }
    });
    
    // Botão histórico
    document.getElementById('btnHistorico')?.addEventListener('click', abrirHistorico);
    
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', function(e) {
        if (pdv.carrinho.length > 0) {
            if (!confirm('Há itens no carrinho. Deseja realmente voltar?')) {
                e.preventDefault();
            }
        }
    });
    
    // Botão logout
    document.getElementById('btnLogout')?.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja sair?')) {
            lojaServices.logout();
        }
    });
}

// ============================================
// FUNÇÃO PARA ALTERAR QUANTIDADE (GLOBAL)
// ============================================
window.alterarQuantidade = function(delta) {
    const input = document.getElementById('itemQuantity');
    if (!input) return;
    
    let valor = parseInt(input.value) || 1;
    valor += delta;
    
    if (valor < 1) valor = 1;
    if (valor > 999) valor = 999;
    
    input.value = valor;
};

// ============================================
// PROCESSAR CÓDIGO DE BARRAS
// ============================================
function processarCodigo(codigo) {
    if (!codigo) return;
    
    // Limpar código
    codigo = codigo.trim();
    
    // Buscar produto
    const produto = pdv.produtos.find(p => 
        p.codigo === codigo || p.codigo_barras === codigo
    );
    
    if (!produto) {
        mostrarMensagem(`Produto não encontrado: ${codigo}`, 'error');
        
        // Perguntar se quer buscar
        setTimeout(() => {
            if (confirm('Produto não encontrado. Deseja buscar manualmente?')) {
                abrirBuscaManual();
            }
        }, 100);
        
        return;
    }
    
    // Pegar quantidade
    const quantidade = parseInt(document.getElementById('itemQuantity').value) || 1;
    
    // Adicionar ao carrinho
    adicionarAoCarrinho(produto, quantidade);
    
    // Limpar input
    document.getElementById('barcodeInput').value = '';
    document.getElementById('barcodeClear').style.display = 'none';
    
    // Resetar quantidade para 1
    document.getElementById('itemQuantity').value = 1;
}

// ============================================
// ADICIONAR AO CARRINHO
// ============================================
function adicionarAoCarrinho(produto, quantidade) {
    // Verificar se já existe
    const index = pdv.carrinho.findIndex(item => item.id === produto.id);
    
    if (index !== -1) {
        // Atualizar quantidade
        pdv.carrinho[index].quantidade += quantidade;
        pdv.carrinho[index].subtotal = pdv.carrinho[index].quantidade * pdv.carrinho[index].preco_unitario;
        pdv.carrinho[index].subtotalComDesconto = pdv.carrinho[index].subtotal * (1 - pdv.carrinho[index].desconto / 100);
    } else {
        // Novo item
        const novoItem = {
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            desconto: 0,
            subtotal: produto.preco * quantidade,
            subtotalComDesconto: produto.preco * quantidade,
            imagem: produto.imagens?.principal || null
        };
        pdv.carrinho.push(novoItem);
        pdv.ultimoProduto = novoItem;
    }
    
    // Atualizar interfaces
    atualizarListaCarrinho();
    atualizarUltimoProduto();
    atualizarTotais();
    
    // Feedback
    mostrarMensagem(`${quantidade}x ${produto.nome} adicionado`, 'success');
}

// ============================================
// ATUALIZAR LISTA DO CARRINHO
// ============================================
function atualizarListaCarrinho() {
    const tbody = document.getElementById('cartTableBody');
    if (!tbody) return;
    
    if (pdv.carrinho.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-cart">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Carrinho vazio</p>
                        <small>Digite ou escaneie um código de barras</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    pdv.carrinho.forEach((item, index) => {
        const numItem = (index + 1).toString().padStart(2, '0');
        
        html += `
            <tr class="cart-item-row" data-index="${index}">
                <td>${numItem}</td>
                <td>${item.codigo || '---'}</td>
                <td>${item.nome}</td>
                <td>
                    <input type="number" class="qty-input" value="${item.quantidade}" 
                           min="1" max="999" onchange="atualizarQuantidadeItem(${index}, this.value)">
                </td>
                <td class="price-cell">${formatarMoeda(item.preco_unitario)}</td>
                <td>
                    <input type="number" class="item-discount-input" value="${item.desconto}" 
                           min="0" max="100" step="0.1" onchange="atualizarDescontoItem(${index}, this.value)">
                </td>
                <td class="subtotal-cell">${formatarMoeda(item.subtotalComDesconto || item.subtotal)}</td>
                <td>
                    <button class="btn-remove-item" onclick="removerItem(${index})" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Atualizar contador
    document.getElementById('itemCount').textContent = `${pdv.carrinho.length} itens`;
}

// ============================================
// FUNÇÕES GLOBAIS PARA MANIPULAÇÃO DE ITENS
// ============================================
window.atualizarQuantidadeItem = function(index, valor) {
    if (index < 0 || index >= pdv.carrinho.length) return;
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerItem(index);
        return;
    }
    
    pdv.carrinho[index].quantidade = novaQuantidade;
    pdv.carrinho[index].subtotal = novaQuantidade * pdv.carrinho[index].preco_unitario;
    pdv.carrinho[index].subtotalComDesconto = pdv.carrinho[index].subtotal * (1 - pdv.carrinho[index].desconto / 100);
    
    if (index === pdv.carrinho.length - 1) {
        pdv.ultimoProduto = pdv.carrinho[index];
        atualizarUltimoProduto();
    }
    
    atualizarListaCarrinho();
    atualizarTotais();
};

window.atualizarDescontoItem = function(index, valor) {
    if (index < 0 || index >= pdv.carrinho.length) return;
    
    const desconto = parseFloat(valor) || 0;
    
    pdv.carrinho[index].desconto = Math.min(100, Math.max(0, desconto));
    pdv.carrinho[index].subtotalComDesconto = pdv.carrinho[index].subtotal * (1 - pdv.carrinho[index].desconto / 100);
    
    if (index === pdv.carrinho.length - 1) {
        pdv.ultimoProduto = pdv.carrinho[index];
        atualizarUltimoProduto();
    }
    
    atualizarListaCarrinho();
    atualizarTotais();
};

window.removerItem = function(index) {
    if (index < 0 || index >= pdv.carrinho.length) return;
    
    const item = pdv.carrinho[index];
    
    if (confirm(`Remover ${item.nome} do carrinho?`)) {
        pdv.carrinho.splice(index, 1);
        
        // Atualizar último produto se necessário
        if (pdv.carrinho.length > 0) {
            pdv.ultimoProduto = pdv.carrinho[pdv.carrinho.length - 1];
        } else {
            pdv.ultimoProduto = null;
        }
        
        atualizarListaCarrinho();
        atualizarUltimoProduto();
        atualizarTotais();
        mostrarMensagem('Item removido', 'info');
    }
};

// ============================================
// ATUALIZAR ÚLTIMO PRODUTO
// ============================================
function atualizarUltimoProduto() {
    const section = document.getElementById('lastProductSection');
    const produto = pdv.ultimoProduto;
    
    if (!produto) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    document.getElementById('lastProductName').textContent = produto.nome;
    document.getElementById('lastProductCode').textContent = produto.codigo || '---';
    
    // Imagem
    const imgElement = document.getElementById('lastProductImage');
    if (produto.imagem) {
        imgElement.src = produto.imagem;
    } else {
        imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTEwIDYwTDIwIDQwTDMwIDUwTDQwIDMwTDUwIDUwTDYwIDQwTDcwIDYwSDEwWiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNFTSBGT1RPPC90ZXh0Pjwvc3ZnPg==';
    }
    
    document.getElementById('lastProductUnitPrice').textContent = formatarMoeda(produto.preco_unitario);
    document.getElementById('lastProductDiscount').value = produto.desconto || 0;
    document.getElementById('lastProductTotal').textContent = formatarMoeda(produto.subtotalComDesconto || produto.subtotal);
}

function atualizarDescontoUltimoProduto(desconto) {
    if (!pdv.ultimoProduto) return;
    
    const index = pdv.carrinho.length - 1;
    if (index >= 0) {
        pdv.carrinho[index].desconto = desconto;
        pdv.carrinho[index].subtotalComDesconto = pdv.carrinho[index].subtotal * (1 - desconto / 100);
        pdv.ultimoProduto = pdv.carrinho[index];
        
        atualizarListaCarrinho();
        atualizarUltimoProduto();
        atualizarTotais();
    }
}

// ============================================
// ATUALIZAR TOTAIS
// ============================================
function atualizarTotais() {
    // Calcular subtotal (sem descontos individuais)
    pdv.subtotal = pdv.carrinho.reduce((total, item) => total + item.subtotal, 0);
    
    // Calcular total com descontos individuais
    let totalComDescontos = pdv.carrinho.reduce((total, item) => {
        return total + (item.subtotalComDesconto || item.subtotal);
    }, 0);
    
    // Aplicar desconto total
    const descontoTotalValor = totalComDescontos * (pdv.descontoTotal / 100);
    pdv.total = totalComDescontos - descontoTotalValor;
    
    // Atualizar interface
    document.getElementById('subtotal').textContent = formatarMoeda(pdv.subtotal);
    document.getElementById('total').textContent = formatarMoeda(pdv.total);
    
    // Habilitar/desabilitar botão finalizar
    document.getElementById('btnFinalizar').disabled = pdv.carrinho.length === 0;
}

function recalcularTodosItens() {
    pdv.carrinho.forEach(item => {
        item.subtotalComDesconto = item.subtotal * (1 - item.desconto / 100);
    });
    
    if (pdv.ultimoProduto) {
        const index = pdv.carrinho.length - 1;
        if (index >= 0) {
            pdv.ultimoProduto = pdv.carrinho[index];
            atualizarUltimoProduto();
        }
    }
    
    atualizarListaCarrinho();
    atualizarTotais();
}

// ============================================
// LIMPAR TUDO
// ============================================
function limparTudo() {
    if (pdv.carrinho.length === 0) return;
    
    if (confirm('Tem certeza que deseja limpar todo o carrinho?')) {
        pdv.carrinho = [];
        pdv.ultimoProduto = null;
        pdv.subtotal = 0;
        pdv.total = 0;
        pdv.descontoTotal = 0;
        
        document.getElementById('totalDesconto').value = 0;
        document.getElementById('lastProductSection').style.display = 'none';
        
        atualizarListaCarrinho();
        atualizarTotais();
        
        mostrarMensagem('Carrinho limpo', 'info');
        document.getElementById('barcodeInput').focus();
    }
}

// ============================================
// FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        return;
    }
    
    if (!confirm(`Finalizar venda no valor de ${formatarMoeda(pdv.total)}?`)) return;
    
    try {
        mostrarLoading('Processando venda...');
        
        const venda = {
            numero: gerarNumeroVenda(),
            data: new Date(),
            itens: pdv.carrinho,
            subtotal: pdv.subtotal,
            descontoTotal: pdv.descontoTotal,
            total: pdv.total,
            formaPagamento: pdv.formaPagamento,
            vendedor: lojaServices.nomeUsuario || 'Vendedor',
            lojaId: pdv.lojaId
        };
        
        // Salvar no localStorage
        const vendas = JSON.parse(localStorage.getItem(`vendas_${pdv.lojaId}`) || '[]');
        vendas.push(venda);
        localStorage.setItem(`vendas_${pdv.lojaId}`, JSON.stringify(vendas));
        
        mostrarMensagem(`Venda #${venda.numero} finalizada!`, 'success');
        
        // Limpar carrinho
        limparTudo();
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao finalizar venda', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// IMPRIMIR
// ============================================
function imprimir() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        return;
    }
    
    // Simples impressão no console
    console.log('=== CUPOM NÃO FISCAL ===');
    console.log(`Data: ${new Date().toLocaleString()}`);
    console.log('-------------------');
    pdv.carrinho.forEach(item => {
        console.log(`${item.nome.substring(0, 20)}`);
        console.log(`  ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotalComDesconto || item.subtotal)}`);
    });
    console.log('-------------------');
    console.log(`Subtotal: ${formatarMoeda(pdv.subtotal)}`);
    if (pdv.descontoTotal > 0) {
        console.log(`Desconto: ${pdv.descontoTotal}%`);
    }
    console.log(`TOTAL: ${formatarMoeda(pdv.total)}`);
    console.log('===================');
    
    mostrarMensagem('Impressão enviada!', 'success');
}

// ============================================
// CANCELAR VENDA
// ============================================
function cancelarVenda() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Nada para cancelar', 'info');
        return;
    }
    
    if (confirm('Cancelar esta venda?')) {
        limparTudo();
    }
}

// ============================================
// CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            pdv.produtos = resultado.data;
            console.log(`✅ ${pdv.produtos.length} produtos carregados`);
        } else {
            console.error('Erro ao carregar produtos');
            pdv.produtos = [];
        }
    } catch (error) {
        console.error('Erro:', error);
        pdv.produtos = [];
    }
}

// ============================================
// MODAIS
// ============================================
function abrirConsultaRapida() {
    const modal = document.getElementById('consultaModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('consultaInput')?.focus();
    
    configurarConsultaRapida();
}

function configurarConsultaRapida() {
    const input = document.getElementById('consultaInput');
    const results = document.getElementById('consultaResults');
    
    if (!input || !results) return;
    
    input.value = '';
    results.innerHTML = '<div class="empty-state">Digite para consultar</div>';
    
    input.oninput = function() {
        const termo = this.value.toLowerCase();
        
        if (!termo) {
            results.innerHTML = '<div class="empty-state">Digite para consultar</div>';
            return;
        }
        
        const filtrados = pdv.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo))
        ).slice(0, 10);
        
        if (filtrados.length === 0) {
            results.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
            return;
        }
        
        let html = '';
        filtrados.forEach(p => {
            html += `
                <div class="consulta-item" onclick="selecionarProdutoConsulta('${p.id}')">
                    <div><strong>${p.codigo || '---'}</strong> - ${p.nome}</div>
                    <div class="consulta-preco">${formatarMoeda(p.preco)}</div>
                </div>
            `;
        });
        
        results.innerHTML = html;
    };
}

window.selecionarProdutoConsulta = function(id) {
    const produto = pdv.produtos.find(p => p.id === id);
    if (produto) {
        mostrarMensagem(`${produto.nome}: ${formatarMoeda(produto.preco)}`, 'info', 5000);
        fecharModal('consultaModal');
    }
};

function abrirBuscaManual() {
    const modal = document.getElementById('buscaModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('buscaInput')?.focus();
    
    configurarBuscaManual();
}

function configurarBuscaManual() {
    const input = document.getElementById('buscaInput');
    const results = document.getElementById('buscaResults');
    
    if (!input || !results) return;
    
    input.value = '';
    results.innerHTML = '<div class="empty-state">Digite para buscar</div>';
    
    input.oninput = function() {
        const termo = this.value.toLowerCase();
        
        if (!termo) {
            results.innerHTML = '<div class="empty-state">Digite para buscar</div>';
            return;
        }
        
        const filtrados = pdv.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termo))
        );
        
        if (filtrados.length === 0) {
            results.innerHTML = '<div class="empty-state">Nenhum produto encontrado</div>';
            return;
        }
        
        let html = '';
        filtrados.forEach(p => {
            html += `
                <div class="busca-item" onclick="adicionarProdutoBusca('${p.id}')">
                    <div><strong>${p.codigo || '---'}</strong></div>
                    <div>${p.nome}</div>
                    <div class="busca-preco">${formatarMoeda(p.preco)}</div>
                    <div>Estoque: ${p.quantidade || 0}</div>
                </div>
            `;
        });
        
        results.innerHTML = html;
    };
}

window.adicionarProdutoBusca = function(id) {
    const produto = pdv.produtos.find(p => p.id === id);
    if (produto) {
        const quantidade = parseInt(document.getElementById('itemQuantity').value) || 1;
        adicionarAoCarrinho(produto, quantidade);
        fecharModal('buscaModal');
    }
};

function abrirHistorico() {
    const modal = document.getElementById('historicoModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('filtroData').value = hoje;
    
    carregarHistorico();
}

function carregarHistorico() {
    const data = document.getElementById('filtroData')?.value;
    const numero = document.getElementById('filtroNumero')?.value?.toLowerCase();
    const results = document.getElementById('historicoResults');
    
    if (!results) return;
    
    const vendas = JSON.parse(localStorage.getItem(`vendas_${pdv.lojaId}`) || '[]');
    
    let filtradas = vendas;
    
    if (data) {
        filtradas = filtradas.filter(v => 
            new Date(v.data).toISOString().split('T')[0] === data
        );
    }
    
    if (numero) {
        filtradas = filtradas.filter(v => 
            v.numero?.toLowerCase().includes(numero)
        );
    }
    
    if (filtradas.length === 0) {
        results.innerHTML = '<div class="empty-state">Nenhuma venda encontrada</div>';
        return;
    }
    
    let html = '';
    
    filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    filtradas.forEach(v => {
        html += `
            <div class="historico-item">
                <div class="historico-header">
                    <span><strong>#${v.numero}</strong> - ${new Date(v.data).toLocaleString()}</span>
                    <span class="historico-total">${formatarMoeda(v.total)}</span>
                </div>
                <div class="historico-detalhes">
                    <div>Itens: ${v.itens?.length || 0}</div>
                    <div>Pagamento: ${v.formaPagamento}</div>
                    <div>Vendedor: ${v.vendedor}</div>
                </div>
            </div>
        `;
    });
    
    results.innerHTML = html;
}

window.filtrarHistorico = function() {
    carregarHistorico();
};

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function gerarNumeroVenda() {
    const agora = new Date();
    const ano = agora.getFullYear().toString().slice(-2);
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const dia = agora.getDate().toString().padStart(2, '0');
    const hora = agora.getHours().toString().padStart(2, '0');
    const min = agora.getMinutes().toString().padStart(2, '0');
    const seg = agora.getSeconds().toString().padStart(2, '0');
    return `${ano}${mes}${dia}${hora}${min}${seg}`;
}

function atualizarInterfaceLoja() {
    const nomeLoja = pdv.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('nomeLoja').textContent = nomeLoja;
    document.getElementById('footerLojaNome').textContent = nomeLoja;
    
    if (lojaServices.nomeUsuario) {
        document.getElementById('userName').textContent = lojaServices.nomeUsuario;
    }
    
    atualizarRelogio();
    setInterval(atualizarRelogio, 1000);
}

function atualizarRelogio() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = new Date().toLocaleString('pt-BR');
    }
}

function mostrarLoading(texto = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.querySelector('h3').textContent = texto;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) return;
    
    alert.className = `message-alert ${tipo}`;
    alert.querySelector('.message-text').textContent = texto;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

// Função global para fechar modais
window.fecharModal = function(id) {
    document.getElementById(id).style.display = 'none';
};

// Fechar modais clicando fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

console.log("✅ PDV carregado com sucesso!");
