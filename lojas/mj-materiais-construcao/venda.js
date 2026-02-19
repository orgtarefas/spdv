// venda.js - Sistema PDV Profissional com Vendas e Orçamentos
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
    formaPagamento: 'dinheiro',
    tipoEntrega: 'retirada',
    produtoSelecionado: null,
    lojaId: lojaServices?.lojaId || null,
    ultimaVenda: null,
    ultimoOrcamento: null,
    vendedorNome: lojaServices?.nomeUsuario || 'Vendedor',
    vendedorId: lojaServices?.usuarioId || null,
    vendedorLogin: lojaServices?.loginUsuario || 'operador',
    dadosEntrega: null
};

// ============================================
// FUNÇÃO PARA TORNAR MODAIS ARRASTÁVEIS
// ============================================
function tornarModalArrastavel(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const header = modal.querySelector('.modal-header');
    const content = modal.querySelector('.modal-content');
    
    if (!header || !content) return;
    
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
        // Não arrastar se clicou no botão fechar
        if (e.target.classList.contains('modal-close') || 
            e.target.closest('.modal-close')) {
            return;
        }
        
        e.preventDefault();
        
        // Posição atual do mouse
        const rect = content.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        isDragging = true;
        content.classList.add('moving');
        
        // Trazer para frente
        content.style.zIndex = '10000';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        
        // Calcular nova posição
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        
        // Limitar para não sair da tela
        const maxX = window.innerWidth - content.offsetWidth;
        const maxY = window.innerHeight - content.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        // Aplicar nova posição
        content.style.left = newX + 'px';
        content.style.top = newY + 'px';
        content.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            content.classList.remove('moving');
            content.style.zIndex = '';
        }
    });
}


// ============================================
// FUNÇÃO PARA ABRIR MODAL
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`❌ Modal não encontrado: ${modalId}`);
        return;
    }
    
    const content = modal.querySelector('.modal-content');
    
    // Resetar posição para o centro na primeira abertura
    if (!content.hasAttribute('data-position-set')) {
        content.style.left = '50%';
        content.style.top = '50%';
        content.style.transform = 'translate(-50%, -50%)';
        content.setAttribute('data-position-set', 'true');
    }
    
    modal.style.display = 'block';
    
    // Trazer para frente
    content.style.zIndex = '10000';
    
    // Bloquear scroll do body
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    
    console.log(`✅ Janela ${modalId} aberta`);
}

// ============================================
// FUNÇÃO PARA FECHAR MODAL
// ============================================
window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.style.display = 'none';
    
    // Liberar scroll
    const modalsAbertos = document.querySelectorAll('.modal[style*="display: block"]');
    if (modalsAbertos.length === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
    
    console.log(`✅ Janela ${modalId} fechada`);
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página carregada");
    
    try {
        mostrarLoading('Inicializando PDV...');
        
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }
        
        pdv.lojaId = lojaServices.lojaId;
        pdv.vendedorNome = lojaServices.nomeUsuario || 'Vendedor';
        pdv.vendedorId = lojaServices.usuarioId || null;
        pdv.vendedorLogin = lojaServices.loginUsuario || 'operador';
        
        console.log(`✅ Loja identificada: ${pdv.lojaId}`);
        console.log(`👤 Vendedor: ${pdv.vendedorNome}`);
        console.log(`🔑 Login: ${pdv.vendedorLogin}`);
        
        atualizarInterfaceLoja();
        configurarEventos();
        await carregarProdutos();

        // Inicializar modais como arrastáveis
        setTimeout(() => {
            tornarModalArrastavel('consultaPrecoModal');
            tornarModalArrastavel('finalizarVendaModal');
            tornarModalArrastavel('historicoModal');
            tornarModalArrastavel('notaFiscalModal');
            tornarModalArrastavel('recolhimentoModal');
        }, 1000);
        
        setTimeout(() => {
            document.getElementById('barcodeInput')?.focus();
        }, 500);
        
        esconderLoading();
        console.log("✅ PDV pronto!");
        
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
    
    document.getElementById('barcodeClear')?.addEventListener('click', function() {
        const input = document.getElementById('barcodeInput');
        if (input) {
            input.value = '';
            input.focus();
            this.style.display = 'none';
        }
    });
    
    document.getElementById('btnAddBarcode')?.addEventListener('click', function() {
        const input = document.getElementById('barcodeInput');
        if (input && input.value.trim()) {
            processarCodigo(input.value.trim());
        }
    });
    
    document.getElementById('btnConsultarPreco')?.addEventListener('click', abrirConsultaPreco);
    document.getElementById('btnFinalizar')?.addEventListener('click', abrirModalFinalizacao);
    document.getElementById('btnImprimirOrcamento')?.addEventListener('click', gerarOrcamento);
    document.getElementById('btnLimparCarrinho')?.addEventListener('click', limparCarrinho);
    document.getElementById('btnRecolhimento')?.addEventListener('click', abrirModalRecolhimento);
    document.getElementById('btnHistorico')?.addEventListener('click', abrirHistorico);
    
    document.getElementById('btnVoltar')?.addEventListener('click', function(e) {
        if (pdv.carrinho.length > 0) {
            if (!confirm('Há itens no carrinho. Deseja realmente voltar?')) {
                e.preventDefault();
            }
        }
    });
    
    document.getElementById('btnLogout')?.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja sair?')) {
            lojaServices.logout();
        }
    });
    
    document.querySelectorAll('input[name="tipoEntrega"]').forEach(radio => {
        radio.addEventListener('change', function() {
            pdv.tipoEntrega = this.value;
            document.getElementById('camposEntrega').style.display = 
                this.value === 'entrega' ? 'block' : 'none';
        });
    });
    
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            pdv.formaPagamento = this.value;
            document.getElementById('trocoSection').style.display = 
                this.value === 'dinheiro' ? 'block' : 'none';
        });
    });
    
    document.getElementById('btnConfirmarVenda')?.addEventListener('click', finalizarVenda);
    document.getElementById('btnConfirmarRecolhimento')?.addEventListener('click', confirmarRecolhimento);
    document.getElementById('btnImprimirNotaVenda')?.addEventListener('click', imprimirNotaFiscal);
}

// ============================================
// FUNÇÃO PARA ALTERAR QUANTIDADE
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
    
    codigo = codigo.trim();
    
    const produto = pdv.produtos.find(p => 
        p.codigo === codigo || p.codigo_barras === codigo
    );
    
    if (!produto) {
        mostrarMensagem(`Produto não encontrado: ${codigo}`, 'error');
        
        setTimeout(() => {
            if (confirm('Produto não encontrado. Deseja buscar manualmente?')) {
                abrirConsultaPreco();
            }
        }, 100);
        
        return;
    }
    
    if (produto.quantidade <= 0) {
        mostrarMensagem(`Produto ${produto.nome} sem estoque`, 'warning');
        return;
    }
    
    const quantidade = parseInt(document.getElementById('itemQuantity').value) || 1;
    
    if (quantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    adicionarAoCarrinho(produto, quantidade);
    
    document.getElementById('barcodeInput').value = '';
    document.getElementById('barcodeClear').style.display = 'none';
    document.getElementById('itemQuantity').value = 1;
}

