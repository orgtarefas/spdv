// venda.js - Sistema de Ponto de Venda
import { lojaServices } from './firebase_config.js';

// Elementos DOM
const inputBusca = document.getElementById('inputBusca');
const resultadosBusca = document.getElementById('resultadosBusca');
const produtosFrequentes = document.getElementById('produtosFrequentes');
const btnSelecionarCliente = document.getElementById('btnSelecionarCliente');
const clienteAtual = document.getElementById('clienteAtual');
const carrinhoItems = document.getElementById('carrinhoItems');
const subtotalElement = document.getElementById('subtotal');
const totalFinalElement = document.getElementById('totalFinal');
const btnAplicarDesconto = document.getElementById('btnAplicarDesconto');
const inputDesconto = document.getElementById('inputDesconto');
const formasPagamento = document.querySelectorAll('input[name="formaPagamento"]');
const valorRecebido = document.getElementById('valorRecebido');
const trocoElement = document.getElementById('troco');
const btnCancelarVenda = document.getElementById('btnCancelarVenda');
const btnSalvarVenda = document.getElementById('btnSalvarVenda');
const btnFinalizarVenda = document.getElementById('btnFinalizarVenda');
const numeroVenda = document.getElementById('numeroVenda');
const btnBuscaAvancada = document.getElementById('btnBuscaAvancada');

// Modais
const modalBuscaAvancada = document.getElementById('modalBuscaAvancada');
const modalCliente = document.getElementById('modalCliente');
const modalFinalizar = document.getElementById('modalFinalizar');

// Elementos modais
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroEstoque = document.getElementById('filtroEstoque');
const filtroPrecoMin = document.getElementById('filtroPrecoMin');
const filtroPrecoMax = document.getElementById('filtroPrecoMax');
const resultadosAvancados = document.getElementById('resultadosAvancados');
const buscaCliente = document.getElementById('buscaCliente');
const clientesLista = document.getElementById('clientesLista');

// Variáveis globais
let produtos = [];
let produtosFiltrados = [];
let clientes = [];
let produtosFrequentesLista = [];
let carrinho = [];
let clienteSelecionado = null;
let modoBusca = 'codigo'; // 'codigo', 'nome', 'categoria'
let formaPagamentoSelecionada = 'dinheiro';
let descontoPercentual = 0;
let numeroVendaAtual = '000001';

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🛒 Sistema de Venda - Inicializando...');
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados iniciais
    await carregarDadosIniciais();
    
    // Atualizar menu ativo
    atualizarMenuAtivo();
    
    // Configurar teclas de atalho
    configurarAtalhosTeclado();
    
    // Gerar número da venda
    gerarNumeroVenda();
});

