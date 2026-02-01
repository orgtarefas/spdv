// estoque.js - MJ Materiais de Construção
import { mjServices } from './firebase_config.js';

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const btnNovoProduto = document.getElementById('btnNovoProduto');
const btnRelatorioEstoque = document.getElementById('btnRelatorioEstoque');
const btnRefresh = document.getElementById('btnRefresh');
const filterStatus = document.getElementById('filterStatus');
const estoqueTableBody = document.getElementById('estoqueTableBody');
const totalProdutosElement = document.getElementById('totalProdutos');
const totalEstoqueElement = document.getElementById('totalEstoque');
const baixoEstoqueElement = document.getElementById('baixoEstoque');
const valorTotalElement = document.getElementById('valorTotal');
const currentCountElement = document.getElementById('currentCount');
const lastUpdateElement = document.getElementById('lastUpdate');
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');

// Modal
const modalProduto = document.getElementById('modalProduto');
const formProduto = document.getElementById('formProduto');
const produtoIdInput = document.getElementById('produtoId');
const modalTitle = document.getElementById('modalTitle');

// Variáveis globais
let produtos = [];
let produtosFiltrados = [];
let usuario = null;

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📦 Estoque MJ Materiais - Inicializando...');
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Carregar dados do usuário
    carregarDadosUsuario();
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos
    await carregarProdutos();
    
    // Atualizar data/hora
    atualizarUltimaAtualizacao();
    setInterval(atualizarUltimaAtualizacao, 1000);
    
    console.log('✅ Estoque MJ Materiais carregado com sucesso!');
});

// ============================================
// 2. VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('pdv_autenticado');
    const usuarioData = localStorage.getItem('pdv_usuario');
    
    if (autenticado !== 'true' || !usuarioData) {
        // Redirecionar para login
        window.location.href = '../../login.html';
        return false;
    }
    
    usuario = JSON.parse(usuarioData);
    return true;
}

// ============================================
// 3. CARREGAR DADOS DO USUÁRIO
// ============================================
function carregarDadosUsuario() {
    if (usuario) {
        userNameElement.textContent = usuario.nomeCompleto || usuario.login;
    }
    
    // Configurar logout
    btnLogout.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '../../login.html';
    });
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Busca em tempo real
    searchInput.addEventListener('input', function() {
        filtrarProdutos();
    });
    
    // Filtro de status
    filterStatus.addEventListener('change', function() {
        filtrarProdutos();
    });
    
    // Botão novo produto
    btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
    
    // Botão relatório
    btnRelatorioEstoque.addEventListener('click', function() {
        showMessage('Relatório em desenvolvimento', 'info');
    });
    
    // Botão atualizar
    btnRefresh.addEventListener('click', async function() {
        await carregarProdutos();
        showMessage('Estoque atualizado', 'success');
    });
    
    // Modal eventos
    const modalClose = modalProduto?.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            fecharModal(modalProduto);
        });
    }
    
    const btnCancel = document.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            fecharModal(modalProduto);
        });
    }
    
    // Fechar modal ao clicar fora
    if (modalProduto) {
        modalProduto.addEventListener('click', function(e) {
            if (e.target === this) {
                fecharModal(this);
            }
        });
    }
    
    // Formulário de produto
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }
}

// ============================================
// 5. CARREGAR PRODUTOS DO FIREBASE
// ============================================
async function carregarProdutos() {
    try {
        showLoading('Carregando estoque...');
        
        const resultado = await mjServices.buscarProdutos();
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            // Renderizar tabela
            renderizarProdutos();
            
            // Atualizar estatísticas
            atualizarEstatisticas();
            
            hideLoading();
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar produtos:', error);
        showMessage('Erro ao carregar estoque', 'error');
        
        // Mostrar estado vazio
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar estoque</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// ============================================
// 6. RENDERIZAR PRODUTOS NA TABELA
// ============================================
function renderizarProdutos() {
    if (produtosFiltrados.length === 0) {
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                    <small>${produtos.length === 0 ? 'Cadastre o primeiro produto' : 'Tente outro filtro'}</small>
                </td>
            </tr>
        `;
        currentCountElement.textContent = '0';
        return;
    }
    
    let html = '';
    let count = 0;
    
    produtosFiltrados.forEach(produto => {
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
                <td>${produto.estoque_minimo || 5}</td>
                <td>R$ ${formatarMoeda(produto.preco_custo || 0)}</td>
                <td>
                    <strong class="text-primary">R$ ${formatarMoeda(produto.preco || 0)}</strong>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="acoes-cell">
                    <button class="btn-acao btn-editar" title="Editar" data-id="${produto.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-acao btn-excluir" title="${produto.ativo ? 'Desativar' : 'Ativar'}" data-id="${produto.id}">
                        <i class="fas ${produto.ativo ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                </td>
            </tr>
        `;
        count++;
    });
    
    estoqueTableBody.innerHTML = html;
    currentCountElement.textContent = count;
    
    // Adicionar eventos aos botões
    adicionarEventosBotoes();
}

function adicionarEventosBotoes() {
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
// 7. FILTRAGEM DE PRODUTOS
// ============================================
function filtrarProdutos() {
    const termoBusca = searchInput.value.toLowerCase().trim();
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
        
        // Filtro por status
        if (statusSelecionado === 'ativo' && !produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'inativo' && produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'baixo' && 
            (produto.quantidade > produto.estoque_minimo || !produto.ativo)) {
            return false;
        }
        
        return true;
    });
    
    renderizarProdutos();
    atualizarEstatisticas();
}

