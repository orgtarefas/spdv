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
    formaPagamento: 'dinheiro',
    ultimoProduto: null,
    lojaId: lojaServices?.lojaId || 'loja-padrao',
    ultimaVenda: null
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
        
        // Inicializar modal de consulta com todos os produtos
        setTimeout(() => {
            if (pdv.produtos.length > 0) {
                const resultsDiv = document.getElementById('consultaPrecoResults');
                if (resultsDiv) {
                    resultsDiv.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
                }
            }
        }, 1000);
        
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
    
    // Botão consultar preço
    document.getElementById('btnConsultarPreco')?.addEventListener('click', abrirConsultaPreco);
    
    // Botões principais
    document.getElementById('btnFinalizar')?.addEventListener('click', finalizarVenda);
    document.getElementById('btnImprimirOrcamento')?.addEventListener('click', gerarOrcamento);
    document.getElementById('btnLimparCarrinho')?.addEventListener('click', limparCarrinho);
    
    // Forma de pagamento
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            pdv.formaPagamento = this.value;
        });
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
    
    // Botão imprimir nota da venda
    document.getElementById('btnImprimirNotaVenda')?.addEventListener('click', function() {
        window.print();
    });
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
    
    // Limpar código
    codigo = codigo.trim();
    
    // Buscar produto
    const produto = pdv.produtos.find(p => 
        p.codigo === codigo || p.codigo_barras === codigo
    );
    
    if (!produto) {
        mostrarMensagem(`Produto não encontrado: ${codigo}`, 'error');
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
    } else {
        // Novo item
        const novoItem = {
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade,
            imagem: produto.imagens?.principal || null
        };
        pdv.carrinho.push(novoItem);
        pdv.ultimoProduto = novoItem;
    }
    
    // Atualizar interfaces
    atualizarListaCarrinho();
    atualizarUltimoProduto();
    atualizarTotais();
    
    // Habilitar botões
    document.getElementById('btnFinalizar').disabled = false;
    document.getElementById('btnImprimirOrcamento').disabled = false;
    
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
                <td colspan="7">
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
                <td class="subtotal-cell">${formatarMoeda(item.subtotal)}</td>
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
            document.getElementById('btnFinalizar').disabled = true;
            document.getElementById('btnImprimirOrcamento').disabled = true;
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
    document.getElementById('lastProductTotal').textContent = formatarMoeda(produto.subtotal);
}

// ============================================
// ATUALIZAR TOTAIS
// ============================================
function atualizarTotais() {
    pdv.subtotal = pdv.carrinho.reduce((total, item) => total + item.subtotal, 0);
    pdv.total = pdv.subtotal;
    
    document.getElementById('subtotal').textContent = formatarMoeda(pdv.subtotal);
    document.getElementById('total').textContent = formatarMoeda(pdv.total);
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
        pdv.ultimoProduto = null;
        pdv.subtotal = 0;
        pdv.total = 0;
        
        document.getElementById('lastProductSection').style.display = 'none';
        document.getElementById('btnFinalizar').disabled = true;
        document.getElementById('btnImprimirOrcamento').disabled = true;
        
        atualizarListaCarrinho();
        atualizarTotais();
        
        mostrarMensagem('Carrinho limpo', 'info');
        document.getElementById('barcodeInput').focus();
    }
}

// ============================================
// CONSULTA DE PREÇO
// ============================================
function abrirConsultaPreco() {
    const modal = document.getElementById('consultaPrecoModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const input = document.getElementById('consultaPrecoInput');
    const clearBtn = document.getElementById('consultaPrecoClear');
    const results = document.getElementById('consultaPrecoResults');
    
    if (input) {
        input.value = '';
        input.focus();
    }
    
    // Mostrar todos os produtos inicialmente
    if (results && pdv.produtos.length > 0) {
        results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
    }
    
    // Configurar filtro
    input.oninput = function() {
        const termo = this.value.toLowerCase().trim();
        
        if (!termo) {
            results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
            return;
        }
        
        const filtrados = pdv.produtos.filter(p => 
            (p.codigo && p.codigo.toLowerCase().includes(termo)) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termo)) ||
            (p.nome && p.nome.toLowerCase().includes(termo)) ||
            (p.categoria && p.categoria.toLowerCase().includes(termo))
        );
        
        results.innerHTML = gerarListaProdutosConsulta(filtrados);
    };
    
    // Botão limpar
    if (clearBtn) {
        clearBtn.onclick = function() {
            input.value = '';
            input.focus();
            results.innerHTML = gerarListaProdutosConsulta(pdv.produtos);
        };
    }
}