// ============================================
// 2. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Busca rápida
    inputBusca.addEventListener('input', buscarProdutos);
    inputBusca.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            adicionarPrimeiroResultado();
        }
        if (e.key === 'F2') {
            e.preventDefault();
            abrirModalBuscaAvancada();
        }
    });
    
    // Botões de tipo de busca
    document.querySelectorAll('.btn-busca-tipo').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-busca-tipo').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            modoBusca = this.dataset.tipo;
            buscarProdutos();
        });
    });
    
    // Botão busca avançada
    btnBuscaAvancada.addEventListener('click', abrirModalBuscaAvancada);
    
    // Botão selecionar cliente
    btnSelecionarCliente.addEventListener('click', abrirModalCliente);
    
    // Botões do carrinho (desconto)
    btnAplicarDesconto.addEventListener('click', function() {
        const desconto = parseFloat(inputDesconto.value) || 0;
        aplicarDesconto(desconto);
        calcularTotal();
    });
    
    inputDesconto.addEventListener('change', function() {
        const desconto = parseFloat(this.value) || 0;
        aplicarDesconto(desconto);
        calcularTotal();
    });
    
    // Formas de pagamento
    formasPagamento.forEach(radio => {
        radio.addEventListener('change', function() {
            formaPagamentoSelecionada = this.value;
            atualizarDetalhesPagamento();
        });
    });
    
    // Valor recebido
    valorRecebido.addEventListener('input', calcularTroco);
    
    // Botões de ação
    btnCancelarVenda.addEventListener('click', confirmarCancelarVenda);
    btnSalvarVenda.addEventListener('click', salvarVenda);
    btnFinalizarVenda.addEventListener('click', abrirModalFinalizar);
    
    // Modais
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            fecharModal(modal);
        });
    });
    
    // Botões cancelar nos modais
    const btnCancels = document.querySelectorAll('.btn-cancelar');
    btnCancels.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            fecharModal(modal);
        });
    });
    
    // Fechar modal ao clicar fora
    [modalBuscaAvancada, modalCliente, modalFinalizar].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    fecharModal(this);
                }
            });
        }
    });
    
    // Botões no modal de busca avançada
    const btnLimparFiltros = document.querySelector('.btn-limpar');
    const btnBuscarAvancado = document.querySelector('.btn-buscar');
    
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', limparFiltrosBusca);
    }
    
    if (btnBuscarAvancado) {
        btnBuscarAvancado.addEventListener('click', buscarProdutosAvancado);
    }
    
    // Busca de clientes
    if (buscaCliente) {
        buscaCliente.addEventListener('input', buscarClientes);
    }
    
    // Botão novo cliente
    const btnNovoCliente = document.querySelector('.btn-novo-cliente');
    if (btnNovoCliente) {
        btnNovoCliente.addEventListener('click', function() {
            showMessage('Funcionalidade em desenvolvimento', 'info');
        });
    }
    
    // Botão confirmar venda
    const btnConfirmarVenda = document.querySelector('#modalFinalizar .btn-confirmar');
    if (btnConfirmarVenda) {
        btnConfirmarVenda.addEventListener('click', finalizarVenda);
    }
}

function configurarAtalhosTeclado() {
    document.addEventListener('keydown', function(e) {
        // F2 - Busca avançada
        if (e.key === 'F2' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            abrirModalBuscaAvancada();
        }
        
        // F3 - Foco na busca
        if (e.key === 'F3' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            inputBusca.focus();
            inputBusca.select();
        }
        
        // F4 - Selecionar cliente
        if (e.key === 'F4' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            abrirModalCliente();
        }
        
        // F5 - Finalizar venda
        if (e.key === 'F5' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            abrirModalFinalizar();
        }
        
        // ESC - Cancelar venda
        if (e.key === 'Escape') {
            if (document.querySelector('.modal[style*="display: flex"]')) {
                const modal = document.querySelector('.modal[style*="display: flex"]');
                fecharModal(modal);
            } else if (carrinho.length > 0) {
                confirmarCancelarVenda();
            }
        }
        
        // Ctrl+Enter - Adicionar produto selecionado
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            adicionarPrimeiroResultado();
        }
        
        // Ctrl+D - Aplicar desconto
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            inputDesconto.focus();
            inputDesconto.select();
        }
        
        // Ctrl+P - Imprimir venda (futuro)
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            // showMessage('Funcionalidade de impressão em desenvolvimento', 'info');
        }
    });
}

// ============================================
// 3. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        showLoading('Carregando dados da venda...');
        
        // Carregar produtos
        await carregarProdutos();
        
        // Carregar produtos frequentes
        await carregarProdutosFrequentes();
        
        // Carregar clientes
        await carregarClientes();
        
        // Carregar categorias para filtro
        await carregarCategorias();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao carregar dados iniciais:', error);
        showMessage('Erro ao carregar dados da venda', 'error');
    }
}

async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutos({ ativo: true });
        
        if (resultado.success) {
            produtos = resultado.data.filter(p => p.ativo && (p.quantidade || 0) > 0);
            produtosFiltrados = [...produtos];
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        produtos = [];
        produtosFiltrados = [];
    }
}

async function carregarProdutosFrequentes() {
    try {
        // Para demonstração, pegar os primeiros 8 produtos
        // Na implementação real, pegar produtos mais vendidos
        produtosFrequentesLista = produtos.slice(0, 8);
        renderizarProdutosFrequentes();
        
    } catch (error) {
        console.error('Erro ao carregar produtos frequentes:', error);
        produtosFrequentesLista = [];
    }
}

