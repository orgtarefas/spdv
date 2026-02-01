// estoque.js - SISTEMA DE ESTOQUE COM FIREBASE 8.10.1 (Compatível com venda.js)
console.log("📦 Sistema de Estoque MJ - Iniciando...");

// ============================================
// CONFIGURAÇÃO FIREBASE (Igual ao venda.js)
// ============================================
let db;

function inicializarFirebase() {
    try {
        // Configuração do seu projeto (mesma do venda.js)
        const firebaseConfig = {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        };
        
        // Inicializar Firebase (versão 8.10.1)
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        } else {
            firebase.app();
        }
        
        // Obter Firestore
        db = firebase.firestore();
        console.log("✅ Firebase inicializado com sucesso!");
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        return false;
    }
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let usuario = null;
let produtos = [];
let produtosFiltrados = [];

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

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página de estoque carregada");
    
    // Esconder loading após 1 segundo
    setTimeout(function() {
        esconderLoading();
    }, 1000);
    
    // Verificar sessão primeiro (igual ao venda.js)
    if (!verificarSessao()) {
        return;
    }
    
    // Inicializar Firebase
    if (!inicializarFirebase()) {
        mostrarErro("Não foi possível conectar ao banco de dados. Recarregue a página.");
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos
    carregarProdutosReais();
    
    // Atualizar data/hora
    atualizarUltimaAtualizacao();
    setInterval(atualizarUltimaAtualizacao, 1000);
    
    console.log("✅ Estoque pronto para uso");
});

// ============================================
// 2. VERIFICAR SESSÃO (Igual ao venda.js)
// ============================================
function verificarSessao() {
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        alert("⚠️ Sessão expirada! Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário:", usuario.nome || usuario.login);
        
        // Atualizar nome na interface
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro na sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        return false;
    }
}

// ============================================
// 3. CARREGAR PRODUTOS REAIS DO FIREBASE
// ============================================
async function carregarProdutosReais() {
    console.log("📦 Buscando produtos do estoque...");
    mostrarLoading("Carregando estoque...");
    
    try {
        // Buscar da coleção estoque_mj_construcoes
        const querySnapshot = await db.collection('estoque_mj_construcoes')
            .orderBy('nome')
            .get();
        
        produtos = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            produtos.push({
                id: doc.id,
                codigo: data.codigo || doc.id,
                nome: data.nome || 'Produto sem nome',
                descricao: data.descricao || '',
                categoria: data.categoria || '',
                quantidade: parseInt(data.quantidade) || 0,
                estoque_minimo: parseInt(data.estoque_minimo) || 5,
                preco_custo: parseFloat(data.preco_custo) || 0,
                preco: parseFloat(data.preco) || 0,
                unidade: data.unidade || 'UN',
                fornecedor: data.fornecedor || '',
                ativo: data.ativo !== false,
                data_criacao: data.data_criacao || '',
                data_atualizacao: data.data_atualizacao || ''
            });
        });
        
        console.log(`✅ ${produtos.length} produtos carregados`);
        
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        atualizarEstatisticas();
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        mostrarErro(`Erro ao carregar estoque: ${error.message}`);
        
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
    } finally {
        esconderLoading();
    }
}

// ============================================
// 4. RENDERIZAR PRODUTOS NA TABELA
// ============================================
function renderizarProdutos() {
    if (!estoqueTableBody) return;
    
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
    });
    
    estoqueTableBody.innerHTML = html;
    currentCountElement.textContent = produtosFiltrados.length;
    
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
// 5. FILTRAGEM DE PRODUTOS
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
// 6. ATUALIZAR ESTATÍSTICAS
// ============================================
function atualizarEstatisticas() {
    if (!produtosFiltrados.length) {
        totalProdutosElement.textContent = '0';
        totalEstoqueElement.textContent = '0';
        baixoEstoqueElement.textContent = '0';
        valorTotalElement.textContent = 'R$ 0,00';
        return;
    }
    
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
// 7. MODAL - NOVO/EDITAR PRODUTO
// ============================================
async function abrirModalNovoProduto() {
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    // Gerar código automático
    document.getElementById('codigo').value = `MJ-${Date.now().toString().slice(-6)}`;
    
    // Configurar cálculo de margem
    const precoCustoInput = document.getElementById('preco_custo');
    const precoVendaInput = document.getElementById('preco');
    
    if (precoCustoInput && precoVendaInput) {
        const calcularMargem = function() {
            const precoCusto = parseFloat(precoCustoInput.value) || 0;
            const precoVenda = parseFloat(precoVendaInput.value) || 0;
            
            if (precoCusto > 0 && precoVenda > 0) {
                const margem = ((precoVenda - precoCusto) / precoCusto * 100).toFixed(2);
                const lucro = precoVenda - precoCusto;
                
                // Adicionar ou atualizar dica
                let hint = document.getElementById('margemHint');
                if (!hint) {
                    hint = document.createElement('small');
                    hint.id = 'margemHint';
                    hint.className = 'form-hint';
                    precoVendaInput.parentNode.appendChild(hint);
                }
                
                hint.textContent = `Lucro: R$ ${lucro.toFixed(2)} | Margem: ${margem}%`;
                hint.style.color = margem >= 0 ? '#27ae60' : '#c0392b';
            }
        };
        
        precoCustoInput.addEventListener('input', calcularMargem);
        precoVendaInput.addEventListener('input', calcularMargem);
    }
    
    abrirModal(modalProduto);
}

async function abrirModalEditar(produtoId) {
    try {
        mostrarLoading('Carregando produto...');
        
        // Buscar produto específico do Firebase
        const docRef = db.collection('estoque_mj_construcoes').doc(produtoId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const produto = { id: doc.id, ...doc.data() };
            
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
            
            esconderLoading();
            abrirModal(modalProduto);
            
        } else {
            throw new Error('Produto não encontrado');
        }
        
    } catch (error) {
        esconderLoading();
        console.error('Erro ao carregar produto:', error);
        mostrarMensagem('Erro ao carregar produto para edição', 'error');
    }
}

async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        mostrarLoading('Salvando produto...');
        
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
            ativo: true,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validações
        if (!dadosProduto.codigo || !dadosProduto.nome) {
            throw new Error('Preencha todos os campos obrigatórios (*)');
        }
        
        if (dadosProduto.preco <= 0) {
            throw new Error('Preço de venda deve ser maior que zero');
        }
        
        const produtoId = produtoIdInput.value;
        
        if (produtoId) {
            // Atualizar produto existente
            await db.collection('estoque_mj_construcoes').doc(produtoId).update(dadosProduto);
            mostrarMensagem('Produto atualizado com sucesso!', 'success');
        } else {
            // Criar novo produto
            dadosProduto.data_criacao = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('estoque_mj_construcoes').add(dadosProduto);
            mostrarMensagem('Produto cadastrado com sucesso!', 'success');
        }
        
        esconderLoading();
        fecharModal(modalProduto);
        
        // Recarregar dados
        await carregarProdutosReais();
        
    } catch (error) {
        esconderLoading();
        console.error('Erro ao salvar produto:', error);
        mostrarMensagem(error.message || 'Erro ao salvar produto', 'error');
    }
}

