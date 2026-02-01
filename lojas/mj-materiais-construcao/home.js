// home.js - MJ Materiais de Construção
import { db } from './firebase_config.js';

// Elementos DOM
const userNameElement = document.getElementById('userName');
const userProfileElement = document.getElementById('userProfile');
const lojaBadgeElement = document.getElementById('lojaBadge');
const lojaNomeCompletoElement = document.getElementById('lojaNomeCompleto');
const lojaLocalElement = document.getElementById('lojaLocal');
const pageTitleElement = document.getElementById('pageTitle');
const pageSubtitleElement = document.getElementById('pageSubtitle');
const headerUserNameElement = document.getElementById('headerUserName');
const welcomeUserNameElement = document.getElementById('welcomeUserName');
const welcomeLojaNomeElement = document.getElementById('welcomeLojaNome');
const footerLojaNomeElement = document.getElementById('footerLojaNome');
const footerUserNameElement = document.getElementById('footerUserName');
const footerUserProfileElement = document.getElementById('footerUserProfile');
const footerLojaIdElement = document.getElementById('footerLojaId');
const infoLojaNomeElement = document.getElementById('infoLojaNome');
const infoLojaLocalElement = document.getElementById('infoLojaLocal');
const infoLojaTelefoneElement = document.getElementById('infoLojaTelefone');
const infoUserNameElement = document.getElementById('infoUserName');
const infoUserProfileElement = document.getElementById('infoUserProfile');
const infoUserLoginElement = document.getElementById('infoUserLogin');
const infoLastAccessElement = document.getElementById('infoLastAccess');
const lastSyncElement = document.getElementById('lastSync');
const currentTimeElement = document.getElementById('currentTime');
const currentDateElement = document.getElementById('currentDate');
const dayOfWeekElement = document.getElementById('dayOfWeek');
const fullDateElement = document.getElementById('fullDate');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const btnLogout = document.getElementById('btnLogout');
const menuLogout = document.getElementById('menuLogout');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const messageAlert = document.getElementById('messageAlert');
const contentArea = document.getElementById('contentArea');
const btnNovaVenda = document.getElementById('btnNovaVenda');
const btnAtalhos = document.getElementById('btnAtalhos');
const quickActionsModal = document.getElementById('quickActionsModal');
const modalClose = document.querySelector('.modal-close');

// Dados do usuário e loja
let usuario = null;
let loja = null;
let lojaInfo = null;