async function carregarClientes() {
    try {
        const resultado = await lojaServices.buscarClientes();
        
        if (resultado.success) {
            clientes = resultado.data;
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        clientes = [];
    }
}

async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        if (resultado.success && filtroCategoria) {
            const categorias = resultado.data;
            
            // Limpar e adicionar categorias
            filtroCategoria.innerHTML = '<option value="">Todas categorias</option>';
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = categoria;
                filtroCategoria.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

// ============================================
// 4. BUSCA E SELEÇÃO DE PRODUTOS
// ============================================
function buscarProdutos() {
    const termo = inputBusca.value.toLowerCase().trim();
    
    if (!termo) {
        resultadosBusca.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Digite para buscar produtos</p>
                <small>ou pressione F2 para busca avançada</small>
            </div>
        `;
        return;
    }
    
    produtosFiltrados = produtos.filter(produto => {
        switch(modoBusca) {
            case 'codigo':
                return produto.codigo?.toLowerCase().includes(termo);
            case 'nome':
                return produto.nome.toLowerCase().includes(termo);
            case 'categoria':
                return produto.categoria?.toLowerCase().includes(termo);
            default:
                return produto.nome.toLowerCase().includes(termo) ||
                       produto.codigo?.toLowerCase().includes(termo);
        }
    });
    
    renderizarResultadosBusca();
}

function renderizarResultadosBusca() {
    if (produtosFiltrados.length === 0) {
        resultadosBusca.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado</p>
                <small>Tente outro termo de busca</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        html += `
            <div class="resultado-item" data-id="${produto.id}">
                <div class="resultado-info">
                    <h4>${produto.nome}</h4>
                    <p class="text-muted">${produto.codigo} | ${produto.categoria || 'Sem categoria'}</p>
                </div>
                <div class="resultado-preco">
                    <strong class="text-primary">R$ ${formatarMoeda(produto.preco)}</strong>
                    <small>Estoque: ${produto.quantidade || 0} ${produto.unidade || 'UN'}</small>
                </div>
                <button class="btn-adicionar" data-id="${produto.id}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    });
    
    resultadosBusca.innerHTML = html;
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.btn-adicionar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                adicionarAoCarrinho(produto);
            }
        });
    });
    
    // Adicionar evento de clique nos itens
    document.querySelectorAll('.resultado-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-adicionar')) {
                const produtoId = this.dataset.id;
                const produto = produtos.find(p => p.id === produtoId);
                if (produto) {
                    adicionarAoCarrinho(produto);
                }
            }
        });
    });
}

function adicionarPrimeiroResultado() {
    if (produtosFiltrados.length > 0) {
        adicionarAoCarrinho(produtosFiltrados[0]);
        inputBusca.value = '';
        inputBusca.focus();
    }
}

// ============================================
// 5. PRODUTOS FREQUENTES
// ============================================
function renderizarProdutosFrequentes() {
    if (produtosFrequentesLista.length === 0) {
        produtosFrequentes.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>Nenhum produto frequente</p>
                <small>Produtos serão exibidos conforme as vendas</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    produtosFrequentesLista.forEach(produto => {
        html += `
            <div class="produto-card" data-id="${produto.id}">
                <i class="fas fa-box"></i>
                <div class="produto-info">
                    <h4>${produto.nome.substring(0, 15)}${produto.nome.length > 15 ? '...' : ''}</h4>
                    <p>${produto.codigo}</p>
                    <div class="produto-preco">R$ ${formatarMoeda(produto.preco)}</div>
                </div>
            </div>
        `;
    });
    
    produtosFrequentes.innerHTML = html;
    
    // Adicionar eventos
    document.querySelectorAll('.produto-card').forEach(card => {
        card.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                adicionarAoCarrinho(produto);
            }
        });
    });
}

// ============================================
// 6. CARRINHO DE COMPRAS
// ============================================
function adicionarAoCarrinho(produto, quantidade = 1) {
    // Verificar se produto já está no carrinho
    const itemExistente = carrinho.find(item => item.id === produto.id);
    
    if (itemExistente) {
        // Atualizar quantidade
        itemExistente.quantidade += quantidade;
        showMessage(`${produto.nome} atualizado no carrinho`, 'success');
    } else {
        // Adicionar novo item
        carrinho.push({
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: quantidade,
            unidade: produto.unidade || 'UN'
        });
        showMessage(`${produto.nome} adicionado ao carrinho`, 'success');
    }
    
    renderizarCarrinho();
    calcularTotal();
}

