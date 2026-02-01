// estoque.js - SISTEMA DE ESTOQUE COM FIREBASE 8.10.1
console.log("📦 Sistema de Estoque MJ - Iniciando...");

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let db;
let usuario = null;
let produtos = [];
let produtosFiltrados = [];

// Elementos DOM (serão inicializados quando o DOM carregar)
let searchInput, btnNovoProduto, btnRelatorioEstoque, btnRefresh, filterStatus;
let estoqueTableBody, totalProdutosElement, totalEstoqueElement, baixoEstoqueElement, valorTotalElement;
let currentCountElement, lastUpdateElement, userNameElement, btnLogout;
let modalProduto, formProduto, produtoIdInput, modalTitle;

// ============================================
// CONFIGURAÇÃO FIREBASE
// ============================================
function inicializarFirebase() {
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyDOXKEQqZQC3OuYjkc_Mg6-I-JvC_ZK7ag",
            authDomain: "spdv-3872a.firebaseapp.com",
            projectId: "spdv-3872a",
            storageBucket: "spdv-3872a.firebasestorage.app",
            messagingSenderId: "552499245950",
            appId: "1:552499245950:web:7f61f8d9c6d05a46d5b92f"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        db = firebase.firestore();
        console.log("✅ Firebase inicializado com sucesso!");
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        return false;
    }
}

// ============================================
// 1. INICIALIZAÇÃO QUANDO O DOM ESTÁ PRONTO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM completamente carregado");
    
    // Inicializar elementos DOM
    inicializarElementosDOM();
    
    // Verificar se elementos críticos existem
    if (!estoqueTableBody) {
        console.error("❌ CRÍTICO: estoqueTableBody não encontrado!");
        // Tentar encontrar novamente
        estoqueTableBody = document.getElementById('estoqueTableBody');
        if (!estoqueTableBody) {
            alert("Erro: Elemento da tabela não encontrado. Recarregue a página.");
            return;
        }
    }
    
    // Esconder loading
    setTimeout(esconderLoading, 500);
    
    // Verificar sessão
    if (!verificarSessao()) {
        return;
    }
    
    // Inicializar Firebase
    if (!inicializarFirebase()) {
        mostrarErro("Não foi possível conectar ao banco de dados.");
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar produtos
    carregarProdutosReais();
    
    // Atualizar data/hora
    atualizarUltimaAtualizacao();
    setInterval(atualizarUltimaAtualizacao, 1000);
    
    console.log("✅ Sistema de estoque inicializado");
});

// ============================================
// INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementosDOM() {
    console.log("🔍 Buscando elementos DOM...");
    
    // Buscar todos os elementos necessários
    searchInput = document.getElementById('searchInput');
    btnNovoProduto = document.getElementById('btnNovoProduto');
    btnRelatorioEstoque = document.getElementById('btnRelatorioEstoque');
    btnRefresh = document.getElementById('btnRefresh');
    filterStatus = document.getElementById('filterStatus');
    estoqueTableBody = document.getElementById('estoqueTableBody');
    totalProdutosElement = document.getElementById('totalProdutos');
    totalEstoqueElement = document.getElementById('totalEstoque');
    baixoEstoqueElement = document.getElementById('baixoEstoque');
    valorTotalElement = document.getElementById('valorTotal');
    currentCountElement = document.getElementById('currentCount');
    lastUpdateElement = document.getElementById('lastUpdate');
    userNameElement = document.getElementById('userName');
    btnLogout = document.getElementById('btnLogout');
    
    // Modal
    modalProduto = document.getElementById('modalProduto');
    formProduto = document.getElementById('formProduto');
    produtoIdInput = document.getElementById('produtoId');
    modalTitle = document.getElementById('modalTitle');
    
    // Log dos elementos encontrados
    console.log("Elementos encontrados:", {
        searchInput: !!searchInput,
        btnNovoProduto: !!btnNovoProduto,
        estoqueTableBody: !!estoqueTableBody,
        totalProdutosElement: !!totalProdutosElement,
        modalProduto: !!modalProduto,
        formProduto: !!formProduto
    });
}

// ============================================
// 2. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        alert("⚠️ Sessão expirada! Faça login novamente.");
        setTimeout(() => window.location.href = '../../login.html', 1000);
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário:", usuario.nome || usuario.login);
        
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro na sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        setTimeout(() => window.location.href = '../../login.html', 1000);
        return false;
    }
}

// ============================================
// 3. CARREGAR PRODUTOS DO FIREBASE
// ============================================
async function carregarProdutosReais() {
    console.log("📦 Buscando produtos do estoque...");
    mostrarLoading("Carregando estoque...");
    
    try {
        const querySnapshot = await db.collection('estoque_mj_construcoes').get();
        
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
                ativo: data.ativo !== false
            });
        });
        
        console.log(`✅ ${produtos.length} produtos carregados`);
        
        produtosFiltrados = [...produtos];
        renderizarProdutos();
        atualizarEstatisticas();
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        mostrarErro(`Erro ao carregar estoque: ${error.message}`);
        
        if (estoqueTableBody) {
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
    } finally {
        esconderLoading();
    }
}

