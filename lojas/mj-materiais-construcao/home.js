// home.js - Sistema Home MJ Materiais de Construção
console.log("🏠 Sistema Home MJ - Iniciando...");

// ============================================
// CONFIGURAÇÃO FIREBASE
// ============================================
let db;

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
// VARIÁVEIS GLOBAIS
// ============================================
let usuario = null;
let produtos = [];

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página home carregada");
    
    // Esconder loading após 1 segundo
    setTimeout(function() {
        esconderLoading();
    }, 1000);
    
    // Verificar sessão primeiro
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
    
    // Carregar dados iniciais
    carregarDadosIniciais();
    
    // Atualizar data/hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 60000);
    
    console.log("✅ Sistema home pronto para uso");
});

// ============================================
// 2. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria') || 
                   localStorage.getItem('pdv_sessao_backup');
    
    if (!sessao) {
        alert("⚠️ Sessão expirada! Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../login.html';
        }, 1000);
        return false;
    }
    
    try {
        usuario = JSON.parse(sessao);
        console.log("✅ Usuário:", usuario.nome || usuario.login);
        
        // Atualizar nome na interface
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = usuario.nome || usuario.login || 'Usuário';
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Erro na sessão:", error);
        alert("Erro na sessão. Faça login novamente.");
        setTimeout(function() {
            window.location.href = '../login.html';
        }, 1000);
        return false;
    }
}

// ============================================
// 3. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        // Carregar produtos para consulta rápida
        await carregarProdutos();
        
        // Carregar estatísticas
        await carregarEstatisticas();
        
        // Carregar atividades recentes
        await carregarAtividadesRecentes();
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
    }
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                window.location.href = '../login.html';
            }
        });
    }
    
    // Botão consulta rápida
    const btnConsultaRapida = document.getElementById('btnConsultaRapida');
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', abrirModalConsulta);
    }
    
    // Botão relatório
    const btnRelatorio = document.getElementById('btnRelatorio');
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', function() {
            mostrarMensagem("Relatórios em desenvolvimento", "info");
        });
    }
    
    // Modal consulta rápida - fechar
    const modalConsulta = document.getElementById('quickSearchModal');
    if (modalConsulta) {
        const modalClose = modalConsulta.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modalConsulta.style.display = 'none';
            });
        }
        
        // Fechar ao clicar fora
        modalConsulta.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
        
        // Busca em tempo real
        const searchProductInput = document.getElementById('searchProductInput');
        if (searchProductInput) {
            searchProductInput.addEventListener('input', function() {
                buscarProdutoConsultaRapida(this.value);
            });
        }
    }
}

// ============================================
// 5. CARREGAR PRODUTOS PARA CONSULTA
// ============================================
async function carregarProdutos() {
    try {
        const querySnapshot = await db.collection('estoque_mj_construcoes')
            .where('ativo', '==', true)
            .get();
        
        produtos = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            produtos.push({
                id: doc.id,
                codigo: data.codigo || doc.id,
                nome: data.nome || 'Produto sem nome',
                preco: parseFloat(data.preco) || 0,
                quantidade: parseInt(data.quantidade) || 0,
                categoria: data.categoria || '',
                unidade: data.unidade || 'UN',
                estoque_minimo: parseInt(data.estoque_minimo) || 5,
                descricao: data.descricao || '',
                fornecedor: data.fornecedor || ''
            });
        });
        
        console.log(`✅ ${produtos.length} produtos carregados para consulta`);
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        
        // Tentar sem filtro
        try {
            const querySnapshot = await db.collection('estoque_mj_construcoes').get();
            produtos = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.ativo !== false) {
                    produtos.push({
                        id: doc.id,
                        codigo: data.codigo || doc.id,
                        nome: data.nome || 'Produto sem nome',
                        preco: parseFloat(data.preco) || 0,
                        quantidade: parseInt(data.quantidade) || 0,
                        categoria: data.categoria || '',
                        unidade: data.unidade || 'UN',
                        estoque_minimo: parseInt(data.estoque_minimo) || 5,
                        descricao: data.descricao || '',
                        fornecedor: data.fornecedor || ''
                    });
                }
            });
            
            console.log(`🔄 ${produtos.length} produtos carregados (modo compatibilidade)`);
            
        } catch (error2) {
            console.error("❌ Erro crítico ao carregar produtos:", error2);
        }
    }
}