function removerDoCarrinho(produtoId) {
    const index = carrinho.findIndex(item => item.id === produtoId);
    if (index !== -1) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
        calcularTotal();
        showMessage('Produto removido do carrinho', 'info');
    }
}

function atualizarQuantidade(produtoId, novaQuantidade) {
    if (novaQuantidade < 1) {
        removerDoCarrinho(produtoId);
        return;
    }
    
    const item = carrinho.find(item => item.id === produtoId);
    if (item) {
        item.quantidade = novaQuantidade;
        renderizarCarrinho();
        calcularTotal();
    }
}

function renderizarCarrinho() {
    if (carrinho.length === 0) {
        carrinhoItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
                <small>Adicione produtos para iniciar a venda</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    carrinho.forEach(item => {
        const total = item.preco * item.quantidade;
        
        html += `
            <div class="carrinho-item" data-id="${item.id}">
                <div>
                    <div class="produto-nome">${item.nome}</div>
                    <div class="produto-codigo">${item.codigo}</div>
                </div>
                <div class="quantidade-control">
                    <button class="btn-quantidade btn-diminuir" data-id="${item.id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" 
                           class="quantidade-input" 
                           value="${item.quantidade}" 
                           min="1" 
                           data-id="${item.id}">
                    <button class="btn-quantidade btn-aumentar" data-id="${item.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="produto-preco">R$ ${formatarMoeda(item.preco)}</div>
                <div class="produto-total">R$ ${formatarMoeda(total)}</div>
                <button class="btn-remover-item" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    
    carrinhoItems.innerHTML = html;
    
    // Adicionar eventos aos controles
    document.querySelectorAll('.btn-diminuir').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const item = carrinho.find(item => item.id === produtoId);
            if (item) {
                atualizarQuantidade(produtoId, item.quantidade - 1);
            }
        });
    });
    
    document.querySelectorAll('.btn-aumentar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const item = carrinho.find(item => item.id === produtoId);
            if (item) {
                atualizarQuantidade(produtoId, item.quantidade + 1);
            }
        });
    });
    
    document.querySelectorAll('.quantidade-input').forEach(input => {
        input.addEventListener('change', function() {
            const produtoId = this.dataset.id;
            const novaQuantidade = parseInt(this.value) || 1;
            atualizarQuantidade(produtoId, novaQuantidade);
        });
    });
    
    document.querySelectorAll('.btn-remover-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            removerDoCarrinho(produtoId);
        });
    });
}

function calcularTotal() {
    let subtotal = 0;
    
    carrinho.forEach(item => {
        subtotal += item.preco * item.quantidade;
    });
    
    const desconto = subtotal * (descontoPercentual / 100);
    const total = subtotal - desconto;
    
    subtotalElement.textContent = `R$ ${formatarMoeda(subtotal)}`;
    totalFinalElement.textContent = `R$ ${formatarMoeda(total)}`;
    
    // Atualizar troco
    calcularTroco();
}

function aplicarDesconto(percentual) {
    if (percentual < 0 || percentual > 100) {
        showMessage('Desconto deve estar entre 0 e 100%', 'warning');
        inputDesconto.value = 0;
        percentual = 0;
    }
    
    descontoPercentual = percentual;
    calcularTotal();
}

// ============================================
// 7. CLIENTES
// ============================================
function abrirModalCliente() {
    buscarClientes();
    abrirModal(modalCliente);
}

function buscarClientes() {
    const termo = buscaCliente?.value.toLowerCase().trim() || '';
    
    let clientesFiltrados = clientes;
    
    if (termo) {
        clientesFiltrados = clientes.filter(cliente => {
            return cliente.nome?.toLowerCase().includes(termo) ||
                   cliente.cpf_cnpj?.toLowerCase().includes(termo) ||
                   cliente.telefone?.toLowerCase().includes(termo);
        });
    }
    
    renderizarClientes(clientesFiltrados);
}

function renderizarClientes(clientesLista) {
    if (clientesLista.length === 0) {
        clientesLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>Nenhum cliente encontrado</p>
                <button class="btn-novo-cliente-lista" id="btnNovoClienteLista">
                    <i class="fas fa-user-plus"></i>
                    Cadastrar Primeiro Cliente
                </button>
            </div>
        `;
        
        document.getElementById('btnNovoClienteLista')?.addEventListener('click', function() {
            showMessage('Funcionalidade em desenvolvimento', 'info');
        });
        
        return;
    }
    
    let html = '';
    
    clientesLista.forEach(cliente => {
        html += `
            <div class="cliente-item" data-id="${cliente.id}">
                <div class="cliente-info">
                    <h4>${cliente.nome}</h4>
                    <p class="text-muted">
                        ${cliente.cpf_cnpj ? `CPF/CNPJ: ${cliente.cpf_cnpj}` : ''}
                        ${cliente.telefone ? ` | Tel: ${cliente.telefone}` : ''}
                    </p>
                </div>
                <div class="cliente-acoes">
                    <button class="btn-selecionar-cliente-modal" data-id="${cliente.id}">
                        Selecionar
                    </button>
                </div>
            </div>
        `;
    });
    
    clientesLista.innerHTML = html;
    
    // Adicionar eventos
    document.querySelectorAll('.btn-selecionar-cliente-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const clienteId = this.dataset.id;
            selecionarCliente(clienteId);
        });
    });
    
    // Selecionar ao clicar no item
    document.querySelectorAll('.cliente-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-selecionar-cliente-modal')) {
                const clienteId = this.dataset.id;
                selecionarCliente(clienteId);
            }
        });
    });
}

function selecionarCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
        clienteSelecionado = cliente;
        atualizarClienteAtual();
        fecharModal(modalCliente);
        showMessage(`Cliente ${cliente.nome} selecionado`, 'success');
    }
}

function atualizarClienteAtual() {
    if (clienteSelecionado) {
        clienteAtual.innerHTML = `
            <div class="cliente-selecionado">
                <h4>${clienteSelecionado.nome}</h4>
                <p>${clienteSelecionado.cpf_cnpj ? `CPF/CNPJ: ${clienteSelecionado.cpf_cnpj}` : ''}</p>
                <p>${clienteSelecionado.telefone ? `Telefone: ${clienteSelecionado.telefone}` : ''}</p>
                <button class="btn-remover-cliente" id="btnRemoverCliente">
                    <i class="fas fa-times"></i> Remover
                </button>
            </div>
        `;
        
        document.getElementById('btnRemoverCliente')?.addEventListener('click', function(e) {
            e.stopPropagation();
            clienteSelecionado = null;
            atualizarClienteAtual();
            showMessage('Cliente removido da venda', 'info');
        });
    } else {
        clienteAtual.innerHTML = `
            <div class="cliente-vazio">
                <i class="fas fa-user-circle"></i>
                <div>
                    <p>Cliente não selecionado</p>
                    <small>Venda para consumidor final</small>
                </div>
            </div>
        `;
    }
}

// ============================================
// 8. FORMAS DE PAGAMENTO
// ============================================
function atualizarDetalhesPagamento() {
    const pagamentoDetalhes = document.getElementById('pagamentoDetalhes');
    
    if (formaPagamentoSelecionada === 'dinheiro') {
        pagamentoDetalhes.innerHTML = `
            <div class="detalhes-dinheiro">
                <div class="input-group">
                    <label>Valor Recebido:</label>
                    <input type="number" 
                           id="valorRecebido" 
                           step="0.01" 
                           min="0"
                           placeholder="0,00">
                </div>
                <div class="troco-info">
                    <span>Troco:</span>
                    <span id="troco">R$ 0,00</span>
                </div>
            </div>
        `;
        
        // Re-adicionar evento ao novo input
        const novoValorRecebido = document.getElementById('valorRecebido');
        if (novoValorRecebido) {
            novoValorRecebido.addEventListener('input', calcularTroco);
        }
    } else {
        pagamentoDetalhes.innerHTML = `
            <div class="detalhes-outro">
                <p><i class="fas fa-info-circle"></i> Pagamento via ${formaPagamentoSelecionada.replace('_', ' ').toUpperCase()}</p>
                <p>O valor será confirmado no final da venda.</p>
            </div>
        `;
    }
    
    calcularTroco();
}