// ============================================
// ADICIONAR AO CARRINHO
// ============================================
function adicionarAoCarrinho(produto, quantidade) {
    const index = pdv.carrinho.findIndex(item => item.id === produto.id);
    
    if (index !== -1) {
        const novaQuantidade = pdv.carrinho[index].quantidade + quantidade;
        if (novaQuantidade > produto.quantidade) {
            mostrarMensagem(`Quantidade total excede estoque. Estoque: ${produto.quantidade}`, 'warning');
            return;
        }
        
        pdv.carrinho[index].quantidade = novaQuantidade;
        pdv.carrinho[index].subtotal = novaQuantidade * pdv.carrinho[index].preco_unitario;
        
        if (produto.desconto) {
            pdv.carrinho[index].desconto = produto.desconto;
            pdv.carrinho[index].desconto_valor = (produto.preco * produto.desconto / 100) * novaQuantidade;
        } else {
            pdv.carrinho[index].desconto = 0;
            pdv.carrinho[index].desconto_valor = 0;
        }
    } else {
        const novoItem = {
            id: produto.id,
            codigo: produto.codigo,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade,
            imagem: produto.imagens?.principal || null,
            unidade: produto.unidade_venda || produto.unidade || 'UN',
            desconto: produto.desconto || 0,
            desconto_valor: produto.desconto ? (produto.preco * produto.desconto / 100) * quantidade : 0
        };
        pdv.carrinho.push(novoItem);
    }
    
    selecionarProduto(pdv.carrinho[pdv.carrinho.length - 1]);
    
    atualizarListaCarrinho();
    atualizarUltimoProduto();
    atualizarTotais();
    
    document.getElementById('btnFinalizar').disabled = false;
    document.getElementById('btnImprimirOrcamento').disabled = false;
    
    mostrarMensagem(`${quantidade}x ${produto.nome} adicionado`, 'success');
}

// ============================================
// FUNÇÃO AUXILIAR - CPF CLIENTE
// ============================================
window.mascaraCPF = function(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 11) {
        valor = valor.slice(0, 11);
    }
    
    if (valor.length <= 11) {
        if (valor.length > 9) {
            valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        } else if (valor.length > 6) {
            valor = valor.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
        } else if (valor.length > 3) {
            valor = valor.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
        }
    }
    
    input.value = valor;
};