// ============================================
// 6. CONSULTA RÁPIDA - MODAL
// ============================================
function abrirModalConsulta() {
    const modal = document.getElementById('quickSearchModal');
    const searchInput = document.getElementById('searchProductInput');
    
    if (modal && searchInput) {
        modal.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();
        
        // Limpar resultados anteriores
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-search"></i>
                    <p>Digite para buscar um produto</p>
                    <small>Busque por código, nome ou categoria</small>
                </div>
            `;
        }
    }
}

function buscarProdutoConsultaRapida(termo) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>Digite para buscar um produto</p>
                <small>Busque por código, nome ou categoria</small>
            </div>
        `;
        return;
    }
    
    // Filtrar produtos
    const resultados = produtos.filter(produto => {
        return (
            (produto.codigo && produto.codigo.toLowerCase().includes(termoLimpo)) ||
            (produto.nome && produto.nome.toLowerCase().includes(termoLimpo)) ||
            (produto.categoria && produto.categoria.toLowerCase().includes(termoLimpo)) ||
            (produto.descricao && produto.descricao.toLowerCase().includes(termoLimpo))
        );
    });
    
    if (resultados.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado</p>
                <small>Tente outro termo de busca</small>
            </div>
        `;
        return;
    }
    
    // Exibir resultados
    let html = '<div class="results-list">';
    
    resultados.forEach(produto => {
        const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
        const precoFormatado = formatarMoeda(produto.preco);
        
        html += `
            <div class="product-result">
                <div class="product-result-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-details">
                    <div class="product-price">
                        <strong>Preço:</strong> R$ ${precoFormatado}
                    </div>
                    <div class="product-actions">
                        <button class="btn-action btn-info" onclick="verDetalhesProduto('${produto.id}')">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        <button class="btn-action btn-sell" onclick="irParaVendaComProduto('${produto.id}')">
                            <i class="fas fa-cart-plus"></i> Vender
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

function verDetalhesProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const estoqueStatus = produto.quantidade <= produto.estoque_minimo ? 'BAIXO' : 'NORMAL';
    const statusClass = produto.quantidade <= produto.estoque_minimo ? 'danger' : 'success';
    
    alert(
        `📦 DETALHES DO PRODUTO\n\n` +
        `Código: ${produto.codigo}\n` +
        `Nome: ${produto.nome}\n` +
        `Categoria: ${produto.categoria || 'Não informada'}\n` +
        `Estoque: ${produto.quantidade} ${produto.unidade || 'UN'}\n` +
        `Mínimo: ${produto.estoque_minimo} ${produto.unidade || 'UN'}\n` +
        `Status: ${estoqueStatus}\n` +
        `Preço: R$ ${formatarMoeda(produto.preco)}\n` +
        `${produto.descricao ? `Descrição: ${produto.descricao}\n` : ''}` +
        `${produto.fornecedor ? `Fornecedor: ${produto.fornecedor}\n` : ''}`
    );
}

function irParaVendaComProduto(produtoId) {
    // Salvar o produto selecionado para a página de vendas
    sessionStorage.setItem('produto_selecionado_venda', produtoId);
    
    // Fechar modal
    const modal = document.getElementById('quickSearchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Ir para página de vendas
    window.location.href = 'venda.html';
}

// ============================================
// 7. CARREGAR ESTATÍSTICAS
// ============================================
async function carregarEstatisticas() {
    try {
        // Vendas de hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const querySnapshot = await db.collection('vendas_mj_construcoes')
            .where('data_venda', '>=', hoje)
            .where('status', '==', 'concluida')
            .get();
        
        let totalVendas = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            totalVendas += parseFloat(data.total) || 0;
        });
        
        // Atualizar elementos
        const vendasHojeElement = document.getElementById('vendasHoje');
        const quantidadeVendasElement = document.getElementById('quantidadeVendas');
        
        if (vendasHojeElement) {
            vendasHojeElement.textContent = `R$ ${formatarMoeda(totalVendas)}`;
        }
        if (quantidadeVendasElement) {
            quantidadeVendasElement.textContent = `${querySnapshot.size} venda${querySnapshot.size !== 1 ? 's' : ''}`;
        }
        
        // Total de produtos em estoque
        const produtosQuery = await db.collection('estoque_mj_construcoes')
            .where('ativo', '==', true)
            .get();
        
        let totalProdutos = 0;
        let produtosBaixoEstoque = 0;
        let valorTotalEstoque = 0;
        
        produtosQuery.forEach(doc => {
            const data = doc.data();
            const quantidade = parseInt(data.quantidade) || 0;
            const precoCusto = parseFloat(data.preco_custo) || 0;
            
            if (quantidade > 0) {
                totalProdutos++;
                valorTotalEstoque += precoCusto * quantidade;
                
                if (quantidade <= (parseInt(data.estoque_minimo) || 5)) {
                    produtosBaixoEstoque++;
                }
            }
        });
        
        // Atualizar elementos
        const totalProdutosElement = document.getElementById('totalProdutos');
        const produtosBaixoElement = document.getElementById('produtosBaixo');
        const valorEstoqueElement = document.getElementById('valorEstoque');
        
        if (totalProdutosElement) totalProdutosElement.textContent = totalProdutos;
        if (produtosBaixoElement) produtosBaixoElement.textContent = `${produtosBaixoEstoque} com baixo estoque`;
        if (valorEstoqueElement) valorEstoqueElement.textContent = `R$ ${formatarMoeda(valorTotalEstoque)}`;
        
        // Meta do mês (exemplo fixo)
        const metaMensal = 50000; // R$ 50.000,00
        const percentual = Math.min(Math.round((totalVendas / metaMensal) * 100), 100);
        const restante = metaMensal - totalVendas;
        
        const metaPercentualElement = document.getElementById('metaPercentual');
        const metaRestanteElement = document.getElementById('metaRestante');
        
        if (metaPercentualElement) metaPercentualElement.textContent = `${percentual}%`;
        if (metaRestanteElement) metaRestanteElement.textContent = `R$ ${formatarMoeda(Math.max(restante, 0))}`;
        
    } catch (error) {
        console.error("❌ Erro ao carregar estatísticas:", error);
    }
}