function gerarListaProdutosConsulta(produtos) {
    if (!produtos || produtos.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
    }
    
    let html = '';
    
    produtos.forEach(p => {
        html += `
            <div class="consulta-preco-item" onclick="selecionarProdutoConsulta('${p.id}')">
                <div class="consulta-preco-info">
                    <div class="consulta-preco-codigo">
                        Código: ${p.codigo || '---'} | Cód. Barras: ${p.codigo_barras || '---'}
                    </div>
                    <div class="consulta-preco-nome">${p.nome}</div>
                </div>
                <div class="consulta-preco-preco">${formatarMoeda(p.preco)}</div>
            </div>
        `;
    });
    
    return html;
}

window.selecionarProdutoConsulta = function(id) {
    const produto = pdv.produtos.find(p => p.id === id);
    if (produto) {
        // Perguntar se quer adicionar ao carrinho
        if (confirm(`Deseja adicionar ${produto.nome} (${formatarMoeda(produto.preco)}) ao carrinho?`)) {
            fecharModal('consultaPrecoModal');
            
            // Pré-preencher código no input
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
        
        const numeroVenda = gerarNumeroVenda();
        
        const venda = {
            numero: numeroVenda,
            data: new Date(),
            itens: pdv.carrinho,
            subtotal: pdv.subtotal,
            total: pdv.total,
            formaPagamento: pdv.formaPagamento,
            vendedor: lojaServices.nomeUsuario || 'Vendedor',
            lojaId: pdv.lojaId
        };
        
        // Salvar no localStorage
        const vendas = JSON.parse(localStorage.getItem(`vendas_${pdv.lojaId}`) || '[]');
        vendas.push(venda);
        localStorage.setItem(`vendas_${pdv.lojaId}`, JSON.stringify(vendas));
        
        pdv.ultimaVenda = venda;
        
        mostrarMensagem(`Venda #${numeroVenda} finalizada!`, 'success');
        
        // Limpar carrinho
        pdv.carrinho = [];
        pdv.ultimoProduto = null;
        pdv.subtotal = 0;
        pdv.total = 0;
        
        document.getElementById('lastProductSection').style.display = 'none';
        document.getElementById('btnFinalizar').disabled = true;
        document.getElementById('btnImprimirOrcamento').disabled = true;
        
        atualizarListaCarrinho();
        atualizarTotais();
        
        // Mostrar nota fiscal automaticamente
        mostrarNotaFiscal(venda);
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao finalizar venda', 'error');
    } finally {
        esconderLoading();
    }
}

function mostrarNotaFiscal(venda) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    // Gerar conteúdo da nota
    let nota = '';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('NOTA FISCAL DE VENDA', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += `Nº: ${venda.numero}\n`;
    nota += `Data: ${new Date(venda.data).toLocaleString('pt-BR')}\n`;
    nota += `Vendedor: ${venda.vendedor}\n`;
    nota += `Forma Pagto: ${traduzirFormaPagamento(venda.formaPagamento)}\n`;
    nota += '-'.repeat(48) + '\n';
    nota += 'ITEM  DESCRIÇÃO                QTD    UNIT     TOTAL\n';
    nota += '-'.repeat(48) + '\n';
    
    venda.itens.forEach((item, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        const nome = item.nome.substring(0, 22).padEnd(22, ' ');
        const qtd = item.quantidade.toString().padStart(3, ' ');
        const unit = formatarMoedaResumida(item.preco_unitario).padStart(8, ' ');
        const total = formatarMoedaResumida(item.subtotal).padStart(8, ' ');
        
        nota += `${num} ${nome} ${qtd} ${unit} ${total}\n`;
    });
    
    nota += '-'.repeat(48) + '\n';
    nota += `Subtotal: ${formatarMoedaResumida(venda.subtotal).padStart(37)}\n`;
    nota += `TOTAL: ${formatarMoedaResumida(venda.total).padStart(40)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('OBRIGADO PELA PREFERÊNCIA!', 48) + '\n';
    nota += centralizarTexto('VOLTE SEMPRE!', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    conteudo.textContent = nota;
    modal.style.display = 'flex';
}

function formatarMoedaResumida(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function centralizarTexto(texto, largura) {
    if (texto.length >= largura) return texto;
    const espacos = Math.floor((largura - texto.length) / 2);
    return ' '.repeat(espacos) + texto;
}

function traduzirFormaPagamento(forma) {
    const traducoes = {
        'dinheiro': 'Dinheiro',
        'debito': 'Cartão Débito',
        'credito': 'Cartão Crédito',
        'pix': 'PIX'
    };
    return traducoes[forma] || forma;
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
        
        const numeroOrcamento = 'ORC-' + gerarNumeroVenda();
        const dataValidade = new Date();
        dataValidade.setDate(dataValidade.getDate() + 10);
        
        const orcamento = {
            numero: numeroOrcamento,
            data: new Date(),
            validade: dataValidade,
            itens: pdv.carrinho,
            subtotal: pdv.subtotal,
            total: pdv.total,
            vendedor: lojaServices.nomeUsuario || 'Vendedor',
            lojaId: pdv.lojaId
        };
        
        // Salvar no localStorage
        const orcamentos = JSON.parse(localStorage.getItem(`orcamentos_${pdv.lojaId}`) || '[]');
        orcamentos.push(orcamento);
        localStorage.setItem(`orcamentos_${pdv.lojaId}`, JSON.stringify(orcamentos));
        
        mostrarMensagem(`Orçamento #${numeroOrcamento} gerado!`, 'success');
        
        // Mostrar nota do orçamento
        mostrarNotaOrcamento(orcamento);
        
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao gerar orçamento', 'error');
    } finally {
        esconderLoading();
    }
}