// ============================================
// 4. RENDERIZAR PRODUTOS
// ============================================
function renderizarProdutos() {
    if (!estoqueTableBody) {
        console.error("❌ Não é possível renderizar: estoqueTableBody não encontrado");
        return;
    }
    
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
        
        if (currentCountElement) {
            currentCountElement.textContent = '0';
        }
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
    
    if (currentCountElement) {
        currentCountElement.textContent = produtosFiltrados.length;
    }
    
    // Adicionar eventos aos botões
    adicionarEventosBotoes();
}

function adicionarEventosBotoes() {
    // Botão editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
            abrirModalEditar(produtoId);
        });
    });
    
    // Botão excluir/ativar
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
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
    if (!searchInput || !filterStatus) return;
    
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
    // Verificar se os elementos existem
    const elementos = [
        totalProdutosElement, 
        totalEstoqueElement, 
        baixoEstoqueElement, 
        valorTotalElement
    ];
    
    const todosExistem = elementos.every(el => el !== null);
    
    if (!todosExistem) {
        console.warn("⚠️ Alguns elementos de estatísticas não foram encontrados");
        return;
    }
    
    if (!produtosFiltrados || produtosFiltrados.length === 0) {
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
// 7. MODAL - NOVO PRODUTO
// ============================================
function abrirModalNovoProduto() {
    console.log("Abrindo modal para novo produto");
    
    if (!produtoIdInput || !modalTitle || !formProduto) {
        mostrarErro("Erro: Elementos do modal não encontrados");
        return;
    }
    
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    // Gerar código automático
    const codigoInput = document.getElementById('codigo');
    if (codigoInput) {
        codigoInput.value = `MJ-${Date.now().toString().slice(-6)}`;
    }
    
    // Abrir modal
    if (modalProduto) {
        modalProduto.style.display = 'flex';
        console.log("Modal aberto com sucesso");
    } else {
        console.error("Modal não encontrado");
    }
}

// ============================================
// 8. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    // Botão novo produto
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
        console.log("✅ Evento do botão Novo Produto configurado");
    } else {
        console.error("❌ Botão Novo Produto não encontrado");
    }
    
    // Botão atualizar
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async function() {
            await carregarProdutosReais();
            mostrarMensagem('Estoque atualizado', 'success');
        });
    }
    
    // Busca
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
    
    // Filtro
    if (filterStatus) {
        filterStatus.addEventListener('change', filtrarProdutos);
    }
    
    // Botão relatório
    if (btnRelatorioEstoque) {
        btnRelatorioEstoque.addEventListener('click', function() {
            mostrarMensagem('Relatório em desenvolvimento', 'info');
        });
    }
    
    // Modal - fechar
    const modalClose = modalProduto?.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    // Modal - cancelar
    const btnCancel = document.querySelector('.btn-cancel');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    // Modal - fechar ao clicar fora
    if (modalProduto) {
        modalProduto.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
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
    
    console.log("✅ Eventos configurados com sucesso");
}

// ============================================
// 9. SALVAR PRODUTO (NOVO OU EDITAR)
// ============================================
async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        mostrarLoading('Salvando produto...');
        
        // Obter valores do formulário
        const dadosProduto = {
            codigo: document.getElementById('codigo')?.value.trim() || '',
            nome: document.getElementById('nome')?.value.trim() || '',
            categoria: document.getElementById('categoria')?.value.trim() || '',
            unidade: document.getElementById('unidade')?.value || 'UN',
            preco_custo: parseFloat(document.getElementById('preco_custo')?.value) || 0,
            preco: parseFloat(document.getElementById('preco')?.value) || 0,
            quantidade: parseInt(document.getElementById('quantidade')?.value) || 0,
            estoque_minimo: parseInt(document.getElementById('estoque_minimo')?.value) || 5,
            descricao: document.getElementById('descricao')?.value.trim() || '',
            fornecedor: document.getElementById('fornecedor')?.value.trim() || '',
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
        
        const produtoId = produtoIdInput?.value || '';
        
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
        
        // Fechar modal
        if (modalProduto) {
            modalProduto.style.display = 'none';
        }
        
        // Recarregar dados
        await carregarProdutosReais();
        
    } catch (error) {
        esconderLoading();
        console.error('Erro ao salvar produto:', error);
        mostrarMensagem(error.message || 'Erro ao salvar produto', 'error');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

function atualizarUltimaAtualizacao() {
    if (lastUpdateElement) {
        const agora = new Date();
        const horaFormatada = agora.toLocaleTimeString('pt-BR');
        lastUpdateElement.textContent = `Última atualização: ${horaFormatada}`;
    }
}

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
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    if (text) text.textContent = texto;
    
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

function mostrarErro(texto) {
    mostrarMensagem(texto, 'error', 5000);
}

// Nota: As funções abrirModalEditar e confirmarAlteracaoStatus 
// serão implementadas posteriormente

// ============================================
// ESTILOS DINÂMICOS
// ============================================
(function adicionarEstilos() {
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
})();

console.log("✅ Sistema de estoque carregado e pronto!");
