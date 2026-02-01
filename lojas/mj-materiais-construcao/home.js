// home.js - COM CAMINHOS CORRETOS
import { db, mjServices } from './firebase_config.js';
import { collection, getDocs, query, where } from './firebase_config.js';

// Variáveis globais
let userSession = null;

// ===== INICIALIZAÇÃO PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🏠 Home MJ Materiais - Inicializando...");
    console.log("📍 URL atual:", window.location.href);
    
    try {
        // 1. Verificar sessão
        const savedSession = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
        
        if (!savedSession) {
            console.log("⚠️ Nenhuma sessão encontrada");
            redirecionarParaLogin();
            return;
        }
        
        userSession = JSON.parse(savedSession);
        console.log("✅ Sessão recuperada:", userSession);
        
        // 2. Inicializar home
        await inicializarHome();
        
        // 3. Configurar navegação
        setupNavigation();
        
    } catch (error) {
        console.error("❌ Erro ao inicializar home:", error);
        mostrarMensagem("Erro ao carregar sistema", "error");
        
        setTimeout(() => {
            redirecionarParaLogin();
        }, 2000);
    }
});

// ===== INICIALIZAR HOME =====
async function inicializarHome() {
    try {
        console.log("🚀 Inicializando interface da Home...");
        
        // 1. Atualizar usuário
        atualizarUsuarioUI();
        
        // 2. Carregar estatísticas
        await carregarEstatisticas();
        
        // 3. Atualizar data e hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000);
        
        // 4. Configurar eventos
        setupUIEvents();
        
        console.log("✅ Home MJ Materiais carregada com sucesso!");
        
        // Esconder loading
        setTimeout(() => {
            ocultarLoading();
        }, 500);
        
    } catch (error) {
        console.error("Erro ao inicializar home:", error);
        mostrarMensagem("Erro ao carregar dados", "error");
    }
}

// ===== NAVEGAÇÃO =====
function setupNavigation() {
    console.log("🔒 Configurando navegação...");
    
    // 1. Links de Venda (NA MESMA PASTA)
    const linkVenda = document.querySelector('a[href="venda.html"]');
    if (linkVenda) {
        linkVenda.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🛒 Indo para Venda...");
            
            // Salvar sessão antes de navegar
            sessionStorage.setItem('userSession', JSON.stringify(userSession));
            window.location.href = 'venda.html'; // NA MESMA PASTA
        });
    }
    
    // 2. Links de Estoque (NA MESMA PASTA)
    const linkEstoque = document.querySelector('a[href="estoque.html"]');
    if (linkEstoque) {
        linkEstoque.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("📦 Indo para Estoque...");
            
            // Verificar permissão
            if (!['admin_global', 'admin'].includes(userSession?.perfil)) {
                mostrarMensagem("⚠️ Apenas administradores!", "warning");
                return;
            }
            
            // Salvar sessão antes de navegar
            sessionStorage.setItem('userSession', JSON.stringify(userSession));
            window.location.href = 'estoque.html'; // NA MESMA PASTA
        });
    }
    
    // 3. Botão de Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', fazerLogout);
    }
}

// ===== FUNÇÕES DE UI =====
function setupUIEvents() {
    // Botão de Consulta Rápida
    const btnConsultaRapida = document.getElementById('btnConsultaRapida');
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', () => {
            mostrarMensagem("Funcionalidade em desenvolvimento", "info");
        });
    }
    
    // Botão de Relatórios
    const btnRelatorio = document.getElementById('btnRelatorio');
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', () => {
            mostrarMensagem("Relatórios em breve", "info");
        });
    }
}

function atualizarUsuarioUI() {
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userSession) {
        userNameElement.textContent = userSession.nome || userSession.login || 'Usuário';
    }
    
    // Mostrar badge de admin
    const userInfo = document.querySelector('.user-info');
    if (userSession?.perfil === 'admin_global') {
        console.log("👑 Usuário é Admin Global");
        if (userInfo) {
            const adminBadge = document.createElement('span');
            adminBadge.className = 'admin-badge';
            adminBadge.innerHTML = '<i class="fas fa-crown"></i> Admin';
            userInfo.insertBefore(adminBadge, userInfo.querySelector('#btnLogout'));
        }
    }
}

// ===== FUNÇÕES DE DADOS =====
async function carregarEstatisticas() {
    try {
        console.log("📊 Carregando estatísticas...");
        
        if (mjServices && mjServices.buscarEstatisticas) {
            const resultado = await mjServices.buscarEstatisticas();
            
            if (resultado.success) {
                const stats = resultado.data;
                
                // Atualizar UI
                if (document.getElementById('totalProdutos')) {
                    document.getElementById('totalProdutos').textContent = 
                        stats.totalProdutos?.toLocaleString('pt-BR') || '0';
                }
                
                if (document.getElementById('vendasHoje')) {
                    document.getElementById('vendasHoje').textContent = 
                        stats.vendasHoje?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
                }
                
                // ... resto das atualizações
            }
        }
        
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

function atualizarDataHora() {
    const element = document.getElementById('currentDateTime');
    if (!element) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    element.textContent = now.toLocaleDateString('pt-BR', options);
}

// ===== LOGOUT =====
async function fazerLogout() {
    try {
        mostrarLoading();
        
        if (!confirm("Deseja realmente sair do sistema?")) {
            ocultarLoading();
            return;
        }
        
        console.log("👋 Fazendo logout...");
        
        // Limpar dados
        sessionStorage.clear();
        localStorage.clear();
        
        mostrarMensagem("Logout realizado com sucesso!", "success");
        
        // VOLTAR 2 NÍVEIS para a raiz (onde está index.html)
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1000);
        
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        mostrarMensagem("Erro ao sair do sistema", "error");
        ocultarLoading();
    }
}

// ===== FUNÇÕES AUXILIARES =====
function redirecionarParaLogin() {
    console.log("Redirecionando para login...");
    sessionStorage.clear();
    localStorage.clear();
    
    // VOLTAR 2 NÍVEIS para a raiz
    window.location.href = '../../index.html';
}

function mostrarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function ocultarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info') {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    const icon = alert.querySelector('.message-icon');
    const text = alert.querySelector('.message-text');
    
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
    
    // Auto-ocultar
    if (tipo !== 'error') {
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

// Inicializar
mostrarLoading();
