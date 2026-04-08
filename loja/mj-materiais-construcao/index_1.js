// index_1.js - Constantes, Utilitários e Configuração Inicial
console.log("📁 Módulo 1 Carregado: Constantes e Utilitários");

// ============================================
// CONSTANTES GLOBAIS
// ============================================
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=";

const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E🏪%3C/text%3E%3C/svg%3E";

let produtos = [];
let categorias = [];
let carrinho = [];
let usuarioLogado = false;
let dadosUsuario = null;
let swiperInstance = null;
let lojaIdAtual = null;

// Variáveis para Agendamento
let agendamentoHabilitado = false;
let programasAprimoramentoHabilitado = false;
let agendamentosAtivos = [];
let agendamentosFuturos = [];
let unsubscribeAgendamentos = null;
let dadosAgendamentoHoje = null;
let servicosConfig = {};
let modoAutomatico = true;
let carrosselAutomaticoInterval = null;
let carrosselAutomaticoAtivo = true;
let agendamentosCarregados = false;

// Variáveis para Paginação
let paginaAtualOutrosFila = 1;
let totalPaginasOutrosFila = 1;
let mudancaManual = false;
let intervaloAtualizacaoAgendamento = null;

// ============================================
// GARANTIR SCROLL SUAVE
// ============================================
const style = document.createElement('style');
style.textContent = `html { scroll-behavior: smooth !important; }`;
document.head.appendChild(style);

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID DA URL
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (window.lojaServices && window.lojaServices.lojaId) {
        lojaIdAtual = window.lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loading) {
        if (loadingMessage) loadingMessage.textContent = mensagem;
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
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    const textEl = alert.querySelector('.message-text');
    if (textEl) textEl.textContent = texto;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

function rolarAteModal(modalId) {
    setTimeout(() => {
        const modal = document.getElementById(modalId);
        if (modal && modal.classList.contains('active')) {
            modal.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            console.log(`📜 Rolando até o modal: ${modalId}`);
        }
    }, 300);
}

function configurarFavicon() {
    const lojaId = extrairLojaIdDaURL();
    if (lojaId) {
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = `../../imagens/${lojaId}/icone.ico`;
            console.log(`✅ Favicon configurado para loja: ${lojaId}`);
        }
    }
}

function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) {
        logoImg.src = getPlaceholderIcon();
        return;
    }
    
    const logoPath = `../../imagens/${lojaId}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
    };
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada, usando placeholder`);
        logoImg.src = getPlaceholderIcon();
    };
    testImg.src = logoPath;
}

function getPlaceholderIcon() {
    return LOGO_PLACEHOLDER;
}

// ============================================
// VERIFICAR LOJA ID INICIAL
// ============================================
if (!lojaIdAtual) {
    lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
    console.log(`📍 Loja ID no clientes.js: ${lojaIdAtual}`);
}

// Aguardar getLojaConfig
if (typeof window.getLojaConfig !== 'function') {
    console.log('⏳ Aguardando getLojaConfig...');
    const checkInterval = setInterval(() => {
        if (typeof window.getLojaConfig === 'function') {
            console.log('✅ getLojaConfig disponível');
            clearInterval(checkInterval);
        }
    }, 100);
}

// Exportar para window
window.IMAGEM_PADRAO_BASE64 = IMAGEM_PADRAO_BASE64;
window.LOGO_PLACEHOLDER = LOGO_PLACEHOLDER;
window.produtos = produtos;
window.categorias = categorias;
window.carrinho = carrinho;
window.usuarioLogado = usuarioLogado;
window.dadosUsuario = dadosUsuario;
window.swiperInstance = swiperInstance;
window.lojaIdAtual = lojaIdAtual;
window.agendamentoHabilitado = agendamentoHabilitado;
window.programasAprimoramentoHabilitado = programasAprimoramentoHabilitado;
window.agendamentosAtivos = agendamentosAtivos;
window.agendamentosFuturos = agendamentosFuturos;
window.unsubscribeAgendamentos = unsubscribeAgendamentos;
window.dadosAgendamentoHoje = dadosAgendamentoHoje;
window.servicosConfig = servicosConfig;
window.modoAutomatico = modoAutomatico;
window.carrosselAutomaticoInterval = carrosselAutomaticoInterval;
window.carrosselAutomaticoAtivo = carrosselAutomaticoAtivo;
window.agendamentosCarregados = agendamentosCarregados;
window.paginaAtualOutrosFila = paginaAtualOutrosFila;
window.totalPaginasOutrosFila = totalPaginasOutrosFila;
window.mudancaManual = mudancaManual;
window.intervaloAtualizacaoAgendamento = intervaloAtualizacaoAgendamento;

window.extrairLojaIdDaURL = extrairLojaIdDaURL;
window.mostrarLoading = mostrarLoading;
window.esconderLoading = esconderLoading;
window.mostrarMensagem = mostrarMensagem;
window.rolarAteModal = rolarAteModal;
window.configurarFavicon = configurarFavicon;
window.carregarLogoLoja = carregarLogoLoja;
window.getPlaceholderIcon = getPlaceholderIcon;

console.log("✅ Módulo 1 carregado com sucesso!");