// ============================================
// 8. CONFIRMAR ALTERAÇÃO DE STATUS
// ============================================
async function confirmarAlteracaoStatus(produto) {
    const confirmar = confirm(
        produto.ativo 
            ? `Deseja realmente desativar o produto "${produto.nome}"?`
            : `Deseja realmente ativar o produto "${produto.nome}"?`
    );
    
    if (!confirmar) return;
    
    try {
        mostrarLoading(produto.ativo ? 'Desativando produto...' : 'Ativando produto...');
        
        await db.collection('estoque_mj_construcoes').doc(produto.id).update({
            ativo: !produto.ativo,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Atualizar lista local
        const index = produtos.findIndex(p => p.id === produto.id);
        if (index !== -1) {
            produtos[index].ativo = !produto.ativo;
        }
        
        esconderLoading();
        renderizarProdutos();
        atualizarEstatisticas();
        
        mostrarMensagem(
            produto.ativo ? 'Produto desativado com sucesso!' : 'Produto ativado com sucesso!',
            'success'
        );
        
    } catch (error) {
        esconderLoading();
        console.error('Erro ao alterar status:', error);
        mostrarMensagem('Erro ao alterar status do produto', 'error');
    }
}

// ============================================
// 9. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Busca em tempo real
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
    
    // Filtro de status
    if (filterStatus) {
        filterStatus.addEventListener('change', filtrarProdutos);
    }
    
    // Botão novo produto
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
    }
    
    // Botão relatório
    if (btnRelatorioEstoque) {
        btnRelatorioEstoque.addEventListener('click', function() {
            mostrarMensagem('Relatório em desenvolvimento', 'info');
        });
    }
    
    // Botão atualizar
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async function() {
            await carregarProdutosReais();
            mostrarMensagem('Estoque atualizado', 'success');
        });
    }
    
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
    
    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                window.location.href = '../../login.html';
            }
        });
    }
}

// ============================================
// 10. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarUltimaAtualizacao() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR');
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = `Última atualização: ${horaFormatada}`;
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
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

// ============================================
// 11. FUNÇÕES DE UI (iguais ao venda.js)
// ============================================
function mostrarLoading(mensagem) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = mensagem || 'Carregando...';
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo}] ${texto}`);
        return;
    }
    
    const icon = alert.querySelector('.message-icon');
    const text = alert.querySelector('.message-text');
    const closeBtn = alert.querySelector('.message-close');
    
    // Configurar alerta
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Ícone
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    if (text) text.textContent = texto;
    
    // Botão fechar
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    // Auto-ocultar
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

function mostrarErro(texto) {
    mostrarMensagem(texto, 'error', 5000);
}

// Adicionar estilos para badges
const estiloBadge = document.createElement('style');
estiloBadge.textContent = `
    .status-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        display: inline-block;
    }
    
    .status-ativo {
        background-color: #d4edda;
        color: #155724;
    }
    
    .status-baixo {
        background-color: #fff3cd;
        color: #856404;
    }
    
    .status-inativo {
        background-color: #f8d7da;
        color: #721c24;
    }
    
    .text-muted {
        color: #6c757d;
        font-size: 0.85rem;
    }
    
    .text-primary {
        color: #3498db;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #6c757d;
    }
    
    .empty-state i {
        font-size: 3rem;
        margin-bottom: 15px;
        color: #bdc3c7;
    }
    
    .btn-acao {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        margin: 0 5px;
        padding: 5px;
        border-radius: 4px;
        transition: all 0.2s;
    }
    
    .btn-acao:hover {
        background-color: #f8f9fa;
        transform: scale(1.1);
    }
    
    .btn-editar {
        color: #3498db;
    }
    
    .btn-excluir {
        color: #e74c3c;
    }
    
    .acoes-cell {
        display: flex;
        justify-content: center;
        gap: 5px;
    }
`;
document.head.appendChild(estiloBadge);

console.log("✅ Sistema de estoque completamente carregado!");
