// home.js - MJ Materiais de Construção
import { mjServices } from './firebase_config.js';

// Elementos DOM
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const currentDateTimeElement = document.getElementById('currentDateTime');
const vendasHojeElement = document.getElementById('vendasHoje');
const quantidadeVendasElement = document.getElementById('quantidadeVendas');
const totalProdutosElement = document.getElementById('totalProdutos');
const produtosBaixoElement = document.getElementById('produtosBaixo');
const valorEstoqueElement = document.getElementById('valorEstoque');
const metaPercentualElement = document.getElementById('metaPercentual');
const metaRestanteElement = document.getElementById('metaRestante');
const activityListElement = document.getElementById('activityList');
const connectionStatusElement = document.getElementById('connectionStatus');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageAlert = document.getElementById('messageAlert');

// Botões de ação
const btnConsultaRapida = document.getElementById('btnConsultaRapida');
const btnRelatorio = document.getElementById('btnRelatorio');
const quickSearchModal = document.getElementById('quickSearchModal');
const searchProductInput = document.getElementById('searchProductInput');
const searchResultsElement = document.getElementById('searchResults');

// Variáveis globais
let usuario = null;
let lojaInfo = null;

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Home MJ Materiais - Inicializando...');
    
    // Verificar autenticação
    if (!verificarAutenticacao()) {
        return;
    }
    
    // Carregar dados do usuário
    carregarDadosUsuario();
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados da loja
    await carregarDadosLoja();
    
    // Atualizar data e hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
    
    // Carregar estatísticas
    await carregarEstatisticas();
    
    // Carregar atividade recente
    await carregarAtividadeRecente();
    
    console.log('✅ Home MJ Materiais carregada com sucesso!');
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
        // Atualizar nome do usuário em todos os lugares
        const userNameElements = document.querySelectorAll('#userName');
        userNameElements.forEach(el => {
            if (el) el.textContent = usuario.nomeCompleto || usuario.login;
        });
    }
}

// ============================================
// 4. CARREGAR DADOS DA LOJA
// ============================================
async function carregarDadosLoja() {
    try {
        const resultado = await mjServices.buscarDadosLoja();
        
        if (resultado.success) {
            lojaInfo = resultado.data;
            console.log('📊 Dados da loja carregados:', lojaInfo);
        } else {
            console.error('Erro ao carregar dados da loja:', resultado.error);
            lojaInfo = {
                nome: "MJ Materiais de Construção",
                local: "Cajazeiras 11 - Salvador/BA",
                telefone: "(71) 99999-9999"
            };
        }
    } catch (error) {
        console.error('Erro ao carregar dados da loja:', error);
        lojaInfo = {
            nome: "MJ Materiais de Construção",
            local: "Cajazeiras 11 - Salvador/BA",
            telefone: "(71) 99999-9999"
        };
    }
}