// ============================================
// 1. VERIFICAÇÃO DE AUTENTICAÇÃO
// ============================================
function verificarAutenticacao() {
    const autenticado = localStorage.getItem('pdv_autenticado');
    const usuarioData = localStorage.getItem('pdv_usuario');
    const lojaId = localStorage.getItem('pdv_loja');
    
    if (autenticado !== 'true' || !usuarioData || !lojaId) {
        // Redirecionar para login
        window.location.href = '../../login.html';
        return false;
    }
    
    try {
        usuario = JSON.parse(usuarioData);
        loja = lojaId;
        
        // Verificar se a loja atual é a mesma do usuário
        if (usuario.loja !== loja) {
            console.error('❌ Inconsistência: loja do usuário não bate com URL');
            logout();
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao processar dados do usuário:', error);
        logout();
        return false;
    }
}

// ============================================
// 2. INICIALIZAÇÃO DO SISTEMA
// ============================================
async function inicializarSistema() {
    if (!verificarAutenticacao()) {
        return;
    }
    
    showLoading('Carregando sistema...');
    
    try {
        // 1. Carregar dados do usuário
        carregarDadosUsuario();
        
        // 2. Carregar informações da loja
        await carregarDadosLoja();
        
        // 3. Configurar eventos
        configurarEventos();
        
        // 4. Atualizar data e hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 1000);
        
        // 5. Inicializar estatísticas
        inicializarEstatisticas();
        
        // 6. Verificar conexão Firebase
        testarConexaoFirebase();
        
        hideLoading();
        
        console.log(`✅ Sistema carregado: ${usuario.loja_nome || loja}`);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao inicializar sistema:', error);
        showMessage('Erro ao carregar sistema', 'error');
    }
}

// ============================================
// 3. CARREGAR DADOS DO USUÁRIO
// ============================================
function carregarDadosUsuario() {
    if (!usuario) return;
    
    // Atualizar elementos com dados do usuário
    const nomeExibicao = usuario.nomeCompleto || usuario.login;
    
    userNameElement.textContent = nomeExibicao;
    userProfileElement.textContent = usuario.perfil;
    headerUserNameElement.textContent = nomeExibicao;
    welcomeUserNameElement.textContent = nomeExibicao;
    footerUserNameElement.textContent = nomeExibicao;
    footerUserProfileElement.textContent = usuario.perfil;
    infoUserNameElement.textContent = nomeExibicao;
    infoUserProfileElement.textContent = usuario.perfil;
    infoUserLoginElement.textContent = usuario.login;
    
    // Atualizar último acesso
    const agora = new Date();
    infoLastAccessElement.textContent = agora.toLocaleString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Atualizar badge do perfil
    const profileBadge = document.querySelector('.profile-badge');
    if (profileBadge) {
        profileBadge.textContent = usuario.perfil;
        profileBadge.className = 'profile-badge ' + usuario.perfil;
    }
}

// ============================================
// 4. CARREGAR DADOS DA LOJA
// ============================================
async function carregarDadosLoja() {
    try {
        // Buscar informações da loja na coleção "lojas"
        const lojasRef = db.collection('lojas');
        const querySnapshot = await lojasRef.where('banco_login', '==', loja).get();
        
        if (querySnapshot.empty) {
            console.warn('⚠️ Informações da loja não encontradas');
            usarDadosPadrao();
            return;
        }
        
        // Pegar primeiro documento encontrado
        querySnapshot.forEach(doc => {
            lojaInfo = doc.data();
            console.log('📊 Dados da loja:', lojaInfo);
        });
        
        if (!lojaInfo) {
            usarDadosPadrao();
            return;
        }
        
        // Atualizar elementos com dados da loja
        const nomeLoja = lojaInfo.nome || 'MJ Materiais de Construção';
        const localLoja = lojaInfo.local || 'Cajazeiras 11 - Salvador/BA';
        const telefoneLoja = lojaInfo.contato?.telefone ? 
            `(${String(lojaInfo.contato.telefone).substring(0, 2)}) ${String(lojaInfo.contato.telefone).substring(2, 7)}-${String(lojaInfo.contato.telefone).substring(7)}` : 
            '(71) 99999-9999';
        
        // Atualizar elementos
        lojaBadgeElement.textContent = nomeLoja.substring(0, 15) + (nomeLoja.length > 15 ? '...' : '');
        lojaNomeCompletoElement.textContent = nomeLoja;
        lojaLocalElement.textContent = localLoja;
        welcomeLojaNomeElement.textContent = nomeLoja;
        footerLojaNomeElement.textContent = nomeLoja;
        footerLojaIdElement.textContent = loja;
        infoLojaNomeElement.textContent = nomeLoja;
        infoLojaLocalElement.textContent = localLoja;
        infoLojaTelefoneElement.textContent = telefoneLoja;
        
        // Atualizar título da página
        document.title = `PDV - ${nomeLoja}`;
        pageTitleElement.textContent = 'Dashboard';
        pageSubtitleElement.textContent = nomeLoja;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
        usarDadosPadrao();
    }
}

function usarDadosPadrao() {
    lojaBadgeElement.textContent = 'MJ Materiais';
    lojaNomeCompletoElement.textContent = 'MJ Materiais de Construção';
    lojaLocalElement.textContent = 'Cajazeiras 11 - Salvador/BA';
    welcomeLojaNomeElement.textContent = 'MJ Materiais de Construção';
    footerLojaNomeElement.textContent = 'MJ Materiais de Construção';
    footerLojaIdElement.textContent = loja;
    infoLojaNomeElement.textContent = 'MJ Materiais de Construção';
    infoLojaLocalElement.textContent = 'Cajazeiras 11 - Salvador/BA';
    infoLojaTelefoneElement.textContent = '(71) 99999-9999';
}

// ============================================
// 5. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Toggle Sidebar (Mobile)
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Logout
    btnLogout.addEventListener('click', logout);
    menuLogout.addEventListener('click', logout);
    
    // Navegação do Menu
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.closest('li').dataset.page;
            abrirPagina(page);
        });
    });
    
    // Botão Nova Venda
    btnNovaVenda.addEventListener('click', function() {
        abrirPagina('pdv');
    });
    
    // Botão Atalhos
    btnAtalhos.addEventListener('click', function() {
        abrirModal(quickActionsModal);
    });
    
    // Fechar Modal
    modalClose.addEventListener('click', function() {
        fecharModal(quickActionsModal);
    });
    
    // Fechar modal ao clicar fora
    quickActionsModal.addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModal(this);
        }
    });
    
    // Botões de ação rápida
    document.getElementById('btnConsultaPreco')?.addEventListener('click', function() {
        showMessage('Consulta de preço em desenvolvimento', 'info');
    });
    
    document.getElementById('btnFecharCaixa')?.addEventListener('click', function() {
        showMessage('Fechamento de caixa em desenvolvimento', 'info');
    });
    
    // Atalhos de teclado
    document.addEventListener('keydown', function(e) {
        // F1 - Nova Venda
        if (e.key === 'F1') {
            e.preventDefault();
            abrirPagina('pdv');
        }
        // F2 - Consulta Preço
        else if (e.key === 'F2') {
            e.preventDefault();
            showMessage('Consulta de preço em desenvolvimento', 'info');
        }
        // F3 - Cadastrar Produto
        else if (e.key === 'F3') {
            e.preventDefault();
            abrirPagina('produtos');
        }
        // F4 - Cadastrar Cliente
        else if (e.key === 'F4') {
            e.preventDefault();
            abrirPagina('clientes');
        }
        // F5 - Relatório Diário
        else if (e.key === 'F5') {
            e.preventDefault();
            abrirPagina('relatorios');
        }
        // F6 - Fechar Caixa
        else if (e.key === 'F6') {
            e.preventDefault();
            showMessage('Fechamento de caixa em desenvolvimento', 'info');
        }
        // ESC - Fechar Modal
        else if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'flex') {
                    fecharModal(modal);
                }
            });
        }
    });
    
    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 992 && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
}