// ============================================
// 8. CARREGAR ATIVIDADES RECENTES
// ============================================
async function carregarAtividadesRecentes() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Buscar últimas 5 vendas
        const querySnapshot = await db.collection('vendas_mj_construcoes')
            .orderBy('data_venda', 'desc')
            .limit(5)
            .get();
        
        if (querySnapshot.empty) {
            activityList.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-history"></i>
                    <p>Nenhuma atividade recente</p>
                    <small>Realize vendas para ver atividades</small>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const dataVenda = data.data_venda?.toDate() || new Date();
            const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            <strong>Venda #${data.numero_venda || doc.id.slice(-6)}</strong>
                            <span class="activity-time">${horaFormatada}</span>
                        </div>
                        <div class="activity-details">
                            <span>${data.vendedor || 'Vendedor'}</span>
                            <span class="activity-amount">R$ ${formatarMoeda(data.total)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        activityList.innerHTML = html;
        
    } catch (error) {
        console.error("❌ Erro ao carregar atividades:", error);
        const activityList = document.getElementById('activityList');
        if (activityList) {
            activityList.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar atividades</p>
                </div>
            `;
        }
    }
}

// ============================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return parseFloat(valor || 0).toFixed(2).replace('.', ',');
}

function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    elemento.textContent = dataFormatada;
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

// ============================================
// 10. ADICIONAR ESTILOS DINÂMICOS PARA O MODAL
// ============================================
(function adicionarEstilosModal() {
    const estiloModal = document.createElement('style');
    estiloModal.textContent = `
        /* Estilos para o modal de consulta rápida */
        .search-box {
            position: relative;
            margin-bottom: 1.5rem;
        }
        
        .search-box i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
        }
        
        .search-box input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 3rem;
            border: 2px solid #3498db;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: #2980b9;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        
        .search-results {
            max-height: 400px;
            overflow-y: auto;
            border-radius: 8px;
            background: #f8f9fa;
        }
        
        .empty-results {
            text-align: center;
            padding: 3rem 1rem;
            color: #6c757d;
        }
        
        .empty-results i {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #bdc3c7;
        }
        
        .results-list {
            padding: 0.5rem;
        }
        
        .product-result {
            background: white;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border: 1px solid #e9ecef;
            transition: all 0.2s;
        }
        
        .product-result:hover {
            border-color: #3498db;
            box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
        }
        
        .product-result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .product-code {
            font-weight: 600;
            color: #2c3e50;
            font-size: 0.9rem;
        }
        
        .product-stock {
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        
        .product-stock.low {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .product-stock:not(.low) {
            background-color: #d4edda;
            color: #155724;
        }
        
        .product-name {
            font-weight: 600;
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            color: #2c3e50;
        }
        
        .product-category {
            display: inline-block;
            background: #e9ecef;
            color: #495057;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
            margin-bottom: 0.75rem;
        }
        
        .product-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 0.75rem;
        }
        
        .product-price {
            font-size: 1.1rem;
            color: #27ae60;
            font-weight: 600;
        }
        
        .product-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn-action {
            padding: 0.5rem 0.75rem;
            border: none;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
        }
        
        .btn-info {
            background: #3498db;
            color: white;
        }
        
        .btn-info:hover {
            background: #2980b9;
        }
        
        .btn-sell {
            background: #27ae60;
            color: white;
        }
        
        .btn-sell:hover {
            background: #219653;
        }
        
        /* Estilos para atividades */
        .empty-activity {
            text-align: center;
            padding: 3rem 1rem;
            color: #6c757d;
        }
        
        .empty-activity i {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #bdc3c7;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            margin-bottom: 0.75rem;
            border-left: 4px solid #3498db;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            background: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.25rem;
        }
        
        .activity-time {
            font-size: 0.85rem;
            color: #6c757d;
        }
        
        .activity-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .activity-amount {
            font-weight: 600;
            color: #27ae60;
        }
    `;
    document.head.appendChild(estiloModal);
})();

console.log("✅ Sistema home completamente carregado!");