// ============================================
// 5. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    btnLogout.addEventListener('click', function() {
        localStorage.clear();
        window.location.href = '../../login.html';
    });
    
    // Botão consulta rápida
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', abrirConsultaRapida);
    }
    
    // Botão relatório
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', function() {
            showMessage('Relatórios em desenvolvimento', 'info');
        });
    }
    
    // Fechar modal
    const modalClose = quickSearchModal?.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            quickSearchModal.style.display = 'none';
        });
    }
    
    // Fechar modal ao clicar fora
    if (quickSearchModal) {
        quickSearchModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Busca em tempo real
    if (searchProductInput) {
        searchProductInput.addEventListener('input', function() {
            const termo = this.value.trim();
            if (termo.length >= 2) {
                buscarProdutosConsulta(termo);
            } else {
                searchResultsElement.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Digite para buscar produtos</p>
                        <small>Mínimo 2 caracteres</small>
                    </div>
                `;
            }
        });
        
        searchProductInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                buscarProdutosConsulta(this.value.trim());
            }
        });
    }
}

// ============================================
// 6. FUNÇÕES DE DASHBOARD
// ============================================
async function carregarEstatisticas() {
    try {
        showLoading('Carregando estatísticas...');
        
        const resultado = await mjServices.buscarEstatisticas();
        
        if (resultado.success) {
            const stats = resultado.data;
            
            // Formatar valores monetários
            const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            // Atualizar elementos
            vendasHojeElement.textContent = formatadorMoeda.format(stats.vendasHoje);
            quantidadeVendasElement.textContent = `${stats.quantidadeVendasHoje} vendas`;
            totalProdutosElement.textContent = stats.totalProdutos.toLocaleString('pt-BR');
            produtosBaixoElement.textContent = `${stats.produtosBaixoEstoque} com baixo estoque`;
            valorEstoqueElement.textContent = formatadorMoeda.format(stats.totalValorEstoque);
            
            // Calcular meta
            const metaPercent = (stats.metaAlcancada / stats.metaMensal * 100).toFixed(1);
            const metaRestante = stats.metaMensal - stats.metaAlcancada;
            
            metaPercentualElement.textContent = `${metaPercent}%`;
            metaRestanteElement.textContent = formatadorMoeda.format(metaRestante);
            
            hideLoading();
            
        } else {
            throw new Error(resultado.error);
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar estatísticas:', error);
        showMessage('Erro ao carregar estatísticas', 'error');
    }
}

async function carregarAtividadeRecente() {
    try {
        // Buscar últimas vendas
        const resultado = await mjServices.buscarVendas(10);
        
        if (resultado.success && resultado.data.length > 0) {
            let html = '';
            
            resultado.data.forEach(venda => {
                const dataVenda = venda.data_venda?.toDate ? venda.data_venda.toDate() : new Date();
                const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                html += `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-shopping-cart"></i>
                        </div>
                        <div class="activity-content">
                            <p>Venda realizada - ${venda.numero_venda || 'N/A'}</p>
                            <small>${formatarMoeda(venda.total)} • ${horaFormatada}</small>
                        </div>
                    </div>
                `;
            });
            
            activityListElement.innerHTML = html;
            
        } else {
            activityListElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>Nenhuma atividade recente</p>
                    <small>Realize a primeira venda</small>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro ao carregar atividade:', error);
        activityListElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar atividade</p>
            </div>
        `;
    }
}

// ============================================
// 7. CONSULTA RÁPIDA
// ============================================
function abrirConsultaRapida() {
    if (quickSearchModal) {
        quickSearchModal.style.display = 'flex';
        searchProductInput.value = '';
        searchProductInput.focus();
        
        searchResultsElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>Digite para buscar produtos</p>
                <small>Busque por código ou nome</small>
            </div>
        `;
    }
}

async function buscarProdutosConsulta(termo) {
    try {
        // Buscar produtos para venda (com estoque disponível)
        const resultado = await mjServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            const produtos = resultado.data;
            
            // Filtrar produtos
            const produtosFiltrados = produtos.filter(produto => 
                produto.codigo?.toLowerCase().includes(termo.toLowerCase()) ||
                produto.nome.toLowerCase().includes(termo.toLowerCase()) ||
                produto.categoria?.toLowerCase().includes(termo.toLowerCase())
            );
            
            if (produtosFiltrados.length === 0) {
                searchResultsElement.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Nenhum produto encontrado</p>
                        <small>Tente outro termo de busca</small>
                    </div>
                `;
                return;
            }
            
            // Mostrar resultados
            let html = '';
            produtosFiltrados.slice(0, 10).forEach(produto => {
                const estoqueBaixo = produto.quantidade <= produto.estoque_minimo;
                
                html += `
                    <div class="produto-resultado ${estoqueBaixo ? 'estoque-baixo' : ''}">
                        <div class="produto-info">
                            <h4>${produto.nome}</h4>
                            <p><strong>Código:</strong> ${produto.codigo || 'N/A'}</p>
                            <p><strong>Estoque:</strong> ${produto.quantidade} ${produto.unidade || 'UN'}</p>
                            ${produto.categoria ? `<p><strong>Categoria:</strong> ${produto.categoria}</p>` : ''}
                        </div>
                        <div class="produto-preco">
                            <strong>R$ ${formatarMoeda(produto.preco)}</strong>
                            ${estoqueBaixo ? '<span class="alerta">⚠️ Baixo</span>' : ''}
                        </div>
                    </div>
                `;
            });
            
            searchResultsElement.innerHTML = html;
            
            // Adicionar estilos CSS dinâmicos
            const style = document.createElement('style');
            style.textContent = `
                .produto-resultado {
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                
                .produto-resultado:last-child {
                    border-bottom: none;
                }
                
                .produto-resultado:hover {
                    background: #f9f9f9;
                }
                
                .produto-info h4 {
                    margin-bottom: 5px;
                    color: var(--primary-color);
                }
                
                .produto-info p {
                    margin: 2px 0;
                    font-size: 0.9rem;
                    color: var(--gray-color);
                }
                
                .produto-preco {
                    text-align: right;
                }
                
                .produto-preco strong {
                    font-size: 1.2rem;
                    color: var(--success-color);
                }
                
                .produto-preco .alerta {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--warning-color);
                    margin-top: 5px;
                }
                
                .estoque-baixo {
                    border-left: 3px solid var(--warning-color);
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--gray-color);
                }
                
                .empty-state i {
                    font-size: 3rem;
                    margin-bottom: 15px;
                    opacity: 0.3;
                }
            `;
            
            if (!document.querySelector('#dynamic-search-styles')) {
                style.id = 'dynamic-search-styles';
                document.head.appendChild(style);
            }
            
        } else {
            throw new Error('Erro na busca');
        }
        
    } catch (error) {
        console.error('Erro na consulta:', error);
        searchResultsElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro na consulta</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// ============================================
// 8. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarDataHora() {
    const agora = new Date();
    
    // Formatar data
    const optionsDate = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const dataFormatada = agora.toLocaleDateString('pt-BR', optionsDate);
    const horaFormatada = agora.toLocaleTimeString('pt-BR', optionsTime);
    
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = `${dataFormatada} - ${horaFormatada}`;
    }
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showLoading(mensagem = 'Carregando...') {
    if (loadingOverlay) {
        const loadingMessage = loadingOverlay.querySelector('h3');
        if (loadingMessage) loadingMessage.textContent = mensagem;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showMessage(text, type = 'info', tempo = 5000) {
    if (!messageAlert) return;
    
    const messageText = messageAlert.querySelector('.message-text');
    const messageIcon = messageAlert.querySelector('.message-icon');
    
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
    
    // Fechar ao clicar no botão
    const messageClose = messageAlert.querySelector('.message-close');
    if (messageClose) {
        messageClose.addEventListener('click', function() {
            messageAlert.style.display = 'none';
        });
    }
}

// Testar conexão Firebase
function testarConexaoFirebase() {
    const statusElement = connectionStatusElement?.querySelector('i');
    if (statusElement) {
        statusElement.className = 'fas fa-circle online';
        connectionStatusElement.innerHTML = '<i class="fas fa-circle online"></i> Conectado ao Firebase';
    }
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
`;
document.head.appendChild(style);