// ============================================
// 6. FUNÇÕES DE NAVEGAÇÃO
// ============================================
function abrirPagina(pagina) {
    // Fechar sidebar no mobile
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('active');
    }
    
    // Ocultar todas as páginas
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar página solicitada
    const targetPage = document.getElementById(`page${pagina.charAt(0).toUpperCase() + pagina.slice(1)}`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Atualizar título
        const pageNames = {
            dashboard: 'Dashboard',
            pdv: 'PDV Vendas',
            produtos: 'Produtos',
            clientes: 'Clientes',
            relatorios: 'Relatórios',
            configuracoes: 'Configurações'
        };
        
        pageTitleElement.textContent = pageNames[pagina] || pagina;
        pageSubtitleElement.textContent = lojaInfo?.nome || 'MJ Materiais de Construção';
        
        // Atualizar menu ativo
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pagina) {
                item.classList.add('active');
            }
        });
    }
}

function abrirModal(modal) {
    modal.style.display = 'flex';
}

function fecharModal(modal) {
    modal.style.display = 'none';
}

// ============================================
// 7. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarDataHora() {
    const agora = new Date();
    
    // Hora atual
    currentTimeElement.querySelector('span').textContent = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Data completa
    currentDateElement.textContent = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Dia da semana
    dayOfWeekElement.textContent = agora.toLocaleDateString('pt-BR', { weekday: 'long' });
    
    // Data formatada
    fullDateElement.textContent = agora.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    // Última sincronização (simulada)
    if (Math.random() > 0.7) { // Atualiza aleatoriamente
        lastSyncElement.textContent = agora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function inicializarEstatisticas() {
    // Estatísticas simuladas (serão substituídas por dados reais)
    const estatisticas = {
        vendasHoje: Math.random() * 10000,
        produtosEstoque: Math.floor(Math.random() * 500),
        clientesAtivos: Math.floor(Math.random() * 1000),
        metaMensal: Math.floor(Math.random() * 100)
    };
    
    // Atualizar elementos
    document.getElementById('vendasHoje').textContent = 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.vendasHoje);
    
    document.getElementById('produtosEstoque').textContent = estatisticas.produtosEstoque.toLocaleString('pt-BR');
    document.getElementById('clientesAtivos').textContent = estatisticas.clientesAtivos.toLocaleString('pt-BR');
    document.getElementById('metaMensal').textContent = `${estatisticas.metaMensal}%`;
    
    // Atualizar badges do menu
    document.getElementById('vendasBadge').textContent = Math.floor(estatisticas.vendasHoje / 100);
    document.getElementById('produtosBadge').textContent = estatisticas.produtosEstoque;
    document.getElementById('clientesBadge').textContent = estatisticas.clientesAtivos;
}

