// home.js - SISTEMA HOME PDV MULTILOJA (Versão Dinâmica)
console.log("🏠 Sistema PDV - Página Inicial (Versão Dinâmica)");

import { pdvManager } from './firebase_config.js';

// Variáveis globais
let produtos = [];
let estatisticas = null;
let atividades = [];

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página home carregada");
    
    // Mostrar loading inicial
    mostrarLoading('Inicializando sistema...');
    
    // Verificar se o pdvManager está carregado
    if (!pdvManager || !pdvManager.isLogged) {
        mostrarMensagem('Sessão expirada! Redirecionando para login...', 'error');
        setTimeout(() => {
            window.location.href = '../../login.html';
        }, 2000);
        return;
    }
    
    console.log(`✅ Loja atual: ${pdvManager.config?.nome || pdvManager.id}`);
    
    try {
        // Atualizar interface com dados da loja
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Atualizar data/hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000);
        
        // Carregar dados iniciais
        await carregarDadosIniciais();
        
        // Esconder loading
        setTimeout(esconderLoading, 500);
        
        console.log("✅ Sistema home pronto para uso");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        esconderLoading();
    }
});

// ============================================
// 2. ATUALIZAR INTERFACE DA LOJA
// ============================================
async function atualizarInterfaceLoja() {
    try {
        // 1. Atualizar título da página
        const lojaNome = pdvManager.config?.nome || pdvManager.id;
        document.title = `${lojaNome} - PDV Sistema`;
        
        // 2. Atualizar nome da loja em todos os elementos
        const elementosNome = [
            'lojaNomeHeader',
            'lojaNomeBemVindo', 
            'lojaNomeFooter'
        ];
        
        elementosNome.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = lojaNome;
            }
        });
        
        // 3. Atualizar local da loja
        const lojaLocal = document.getElementById('lojaLocal');
        if (lojaLocal && pdvManager.config?.local) {
            lojaLocal.textContent = pdvManager.config.local;
        }
        
        // 4. Atualizar informações do usuário
        const userName = document.getElementById('userName');
        const userWelcome = document.getElementById('userWelcome');
        const userPerfil = document.getElementById('userPerfil');
        
        if (userName) userName.textContent = pdvManager.nomeUsuario;
        if (userWelcome) userWelcome.textContent = pdvManager.nomeUsuario;
        if (userPerfil) {
            const perfil = pdvManager.perfil || 'usuario';
            userPerfil.textContent = perfil.includes('admin') ? '👑 Administrador' : '👤 Vendedor';
            userPerfil.className = `user-perfil ${perfil.includes('admin') ? 'admin' : 'user'}`;
        }
        
        // 5. Buscar dados completos da loja do Firebase
        await carregarDadosLojaFirebase();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface da loja:', error);
    }
}

// ============================================
// 3. CARREGAR DADOS DA LOJA DO FIREBASE
// ============================================
async function carregarDadosLojaFirebase() {
    try {
        mostrarLoading('Carregando dados da loja...', 'Carregando...');
        
        // Usar o método buscarDadosLoja do pdvManager
        const resultado = await pdvManager.buscarDadosLoja();
        
        if (resultado.success) {
            const dadosLoja = resultado.data;
            
            // Atualizar informações adicionais
            const footerInfo = document.getElementById('footerInfo');
            if (footerInfo) {
                let infoText = '';
                if (dadosLoja.telefone) infoText += `📞 ${dadosLoja.telefone}`;
                if (dadosLoja.email) infoText += infoText ? ` | ✉️ ${dadosLoja.email}` : `✉️ ${dadosLoja.email}`;
                if (dadosLoja.cnpj) infoText += infoText ? ` | 🏢 ${dadosLoja.cnpj}` : `🏢 ${dadosLoja.cnpj}`;
                
                footerInfo.textContent = infoText;
            }
            
            console.log('✅ Dados da loja carregados:', dadosLoja);
            
        } else {
            console.warn('⚠️ Dados da loja não encontrados no Firebase');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
    }
}

// ============================================
// 4. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        // 1. Carregar produtos para consulta rápida
        await carregarProdutos();
        
        // 2. Carregar estatísticas
        await carregarEstatisticas();
        
        // 3. Carregar atividades recentes
        await carregarAtividadesRecentes();
        
        // 4. Atualizar status de conexão
        atualizarStatusConexao(true);
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
        mostrarMensagem("Erro ao carregar dados do sistema", "error");
    }
}

