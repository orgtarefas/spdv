// home.js - COM SUPORTE A ADMIN GLOBAL
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
        
        // Se for admin global, mostrar badge especial
        if (sessaoUsuario.is_admin_global) {
            console.log('👑 Usuário é Admin Global');
            mostrarBadgeAdmin();
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
// 2. MOSTRAR BADGE DE ADMIN GLOBAL
// ============================================
function mostrarBadgeAdmin() {
    // Adicionar badge de admin global ao nome do usuário
    const userNameElements = document.querySelectorAll('#userName');
    userNameElements.forEach(el => {
        if (el) {
            const originalText = el.textContent;
            el.innerHTML = `${originalText} <span class="admin-badge">👑 Admin Global</span>`;
        }
    });
    
    // Adicionar CSS para o badge
    const style = document.createElement('style');
    style.textContent = `
        .admin-badge {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: bold;
            margin-left: 8px;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Adicionar menu especial para admin
    adicionarMenuAdmin();
}

// ============================================
// 3. ADICIONAR MENU ESPECIAL PARA ADMIN
// ============================================
function adicionarMenuAdmin() {
    // Adicionar link para voltar ao seletor de lojas
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        const adminLink = document.createElement('a');
        adminLink.href = '../../login.html';
        adminLink.innerHTML = '<i class="fas fa-exchange-alt"></i> Trocar de Loja';
        adminLink.style.color = '#FFD700';
        adminLink.style.fontWeight = 'bold';
        
        userMenu.appendChild(adminLink);
    }
}

// ============================================
// 4. INICIALIZAÇÃO DO SISTEMA
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
// 5. CARREGAR DADOS DO USUÁRIO
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
// 6. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    btnLogout.addEventListener('click', function() {
        // Limpar sessão
        sessionStorage.removeItem('pdv_sessao_temporaria');
        // Redirecionar para login
        window.location.href = '../../login.html';
    });
    
    // Se for admin global, adicionar atalho para voltar ao seletor
    if (sessaoUsuario && sessaoUsuario.is_admin_global) {
        const btnTrocarLoja = document.getElementById('btnTrocarLoja');
        if (btnTrocarLoja) {
            btnTrocarLoja.addEventListener('click', function() {
                sessionStorage.removeItem('pdv_sessao_temporaria');
                window.location.href = '../../login.html';
            });
        }
    }
    
    // Outros eventos conforme necessário...
}

// ============================================
// 7. FUNÇÕES UTILITÁRIAS
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