// ============================================
// 8. ATUALIZAR ESTATÍSTICAS
// ============================================
function atualizarEstatisticas() {
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
}

// ============================================
// 9. MODAL - NOVO/EDITAR PRODUTO
// ============================================
async function abrirModalNovoProduto() {
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    // Gerar código automático
    document.getElementById('codigo').value = `MJ-${Date.now().toString().slice(-6)}`;
    
    // Configurar preço de venda para calcular margem
    const precoCustoInput = document.getElementById('preco_custo');
    const precoVendaInput = document.getElementById('preco');
    
    precoCustoInput.addEventListener('input', calcularMargem);
    precoVendaInput.addEventListener('input', calcularMargem);
    
    abrirModal(modalProduto);
}

async function abrirModalEditar(produtoId) {
    try {
        showLoading('Carregando produto...');
        
        const resultado = await mjServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            // Preencher formulário
            produtoIdInput.value = produto.id;
            modalTitle.textContent = 'Editar Produto';
            
            document.getElementById('codigo').value = produto.codigo || '';
            document.getElementById('nome').value = produto.nome || '';
            document.getElementById('categoria').value = produto.categoria || '';
            document.getElementById('unidade').value = produto.unidade || 'UN';
            document.getElementById('preco_custo').value = produto.preco_custo || 0;
            document.getElementById('preco').value = produto.preco || 0;
            document.getElementById('quantidade').value = produto.quantidade || 0;
            document.getElementById('estoque_minimo').value = produto.estoque_minimo || 5;
            document.getElementById('descricao').value = produto.descricao || '';
            document.getElementById('fornecedor').value = produto.fornecedor || '';
            
            // Calcular margem
            calcularMargem();
            
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
        hint.style.color = margem >= 0 ? '#27ae60' : '#c0392b';
    }
}

async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        showLoading('Salvando produto...');
        
        const dadosProduto = {
            codigo: document.getElementById('codigo').value.trim(),
            nome: document.getElementById('nome').value.trim(),
            categoria: document.getElementById('categoria').value.trim(),
            unidade: document.getElementById('unidade').value,
            preco_custo: parseFloat(document.getElementById('preco_custo').value) || 0,
            preco: parseFloat(document.getElementById('preco').value) || 0,
            quantidade: parseInt(document.getElementById('quantidade').value) || 0,
            estoque_minimo: parseInt(document.getElementById('estoque_minimo').value) || 5,
            descricao: document.getElementById('descricao').value.trim(),
            fornecedor: document.getElementById('fornecedor').value.trim(),
            ativo: true
        };
        
        // Validações
        if (!dadosProduto.codigo || !dadosProduto.nome) {
            throw new Error('Preencha todos os campos obrigatórios (*)');
        }
        
        if (dadosProduto.preco <= 0) {
            throw new Error('Preço de venda deve ser maior que zero');
        }
        
        const produtoId = produtoIdInput.value;
        let resultado;
        
        if (produtoId) {
            // Atualizar produto existente
            resultado = await mjServices.atualizarProduto(produtoId, dadosProduto);
        } else {
            // Criar novo produto
            resultado = await mjServices.cadastrarProduto(dadosProduto);
        }
        
        if (resultado.success) {
            hideLoading();
            fecharModal(modalProduto);
            
            // Recarregar dados
            await carregarProdutos();
            
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
// 10. CONFIRMAR ALTERAÇÃO DE STATUS
// ============================================
async function confirmarAlteracaoStatus(produto) {
    const confirmar = confirm(
        produto.ativo 
            ? `Deseja realmente desativar o produto "${produto.nome}"?`
            : `Deseja realmente ativar o produto "${produto.nome}"?`
    );
    
    if (!confirmar) return;
    
    try {
        showLoading(produto.ativo ? 'Desativando produto...' : 'Ativando produto...');
        
        const resultado = await mjServices.alterarStatusProduto(produto.id, !produto.ativo);
        
        if (resultado.success) {
            // Atualizar lista local
            const index = produtos.findIndex(p => p.id === produto.id);
            if (index !== -1) {
                produtos[index].ativo = !produto.ativo;
            }
            
            hideLoading();
            renderizarProdutos();
            atualizarEstatisticas();
            
            showMessage(
                produto.ativo ? 'Produto desativado com sucesso!' : 'Produto ativado com sucesso!',
                'success'
            );
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao alterar status:', error);
        showMessage('Erro ao alterar status do produto', 'error');
    }
}

// ============================================
// 11. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarUltimaAtualizacao() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR');
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = `Última atualização: ${horaFormatada}`;
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function abrirModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLoading(mensagem = 'Carregando...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = loadingOverlay?.querySelector('h3');
    
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
    
    // Fechar ao clicar no botão
    const messageClose = messageAlert.querySelector('.message-close');
    if (messageClose) {
        messageClose.onclick = () => {
            messageAlert.style.display = 'none';
        };
    }
    
    // Auto-fechar
    setTimeout(() => {
        if (messageAlert.style.display === 'block') {
            messageAlert.style.display = 'none';
        }
    }, tempo);
}

// Adicionar animação de slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .text-muted {
        color: var(--gray-color);
        font-size: 0.85rem;
    }
    
    .text-primary {
        color: var(--primary-color);
    }
`;
document.head.appendChild(style);