function calcularTroco() {
    if (formaPagamentoSelecionada !== 'dinheiro') {
        trocoElement.textContent = 'R$ 0,00';
        return;
    }
    
    const total = parseFloat(totalFinalElement.textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
    const recebido = parseFloat(valorRecebido?.value) || 0;
    
    let troco = 0;
    if (recebido > total) {
        troco = recebido - total;
    }
    
    trocoElement.textContent = `R$ ${formatarMoeda(troco)}`;
}

// ============================================
// 9. BUSCA AVANÇADA
// ============================================
function abrirModalBuscaAvancada() {
    abrirModal(modalBuscaAvancada);
    buscarProdutosAvancado();
}

function limparFiltrosBusca() {
    filtroCategoria.value = '';
    filtroEstoque.value = '';
    filtroPrecoMin.value = '';
    filtroPrecoMax.value = '';
    buscarProdutosAvancado();
}

function buscarProdutosAvancado() {
    const categoria = filtroCategoria.value;
    const estoqueMin = parseInt(filtroEstoque.value) || 0;
    const precoMin = parseFloat(filtroPrecoMin.value) || 0;
    const precoMax = parseFloat(filtroPrecoMax.value) || Infinity;
    
    const produtosFiltradosAvancado = produtos.filter(produto => {
        // Filtro por categoria
        if (categoria && produto.categoria !== categoria) {
            return false;
        }
        
        // Filtro por estoque mínimo
        if (estoqueMin > 0 && (produto.quantidade || 0) < estoqueMin) {
            return false;
        }
        
        // Filtro por faixa de preço
        if (produto.preco < precoMin || produto.preco > precoMax) {
            return false;
        }
        
        return true;
    });
    
    renderizarResultadosAvancados(produtosFiltradosAvancado);
}

function renderizarResultadosAvancados(produtosLista) {
    if (produtosLista.length === 0) {
        resultadosAvancados.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado com os filtros aplicados</p>
                <small>Tente ajustar os filtros</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    produtosLista.forEach(produto => {
        html += `
            <div class="resultado-avancado-item" data-id="${produto.id}">
                <div class="resultado-avancado-info">
                    <h4>${produto.nome}</h4>
                    <p class="text-muted">${produto.codigo} | ${produto.categoria || 'Sem categoria'}</p>
                    <p>Estoque: ${produto.quantidade || 0} ${produto.unidade || 'UN'}</p>
                </div>
                <div class="resultado-avancado-preco">
                    <strong class="text-primary">R$ ${formatarMoeda(produto.preco)}</strong>
                </div>
                <button class="btn-adicionar-avancado" data-id="${produto.id}">
                    <i class="fas fa-plus"></i> Adicionar
                </button>
            </div>
        `;
    });
    
    resultadosAvancados.innerHTML = html;
    
    // Adicionar eventos
    document.querySelectorAll('.btn-adicionar-avancado').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                adicionarAoCarrinho(produto);
                fecharModal(modalBuscaAvancada);
            }
        });
    });
    
    document.querySelectorAll('.resultado-avancado-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.btn-adicionar-avancado')) {
                const produtoId = this.dataset.id;
                const produto = produtos.find(p => p.id === produtoId);
                if (produto) {
                    adicionarAoCarrinho(produto);
                    fecharModal(modalBuscaAvancada);
                }
            }
        });
    });
}

// ============================================
// 10. FINALIZAÇÃO DA VENDA
// ============================================
function abrirModalFinalizar() {
    if (carrinho.length === 0) {
        showMessage('Adicione produtos ao carrinho antes de finalizar', 'warning');
        return;
    }
    
    // Atualizar resumo no modal
    document.getElementById('resumoTotal').textContent = totalFinalElement.textContent;
    document.getElementById('resumoPagamento').textContent = 
        formaPagamentoSelecionada.replace('_', ' ').toUpperCase();
    document.getElementById('resumoTroco').textContent = trocoElement.textContent;
    
    abrirModal(modalFinalizar);
}