// ============================================
// SELECIONAR PRODUTO
// ============================================
function selecionarProduto(produto) {
    if (!produto) return;
    
    pdv.produtoSelecionado = produto;
    
    document.querySelectorAll('.cart-item-row').forEach(row => {
        row.classList.remove('selected');
    });
    
    const linhaSelecionada = document.querySelector(`.cart-item-row[data-index="${pdv.carrinho.findIndex(p => p.id === produto.id)}"]`);
    if (linhaSelecionada) {
        linhaSelecionada.classList.add('selected');
    }
    
    atualizarUltimoProduto();
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
        const selectedClass = pdv.produtoSelecionado?.id === item.id ? 'selected' : '';
        const desconto = item.desconto || 0;
        const descontoValor = item.desconto_valor || 0;
        
        html += `
            <tr class="cart-item-row ${selectedClass}" data-index="${index}" onclick="selecionarProdutoPorIndex(${index})">
                <td>${numItem}</td>
                <td>${item.codigo || '---'}</td>
                <td>${item.nome}</td>
                <td>
                    <input type="number" class="qty-input" value="${item.quantidade}" 
                           min="1" max="999" onchange="atualizarQuantidadeItem(${index}, this.value)" 
                           onclick="event.stopPropagation()">
                </td>
                <td class="price-cell">${formatarMoeda(item.preco_unitario)}</td>
                <td class="discount-cell">${desconto > 0 ? desconto + '%' : 'R$ 0,00'}</td>
                <td class="subtotal-cell">${formatarMoeda(item.subtotal - descontoValor)}</td>
                <td>
                    <button class="btn-remove-item" onclick="removerItem(${index})" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    document.getElementById('itemCount').textContent = `${pdv.carrinho.length} itens`;
}

// ============================================
// FUNÇÕES GLOBAIS PARA MANIPULAÇÃO DE ITENS
// ============================================
window.selecionarProdutoPorIndex = function(index) {
    if (index < 0 || index >= pdv.carrinho.length) return;
    selecionarProduto(pdv.carrinho[index]);
};

window.atualizarQuantidadeItem = function(index, valor) {
    if (index < 0 || index >= pdv.carrinho.length) return;
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerItem(index);
        return;
    }
    
    const produto = pdv.produtos.find(p => p.id === pdv.carrinho[index].id);
    if (produto && novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    pdv.carrinho[index].quantidade = novaQuantidade;
    pdv.carrinho[index].subtotal = novaQuantidade * pdv.carrinho[index].preco_unitario;
    
    if (pdv.carrinho[index].desconto) {
        pdv.carrinho[index].desconto_valor = (pdv.carrinho[index].preco_unitario * pdv.carrinho[index].desconto / 100) * novaQuantidade;
    }
    
    if (pdv.produtoSelecionado?.id === pdv.carrinho[index].id) {
        pdv.produtoSelecionado = pdv.carrinho[index];
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
        
        if (pdv.carrinho.length > 0) {
            if (pdv.produtoSelecionado?.id === item.id) {
                selecionarProduto(pdv.carrinho[0]);
            }
        } else {
            pdv.produtoSelecionado = null;
            document.getElementById('btnFinalizar').disabled = true;
            document.getElementById('btnImprimirOrcamento').disabled = true;
            
            const lastSection = document.getElementById('lastProductSection');
            if (lastSection) lastSection.style.display = 'none';
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
    const produto = pdv.produtoSelecionado;
    
    if (!produto || !section) {
        if (section) section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    const nameEl = document.getElementById('lastProductName');
    const codeEl = document.getElementById('lastProductCode');
    const unitPriceEl = document.getElementById('lastProductUnitPrice');
    const totalEl = document.getElementById('lastProductTotal');
    const imgEl = document.getElementById('lastProductImage');
    
    if (nameEl) nameEl.textContent = produto.nome;
    if (codeEl) codeEl.textContent = produto.codigo || '---';
    
    if (imgEl) {
        if (produto.imagem) {
            imgEl.src = produto.imagem;
        } else {
            imgEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTEwIDYwTDIwIDQwTDMwIDUwTDQwIDMwTDUwIDUwTDYwIDQwTDcwIDYwSDEwWiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNFTSBGT1RPPC90ZXh0Pjwvc3ZnPg==';
        }
    }
    
    if (unitPriceEl) unitPriceEl.textContent = formatarMoeda(produto.preco_unitario);
    
    const totalComDesconto = produto.subtotal - (produto.desconto_valor || 0);
    if (totalEl) totalEl.textContent = formatarMoeda(totalComDesconto);
    
    const pricesContainer = document.querySelector('.last-product-prices');
    if (pricesContainer) {
        let discountBox = document.querySelector('.discount-box');
        if (!discountBox) {
            discountBox = document.createElement('div');
            discountBox.className = 'price-box discount-box';
            pricesContainer.appendChild(discountBox);
        }
        
        if (produto.desconto > 0) {
            discountBox.innerHTML = `
                <span class="price-label">Desconto</span>
                <span class="discount-value">${produto.desconto}%</span>
            `;
        } else {
            discountBox.innerHTML = `
                <span class="price-label">Desconto</span>
                <span class="discount-value">R$ 0,00</span>
            `;
        }
    }
}

// ============================================
// ATUALIZAR TOTAIS
// ============================================
function atualizarTotais() {
    pdv.subtotal = pdv.carrinho.reduce((total, item) => total + item.subtotal, 0);
    
    const totalDescontos = pdv.carrinho.reduce((total, item) => total + (item.desconto_valor || 0), 0);
    pdv.total = pdv.subtotal - totalDescontos;
    
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    
    if (subtotalEl) subtotalEl.textContent = formatarMoeda(pdv.subtotal);
    if (totalEl) totalEl.textContent = formatarMoeda(pdv.total);
}

// ============================================
// LIMPAR CARRINHO
// ============================================
function limparCarrinho() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Carrinho já está vazio', 'info');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
        pdv.carrinho = [];
        pdv.produtoSelecionado = null;
        pdv.subtotal = 0;
        pdv.total = 0;
        
        const lastSection = document.getElementById('lastProductSection');
        if (lastSection) lastSection.style.display = 'none';
        
        document.getElementById('btnFinalizar').disabled = true;
        document.getElementById('btnImprimirOrcamento').disabled = true;
        
        atualizarListaCarrinho();
        atualizarTotais();
        
        mostrarMensagem('Carrinho limpo', 'info');
        
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.focus();
    }
}

// ============================================
// ABRIR MODAL DE FINALIZAÇÃO
// ============================================
function abrirModalFinalizacao() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        return;
    }
    
    abrirModal('finalizarVendaModal');
    
    document.getElementById('resumoTotalItens').textContent = pdv.carrinho.length;
    document.getElementById('resumoSubtotal').textContent = formatarMoeda(pdv.subtotal);
    document.getElementById('resumoTotal').textContent = formatarMoeda(pdv.total);
    
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteTelefone').value = '';
    document.getElementById('clienteEndereco').value = '';
    document.getElementById('clienteCidade').value = '';
    document.getElementById('clienteCep').value = '';
    document.getElementById('taxaEntrega').value = 'R$ 0,00';
    document.getElementById('valorRecebido').value = '';
    document.getElementById('valorTroco').value = '';
    document.getElementById('clienteCpf').value = '';
    
    document.querySelector('input[name="tipoEntrega"][value="retirada"]').checked = true;
    document.querySelector('input[name="payment"][value="dinheiro"]').checked = true;
    pdv.tipoEntrega = 'retirada';
    pdv.formaPagamento = 'dinheiro';
    
    document.getElementById('camposEntrega').style.display = 'none';
    document.getElementById('trocoSection').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('valorRecebido')?.focus();
    }, 500);
}

// ============================================
// CALCULAR TROCO
// ============================================
window.calcularTroco = function() {
    const valorRecebido = parseFloat(
        document.getElementById('valorRecebido').value
            .replace('R$', '')
            .replace('.', '')
            .replace(',', '.')
            .trim() || '0'
    );
    
    const troco = valorRecebido - pdv.total;
    document.getElementById('valorTroco').value = 
        troco >= 0 ? formatarMoeda(troco) : 'R$ 0,00';
};

// ============================================
// FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (pdv.tipoEntrega === 'entrega') {
        const nome = document.getElementById('clienteNome').value.trim();
        const telefone = document.getElementById('clienteTelefone').value.trim();
        const endereco = document.getElementById('clienteEndereco').value.trim();
        
        if (!nome || !telefone || !endereco) {
            mostrarMensagem('Preencha os dados de entrega', 'warning');
            return;
        }
        
        pdv.dadosEntrega = {
            nome: nome,
            telefone: telefone,
            endereco: endereco,
            cidade: document.getElementById('clienteCidade').value.trim(),
            cep: document.getElementById('clienteCep').value.trim(),
            taxaEntrega: parseFloat(
                document.getElementById('taxaEntrega').value
                    .replace('R$', '')
                    .replace('.', '')
                    .replace(',', '.')
                    .trim() || '0'
            )
        };
    } else {
        pdv.dadosEntrega = null;
    }
    
    if (pdv.formaPagamento === 'dinheiro') {
        const valorRecebido = parseFloat(
            document.getElementById('valorRecebido').value
                .replace('R$', '')
                .replace('.', '')
                .replace(',', '.')
                .trim() || '0'
        );
        
        if (valorRecebido < pdv.total) {
            mostrarMensagem('Valor recebido insuficiente', 'warning');
            return;
        }
    }
    
    try {
        mostrarLoading('Processando venda...');
        fecharModal('finalizarVendaModal');
        
        const numeroVenda = gerarNumeroVenda('V');
        const totalComEntrega = pdv.total + (pdv.dadosEntrega?.taxaEntrega || 0);
        const cpfCliente = document.getElementById('clienteCpf')?.value.replace(/\D/g, '') || '';
        
        const vendaData = {
            tipo: 'VENDA',
            numero: numeroVenda,
            data: new Date(),
            itens: pdv.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                codigo_barras: item.codigo_barras,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal,
                desconto: item.desconto || 0,
                desconto_valor: item.desconto_valor || 0,
                unidade: item.unidade
            })),
            subtotal: pdv.subtotal,
            total: totalComEntrega,
            total_descontos: pdv.carrinho.reduce((acc, item) => acc + (item.desconto_valor || 0), 0),
            forma_pagamento: pdv.formaPagamento,
            tipo_entrega: pdv.tipoEntrega,
            dados_entrega: pdv.dadosEntrega,
            vendedor_id: pdv.vendedorId,
            vendedor_nome: pdv.vendedorNome,
            cpf_cliente: cpfCliente || null,
            vendedor_login: pdv.vendedorLogin,
            loja_id: pdv.lojaId,
            status: 'concluida',
            data_criacao: new Date()
        };
        
        const resultado = await lojaServices.criarVenda(vendaData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar venda');
        }
        
        await atualizarEstoqueProdutos();
        
        pdv.ultimaVenda = { ...vendaData, id: resultado.id };
        
        mostrarMensagem(`Venda #${numeroVenda} finalizada com sucesso!`, 'success');
        
        limparCarrinhoAposFinalizar();
        mostrarNotaFiscalVenda(pdv.ultimaVenda);
        await carregarProdutos();
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        mostrarMensagem(`Erro ao finalizar venda: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
}

function limparCarrinhoAposFinalizar() {
    pdv.carrinho = [];
    pdv.produtoSelecionado = null;
    pdv.subtotal = 0;
    pdv.total = 0;
    pdv.dadosEntrega = null;
    
    const lastSection = document.getElementById('lastProductSection');
    if (lastSection) lastSection.style.display = 'none';
    
    document.getElementById('btnFinalizar').disabled = true;
    document.getElementById('btnImprimirOrcamento').disabled = true;
    
    atualizarListaCarrinho();
    atualizarTotais();
}

async function atualizarEstoqueProdutos() {
    try {
        for (const item of pdv.carrinho) {
            await lojaServices.atualizarEstoque(
                item.id,
                item.quantidade,
                'saida'
            );
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar estoque:', error);
        throw error;
    }
}

// ============================================
// GERAR ORÇAMENTO
// ============================================
async function gerarOrcamento() {
    if (pdv.carrinho.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        return;
    }
    
    try {
        mostrarLoading('Gerando orçamento...');
        
        const numeroOrcamento = gerarNumeroVenda('O');
        const dataValidade = new Date();
        dataValidade.setDate(dataValidade.getDate() + 10);
        
        const orcamentoData = {
            tipo: 'ORCAMENTO',
            numero: numeroOrcamento,
            data_criacao: new Date(),
            data_validade: dataValidade,
            itens: pdv.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                codigo_barras: item.codigo_barras,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal,
                desconto: item.desconto || 0,
                desconto_valor: item.desconto_valor || 0,
                unidade: item.unidade
            })),
            subtotal: pdv.subtotal,
            total: pdv.total,
            total_descontos: pdv.carrinho.reduce((acc, item) => acc + (item.desconto_valor || 0), 0),
            vendedor_id: pdv.vendedorId,
            vendedor_nome: pdv.vendedorNome,
            vendedor_login: pdv.vendedorLogin,
            loja_id: pdv.lojaId,
            status: 'ativo',
            convertido_em_venda: null
        };
        
        const resultado = await lojaServices.criarOrcamento(orcamentoData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar orçamento');
        }
        
        pdv.ultimoOrcamento = { ...orcamentoData, id: resultado.id };
        
        mostrarMensagem(`Orçamento #${numeroOrcamento} gerado com sucesso!`, 'success');
        mostrarNotaOrcamento(pdv.ultimoOrcamento);
        
    } catch (error) {
        console.error('❌ Erro ao gerar orçamento:', error);
        mostrarMensagem(`Erro ao gerar orçamento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// ABRIR MODAL DE RECOLHIMENTO
// ============================================
function abrirModalRecolhimento() {
    abrirModal('recolhimentoModal');
    
    document.getElementById('recolhimentoOperador').value = `${pdv.vendedorNome} (${pdv.vendedorLogin})`;
    document.getElementById('recolhimentoDataHora').value = new Date().toLocaleString('pt-BR');
    document.getElementById('recolhimentoValor').value = '';
    document.getElementById('recolhimentoEnvelope').value = '';
    document.getElementById('recolhimentoObs').value = '';
    document.getElementById('recolhimentoCaixa').value = 'caixa01';
    
    setTimeout(() => {
        document.getElementById('recolhimentoValor')?.focus();
    }, 500);
}

// ============================================
// CONFIRMAR RECOLHIMENTO
// ============================================
async function confirmarRecolhimento() {
    const valor = document.getElementById('recolhimentoValor').value.trim();
    const envelope = document.getElementById('recolhimentoEnvelope').value.trim();
    const caixa = document.getElementById('recolhimentoCaixa').value;
    const observacao = document.getElementById('recolhimentoObs').value.trim();
    
    if (!valor) {
        mostrarMensagem('Informe o valor do recolhimento', 'warning');
        return;
    }
    
    if (!envelope) {
        mostrarMensagem('Informe o número do envelope', 'warning');
        return;
    }
    
    try {
        mostrarLoading('Processando recolhimento...');
        
        const valorNumerico = parseFloat(
            valor.replace('R$', '')
                .replace('.', '')
                .replace(',', '.')
                .trim()
        );
        
        const recolhimentoData = {
            tipo: 'RECOLHIMENTO',
            numero: gerarNumeroVenda('R'),
            data: new Date(),
            valor: valorNumerico,
            caixa: caixa,
            envelope: envelope,
            observacao: observacao,
            operador_id: pdv.vendedorId,
            operador_nome: pdv.vendedorNome,
            operador_login: pdv.vendedorLogin,
            loja_id: pdv.lojaId,
            data_criacao: new Date()
        };
        
        const resultado = await lojaServices.criarRecolhimento(recolhimentoData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar recolhimento');
        }
        
        mostrarMensagem('Recolhimento registrado com sucesso!', 'success');
        fecharModal('recolhimentoModal');
        imprimirComprovanteRecolhimento(recolhimentoData);
        
    } catch (error) {
        console.error('❌ Erro ao registrar recolhimento:', error);
        mostrarMensagem(`Erro ao registrar recolhimento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// IMPRIMIR COMPROVANTE DE RECOLHIMENTO
// ============================================
function imprimirComprovanteRecolhimento(recolhimento) {
    const conteudo = `
        <html>
        <head>
            <title>Comprovante de Recolhimento</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h2 { font-size: 16px; margin-bottom: 5px; }
                .linha { border-top: 1px dashed #000; margin: 10px 0; }
                .dados { margin: 15px 0; }
                .dados p { margin: 5px 0; }
                .total { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0; }
                .assinatura { margin-top: 30px; text-align: center; }
                .assinatura hr { width: 200px; margin: 5px auto; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>COMPROVANTE DE RECOLHIMENTO</h2>
                <p>${document.getElementById('nomeLoja')?.textContent || 'SUA LOJA'}</p>
            </div>
            <div class="linha"></div>
            <div class="dados">
                <p><strong>Nº:</strong> ${recolhimento.numero}</p>
                <p><strong>Data/Hora:</strong> ${new Date(recolhimento.data).toLocaleString('pt-BR')}</p>
                <p><strong>Operador:</strong> ${recolhimento.operador_nome} (${recolhimento.operador_login})</p>
                <p><strong>Caixa:</strong> ${recolhimento.caixa}</p>
                <p><strong>Nº Envelope:</strong> ${recolhimento.envelope}</p>
                ${recolhimento.observacao ? `<p><strong>Obs:</strong> ${recolhimento.observacao}</p>` : ''}
            </div>
            <div class="linha"></div>
            <div class="total">
                VALOR: ${formatarMoeda(recolhimento.valor)}
            </div>
            <div class="linha"></div>
            <div class="assinatura">
                <p>_________________________________</p>
                <p>Assinatura do Responsável</p>
            </div>
        </body>
        </html>
    `;
    
    imprimirConteudo(conteudo);
}

// ============================================
// FUNÇÃO DE IMPRESSÃO
// ============================================
function imprimirConteudo(conteudo) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(conteudo);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    } else {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        iframe.contentDocument.write(conteudo);
        iframe.contentDocument.close();
        
        setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    }
}

// ============================================
// CONSULTA DE PREÇO
// ============================================
function abrirConsultaPreco() {
    abrirModal('consultaPrecoModal');
    
    const input = document.getElementById('consultaPrecoInput');
    const clearBtn = document.getElementById('consultaPrecoClear');
    const results = document.getElementById('consultaPrecoResults');
    
    if (input) {
        input.value = '';
        input.focus();
    }
    
    if (results && pdv.produtos.length > 0) {
        results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
    }
    
    if (input) {
        input.oninput = function() {
            const termo = this.value.toLowerCase().trim();
            
            if (!termo) {
                if (results) results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
                return;
            }
            
            const filtrados = pdv.produtos.filter(p => 
                (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
                (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo)) ||
                (p.nome && p.nome.toLowerCase().includes(termo)) ||
                (p.categoria && p.categoria.toLowerCase().includes(termo))
            );
            
            if (results) results.innerHTML = gerarListaProdutosConsulta(filtrados);
        };
    }
    
    if (clearBtn) {
        clearBtn.onclick = function() {
            if (input) {
                input.value = '';
                input.focus();
            }
            if (results) results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
        };
    }
}

// ============================================
// GERAR LISTA DE PRODUTOS PARA CONSULTA (COM IMGBB)
// ============================================
function gerarListaProdutosConsulta(produtos) {
    if (!produtos || produtos.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
    }
    
    let html = '<div class="consulta-preco-grid">';
    
    produtos.forEach(p => {
        const estoqueClass = p.quantidade > 0 ? 'estoque-normal' : 'estoque-zero';
        const estoqueTexto = p.quantidade > 0 ? `Estoque: ${p.quantidade} ${p.unidade || 'UN'}` : 'SEM ESTOQUE';
        const descontoTexto = p.desconto ? `<span class="produto-desconto">${p.desconto}% OFF</span>` : '';
        
        // 🔥 BUSCAR IMAGEM DO IMGBB CORRETAMENTE 🔥
        let imagemUrl = null;
        
        // Verificar diferentes lugares onde a imagem pode estar
        if (p.imagens) {
            // Estrutura completa do ImgBB
            imagemUrl = p.imagens.thumbnail || p.imagens.medium || p.imagens.principal || p.imagens.url;
        }
        
        // Se não encontrou, verificar campos diretos
        if (!imagemUrl) {
            imagemUrl = p.imagem_thumbnail || p.imagem_url || p.imagem;
        }
        
        // Placeholder em Base64 para quando não há imagem
        const placeholderBase64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=';
        
        html += `
            <div class="consulta-preco-card" onclick="selecionarProdutoConsulta('${p.id}')">
                <div class="consulta-preco-imagem">
                    <img src="${imagemUrl || placeholderBase64}" 
                         alt="${p.nome || 'Produto'}"
                         loading="lazy"
                         onerror="this.src='${placeholderBase64}'">
                </div>
                <div class="consulta-preco-info">
                    <div class="consulta-preco-codigo">${p.codigo || '---'}</div>
                    <div class="consulta-preco-nome">${p.nome || 'Produto sem nome'}</div>
                    <div class="consulta-preco-categoria">${p.categoria || 'Sem categoria'}</div>
                    <div class="consulta-preco-preco">${formatarMoeda(p.preco || 0)}</div>
                    <div class="consulta-preco-estoque ${estoqueClass}">${estoqueTexto}</div>
                    ${descontoTexto}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

window.selecionarProdutoConsulta = function(id) {
    const produto = pdv.produtos.find(p => p.id === id);
    if (produto) {
        if (produto.quantidade <= 0) {
            alert(`Produto ${produto.nome} sem estoque disponível!`);
            return;
        }
        
        if (confirm(`Deseja adicionar ${produto.nome} (${formatarMoeda(produto.preco)}) ao carrinho?`)) {
            fecharModal('consultaPrecoModal');
            
            const barcodeInput = document.getElementById('barcodeInput');
            if (barcodeInput) {
                barcodeInput.value = produto.codigo || produto.codigo_barras || '';
                barcodeInput.focus();
                barcodeInput.select();
            }
        }
    }
};

// ============================================
// MOSTRAR NOTA FISCAL DE VENDA
// ============================================
function mostrarNotaFiscalVenda(venda) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    const nomeLoja = document.getElementById('nomeLoja')?.textContent || 'SUA LOJA';
    const dataVenda = new Date(venda.data || venda.data_criacao).toLocaleString('pt-BR');
    const isExtornada = venda.status === 'extornada';
    
    let nota = '';
    
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto(nomeLoja, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    if (isExtornada) {
        nota += centralizarTexto('*** VENDA EXTORNADA ***', 48) + '\n';
        nota += centralizarTexto('DOCUMENTO CANCELADO', 48) + '\n';
    } else {
        nota += centralizarTexto('CUPOM NÃO FISCAL - VENDA', 48) + '\n';
    }
    
    nota += '='.repeat(48) + '\n';
    nota += `VENDA..: ${venda.numero || venda.numero_venda || 'N/A'}\n`;
    nota += `DATA...: ${dataVenda}\n`;
    nota += `VENDEDOR: ${venda.vendedor_nome || venda.vendedor || 'Sistema'} (${venda.vendedor_login || 'operador'})\n`;
    nota += `PGTO...: ${traduzirFormaPagamento(venda.forma_pagamento)}\n`;

    if (venda.cpf_cliente) {
        let cpfFormatado = venda.cpf_cliente;
        if (cpfFormatado.length === 11) {
            cpfFormatado = cpfFormatado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        nota += `CPF....: ${cpfFormatado}\n`;
    }
    
    if (isExtornada) {
        nota += '-'.repeat(48) + '\n';
        nota += `EXTORNADO EM: ${new Date(venda.data_extorno).toLocaleString('pt-BR')}\n`;
        nota += `EXTORNADO POR: ${venda.extornado_por || 'Sistema'}\n`;
        if (venda.motivo_extorno) {
            nota += `MOTIVO: ${venda.motivo_extorno}\n`;
        }
    }
    
    if (venda.tipo_entrega === 'entrega' && venda.dados_entrega) {
        nota += '-'.repeat(48) + '\n';
        nota += `ENTREGA:\n`;
        nota += `Cliente: ${venda.dados_entrega.nome}\n`;
        nota += `Tel....: ${venda.dados_entrega.telefone}\n`;
        nota += `End....: ${venda.dados_entrega.endereco}\n`;
        if (venda.dados_entrega.cidade) nota += `Cidade.: ${venda.dados_entrega.cidade}\n`;
        if (venda.dados_entrega.cep) nota += `CEP....: ${venda.dados_entrega.cep}\n`;
        if (venda.dados_entrega.taxaEntrega > 0) {
            nota += `Taxa Entrega: ${formatarMoedaResumida(venda.dados_entrega.taxaEntrega)}\n`;
        }
    }
    
    nota += '-'.repeat(48) + '\n';
    nota += 'ITEM  DESCRIÇÃO                QTD    UNIT     DESC    TOTAL\n';
    nota += '-'.repeat(48) + '\n';
    
    if (venda.itens && venda.itens.length > 0) {
        venda.itens.forEach((item, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            const nome = (item.nome || 'Produto').substring(0, 20).padEnd(20, ' ');
            const qtd = (item.quantidade || 0).toString().padStart(3, ' ');
            const unit = formatarMoedaResumida(item.preco_unitario || 0).padStart(7, ' ');
            
            let desc = '     ';
            if (item.desconto && item.desconto > 0) {
                desc = item.desconto.toString().padStart(3, ' ') + '%';
            } else if (item.desconto_valor && item.desconto_valor > 0) {
                desc = 'VALOR';
            }
            desc = desc.padStart(5, ' ');
            
            const totalItem = (item.subtotal || 0) - (item.desconto_valor || 0);
            const total = formatarMoedaResumida(totalItem).padStart(7, ' ');
            
            nota += `${num} ${nome} ${qtd} ${unit} ${desc} ${total}\n`;
        });
    } else {
        nota += 'Nenhum item encontrado\n';
    }
    
    nota += '-'.repeat(48) + '\n';
    
    if (venda.total_descontos && venda.total_descontos > 0) {
        nota += `DESCONTOS:${formatarMoedaResumida(venda.total_descontos).padStart(37)}\n`;
    }
    
    nota += `SUBTOTAL.:${formatarMoedaResumida(venda.subtotal || 0).padStart(37)}\n`;
    nota += `TOTAL....:${formatarMoedaResumida(venda.total || 0).padStart(37)}\n`;
    
    nota += '='.repeat(48) + '\n';
    
    if (isExtornada) {
        nota += centralizarTexto('*** DOCUMENTO CANCELADO ***', 48) + '\n';
        nota += centralizarTexto('SEM VALOR FISCAL', 48) + '\n';
    } else {
        nota += centralizarTexto('OBRIGADO PELA PREFERÊNCIA!', 48) + '\n';
        nota += centralizarTexto('VOLTE SEMPRE!', 48) + '\n';
    }
    
    nota += '='.repeat(48) + '\n';
    nota += `SISTEMA PDV v1.0 - ${new Date().toLocaleDateString()}\n`;
    
    conteudo.textContent = nota;
    abrirModal('notaFiscalModal');
    
    const modalHeader = modal.querySelector('.modal-header h3');
    if (modalHeader) {
        modalHeader.innerHTML = isExtornada ? 
            '<i class="fas fa-undo-alt"></i> Nota Fiscal - Venda Extornada' : 
            '<i class="fas fa-receipt"></i> Nota Fiscal da Venda';
    }
}

// ============================================
// MOSTRAR NOTA DE ORÇAMENTO
// ============================================
function mostrarNotaOrcamento(orcamento) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    const nomeLoja = document.getElementById('nomeLoja')?.textContent || 'SUA LOJA';
    const dataCriacao = new Date(orcamento.data_criacao).toLocaleString('pt-BR');
    const dataValidade = new Date(orcamento.data_validade).toLocaleDateString('pt-BR');
    
    let nota = '';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto(nomeLoja, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('ORÇAMENTO', 48) + '\n';
    nota += centralizarTexto(orcamento.numero, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += `DATA: ${dataCriacao}\n`;
    nota += `VENDEDOR: ${orcamento.vendedor_nome} (${orcamento.vendedor_login || 'operador'})\n`;
    nota += `VALIDADE: ${dataValidade} (10 DIAS)\n`;
    nota += '-'.repeat(48) + '\n';
    nota += 'ITEM  DESCRIÇÃO                QTD    UNIT     DESC    TOTAL\n';
    nota += '-'.repeat(48) + '\n';
    
    orcamento.itens.forEach((item, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        const nome = item.nome.substring(0, 20).padEnd(20, ' ');
        const qtd = item.quantidade.toString().padStart(3, ' ');
        const unit = formatarMoedaResumida(item.preco_unitario).padStart(7, ' ');
        const desc = item.desconto ? item.desconto.toString().padStart(3, ' ') + '%' : '     ';
        const total = formatarMoedaResumida(item.subtotal - (item.desconto_valor || 0)).padStart(7, ' ');
        
        nota += `${num} ${nome} ${qtd} ${unit} ${desc} ${total}\n`;
    });
    
    nota += '-'.repeat(48) + '\n';
    if (orcamento.total_descontos > 0) {
        nota += `DESCONTOS:${formatarMoedaResumida(orcamento.total_descontos).padStart(37)}\n`;
    }
    nota += `SUBTOTAL:${formatarMoedaResumida(orcamento.subtotal).padStart(38)}\n`;
    nota += `TOTAL:${formatarMoedaResumida(orcamento.total).padStart(41)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('ORÇAMENTO VÁLIDO POR 10 DIAS', 48) + '\n';
    nota += centralizarTexto('Lei Federal nº 8.078/90', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    conteudo.textContent = nota;
    abrirModal('notaFiscalModal');
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarMoedaResumida(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace('R$', '').trim();
}

window.mascaraMoeda = function(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = (parseInt(valor) / 100).toFixed(2);
    input.value = formatarMoeda(valor);
};

function gerarNumeroVenda(prefixo = 'V') {
    const agora = new Date();
    const ano = agora.getFullYear().toString().slice(-2);
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const dia = agora.getDate().toString().padStart(2, '0');
    const hora = agora.getHours().toString().padStart(2, '0');
    const min = agora.getMinutes().toString().padStart(2, '0');
    const seg = agora.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefixo}${ano}${mes}${dia}${hora}${min}${seg}${random}`;
}

function centralizarTexto(texto, largura) {
    if (texto.length >= largura) return texto;
    const espacos = Math.floor((largura - texto.length) / 2);
    return ' '.repeat(espacos) + texto;
}

function traduzirFormaPagamento(forma) {
    const traducoes = {
        'dinheiro': 'DINHEIRO',
        'debito': 'CARTÃO DÉBITO',
        'credito': 'CARTÃO CRÉDITO',
        'pix': 'PIX',
        'ticket': 'TICKET'
    };
    return traducoes[forma] || forma.toUpperCase();
}

function atualizarInterfaceLoja() {
    const nomeLoja = pdv.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const lojaElement = document.getElementById('nomeLoja');
    const footerLojaElement = document.getElementById('footerLojaNome');
    const userElement = document.getElementById('userName');
    
    if (lojaElement) lojaElement.textContent = nomeLoja;
    if (footerLojaElement) footerLojaElement.textContent = nomeLoja;
    if (userElement && pdv.vendedorNome) userElement.textContent = `${pdv.vendedorNome} (${pdv.vendedorLogin})`;
    
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
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = texto;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    const textEl = alert.querySelector('.message-text');
    if (textEl) textEl.textContent = texto;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

window.imprimirNotaFiscal = function() {
    const conteudo = document.getElementById('notaFiscalConteudo');
    if (!conteudo) return;
    
    const html = `
        <html>
        <head>
            <title>Nota Fiscal</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                pre { margin: 0; }
            </style>
        </head>
        <body>
            <pre>${conteudo.textContent}</pre>
        </body>
        </html>
    `;
    
    imprimirConteudo(html);
};

// ============================================
// CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            pdv.produtos = resultado.data;
            console.log(`✅ ${pdv.produtos.length} produtos carregados`);
            
            const modalAberto = document.getElementById('consultaPrecoModal')?.style.display === 'flex';
            if (modalAberto) {
                const results = document.getElementById('consultaPrecoResults');
                if (results) {
                    results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
                }
            }
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            pdv.produtos = [];
            mostrarMensagem('Erro ao carregar produtos', 'error');
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        pdv.produtos = [];
        mostrarMensagem('Erro ao carregar produtos', 'error');
    }
}

// ============================================
// HISTÓRICO
// ============================================
function abrirHistorico() {
    abrirModal('historicoModal');
    
    const hoje = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById('filtroData');
    if (filtroData) filtroData.value = hoje;
    
    const filtroNumero = document.getElementById('filtroNumero');
    if (filtroNumero) filtroNumero.value = '';
    
    carregarHistoricoCompleto();
}

async function carregarHistoricoCompleto() {
    const data = document.getElementById('filtroData')?.value;
    const numero = document.getElementById('filtroNumero')?.value?.toLowerCase();
    const results = document.getElementById('historicoResults');
    
    if (!results) return;
    
    try {
        mostrarLoading('Buscando histórico...');
        
        results.innerHTML = `
            <div class="loading-activity">
                <div class="spinner"></div>
                <p>Carregando histórico...</p>
            </div>
        `;
        
        const resultadoVendas = await lojaServices.buscarVendasComFiltros({
            data: data,
            numero: numero
        });
        
        const resultadoOrcamentos = await lojaServices.buscarOrcamentos({
            data: data,
            numero: numero
        });
        
        const vendas = resultadoVendas.success ? resultadoVendas.data || [] : [];
        const orcamentos = resultadoOrcamentos.success ? resultadoOrcamentos.data || [] : [];
        
        console.log('📊 Vendas encontradas no histórico:', vendas.length);
        console.log('📊 Orçamentos encontrados no histórico:', orcamentos.length);
        
        if (vendas.length === 0 && orcamentos.length === 0) {
            results.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Nenhum registro encontrado</p>
                    <small>Tente outro filtro ou realize vendas para ver o histórico</small>
                </div>
            `;
            esconderLoading();
            return;
        }
        
        const todos = [
            ...vendas.map(v => ({ 
                ...v, 
                tipo_display: 'VENDA',
                data_exibicao: v.data_venda || v.data_criacao,
                numero_exibicao: v.numero_venda || v.numero || v.id
            })),
            ...orcamentos.map(o => ({ 
                ...o, 
                tipo_display: 'ORÇAMENTO',
                data_exibicao: o.created_at || o.data_criacao,
                numero_exibicao: o.numero || o.id
            }))
        ].sort((a, b) => {
            const dataA = a.data_exibicao?.toDate ? a.data_exibicao.toDate() : new Date(a.data_exibicao || 0);
            const dataB = b.data_exibicao?.toDate ? b.data_exibicao.toDate() : new Date(b.data_exibicao || 0);
            return dataB - dataA;
        });
        
        let html = '';
        
        todos.forEach(item => {
            let dataItem;
            try {
                dataItem = item.data_exibicao?.toDate ? 
                    item.data_exibicao.toDate() : 
                    new Date(item.data_exibicao || item.data_criacao || Date.now());
            } catch (e) {
                dataItem = new Date();
            }
            
            const dataFormatada = dataItem.toLocaleDateString('pt-BR');
            const horaFormatada = dataItem.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const tipoClass = item.tipo_display === 'VENDA' ? 'tipo-venda' : 'tipo-orcamento';
            
            let statusHtml = '';
            if (item.tipo_display === 'ORÇAMENTO') {
                const valido = item.data_validade?.toDate ? 
                    item.data_validade.toDate() > new Date() : 
                    new Date(item.data_validade || 0) > new Date();
                statusHtml = `<span class="status-badge ${valido ? 'valido' : 'expirado'}">${valido ? 'Válido' : 'Expirado'}</span>`;
            }
        
            html += `
                <div class="historico-item ${tipoClass}" data-status="${item.status || 'concluida'}">
                    <div class="historico-header">
                        <div>
                            <strong>${item.tipo_display} #${item.numero_exibicao}</strong> - ${dataFormatada} ${horaFormatada}
                            ${statusHtml}
                        </div>
                        <span class="historico-total">${formatarMoeda(item.total || 0)}</span>
                    </div>
                    <div class="historico-detalhes">
                        <div><i class="fas fa-boxes"></i> Itens: ${item.itens?.length || 0}</div>
                        ${item.forma_pagamento ? `<div><i class="fas fa-credit-card"></i> Pagamento: ${traduzirFormaPagamento(item.forma_pagamento)}</div>` : ''}
                        <div><i class="fas fa-user"></i> Vendedor: ${item.vendedor_nome || item.vendedor || 'Sistema'}</div>
                        ${item.data_validade ? `<div><i class="fas fa-calendar"></i> Validade: ${new Date(item.data_validade).toLocaleDateString('pt-BR')}</div>` : ''}
                        
                        ${item.status === 'extornada' ? `
                            <div class="extorno-info">
                                <i class="fas fa-undo-alt"></i> EXTORNADA em ${new Date(item.data_extorno).toLocaleString('pt-BR')}
                                por ${item.extornado_por || 'Sistema'}
                            </div>
                        ` : ''}
                    </div>
                    <div class="historico-acoes">
                        ${item.tipo_display === 'ORÇAMENTO' && item.status === 'ativo' ? 
                            `<button class="btn-convert" onclick="converterOrcamentoParaVenda('${item.id}')">
                                <i class="fas fa-cash-register"></i> Converter
                            </button>` : ''}
                        
                        ${item.tipo_display === 'ORÇAMENTO' ? 
                            `<button class="btn-delete" onclick="excluirOrcamento('${item.id}', '${item.numero_exibicao}')">
                                <i class="fas fa-trash-alt"></i> Excluir
                            </button>` : ''}
                        
                        ${item.tipo_display === 'VENDA' && item.status !== 'extornada' ? 
                            `<button class="btn-extornar" onclick="extornarVenda('${item.id}', '${item.numero_exibicao}')">
                                <i class="fas fa-undo-alt"></i> Extornar
                            </button>` : ''}
                        
                        <button class="btn-view" onclick="verNota('${item.id}', '${item.tipo_display}')">
                            <i class="fas fa-eye"></i> Ver Nota
                        </button>
                    </div>
                </div>
            `;
        });
        
        results.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        results.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar histórico</p>
                <small>${error.message}</small>
            </div>
        `;
    } finally {
        esconderLoading();
    }
}

window.filtrarHistorico = function() {
    carregarHistoricoCompleto();
};

window.verNota = async function(id, tipo) {
    try {
        if (tipo === 'VENDA') {
            const resultado = await lojaServices.buscarVendaPorId(id);
            if (resultado.success && resultado.data) {
                mostrarNotaFiscalVenda(resultado.data);
            }
        } else if (tipo === 'ORÇAMENTO') {
            const resultado = await lojaServices.buscarOrcamentoPorId(id);
            if (resultado.success && resultado.data) {
                mostrarNotaOrcamento(resultado.data);
            }
        }
    } catch (error) {
        console.error('Erro ao buscar nota:', error);
        mostrarMensagem('Erro ao buscar nota', 'error');
    }
};

// ============================================
// CONVERTER ORÇAMENTO EM VENDA
// ============================================
window.converterOrcamentoParaVenda = async function(orcamentoId) {
    try {
        mostrarLoading('Buscando orçamento...');
        
        fecharModal('historicoModal');
        
        const resultado = await lojaServices.buscarOrcamentoPorId(orcamentoId);
        
        if (!resultado.success || !resultado.data) {
            throw new Error('Orçamento não encontrado');
        }
        
        const orcamento = resultado.data;
        
        if (orcamento.status === 'convertido') {
            alert('Este orçamento já foi convertido em venda anteriormente!');
            fecharModal('notaFiscalModal');
            return;
        }
        
        const dataValidade = orcamento.data_validade?.toDate ? 
            orcamento.data_validade.toDate() : 
            new Date(orcamento.data_validade || 0);
        
        const hoje = new Date();
        
        if (hoje > dataValidade) {
            if (!confirm('⚠️ Este orçamento está VENCIDO! Deseja continuar mesmo assim?')) {
                return;
            }
        }
        
        const produtosSemEstoque = [];
        for (const item of orcamento.itens) {
            const produto = pdv.produtos.find(p => p.id === item.produto_id);
            if (!produto || produto.quantidade < item.quantidade) {
                produtosSemEstoque.push(`${item.nome} (disponível: ${produto?.quantidade || 0})`);
            }
        }
        
        if (produtosSemEstoque.length > 0) {
            alert(`❌ Produtos com estoque insuficiente:\n${produtosSemEstoque.join('\n')}`);
            return;
        }
        
        if (!confirm(`🔄 Converter orçamento ${orcamento.numero} em venda?\n\nValor: ${formatarMoeda(orcamento.total)}\nItens: ${orcamento.itens.length}\n\nOs itens serão carregados no carrinho para finalização.`)) {
            return;
        }
        
        mostrarLoading('Carregando itens do orçamento...');
        
        pdv.carrinho = [];
        
        for (const item of orcamento.itens) {
            const produto = pdv.produtos.find(p => p.id === item.produto_id);
            
            if (produto) {
                const novoItem = {
                    id: produto.id,
                    codigo: produto.codigo,
                    codigo_barras: produto.codigo_barras,
                    nome: produto.nome,
                    preco_unitario: produto.preco,
                    quantidade: item.quantidade,
                    subtotal: produto.preco * item.quantidade,
                    imagem: produto.imagens?.principal || null,
                    unidade: produto.unidade_venda || produto.unidade || 'UN',
                    desconto: item.desconto || 0,
                    desconto_valor: item.desconto ? (produto.preco * item.desconto / 100) * item.quantidade : 0
                };
                
                pdv.carrinho.push(novoItem);
            }
        }
        
        if (pdv.carrinho.length > 0) {
            pdv.produtoSelecionado = pdv.carrinho[pdv.carrinho.length - 1];
        }
        
        atualizarListaCarrinho();
        atualizarUltimoProduto();
        atualizarTotais();
        
        document.getElementById('btnFinalizar').disabled = false;
        document.getElementById('btnImprimirOrcamento').disabled = false;
        
        document.getElementById('lastProductSection').style.display = 'block';
        
        fecharModal('notaFiscalModal');
        
        mostrarMensagem(`✅ Orçamento #${orcamento.numero} carregado no carrinho!`, 'success');
        
        await excluirOrcamentoAposConversao(orcamentoId);
        
    } catch (error) {
        console.error('❌ Erro ao converter orçamento:', error);
        mostrarMensagem(`Erro ao converter orçamento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
};

async function excluirOrcamentoAposConversao(orcamentoId) {
    try {
        console.log(`🗑️ Excluindo orçamento ${orcamentoId} da base...`);
        
        const resultado = await lojaServices.excluirOrcamento(orcamentoId);
        
        if (resultado.success) {
            console.log(`✅ Orçamento ${orcamentoId} excluído com sucesso!`);
        } else {
            console.warn(`⚠️ Não foi possível excluir o orçamento:`, resultado.error);
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir orçamento:', error);
    }
}

// ============================================
// EXCLUIR ORÇAMENTO DO HISTÓRICO
// ============================================
window.excluirOrcamento = async function(orcamentoId, orcamentoNumero) {
    try {
        if (!confirm(`🗑️ Tem certeza que deseja EXCLUIR permanentemente o orçamento #${orcamentoNumero}?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        
        mostrarLoading('Excluindo orçamento...');
        
        const resultado = await lojaServices.excluirOrcamento(orcamentoId);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao excluir orçamento');
        }
        
        mostrarMensagem(`✅ Orçamento #${orcamentoNumero} excluído com sucesso!`, 'success');
        
        setTimeout(() => {
            carregarHistoricoCompleto();
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao excluir orçamento:', error);
        mostrarMensagem(`Erro ao excluir orçamento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
};

// ============================================
// EXTORNAR VENDA
// ============================================
window.extornarVenda = async function(vendaId, vendaNumero) {
    try {
        if (!confirm(`⚠️ EXTORNAR VENDA #${vendaNumero}?\n\nTem certeza que deseja cancelar esta venda?\n\n- Os produtos serão devolvidos ao estoque\n- A venda ficará marcada como EXTORNADA no histórico\n\nEsta ação NÃO pode ser desfeita!`)) {
            return;
        }
        
        const confirmacao = prompt('Digite "EXTORNAR" para confirmar o cancelamento:');
        if (confirmacao !== 'EXTORNAR') {
            mostrarMensagem('Operação cancelada', 'info');
            return;
        }
        
        mostrarLoading('Processando extorno da venda...');
        
        const resultado = await lojaServices.buscarVendaPorId(vendaId);
        
        if (!resultado.success || !resultado.data) {
            throw new Error('Venda não encontrada');
        }
        
        const venda = resultado.data;
        
        if (venda.status === 'extornada') {
            alert('Esta venda já foi extornada anteriormente!');
            return;
        }
        
        for (const item of venda.itens) {
            await lojaServices.atualizarEstoque(
                item.produto_id,
                item.quantidade,
                'entrada'
            );
        }
        
        const dadosAtualizados = {
            status: 'extornada',
            data_extorno: new Date(),
            extornado_por: pdv.vendedorNome,
            extornado_por_id: pdv.vendedorId,
            extornado_por_login: pdv.vendedorLogin,
            motivo_extorno: 'Cancelamento pelo operador'
        };
        
        const resultadoUpdate = await lojaServices.atualizarVenda(vendaId, dadosAtualizados);
        
        if (!resultadoUpdate.success) {
            throw new Error(resultadoUpdate.error || 'Erro ao atualizar status da venda');
        }
        
        mostrarMensagem(`✅ Venda #${vendaNumero} extornada com sucesso!\nProdutos devolvidos ao estoque.`, 'success');
        
        setTimeout(() => {
            carregarHistoricoCompleto();
        }, 500);
        
        await carregarProdutos();
        
    } catch (error) {
        console.error('❌ Erro ao extornar venda:', error);
        mostrarMensagem(`Erro ao extornar venda: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
};

console.log("✅ PDV carregado com sucesso!");