async function testarConexaoFirebase() {
    try {
        // Testar conexão com Firebase
        await db.collection('lojas').limit(1).get();
        
        // Atualizar status
        const statusItems = document.querySelectorAll('.status-icon');
        statusItems.forEach(item => {
            item.classList.remove('offline');
            item.classList.add('online');
        });
        
        const footerStatus = document.getElementById('footerConnectionStatus');
        if (footerStatus) {
            footerStatus.innerHTML = '<i class="fas fa-circle online"></i> Conectado ao Firebase';
        }
        
        console.log('✅ Conexão Firebase: OK');
        
    } catch (error) {
        console.warn('⚠️ Conexão Firebase: OFFLINE');
        
        const statusItems = document.querySelectorAll('.status-icon');
        statusItems.forEach(item => {
            item.classList.remove('online');
            item.classList.add('offline');
        });
        
        const footerStatus = document.getElementById('footerConnectionStatus');
        if (footerStatus) {
            footerStatus.innerHTML = '<i class="fas fa-circle offline"></i> Firebase Offline';
            footerStatus.querySelector('.offline').style.color = '#c0392b';
        }
        
        showMessage('Conexão com servidor interrompida', 'warning');
    }
}

// ============================================
// 8. FUNÇÕES DE UI
// ============================================
function showLoading(mensagem) {
    loadingMessage.textContent = mensagem;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showMessage(text, type = 'info', tempo = 5000) {
    const messageContent = messageAlert.querySelector('.message-content');
    const messageText = messageAlert.querySelector('.message-text');
    const messageIcon = messageAlert.querySelector('.message-icon');
    
    messageText.textContent = text;
    messageAlert.className = `message-alert ${type}`;
    
    // Configurar ícone
    messageIcon.className = 'message-icon';
    
    messageAlert.style.display = 'block';
    messageAlert.style.animation = 'slideInRight 0.3s ease';
    
    // Fechar mensagem anterior
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

// ============================================
// 9. LOGOUT
// ============================================
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        // Limpar dados de autenticação
        localStorage.removeItem('pdv_autenticado');
        localStorage.removeItem('pdv_usuario');
        localStorage.removeItem('pdv_loja');
        localStorage.removeItem('pdv_loja_nome');
        localStorage.removeItem('pdv_login_time');
        
        // Redirecionar para login
        window.location.href = '../../login.html';
    }
}

// ============================================
// 10. INICIAR SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar classe de carregamento ao body
    document.body.classList.add('loading');
    
    // Inicializar sistema após um breve delay
    setTimeout(() => {
        inicializarSistema();
        document.body.classList.remove('loading');
    }, 500);
    
    // Adicionar atividade inicial
    adicionarAtividade('Bem-vindo ao sistema PDV!', 'info');
});

// ============================================
// 11. FUNÇÕES ADICIONAIS
// ============================================
function adicionarAtividade(texto, tipo = 'info') {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    const atividade = document.createElement('div');
    atividade.className = 'activity-item';
    
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const icone = {
        info: 'info-circle',
        success: 'check-circle',
        warning: 'exclamation-circle',
        error: 'times-circle'
    }[tipo] || 'info-circle';
    
    atividade.innerHTML = `
        <i class="fas fa-${icone} activity-icon ${tipo}"></i>
        <div class="activity-content">
            <p>${texto}</p>
            <small>${horaFormatada}</small>
        </div>
    `;
    
    // Adicionar no início da lista
    activityList.insertBefore(atividade, activityList.firstChild);
    
    // Limitar a 10 atividades
    const atividades = activityList.querySelectorAll('.activity-item');
    if (atividades.length > 10) {
        activityList.removeChild(atividades[atividades.length - 1]);
    }
}

// Exportar funções para debug (opcional)
if (typeof window !== 'undefined') {
    window.appDebug = {
        usuario: () => usuario,
        loja: () => loja,
        lojaInfo: () => lojaInfo,
        recarregar: () => inicializarSistema(),
        testarConexao: testarConexaoFirebase,
        adicionarAtividade: (texto, tipo) => adicionarAtividade(texto, tipo)
    };
}

console.log('✅ Sistema PDV carregado e pronto!');