async function finalizarVenda() {
    try {
        if (carrinho.length === 0) {
            showMessage('Carrinho vazio', 'warning');
            return;
        }
        
        // Verificar estoque
        for (const item of carrinho) {
            const produto = produtos.find(p => p.id === item.id);
            if (!produto || (produto.quantidade || 0) < item.quantidade) {
                showMessage(`Estoque insuficiente para ${item.nome}`, 'error');
                return;
            }
        }
        
        showLoading('Processando venda...');
        
        // Preparar dados da venda
        const vendaData = {
            numero: numeroVendaAtual,
            cliente: clienteSelecionado ? {
                id: clienteSelecionado.id,
                nome: clienteSelecionado.nome,
                cpf_cnpj: clienteSelecionado.cpf_cnpj
            } : null,
            itens: carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                quantidade: item.quantidade,
                preco_unitario: item.preco,
                total: item.preco * item.quantidade,
                unidade: item.unidade
            })),
            subtotal: carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0),
            desconto: descontoPercentual,
            total: parseFloat(totalFinalElement.textContent.replace('R$ ', '').replace('.', '').replace(',', '.')),
            forma_pagamento: formaPagamentoSelecionada,
            valor_recebido: formaPagamentoSelecionada === 'dinheiro' ? parseFloat(valorRecebido.value) || 0 : null,
            troco: formaPagamentoSelecionada === 'dinheiro' ? parseFloat(trocoElement.textContent.replace('R$ ', '').replace('.', '').replace(',', '.')) : 0,
            status: 'finalizada',
            data: new Date().toISOString()
        };
        
        // Salvar venda
        const resultado = await lojaServices.cadastrarVenda(vendaData);
        
        if (resultado.success) {
            // Atualizar estoque dos produtos
            for (const item of carrinho) {
                const produto = produtos.find(p => p.id === item.id);
                if (produto) {
                    const novaQuantidade = (produto.quantidade || 0) - item.quantidade;
                    await lojaServices.atualizarProduto(produto.id, {
                        quantidade: novaQuantidade
                    });
                }
            }
            
            hideLoading();
            fecharModal(modalFinalizar);
            
            // Mostrar recibo
            mostrarRecibo(vendaData);
            
            // Reiniciar venda
            reiniciarVenda();
            
            showMessage('Venda finalizada com sucesso!', 'success');
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao finalizar venda:', error);
        showMessage('Erro ao finalizar venda: ' + error.message, 'error');
    }
}