// ============================================
// 5. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja sair do sistema?")) {
                pdvManager.logout();
            }
        });
    }
    
    // Botão consulta rápida
    const btnConsultaRapida = document.getElementById('btnConsultaRapida');
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', abrirModalConsulta);
    }
    
    // Modal consulta rápida - fechar
    const modalConsulta = document.getElementById('quickSearchModal');
    if (modalConsulta) {
        // Botão fechar
        const modalClose = modalConsulta.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modalConsulta.style.display = 'none';
            });
        }
        
        // Botão limpar busca
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                const searchInput = document.getElementById('searchProductInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    buscarProdutoConsultaRapida('');
                }
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
            
            // Buscar ao pressionar Enter
            searchProductInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarProdutoConsultaRapida(this.value);
                }
            });
        }
        
        // Filtros de busca
        const filterBtns = modalConsulta.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Atualizar botões ativos
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Refiltrar resultados
                const searchInput = document.getElementById('searchProductInput');
                if (searchInput) {
                    buscarProdutoConsultaRapida(searchInput.value);
                }
            });
        });
    }
    
    // Filtros de atividades
    const activityFilters = document.querySelectorAll('.activity-filters .filter-btn');
    activityFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            // Atualizar botões ativos
            activityFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filtrar atividades
            const filtro = this.dataset.filter;
            filtrarAtividades(filtro);
        });
    });
}

// ============================================
// 6. CARREGAR PRODUTOS PARA CONSULTA
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...', 'Carregando catálogo...');
        
        const resultado = await pdvManager.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            
            // Atualizar badge de produtos
            const totalProdutosBadge = document.getElementById('totalProdutosBadge');
            if (totalProdutosBadge) {
                totalProdutosBadge.textContent = produtos.length;
                totalProdutosBadge.style.display = produtos.length > 0 ? 'flex' : 'none';
            }
            
            console.log(`✅ ${produtos.length} produtos carregados para consulta`);
            
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            produtos = [];
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

