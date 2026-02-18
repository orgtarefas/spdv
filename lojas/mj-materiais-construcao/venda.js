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
    ultimoProduto: null,
    lojaId: lojaServices?.lojaId || null,
    ultimaVenda: null,
    ultimoOrcamento: null,
    vendedorNome: lojaServices?.nomeUsuario || 'Vendedor',
    vendedorId: lojaServices?.usuarioId || null
};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página carregada");
    
    try {
        mostrarLoading('Inicializando PDV...');
        
        // Verificar loja
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }
        
        pdv.lojaId = lojaServices.lojaId;
        pdv.vendedorNome = lojaServices.nomeUsuario || 'Vendedor';
        pdv.vendedorId = lojaServices.usuarioId || null;
        
        console.log(`✅ Loja identificada: ${pdv.lojaId}`);
        console.log(`👤 Vendedor: ${pdv.vendedorNome}`);
        
        // Atualizar interface
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar produtos
        await carregarProdutos();
        
        // Foco no input
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
    
    // Botão converter orçamento em venda
    document.getElementById('btnConverterOrcamento')?.addEventListener('click', converterOrcamentoEmVenda);
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
    
    // Buscar produto (por código ou código de barras)
    const produto = pdv.produtos.find(p => 
        p.codigo === codigo || p.codigo_barras === codigo
    );
    
    if (!produto) {
        mostrarMensagem(`Produto não encontrado: ${codigo}`, 'error');
        
        // Perguntar se quer buscar manualmente
        setTimeout(() => {
            if (confirm('Produto não encontrado. Deseja buscar manualmente?')) {
                abrirConsultaPreco();
            }
        }, 100);
        
        return;
    }
    
    // Verificar estoque
    if (produto.quantidade <= 0) {
        mostrarMensagem(`Produto ${produto.nome} sem estoque`, 'warning');
        return;
    }
    
    // Pegar quantidade
    const quantidade = parseInt(document.getElementById('itemQuantity').value) || 1;
    
    // Verificar se quantidade solicitada é maior que estoque
    if (quantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
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
        // Verificar se nova quantidade total excede estoque
        const novaQuantidade = pdv.carrinho[index].quantidade + quantidade;
        if (novaQuantidade > produto.quantidade) {
            mostrarMensagem(`Quantidade total excede estoque. Estoque: ${produto.quantidade}`, 'warning');
            return;
        }
        
        // Atualizar quantidade
        pdv.carrinho[index].quantidade = novaQuantidade;
        pdv.carrinho[index].subtotal = novaQuantidade * pdv.carrinho[index].preco_unitario;
    } else {
        // Novo item
        const novoItem = {
            id: produto.id,
            codigo: produto.codigo,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade,
            imagem: produto.imagens?.principal || null,
            unidade: produto.unidade_venda || produto.unidade || 'UN'
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
    
    // Verificar estoque
    const produto = pdv.produtos.find(p => p.id === pdv.carrinho[index].id);
    if (produto && novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
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
            
            // Esconder seção último produto
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
    const produto = pdv.ultimoProduto;
    
    if (!produto || !section) {
        if (section) section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    
    // Elementos que podem não existir - verificar antes de usar
    const nameEl = document.getElementById('lastProductName');
    const codeEl = document.getElementById('lastProductCode');
    const unitPriceEl = document.getElementById('lastProductUnitPrice');
    const totalEl = document.getElementById('lastProductTotal');
    const imgEl = document.getElementById('lastProductImage');
    
    if (nameEl) nameEl.textContent = produto.nome;
    if (codeEl) codeEl.textContent = produto.codigo || '---';
    
    // Imagem
    if (imgEl) {
        if (produto.imagem) {
            imgEl.src = produto.imagem;
        } else {
            imgEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTEwIDYwTDIwIDQwTDMwIDUwTDQwIDMwTDUwIDUwTDYwIDQwTDcwIDYwSDEwWiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNFTSBGT1RPPC90ZXh0Pjwvc3ZnPg==';
        }
    }
    
    if (unitPriceEl) unitPriceEl.textContent = formatarMoeda(produto.preco_unitario);
    if (totalEl) totalEl.textContent = formatarMoeda(produto.subtotal);
}

// ============================================
// ATUALIZAR TOTAIS
// ============================================
function atualizarTotais() {
    pdv.subtotal = pdv.carrinho.reduce((total, item) => total + item.subtotal, 0);
    pdv.total = pdv.subtotal;
    
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
        pdv.ultimoProduto = null;
        pdv.subtotal = 0;
        pdv.total = 0;
        
        const lastSection = document.getElementById('lastProductSection');
        if (lastSection) lastSection.style.display = 'none';
        
        const btnFinalizar = document.getElementById('btnFinalizar');
        const btnOrcamento = document.getElementById('btnImprimirOrcamento');
        
        if (btnFinalizar) btnFinalizar.disabled = true;
        if (btnOrcamento) btnOrcamento.disabled = true;
        
        atualizarListaCarrinho();
        atualizarTotais();
        
        mostrarMensagem('Carrinho limpo', 'info');
        
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.focus();
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
    
    // Botão limpar
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
        const estoqueClass = p.quantidade > 0 ? 'estoque-normal' : 'estoque-zero';
        const estoqueTexto = p.quantidade > 0 ? `Estoque: ${p.quantidade} ${p.unidade || 'UN'}` : 'SEM ESTOQUE';
        
        html += `
            <div class="consulta-preco-item" onclick="selecionarProdutoConsulta('${p.id}')">
                <div class="consulta-preco-info">
                    <div class="consulta-preco-codigo">
                        Cód: ${p.codigo || '---'} | ${p.codigo_barras ? `Barras: ${p.codigo_barras}` : ''}
                    </div>
                    <div class="consulta-preco-nome">${p.nome}</div>
                    <div class="consulta-preco-estoque ${estoqueClass}">${estoqueTexto}</div>
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
        // Verificar estoque
        if (produto.quantidade <= 0) {
            alert(`Produto ${produto.nome} sem estoque disponível!`);
            return;
        }
        
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
        
        const numeroVenda = gerarNumeroVenda('V');
        
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
                unidade: item.unidade
            })),
            subtotal: pdv.subtotal,
            total: pdv.total,
            forma_pagamento: pdv.formaPagamento,
            vendedor_id: pdv.vendedorId,
            vendedor_nome: pdv.vendedorNome,
            loja_id: pdv.lojaId,
            status: 'concluida',
            data_criacao: new Date()
        };
        
        // Salvar no Firebase
        const resultado = await lojaServices.criarVenda(vendaData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar venda');
        }
        
        // Atualizar estoque dos produtos
        await atualizarEstoqueProdutos();
        
        pdv.ultimaVenda = { ...vendaData, id: resultado.id };
        
        mostrarMensagem(`Venda #${numeroVenda} finalizada com sucesso!`, 'success');
        
        // Limpar carrinho
        limparCarrinhoAposFinalizar();
        
        // Mostrar nota fiscal automaticamente
        mostrarNotaFiscalVenda(pdv.ultimaVenda);
        
        // Recarregar produtos para atualizar estoque
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
    pdv.ultimoProduto = null;
    pdv.subtotal = 0;
    pdv.total = 0;
    
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
            const resultado = await lojaServices.atualizarEstoque(
                item.id,
                item.quantidade,
                'saida'
            );
            
            if (!resultado.success) {
                console.warn(`Aviso ao atualizar estoque de ${item.nome}:`, resultado.error);
            }
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
        dataValidade.setDate(dataValidade.getDate() + 10); // Validade de 10 dias
        
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
                unidade: item.unidade
            })),
            subtotal: pdv.subtotal,
            total: pdv.total,
            vendedor_id: pdv.vendedorId,
            vendedor_nome: pdv.vendedorNome,
            loja_id: pdv.lojaId,
            status: 'ativo', // ativo, convertido, expirado
            convertido_em_venda: null // ID da venda quando convertido
        };
        
        // Salvar no Firebase
        const resultado = await lojaServices.criarOrcamento(orcamentoData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar orçamento');
        }
        
        pdv.ultimoOrcamento = { ...orcamentoData, id: resultado.id };
        
        mostrarMensagem(`Orçamento #${numeroOrcamento} gerado com sucesso!`, 'success');
        
        // Mostrar nota do orçamento
        mostrarNotaOrcamento(pdv.ultimoOrcamento);
        
    } catch (error) {
        console.error('❌ Erro ao gerar orçamento:', error);
        mostrarMensagem(`Erro ao gerar orçamento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// MOSTRAR NOTA FISCAL DE VENDA
// ============================================
function mostrarNotaFiscalVenda(venda) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    // Dados da loja
    const nomeLoja = document.getElementById('nomeLoja')?.textContent || 'SUA LOJA';
    const dataVenda = new Date(venda.data || venda.data_criacao).toLocaleString('pt-BR');
    
    // Gerar conteúdo da nota
    let nota = '';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto(nomeLoja, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('CUPOM NÃO FISCAL - VENDA', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += `VENDA: ${venda.numero}\n`;
    nota += `DATA: ${dataVenda}\n`;
    nota += `VENDEDOR: ${venda.vendedor_nome}\n`;
    nota += `PAGAMENTO: ${traduzirFormaPagamento(venda.forma_pagamento)}\n`;
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
    nota += `SUBTOTAL:${formatarMoedaResumida(venda.subtotal).padStart(38)}\n`;
    nota += `TOTAL:${formatarMoedaResumida(venda.total).padStart(41)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('OBRIGADO PELA PREFERÊNCIA!', 48) + '\n';
    nota += centralizarTexto('VOLTE SEMPRE!', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    // Adicionar botão de reimpressão no modal
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn-print" onclick="reimprimirNota('${venda.id}', 'VENDA')">
                <i class="fas fa-print"></i> Reimprimir
            </button>
            <button class="btn-cancel" onclick="fecharModal('notaFiscalModal')">
                <i class="fas fa-times"></i> Fechar
            </button>
        `;
    }
    
    conteudo.textContent = nota;
    modal.style.display = 'flex';
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
    nota += `VENDEDOR: ${orcamento.vendedor_nome}\n`;
    nota += `VALIDADE: ${dataValidade} (10 DIAS)\n`;
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
    nota += `SUBTOTAL:${formatarMoedaResumida(orcamento.subtotal).padStart(38)}\n`;
    nota += `TOTAL:${formatarMoedaResumida(orcamento.total).padStart(41)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('ORÇAMENTO VÁLIDO POR 10 DIAS', 48) + '\n';
    nota += centralizarTexto('Lei Federal nº 8.078/90', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    // Adicionar botão de converter em venda no modal
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn-convert" onclick="converterOrcamentoParaVenda('${orcamento.id}')">
                <i class="fas fa-cash-register"></i> Converter em Venda
            </button>
            <button class="btn-print" onclick="reimprimirNota('${orcamento.id}', 'ORCAMENTO')">
                <i class="fas fa-print"></i> Reimprimir
            </button>
            <button class="btn-cancel" onclick="fecharModal('notaFiscalModal')">
                <i class="fas fa-times"></i> Fechar
            </button>
        `;
    }
    
    conteudo.textContent = nota;
    modal.style.display = 'flex';
}

// ============================================
// CONVERTER ORÇAMENTO EM VENDA
// ============================================
window.converterOrcamentoParaVenda = async function(orcamentoId) {
    try {
        mostrarLoading('Buscando orçamento...');
        
        // Buscar orçamento do Firebase
        const resultado = await lojaServices.buscarOrcamentoPorId(orcamentoId);
        
        if (!resultado.success || !resultado.data) {
            throw new Error('Orçamento não encontrado');
        }
        
        const orcamento = resultado.data;
        
        // Verificar se orçamento ainda é válido
        const dataValidade = new Date(orcamento.data_validade);
        const hoje = new Date();
        
        if (hoje > dataValidade) {
            if (!confirm('Este orçamento está vencido. Deseja continuar mesmo assim?')) {
                fecharModal('notaFiscalModal');
                return;
            }
        }
        
        // Verificar estoque dos produtos
        const produtosSemEstoque = [];
        for (const item of orcamento.itens) {
            const produto = pdv.produtos.find(p => p.id === item.produto_id);
            if (!produto || produto.quantidade < item.quantidade) {
                produtosSemEstoque.push(`${item.nome} (disponível: ${produto?.quantidade || 0})`);
            }
        }
        
        if (produtosSemEstoque.length > 0) {
            alert(`Produtos com estoque insuficiente:\n${produtosSemEstoque.join('\n')}`);
            fecharModal('notaFiscalModal');
            return;
        }
        
        // Confirmar conversão
        if (!confirm(`Converter orçamento ${orcamento.numero} em venda no valor de ${formatarMoeda(orcamento.total)}?`)) {
            return;
        }
        
        mostrarLoading('Convertendo orçamento em venda...');
        
        // Criar venda a partir do orçamento
        const numeroVenda = gerarNumeroVenda('V');
        
        const vendaData = {
            tipo: 'VENDA',
            numero: numeroVenda,
            data: new Date(),
            itens: orcamento.itens,
            subtotal: orcamento.subtotal,
            total: orcamento.total,
            forma_pagamento: 'dinheiro', // Padrão, pode ser alterado
            vendedor_id: pdv.vendedorId,
            vendedor_nome: pdv.vendedorNome,
            loja_id: pdv.lojaId,
            status: 'concluida',
            orcamento_origem: orcamentoId,
            data_criacao: new Date()
        };
        
        // Salvar venda no Firebase
        const resultadoVenda = await lojaServices.criarVenda(vendaData);
        
        if (!resultadoVenda.success) {
            throw new Error(resultadoVenda.error || 'Erro ao salvar venda');
        }
        
        // Atualizar estoque
        for (const item of orcamento.itens) {
            await lojaServices.atualizarEstoque(
                item.produto_id,
                item.quantidade,
                'saida'
            );
        }
        
        // Marcar orçamento como convertido
        await lojaServices.atualizarOrcamento(orcamentoId, {
            status: 'convertido',
            convertido_em_venda: resultadoVenda.id
        });
        
        fecharModal('notaFiscalModal');
        
        mostrarMensagem(`Orçamento convertido em venda #${numeroVenda}!`, 'success');
        
        // Mostrar nota da venda
        mostrarNotaFiscalVenda({ ...vendaData, id: resultadoVenda.id });
        
        // Recarregar produtos
        await carregarProdutos();
        
    } catch (error) {
        console.error('❌ Erro ao converter orçamento:', error);
        mostrarMensagem(`Erro ao converter orçamento: ${error.message}`, 'error');
    } finally {
        esconderLoading();
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

function formatarMoedaResumida(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

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
        'pix': 'PIX'
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
    if (userElement && pdv.vendedorNome) userElement.textContent = pdv.vendedorNome;
    
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

// Função global para fechar modais
window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
};

// Função global para reimprimir notas
window.reimprimirNota = async function(id, tipo) {
    try {
        if (tipo === 'VENDA') {
            const resultado = await lojaServices.buscarVendaPorId(id);
            if (resultado.success && resultado.data) {
                mostrarNotaFiscalVenda(resultado.data);
            }
        } else if (tipo === 'ORCAMENTO') {
            const resultado = await lojaServices.buscarOrcamentoPorId(id);
            if (resultado.success && resultado.data) {
                mostrarNotaOrcamento(resultado.data);
            }
        }
    } catch (error) {
        console.error('Erro ao reimprimir:', error);
        mostrarMensagem('Erro ao reimprimir nota', 'error');
    }
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
            
            // Atualizar modal de consulta se estiver aberto
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
// HISTÓRICO (BUSCA DO FIREBASE)
// ============================================
function abrirHistorico() {
    const modal = document.getElementById('historicoModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const hoje = new Date().toISOString().split('T')[0];
    const filtroData = document.getElementById('filtroData');
    if (filtroData) filtroData.value = hoje;
    
    carregarHistoricoFirebase();
}

async function carregarHistoricoFirebase() {
    const data = document.getElementById('filtroData')?.value;
    const numero = document.getElementById('filtroNumero')?.value?.toLowerCase();
    const results = document.getElementById('historicoResults');
    
    if (!results) return;
    
    try {
        mostrarLoading('Buscando histórico...');
        
        // Buscar vendas do Firebase
        const resultadoVendas = await lojaServices.buscarVendas({
            data: data,
            numero: numero
        });
        
        // Buscar orçamentos do Firebase
        const resultadoOrcamentos = await lojaServices.buscarOrcamentos({
            data: data,
            numero: numero
        });
        
        const vendas = resultadoVendas.success ? resultadoVendas.data || [] : [];
        const orcamentos = resultadoOrcamentos.success ? resultadoOrcamentos.data || [] : [];
        
        // Combinar e ordenar
        const todos = [
            ...vendas.map(v => ({ ...v, tipo_display: 'VENDA' })),
            ...orcamentos.map(o => ({ ...o, tipo_display: 'ORÇAMENTO' }))
        ].sort((a, b) => new Date(b.data_criacao || b.data) - new Date(a.data_criacao || a.data));
        
        if (todos.length === 0) {
            results.innerHTML = '<div class="empty-state">Nenhum registro encontrado</div>';
            return;
        }
        
        let html = '';
        
        todos.forEach(item => {
            const dataItem = new Date(item.data_criacao || item.data).toLocaleString('pt-BR');
            const tipoClass = item.tipo_display === 'VENDA' ? 'tipo-venda' : 'tipo-orcamento';
            
            let statusHtml = '';
            if (item.tipo_display === 'ORÇAMENTO') {
                const valido = new Date(item.data_validade) > new Date();
                statusHtml = `<span class="status-badge ${valido ? 'valido' : 'expirado'}">${valido ? 'Válido' : 'Expirado'}</span>`;
            }
            
            html += `
                <div class="historico-item ${tipoClass}">
                    <div class="historico-header">
                        <div>
                            <strong>${item.tipo_display} #${item.numero}</strong> - ${dataItem}
                            ${statusHtml}
                        </div>
                        <span class="historico-total">${formatarMoeda(item.total)}</span>
                    </div>
                    <div class="historico-detalhes">
                        <div>Itens: ${item.itens?.length || 0}</div>
                        ${item.forma_pagamento ? `<div>Pagamento: ${traduzirFormaPagamento(item.forma_pagamento)}</div>` : ''}
                        <div>Vendedor: ${item.vendedor_nome}</div>
                        ${item.data_validade ? `<div>Validade: ${new Date(item.data_validade).toLocaleDateString('pt-BR')}</div>` : ''}
                    </div>
                    <div class="historico-acoes">
                        ${item.tipo_display === 'ORÇAMENTO' && item.status === 'ativo' ? 
                            `<button class="btn-convert" onclick="converterOrcamentoParaVenda('${item.id}')">
                                <i class="fas fa-cash-register"></i> Converter em Venda
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
        console.error('Erro ao carregar histórico:', error);
        results.innerHTML = '<div class="empty-state error">Erro ao carregar histórico</div>';
    } finally {
        esconderLoading();
    }
}

window.filtrarHistorico = function() {
    carregarHistoricoFirebase();
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

// Fechar modais clicando fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

console.log("✅ PDV carregado com sucesso!");