function mostrarNotaOrcamento(orcamento) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    const dataValidade = new Date(orcamento.validade).toLocaleDateString('pt-BR');
    
    let nota = '';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('ORÇAMENTO', 48) + '\n';
    nota += centralizarTexto(orcamento.numero, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += `Data: ${new Date(orcamento.data).toLocaleString('pt-BR')}\n`;
    nota += `Vendedor: ${orcamento.vendedor}\n`;
    nota += `Validade: ${dataValidade} (10 dias)\n`;
    nota += '-'.repeat(48) + '\n';
    nota += 'ITEM  DESCRIÇÃO                QTD    UNIT     TOTAL\n';
    nota += '-'.repeat(48) + '\n';
    
    orcamento.itens.forEach((item, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        const nome = item.nome.substring(0, 22).padEnd(22, ' ');
        const qtd = item.quantidade.toString().padStart(3, ' ');
        const unit = formatarMoedaResumida(item.preco_unitario).padStart(8, ' ');
        const total = formatarMoedaResumida(item.subtotal).padStart(8, ' ');
        
        nota += `${num} ${nome} ${qtd} ${unit} ${total}\n`;
    });
    
    nota += '-'.repeat(48) + '\n';
    nota += `Subtotal: ${formatarMoedaResumida(orcamento.subtotal).padStart(37)}\n`;
    nota += `TOTAL: ${formatarMoedaResumida(orcamento.total).padStart(40)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('ORÇAMENTO VÁLIDO POR 10 DIAS', 48) + '\n';
    nota += centralizarTexto('Lei Federal nº 8.078/90', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    conteudo.textContent = nota;
    modal.style.display = 'flex';
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
// HISTÓRICO
// ============================================
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
                    <div>Pagamento: ${traduzirFormaPagamento(v.formaPagamento)}</div>
                    <div>Vendedor: ${v.vendedor}</div>
                </div>
                <div class="historico-acoes">
                    <button class="btn-historico-print" onclick="verNotaVenda('${v.numero}')">
                        <i class="fas fa-eye"></i> Ver Nota
                    </button>
                </div>
            </div>
        `;
    });
    
    results.innerHTML = html;
}

window.filtrarHistorico = function() {
    carregarHistorico();
};

window.verNotaVenda = function(numero) {
    const vendas = JSON.parse(localStorage.getItem(`vendas_${pdv.lojaId}`) || '[]');
    const venda = vendas.find(v => v.numero === numero);
    
    if (venda) {
        mostrarNotaFiscal(venda);
    }
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
