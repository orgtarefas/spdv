// estoque.js - Sistema de Controle de Estoque
import { lojaServices } from './firebase_config.js';

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const filterCategoria = document.getElementById('filterCategoria');
const filterStatus = document.getElementById('filterStatus');
const btnAplicarFiltro = document.getElementById('btnAplicarFiltro');
const btnNovoProduto = document.getElementById('btnNovoProduto');
const btnExportar = document.getElementById('btnExportar');
const btnRelatorio = document.getElementById('btnRelatorio');
const estoqueTableBody = document.getElementById('estoqueTableBody');
const totalProdutosElement = document.getElementById('totalProdutos');
const totalEstoqueElement = document.getElementById('totalEstoque');
const baixoEstoqueElement = document.getElementById('baixoEstoque');
const valorTotalElement = document.getElementById('valorTotal');
const currentCountElement = document.getElementById('currentCount');
const totalCountElement = document.getElementById('totalCount');
const currentPageElement = document.getElementById('currentPage');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

// Modais
const modalProduto = document.getElementById('modalProduto');
const modalConfirmar = document.getElementById('modalConfirmar');
const modalDetalhes = document.getElementById('modalDetalhes');

// Formulário
const formProduto = document.getElementById('formProduto');
const produtoIdInput = document.getElementById('produtoId');
const modalTitle = document.getElementById('modalTitle');

// Variáveis globais
let produtos = [];
let produtosFiltrados = [];
let categorias = [];
let produtoParaExcluir = null;
let produtoParaDetalhes = null;
let paginaAtual = 1;
const produtosPorPagina = 10;

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📦 Sistema de Estoque - Inicializando...');
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados iniciais
    await carregarDadosIniciais();
    
    // Atualizar menu ativo
    atualizarMenuAtivo();
});

// ============================================
// 2. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Busca em tempo real
    searchInput.addEventListener('input', function() {
        filtrarProdutos();
    });
    
    // Filtros
    btnAplicarFiltro.addEventListener('click', filtrarProdutos);
    filterCategoria.addEventListener('change', filtrarProdutos);
    filterStatus.addEventListener('change', filtrarProdutos);
    
    // Botões de ação
    btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
    btnExportar.addEventListener('click', exportarEstoque);
    btnRelatorio.addEventListener('click', gerarRelatorio);
    
    // Paginação
    btnPrev.addEventListener('click', () => mudarPagina(-1));
    btnNext.addEventListener('click', () => mudarPagina(1));
    
    // Modais
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            fecharModal(modal);
        });
    });
    
    // Botões cancelar nos modais
    const btnCancels = document.querySelectorAll('.btn-cancel, .btn-close');
    btnCancels.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            fecharModal(modal);
        });
    });
    
    // Fechar modal ao clicar fora
    [modalProduto, modalConfirmar, modalDetalhes].forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                fecharModal(this);
            }
        });
    });
    
    // Formulário de produto
    formProduto.addEventListener('submit', salvarProduto);
    
    // Preço de custo e venda - cálculo automático de margem
    const precoCustoInput = document.getElementById('preco_custo');
    const precoVendaInput = document.getElementById('preco');
    
    if (precoCustoInput && precoVendaInput) {
        precoCustoInput.addEventListener('input', calcularMargem);
        precoVendaInput.addEventListener('input', calcularMargem);
    }
}

// ============================================
// 3. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        showLoading('Carregando estoque...');
        
        // Carregar produtos
        await carregarProdutos();
        
        // Carregar categorias
        await carregarCategorias();
        
        // Atualizar estatísticas
        await atualizarEstatisticas();
        
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao carregar dados iniciais:', error);
        showMessage('Erro ao carregar estoque', 'error');
    }
}

async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutos({ ativo: null });
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            renderizarProdutos();
            atualizarContadores();
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        produtos = [];
        produtosFiltrados = [];
        renderizarProdutos();
    }
}

async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        if (resultado.success) {
            categorias = resultado.data;
            atualizarSelectCategorias();
        }
        
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        categorias = [];
    }
}