// ============================================
// 7. CARREGAR ESTATÍSTICAS
// ============================================
async function carregarEstatisticas() {
    try {
        mostrarLoading('Calculando estatísticas...', 'Analisando dados...');
        
        const resultado = await pdvManager.buscarEstatisticas();
        
        if (resultado.success) {
            estatisticas = resultado.data;
            atualizarEstatisticasUI();
        } else {
            console.error('❌ Erro ao carregar estatísticas:', resultado.error);
            estatisticas = null;
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar estatísticas:", error);
        estatisticas = null;
    }
}

function atualizarEstatisticasUI() {
    if (!estatisticas) return;
    
    try {
        // Vendas de hoje
        const vendasHojeElement = document.getElementById('vendasHoje');
        const quantidadeVendasElement = document.getElementById('quantidadeVendas');
        
        if (vendasHojeElement) {
            vendasHojeElement.textContent = formatarMoeda(estatisticas.vendasHoje);
        }
        if (quantidadeVendasElement) {
            quantidadeVendasElement.textContent = `${estatisticas.quantidadeVendasHoje} venda${estatisticas.quantidadeVendasHoje !== 1 ? 's' : ''}`;
        }
        
        // Total de produtos
        const totalProdutosElement = document.getElementById('totalProdutos');
        const produtosBaixoElement = document.getElementById('produtosBaixo');
        
        if (totalProdutosElement) totalProdutosElement.textContent = estatisticas.totalProdutos;
        if (produtosBaixoElement) produtosBaixoElement.textContent = `${estatisticas.produtosBaixoEstoque} com baixo estoque`;
        
        // Valor em estoque
        const valorEstoqueElement = document.getElementById('valorEstoque');
        if (valorEstoqueElement) {
            valorEstoqueElement.textContent = formatarMoeda(estatisticas.totalValorEstoque);
        }
        
        // Meta do mês
        const metaMensal = pdvManager.config?.meta_mensal || 10000;
        const percentual = Math.min(Math.round((parseFloat(estatisticas.vendasHoje) / metaMensal) * 100), 100);
        const restante = Math.max(metaMensal - parseFloat(estatisticas.vendasHoje), 0);
        
        const metaPercentualElement = document.getElementById('metaPercentual');
        const metaRestanteElement = document.getElementById('metaRestante');
        const metaProgressBar = document.getElementById('metaProgressBar');
        
        if (metaPercentualElement) metaPercentualElement.textContent = `${percentual}%`;
        if (metaRestanteElement) metaRestanteElement.textContent = formatarMoeda(restante);
        if (metaProgressBar) metaProgressBar.style.width = `${percentual}%`;
        
        // Atualizar progresso das vendas
        const progressBar = document.querySelector('.stat-progress .progress-bar');
        if (progressBar && estatisticas.quantidadeVendasHoje > 0) {
            progressBar.style.width = '100%';
        }
        
        // Atualizar última atualização
        const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
        if (ultimaAtualizacao) {
            ultimaAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        console.log('✅ Estatísticas atualizadas na interface');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas UI:', error);
    }
}

// ============================================
// 8. CARREGAR ATIVIDADES RECENTES
// ============================================
async function carregarAtividadesRecentes() {
    try {
        mostrarLoading('Carregando atividades...', 'Buscando histórico...');
        
        const resultado = await pdvManager.buscarVendas(10);
        
        if (resultado.success) {
            atividades = resultado.data;
            exibirAtividades(atividades);
        } else {
            console.error('❌ Erro ao carregar atividades:', resultado.error);
            atividades = [];
            exibirAtividades([]);
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar atividades:", error);
        atividades = [];
        exibirAtividades([]);
    }
}

function exibirAtividades(listaAtividades) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!listaAtividades || listaAtividades.length === 0) {
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
    
    listaAtividades.forEach(atividade => {
        const dataVenda = atividade.data_venda?.toDate ? atividade.data_venda.toDate() : new Date();
        const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataFormatada = dataVenda.toLocaleDateString('pt-BR');
        
        // Determinar ícone baseado no status
        let iconClass = 'fas fa-shopping-cart';
        if (atividade.status === 'cancelada') iconClass = 'fas fa-ban';
        if (atividade.status === 'pendente') iconClass = 'fas fa-clock';
        
        html += `
            <div class="activity-item" data-type="venda" data-status="${atividade.status}">
                <div class="activity-icon ${atividade.status}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">
                        <strong>Venda #${atividade.numero_venda || atividade.id.slice(-6)}</strong>
                        <span class="activity-time">${dataFormatada} ${horaFormatada}</span>
                    </div>
                    <div class="activity-details">
                        <span class="activity-vendedor">
                            <i class="fas fa-user"></i>
                            ${atividade.vendedor_nome || 'Vendedor'}
                        </span>
                        <span class="activity-status ${atividade.status}">${atividade.status === 'concluida' ? '✅ Concluída' : '⏳ Pendente'}</span>
                        <span class="activity-amount">${formatarMoeda(atividade.total)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    activityList.innerHTML = html;
}

function filtrarAtividades(filtro) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    let atividadesFiltradas = atividades;
    
    if (filtro === 'vendas') {
        atividadesFiltradas = atividades; // Já são todas vendas
    } else if (filtro === 'estoque') {
        // Se tivéssemos atividades de estoque, filtraríamos aqui
        atividadesFiltradas = []; // Exemplo: sem atividades de estoque por enquanto
    }
    
    exibirAtividades(atividadesFiltradas);
}

// ============================================
// 9. CONSULTA RÁPIDA - MODAL
// ============================================
function abrirModalConsulta() {
    const modal = document.getElementById('quickSearchModal');
    const searchInput = document.getElementById('searchProductInput');
    
    if (modal && searchInput) {
        modal.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();
        
        // Limpar resultados anteriores
        buscarProdutoConsultaRapida('');
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
    
    // Obter filtro ativo
    const filtroAtivo = document.querySelector('.search-filters .filter-btn.active');
    const tipoFiltro = filtroAtivo ? filtroAtivo.dataset.filter : 'all';
    
    // Filtrar produtos
    let resultados = produtos.filter(produto => {
        return (
            (produto.codigo && produto.codigo.toLowerCase().includes(termoLimpo)) ||
            (produto.nome && produto.nome.toLowerCase().includes(termoLimpo)) ||
            (produto.categoria && produto.categoria.toLowerCase().includes(termoLimpo)) ||
            (produto.descricao && produto.descricao.toLowerCase().includes(termoLimpo))
        );
    });
    
    // Aplicar filtro adicional
    if (tipoFiltro === 'estoque') {
        resultados = resultados.filter(p => p.quantidade > 0);
    } else if (tipoFiltro === 'baixo') {
        resultados = resultados.filter(p => p.quantidade <= p.estoque_minimo);
    }
    
    if (resultados.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado</p>
                <small>Tente outro termo de busca ou altere o filtro</small>
            </div>
        `;
        return;
    }
    
    // Exibir resultados
    let html = '<div class="results-list">';
    
    resultados.forEach(produto => {
        const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = produto.quantidade > 0;
        
        html += `
            <div class="product-result">
                <div class="product-result-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : (temEstoque ? 'normal' : 'out')}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                        ${estoqueBaixo ? ' ⚠️' : ''}
                        ${!temEstoque ? ' (ESGOTADO)' : ''}
                    </span>
                </div>
                <div class="product-name">${produto.nome}</div>
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                <div class="product-details">
                    <div class="product-price">
                        <strong>Preço:</strong> ${formatarMoeda(produto.preco)}
                    </div>
                    <div class="product-actions">
                        <button class="btn-action btn-info" onclick="verDetalhesProduto('${produto.id}')">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        ${temEstoque ? `
                        <button class="btn-action btn-sell" onclick="irParaVendaComProduto('${produto.id}')">
                            <i class="fas fa-cart-plus"></i> Vender
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

// Funções globais para os botões do modal
window.verDetalhesProduto = async function(produtoId) {
    try {
        const resultado = await pdvManager.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            const estoqueStatus = produto.quantidade <= produto.estoque_minimo ? 'BAIXO' : 'NORMAL';
            const statusClass = produto.quantidade <= produto.estoque_minimo ? 'danger' : 'success';
            
            alert(
                `📦 DETALHES DO PRODUTO\n\n` +
                `Código: ${produto.codigo || 'Não informado'}\n` +
                `Nome: ${produto.nome || 'Sem nome'}\n` +
                `Categoria: ${produto.categoria || 'Não informada'}\n` +
                `Estoque: ${produto.quantidade || 0} ${produto.unidade || 'UN'}\n` +
                `Estoque mínimo: ${produto.estoque_minimo || 5} ${produto.unidade || 'UN'}\n` +
                `Status: ${estoqueStatus}\n` +
                `Preço venda: ${formatarMoeda(produto.preco)}\n` +
                `Preço custo: ${formatarMoeda(produto.preco_custo)}\n` +
                `Margem: ${calcularMargem(produto.preco_custo, produto.preco)}%\n` +
                `${produto.descricao ? `Descrição: ${produto.descricao}\n` : ''}` +
                `${produto.fornecedor ? `Fornecedor: ${produto.fornecedor}\n` : ''}`
            );
        } else {
            mostrarMensagem('Produto não encontrado', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do produto:', error);
        mostrarMensagem('Erro ao carregar detalhes', 'error');
    }
};

window.irParaVendaComProduto = function(produtoId) {
    // Salvar o produto selecionado para a página de vendas
    sessionStorage.setItem('produto_selecionado_venda', produtoId);
    
    // Fechar modal
    const modal = document.getElementById('quickSearchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Ir para página de vendas
    window.location.href = 'venda.html';
};

function calcularMargem(custo, venda) {
    if (!custo || custo <= 0) return 'N/A';
    const margem = ((venda - custo) / custo) * 100;
    return margem.toFixed(1);
}

// ============================================
// 10. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
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
        minute: '2-digit',
        second: '2-digit'
    });
    
    elemento.textContent = dataFormatada;
}

function atualizarStatusConexao(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const statusText = statusElement.querySelector('#statusText');
    const icon = statusElement.querySelector('i');
    
    if (conectado) {
        if (statusText) statusText.textContent = 'Conectado';
        if (icon) {
            icon.style.color = '#27ae60';
        }
        statusElement.style.color = '#27ae60';
    } else {
        if (statusText) statusText.textContent = 'Desconectado';
        if (icon) {
            icon.style.color = '#e74c3c';
        }
        statusElement.style.color = '#e74c3c';
    }
}

function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail');
        
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 4000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    // Configurar alerta
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Ícone
    const icon = alert.querySelector('.message-icon');
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    
    // Texto
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    // Botão fechar
    const closeBtn = alert.querySelector('.message-close');
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

// Adicionar estilos CSS dinâmicos
(function adicionarEstilos() {
    const estilo = document.createElement('style');
    estilo.textContent = `
        /* Estilos específicos para a versão dinâmica */
        
        .user-perfil {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-left: 0.5rem;
            font-weight: 500;
        }
        
        .user-perfil.admin {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
        }
        
        .user-perfil.user {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .user-welcome {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.5rem;
            color: #555;
        }
        
        .user-welcome i {
            font-size: 1.5rem;
            color: #3498db;
        }
        
        .action-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #e74c3c;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .stat-progress {
            height: 4px;
            background: #ecf0f1;
            border-radius: 2px;
            margin-top: 0.5rem;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #2ecc71, #27ae60);
            border-radius: 2px;
            transition: width 0.5s ease;
        }
        
        .stat-trend {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 0.5rem;
        }
        
        .stat-detail {
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 0.5rem;
        }
        
        .activity-filters {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .filter-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #ddd;
            background: white;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        
        .filter-btn:hover {
            border-color: #3498db;
            color: #3498db;
        }
        
        .filter-btn.active {
            background: #3498db;
            color: white;
            border-color: #3498db;
        }
        
        .search-clear {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.5rem;
        }
        
        .search-clear:hover {
            color: #e74c3c;
        }
        
        .search-filters {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .product-stock.out {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .activity-status.concluida {
            color: #27ae60;
        }
        
        .activity-status.pendente {
            color: #f39c12;
        }
        
        .activity-status.cancelada {
            color: #e74c3c;
        }
        
        .activity-vendedor {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: #555;
        }
        
        .footer-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-top: 0.5rem;
        }
        
        #footerVersao {
            font-size: 0.9rem;
            color: #95a5a6;
        }
        
        .header-info {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.25rem;
        }
        
        /* Estilos para o modal de consulta */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .modal-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .modal-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-close:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .search-box {
            position: relative;
            margin-bottom: 1rem;
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
            padding: 1rem 3rem 1rem 3rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        
        .search-results {
            max-height: 400px;
            overflow-y: auto;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #eee;
        }
        
        /* Estilos para loading em atividades */
        .loading-activity {
            text-align: center;
            padding: 2rem;
        }
        
        .loading-activity .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
            .header-right {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .header-info {
                margin-top: 0.5rem;
            }
            
            .user-welcome {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
            }
            
            .footer-info {
                flex-direction: column;
                gap: 0.5rem;
            }
        }
    `;
    document.head.appendChild(estilo);
})();

console.log("✅ Sistema home dinâmico completamente carregado!");