function mostrarRecibo(vendaData) {
    const reciboWindow = window.open('', '_blank');
    
    const reciboHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo Venda #${vendaData.numero}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .recibo { max-width: 400px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
                .info { margin-bottom: 20px; }
                .info-item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .items { margin-bottom: 20px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
                .item-name { flex: 2; }
                .item-qtd { flex: 1; text-align: center; }
                .item-price { flex: 1; text-align: right; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; }
                .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="recibo">
                <div class="header">
                    <h1>MJ Materiais de Construção</h1>
                    <h2>RECIBO DE VENDA</h2>
                    <p>Venda #${vendaData.numero}</p>
                </div>
                
                <div class="info">
                    <div class="info-item">
                        <span>Data:</span>
                        <span>${new Date(vendaData.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    ${vendaData.cliente ? `
                    <div class="info-item">
                        <span>Cliente:</span>
                        <span>${vendaData.cliente.nome}</span>
                    </div>
                    <div class="info-item">
                        <span>CPF/CNPJ:</span>
                        <span>${vendaData.cliente.cpf_cnpj || ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="items">
                    ${vendaData.itens.map(item => `
                        <div class="item">
                            <div class="item-name">${item.nome}</div>
                            <div class="item-qtd">${item.quantidade} x</div>
                            <div class="item-price">R$ ${formatarMoeda(item.preco_unitario)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="info">
                    <div class="info-item">
                        <span>Subtotal:</span>
                        <span>R$ ${formatarMoeda(vendaData.subtotal)}</span>
                    </div>
                    ${vendaData.desconto > 0 ? `
                    <div class="info-item">
                        <span>Desconto (${vendaData.desconto}%):</span>
                        <span>-R$ ${formatarMoeda(vendaData.subtotal * (vendaData.desconto/100))}</span>
                    </div>
                    ` : ''}
                    <div class="info-item">
                        <strong>Total:</strong>
                        <strong>R$ ${formatarMoeda(vendaData.total)}</strong>
                    </div>
                    <div class="info-item">
                        <span>Forma de Pagamento:</span>
                        <span>${vendaData.forma_pagamento.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    ${vendaData.valor_recebido ? `
                    <div class="info-item">
                        <span>Valor Recebido:</span>
                        <span>R$ ${formatarMoeda(vendaData.valor_recebido)}</span>
                    </div>
                    <div class="info-item">
                        <span>Troco:</span>
                        <span>R$ ${formatarMoeda(vendaData.troco)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>Obrigado pela preferência!</p>
                    <p>Volte sempre!</p>
                    <p>Este não é um documento fiscal</p>
                    <button class="no-print" onclick="window.print()">Imprimir Recibo</button>
                </div>
            </div>
        </body>
        </html>
    `;
    
    reciboWindow.document.write(reciboHTML);
    reciboWindow.document.close();
}

async function salvarVenda() {
    showMessage('Funcionalidade de salvar venda em desenvolvimento', 'info');
}

function confirmarCancelarVenda() {
    if (carrinho.length === 0) {
        limparVenda();
        return;
    }
    
    if (confirm('Deseja cancelar esta venda? Todos os itens serão removidos.')) {
        limparVenda();
        showMessage('Venda cancelada', 'info');
    }
}

function limparVenda() {
    carrinho = [];
    clienteSelecionado = null;
    descontoPercentual = 0;
    formaPagamentoSelecionada = 'dinheiro';
    
    renderizarCarrinho();
    calcularTotal();
    atualizarClienteAtual();
    atualizarDetalhesPagamento();
    
    inputBusca.value = '';
    resultadosBusca.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Digite para buscar produtos</p>
            <small>ou pressione F2 para busca avançada</small>
        </div>
    `;
    
    inputBusca.focus();
}

function reiniciarVenda() {
    gerarNumeroVenda();
    limparVenda();
}

function gerarNumeroVenda() {
    // Gerar número sequencial (na prática, buscar do banco)
    const numeroAtual = parseInt(numeroVendaAtual) || 0;
    const novoNumero = (numeroAtual + 1).toString().padStart(6, '0');
    numeroVendaAtual = novoNumero;
    numeroVenda.textContent = novoNumero;
}

// ============================================
// 11. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function abrirModal(modal) {
    modal.style.display = 'flex';
}

function fecharModal(modal) {
    modal.style.display = 'none';
}

function showLoading(mensagem) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = mensagem;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showMessage(text, type = 'info', tempo = 5000) {
    const messageAlert = document.getElementById('messageAlert');
    const messageText = messageAlert?.querySelector('.message-text');
    const messageIcon = messageAlert?.querySelector('.message-icon');
    
    if (!messageAlert || !messageText) return;
    
    messageText.textContent = text;
    messageAlert.className = `message-alert ${type}`;
    messageAlert.style.display = 'block';
    messageAlert.style.animation = 'slideInRight 0.3s ease';
    
    // Fechar ao clicar no X
    const closeBtn = messageAlert.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            messageAlert.style.display = 'none';
        };
    }
    
    // Auto-fechar
    setTimeout(() => {
        if (messageAlert.style.display === 'block') {
            messageAlert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                messageAlert.style.display = 'none';
            }, 300);
        }
    }, tempo);
}

function atualizarMenuAtivo() {
    // Atualizar menu ativo na sidebar
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === 'venda') {
            item.classList.add('active');
        }
    });
    
    // Atualizar título da página
    const pageTitle = document.querySelector('.page-title h1');
    if (pageTitle) {
        pageTitle.textContent = 'Ponto de Venda';
    }
}

// Exportar funções para debug (opcional)
if (typeof window !== 'undefined') {
    window.vendaDebug = {
        carrinho: () => carrinho,
        produtos: () => produtos,
        cliente: () => clienteSelecionado,
        reiniciar: reiniciarVenda
    };
}

console.log('✅ Sistema de venda carregado e pronto!');