// ============================================
// 4. RENDERIZAÇÃO DE PRODUTOS
// ============================================
function renderizarProdutos() {
    if (!estoqueTableBody) return;
    
    // Calcular índices para paginação
    const inicio = (paginaAtual - 1) * produtosPorPagina;
    const fim = inicio + produtosPorPagina;
    const produtosPagina = produtosFiltrados.slice(inicio, fim);
    
    if (produtosPagina.length === 0) {
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    produtosPagina.forEach(produto => {
        const statusClass = !produto.ativo ? 'status-inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'status-baixo' : 'status-ativo';
        
        const statusText = !produto.ativo ? 'Inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'Baixo' : 'Ativo';
        
        html += `
            <tr data-id="${produto.id}">
                <td>${produto.codigo || 'N/A'}</td>
                <td>
                    <strong>${produto.nome}</strong>
                    ${produto.descricao ? `<br><small class="text-muted">${produto.descricao.substring(0, 50)}${produto.descricao.length > 50 ? '...' : ''}</small>` : ''}
                </td>
                <td>${produto.categoria || 'Não informada'}</td>
                <td>
                    <strong>${produto.quantidade || 0} ${produto.unidade || 'UN'}</strong>
                </td>
                <td>${produto.estoque_minimo || 0}</td>
                <td>R$ ${formatarMoeda(produto.preco_custo || 0)}</td>
                <td>
                    <strong class="text-primary">R$ ${formatarMoeda(produto.preco || 0)}</strong>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="acoes-cell">
                    <button class="btn-acao btn-detalhes" title="Detalhes" data-id="${produto.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-acao btn-editar" title="Editar" data-id="${produto.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-acao btn-excluir" title="${produto.ativo ? 'Desativar' : 'Ativar'}" data-id="${produto.id}">
                        <i class="fas ${produto.ativo ? 'fa-trash' : 'fa-check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    estoqueTableBody.innerHTML = html;
    
    // Adicionar eventos aos botões
    adicionarEventosBotoes();
    
    // Atualizar paginação
    atualizarPaginacao();
}

function adicionarEventosBotoes() {
    // Botão detalhes
    document.querySelectorAll('.btn-detalhes').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            abrirModalDetalhes(produtoId);
        });
    });
    
    // Botão editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            abrirModalEditar(produtoId);
        });
    });
    
    // Botão excluir/ativar
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.dataset.id;
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                confirmarAlteracaoStatus(produto);
            }
        });
    });
}

// ============================================
// 5. FILTRAGEM E BUSCA
// ============================================
function filtrarProdutos() {
    const termoBusca = searchInput.value.toLowerCase().trim();
    const categoriaSelecionada = filterCategoria.value;
    const statusSelecionado = filterStatus.value;
    
    produtosFiltrados = produtos.filter(produto => {
        // Filtro por busca
        if (termoBusca) {
            const buscaNome = produto.nome.toLowerCase().includes(termoBusca);
            const buscaCodigo = produto.codigo?.toLowerCase().includes(termoBusca);
            const buscaDescricao = produto.descricao?.toLowerCase().includes(termoBusca);
            
            if (!(buscaNome || buscaCodigo || buscaDescricao)) {
                return false;
            }
        }
        
        // Filtro por categoria
        if (categoriaSelecionada && produto.categoria !== categoriaSelecionada) {
            return false;
        }
        
        // Filtro por status
        if (statusSelecionado === 'ativo' && !produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'inativo' && produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'baixo_estoque' && 
            (produto.quantidade > produto.estoque_minimo || !produto.ativo)) {
            return false;
        }
        
        return true;
    });
    
    paginaAtual = 1;
    renderizarProdutos();
    atualizarContadores();
}

// ============================================
// 6. MODAL - NOVO/EDITAR PRODUTO
// ============================================
async function abrirModalNovoProduto() {
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    // Preencher categorias no select
    const categoriaSelect = document.getElementById('categoria');
    if (categoriaSelect) {
        categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);
        });
    }
    
    // Gerar código automático
    document.getElementById('codigo').value = `MJ-${Date.now().toString().slice(-6)}`;
    
    abrirModal(modalProduto);
}

async function abrirModalEditar(produtoId) {
    try {
        showLoading('Carregando produto...');
        
        const resultado = await lojaServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            // Preencher formulário
            produtoIdInput.value = produto.id;
            modalTitle.textContent = 'Editar Produto';
            
            document.getElementById('codigo').value = produto.codigo || '';
            document.getElementById('nome').value = produto.nome || '';
            
            // Preencher categorias
            const categoriaSelect = document.getElementById('categoria');
            categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                option.textContent = categoria;
                if (categoria === produto.categoria) {
                    option.selected = true;
                }
                categoriaSelect.appendChild(option);
            });
            
            document.getElementById('unidade').value = produto.unidade || 'UN';
            document.getElementById('preco_custo').value = produto.preco_custo || 0;
            document.getElementById('preco').value = produto.preco || 0;
            document.getElementById('quantidade').value = produto.quantidade || 0;
            document.getElementById('estoque_minimo').value = produto.estoque_minimo || 0;
            document.getElementById('descricao').value = produto.descricao || '';
            document.getElementById('fornecedor').value = produto.fornecedor || '';
            
            hideLoading();
            abrirModal(modalProduto);
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produto:', error);
        showMessage('Erro ao carregar produto para edição', 'error');
    }
}

async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        showLoading('Salvando produto...');
        
        const dadosProduto = {
            codigo: document.getElementById('codigo').value.trim(),
            nome: document.getElementById('nome').value.trim(),
            categoria: document.getElementById('categoria').value,
            unidade: document.getElementById('unidade').value,
            preco_custo: parseFloat(document.getElementById('preco_custo').value) || 0,
            preco: parseFloat(document.getElementById('preco').value) || 0,
            quantidade: parseInt(document.getElementById('quantidade').value) || 0,
            estoque_minimo: parseInt(document.getElementById('estoque_minimo').value) || 0,
            descricao: document.getElementById('descricao').value.trim(),
            fornecedor: document.getElementById('fornecedor').value.trim(),
            ativo: true
        };
        
        // Validações
        if (!dadosProduto.codigo || !dadosProduto.nome || !dadosProduto.categoria) {
            throw new Error('Preencha todos os campos obrigatórios (*)');
        }
        
        if (dadosProduto.preco <= 0) {
            throw new Error('Preço de venda deve ser maior que zero');
        }
        
        const produtoId = produtoIdInput.value;
        let resultado;
        
        if (produtoId) {
            // Atualizar produto existente
            resultado = await lojaServices.atualizarProduto(produtoId, dadosProduto);
        } else {
            // Criar novo produto
            resultado = await lojaServices.cadastrarProduto(dadosProduto);
        }
        
        if (resultado.success) {
            hideLoading();
            fecharModal(modalProduto);
            
            // Recarregar dados
            await carregarProdutos();
            await atualizarEstatisticas();
            
            showMessage(
                produtoId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!',
                'success'
            );
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao salvar produto:', error);
        showMessage(error.message || 'Erro ao salvar produto', 'error');
    }
}

// ============================================
// 7. MODAL - CONFIRMAR ALTERAÇÃO DE STATUS
// ============================================
function confirmarAlteracaoStatus(produto) {
    produtoParaExcluir = produto;
    
    const confirmMessage = document.getElementById('confirmMessage');
    const btnConfirm = document.querySelector('#modalConfirmar .btn-confirm');
    
    if (produto.ativo) {
        confirmMessage.textContent = `Tem certeza que deseja desativar o produto "${produto.nome}"?`;
        btnConfirm.innerHTML = '<i class="fas fa-ban"></i> Desativar';
        btnConfirm.style.backgroundColor = '#ef4444';
    } else {
        confirmMessage.textContent = `Tem certeza que deseja reativar o produto "${produto.nome}"?`;
        btnConfirm.innerHTML = '<i class="fas fa-check"></i> Reativar';
        btnConfirm.style.backgroundColor = '#10b981';
    }
    
    // Remover evento anterior e adicionar novo
    btnConfirm.replaceWith(btnConfirm.cloneNode(true));
    const newBtnConfirm = document.querySelector('#modalConfirmar .btn-confirm');
    
    newBtnConfirm.addEventListener('click', async () => {
        await alterarStatusProduto(produto);
        fecharModal(modalConfirmar);
    });
    
    abrirModal(modalConfirmar);
}

async function alterarStatusProduto(produto) {
    try {
        showLoading(produto.ativo ? 'Desativando produto...' : 'Reativando produto...');
        
        const resultado = await lojaServices.atualizarProduto(produto.id, {
            ativo: !produto.ativo
        });
        
        if (resultado.success) {
            // Atualizar lista local
            const index = produtos.findIndex(p => p.id === produto.id);
            if (index !== -1) {
                produtos[index].ativo = !produto.ativo;
            }
            
            hideLoading();
            renderizarProdutos();
            await atualizarEstatisticas();
            
            showMessage(
                produto.ativo ? 'Produto desativado com sucesso!' : 'Produto reativado com sucesso!',
                'success'
            );
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao alterar status do produto:', error);
        showMessage('Erro ao alterar status do produto', 'error');
    }
}

// ============================================
// 8. MODAL - DETALHES DO PRODUTO
// ============================================
async function abrirModalDetalhes(produtoId) {
    try {
        showLoading('Carregando detalhes...');
        
        const resultado = await lojaServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            produtoParaDetalhes = produto;
            
            const detalhesContent = document.getElementById('detalhesContent');
            
            // Calcular margem de lucro
            const margemLucro = produto.preco_custo > 0 ? 
                ((produto.preco - produto.preco_custo) / produto.preco_custo * 100).toFixed(2) : 0;
            
            // Calcular valor total em estoque
            const valorTotalEstoque = (produto.preco_custo * produto.quantidade).toFixed(2);
            
            detalhesContent.innerHTML = `
                <div class="detalhes-grid">
                    <div class="detalhes-info">
                        <h4>Informações Básicas</h4>
                        <div class="detalhes-item">
                            <strong>Código:</strong>
                            <span>${produto.codigo || 'N/A'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Nome:</strong>
                            <span>${produto.nome}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Categoria:</strong>
                            <span>${produto.categoria || 'Não informada'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Unidade:</strong>
                            <span>${produto.unidade || 'UN'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Fornecedor:</strong>
                            <span>${produto.fornecedor || 'Não informado'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Status:</strong>
                            <span class="status-badge ${produto.ativo ? 'status-ativo' : 'status-inativo'}">
                                ${produto.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="detalhes-info">
                        <h4>Preços e Estoque</h4>
                        <div class="detalhes-item">
                            <strong>Preço de Custo:</strong>
                            <span>R$ ${formatarMoeda(produto.preco_custo)}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Preço de Venda:</strong>
                            <span class="text-primary">R$ ${formatarMoeda(produto.preco)}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Margem de Lucro:</strong>
                            <span class="${margemLucro >= 0 ? 'text-success' : 'text-danger'}">
                                ${margemLucro}%
                            </span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Estoque Atual:</strong>
                            <span>${produto.quantidade} ${produto.unidade || 'UN'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Estoque Mínimo:</strong>
                            <span>${produto.estoque_minimo} ${produto.unidade || 'UN'}</span>
                        </div>
                        <div class="detalhes-item">
                            <strong>Valor Total em Estoque:</strong>
                            <span class="text-primary">R$ ${formatarMoeda(valorTotalEstoque)}</span>
                        </div>
                    </div>
                </div>
                
                ${produto.descricao ? `
                <div class="detalhes-info">
                    <h4>Descrição</h4>
                    <p>${produto.descricao}</p>
                </div>
                ` : ''}
                
                <div class="detalhes-estatistica">
                    <h5>Informações do Produto</h5>
                    <p><strong>Cadastrado em:</strong> ${produto.data_cadastro ? new Date(produto.data_cadastro.seconds * 1000).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p><strong>Última atualização:</strong> ${produto.data_atualizacao ? new Date(produto.data_atualizacao.seconds * 1000).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p><strong>Estoque crítico:</strong> ${produto.quantidade <= produto.estoque_minimo ? 'SIM ⚠️' : 'NÃO ✅'}</p>
                </div>
            `;
            
            hideLoading();
            abrirModal(modalDetalhes);
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar detalhes:', error);
        showMessage('Erro ao carregar detalhes do produto', 'error');
    }
}

// ============================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarSelectCategorias() {
    if (!filterCategoria) return;
    
    // Limpar e adicionar opção padrão
    filterCategoria.innerHTML = '<option value="">Todas categorias</option>';
    
    // Adicionar categorias
    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filterCategoria.appendChild(option);
    });
    
    // Atualizar também no modal
    const categoriaModalSelect = document.getElementById('categoria');
    if (categoriaModalSelect) {
        categoriaModalSelect.innerHTML = '<option value="">Selecione uma categoria</option>';
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaModalSelect.appendChild(option);
        });
    }
}

async function atualizarEstatisticas() {
    try {
        // Calcular estatísticas dos produtos filtrados
        const produtosAtivos = produtosFiltrados.filter(p => p.ativo);
        
        const totalProdutos = produtosAtivos.length;
        const totalEstoque = produtosAtivos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
        const baixoEstoque = produtosAtivos.filter(p => p.quantidade <= p.estoque_minimo).length;
        const valorTotal = produtosAtivos.reduce((sum, p) => {
            const valor = (p.preco_custo || 0) * (p.quantidade || 0);
            return sum + valor;
        }, 0);
        
        // Atualizar elementos
        totalProdutosElement.textContent = totalProdutos.toLocaleString('pt-BR');
        totalEstoqueElement.textContent = totalEstoque.toLocaleString('pt-BR');
        baixoEstoqueElement.textContent = baixoEstoque.toLocaleString('pt-BR');
        valorTotalElement.textContent = `R$ ${formatarMoeda(valorTotal)}`;
        
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

function atualizarContadores() {
    const total = produtosFiltrados.length;
    const inicio = (paginaAtual - 1) * produtosPorPagina + 1;
    const fim = Math.min(paginaAtual * produtosPorPagina, total);
    
    currentCountElement.textContent = fim > 0 ? `${inicio}-${fim}` : '0';
    totalCountElement.textContent = total.toLocaleString('pt-BR');
    currentPageElement.textContent = paginaAtual;
    
    // Atualizar botões de paginação
    btnPrev.disabled = paginaAtual === 1;
    btnNext.disabled = fim >= total;
}

function atualizarPaginacao() {
    const totalPaginas = Math.ceil(produtosFiltrados.length / produtosPorPagina);
    btnPrev.disabled = paginaAtual === 1;
    btnNext.disabled = paginaAtual === totalPaginas || totalPaginas === 0;
}

function mudarPagina(direcao) {
    const novaPagina = paginaAtual + direcao;
    const totalPaginas = Math.ceil(produtosFiltrados.length / produtosPorPagina);
    
    if (novaPagina >= 1 && novaPagina <= totalPaginas) {
        paginaAtual = novaPagina;
        renderizarProdutos();
        atualizarContadores();
    }
}

function calcularMargem() {
    const precoCusto = parseFloat(document.getElementById('preco_custo').value) || 0;
    const precoVenda = parseFloat(document.getElementById('preco').value) || 0;
    
    if (precoCusto > 0 && precoVenda > 0) {
        const margem = ((precoVenda - precoCusto) / precoCusto * 100).toFixed(2);
        const lucro = precoVenda - precoCusto;
        
        // Adicionar ou atualizar dica
        let hint = document.getElementById('margemHint');
        if (!hint) {
            hint = document.createElement('small');
            hint.id = 'margemHint';
            hint.className = 'form-hint';
            document.getElementById('preco').parentNode.appendChild(hint);
        }
        
        hint.textContent = `Lucro: R$ ${lucro.toFixed(2)} | Margem: ${margem}%`;
        hint.style.color = margem >= 0 ? '#10b981' : '#ef4444';
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

async function exportarEstoque() {
    try {
        showLoading('Preparando exportação...');
        
        // Filtrar apenas produtos ativos para exportação
        const produtosParaExportar = produtosFiltrados
            .filter(p => p.ativo)
            .map(p => ({
                Código: p.codigo,
                Produto: p.nome,
                Categoria: p.categoria,
                Unidade: p.unidade,
                'Preço Custo': `R$ ${formatarMoeda(p.preco_custo)}`,
                'Preço Venda': `R$ ${formatarMoeda(p.preco)}`,
                'Estoque Atual': p.quantidade,
                'Estoque Mínimo': p.estoque_minimo,
                'Valor Total': `R$ ${formatarMoeda(p.preco_custo * p.quantidade)}`,
                Fornecedor: p.fornecedor || 'Não informado'
            }));
        
        // Converter para CSV
        const cabecalhos = Object.keys(produtosParaExportar[0] || {});
        const linhas = produtosParaExportar.map(produto => 
            cabecalhos.map(cabecalho => `"${produto[cabecalho] || ''}"`).join(';')
        );
        
        const csvContent = [cabecalhos.join(';'), ...linhas].join('\n');
        
        // Criar arquivo para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `estoque_mj_materiais_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoading();
        showMessage('Exportação concluída com sucesso!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao exportar estoque:', error);
        showMessage('Erro ao exportar estoque', 'error');
    }
}

async function gerarRelatorio() {
    showMessage('Relatório em desenvolvimento', 'info');
}

// ============================================
// 10. FUNÇÕES DE UI
// ============================================
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
        if (item.dataset.page === 'estoque') {
            item.classList.add('active');
        }
    });
    
    // Atualizar título da página
    const pageTitle = document.querySelector('.page-title h1');
    if (pageTitle) {
        pageTitle.textContent = 'Controle de Estoque';
    }
}

// Exportar funções para debug (opcional)
if (typeof window !== 'undefined') {
    window.estoqueDebug = {
        produtos: () => produtos,
        filtrar: filtrarProdutos,
        recarregar: carregarProdutos,
        estatisticas: atualizarEstatisticas
    };
}

console.log('✅ Sistema de estoque carregado e pronto!');