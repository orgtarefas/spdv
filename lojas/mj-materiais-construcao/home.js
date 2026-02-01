// home.js - MJ Materiais de Construção (SEM LOCALSTORAGE)
import { mjServices } from './firebase_config.js';

// Elementos DOM
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const currentDateTimeElement = document.getElementById('currentDateTime');
const loadingOverlay = document.getElementById('loadingOverlay');
const messageAlert = document.getElementById('messageAlert');

// Variáveis de sessão
let sessaoUsuario = null;

// ============================================
// 1. VERIFICAR SESSÃO
// ============================================
function verificarSessao() {
    // Verificar se há sessão temporária passada pelo login
    const sessaoTemp = sessionStorage.getItem('pdv_sessao_temporaria');
    
    if (!sessaoTemp) {
        // Sem sessão, redirecionar para login
        window.location.href = '../../login.html';
        return false;
    }
    
    try {
        sessaoUsuario = JSON.parse(sessaoTemp);
        console.log('✅ Sessão recuperada:', sessaoUsuario);
        
        // Verificar se a sessão é recente (menos de 1 hora)
        const dataLogin = new Date(sessaoUsuario.data_login);
        const agora = new Date();
        const diferencaHoras = (agora - dataLogin) / (1000 * 60 * 60);
        
        if (diferencaHoras > 1) {
            // Sessão expirada (mais de 1 hora)
            console.log('❌ Sessão expirada');
            sessionStorage.removeItem('pdv_sessao_temporaria');
            window.location.href = '../../login.html';
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao processar sessão:', error);
        sessionStorage.removeItem('pdv_sessao_temporaria');
        window.location.href = '../../login.html';
        return false;
    }
}

// ============================================
// 2. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Home MJ Materiais - Inicializando...');
    
    // Verificar sessão
    if (!verificarSessao()) {
        return;
    }
    
    // Carregar dados do usuário da sessão
    carregarDadosUsuario();
    
    // Configurar eventos
    configurarEventos();
    
    // Atualizar data e hora
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
    
    console.log('✅ Home MJ Materiais carregada com sucesso!');
});

// ============================================
// 3. CARREGAR DADOS DO USUÁRIO
// ============================================
function carregarDadosUsuario() {
    if (sessaoUsuario) {
        // Atualizar nome do usuário em todos os lugares
        const userNameElements = document.querySelectorAll('#userName');
        userNameElements.forEach(el => {
            if (el) el.textContent = sessaoUsuario.nome || sessaoUsuario.login;
        });
    }
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    btnLogout.addEventListener('click', function() {
        // Limpar sessão
        sessionStorage.removeItem('pdv_sessao_temporaria');
        // Redirecionar para login
        window.location.href = '../../login.html';
    });
    
    // Outros eventos conforme necessário...
}

// ============================================
// 5. FUNÇÕES UTILITÁRIAS
// ============================================
function atualizarDataHora() {
    const agora = new Date();
    const horaFormatada = agora.toLocaleTimeString('pt-BR');
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = `${dataFormatada} ${horaFormatada}`;
    }
}

function showLoading(mensagem = 'Carregando...') {
    const loadingMessage = loadingOverlay?.querySelector('h3');
    
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = mensagem;
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showMessage(text, type = 'info', tempo = 5000) {
    const messageText = messageAlert?.querySelector('.message-text');
    
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
