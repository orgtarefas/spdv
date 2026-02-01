// home.js - AJUSTADO PARA ESTRUTURA DE PASTAS
import { db, mjServices } from './firebase_config.js';

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
        configurarNavegacao();
        
        // 4. Configurar eventos da UI
        configurarEventosUI();
        
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
        
        // 4. Carregar atividades recentes
        await carregarAtividadesRecentes();
        
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

// ===== CONFIGURAR NAVEGAÇÃO =====
function configurarNavegacao() {
    console.log("🔒 Configurando navegação...");
    
    // 1. Links de Venda
    const linkVenda = document.querySelector('a[href="venda.html"]');
    if (linkVenda) {
        linkVenda.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🛒 Indo para Venda...");
            
            // Salvar sessão antes de navegar
            sessionStorage.setItem('userSession', JSON.stringify(userSession));
            window.location.href = 'venda.html';
        });
    }
    
    // 2. Links de Estoque
    const linkEstoque = document.querySelector('a[href="estoque.html"]');
    if (linkEstoque) {
        linkEstoque.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("📦 Indo para Estoque...");
            
            // Verificar permissão
            if (!['admin_global', 'admin'].includes(userSession?.perfil)) {
                mostrarMensagem("⚠️ Acesso restrito! Apenas administradores.", "warning");
                return;
            }
            
            // Salvar sessão antes de navegar
            sessionStorage.setItem('userSession', JSON.stringify(userSession));
            window.location.href = 'estoque.html';
        });
    }
    
    // 3. Botão de Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', fazerLogout);
    }
}

// ===== FUNÇÕES DE UI =====
function configurarEventosUI() {
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
    
    // Fechar modal
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('quickSearchModal').style.display = 'none';
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
                document.getElementById('totalProdutos').textContent = 
                    stats.totalProdutos?.toLocaleString('pt-BR') || '0';
                
                document.getElementById('vendasHoje').textContent = 
                    stats.vendasHoje?.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    }) || 'R$ 0,00';
                
                document.getElementById('quantidadeVendas').textContent = 
                    `${stats.quantidadeVendasHoje || 0} vendas`;
                
                document.getElementById('valorEstoque').textContent = 
                    stats.totalValorEstoque?.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    }) || 'R$ 0,00';
                
                document.getElementById('produtosBaixo').textContent = 
                    `${stats.produtosBaixoEstoque || 0} com baixo estoque`;
                
                // Calcular meta
                if (stats.metaMensal > 0) {
                    const percentual = Math.round((stats.metaAlcancada / stats.metaMensal) * 100);
                    document.getElementById('metaPercentual').textContent = `${percentual}%`;
                    document.getElementById('metaRestante').textContent = 
                        (stats.metaMensal - stats.metaAlcancada).toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                        });
                }
            }
        }
        
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
        // Valores padrão
        document.getElementById('vendasHoje').textContent = 'R$ 0,00';
        document.getElementById('quantidadeVendas').textContent = '0 vendas';
        document.getElementById('totalProdutos').textContent = '0';
        document.getElementById('valorEstoque').textContent = 'R$ 0,00';
        document.getElementById('produtosBaixo').textContent = '0 com baixo estoque';
        document.getElementById('metaPercentual').textContent = '0%';
        document.getElementById('metaRestante').textContent = 'R$ 50.000,00';
    }
}

async function carregarAtividadesRecentes() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Atividades de exemplo
        const atividades = [
            { tipo: 'venda', texto: 'Sistema inicializado com sucesso', hora: getHoraAtual() },
            { tipo: 'login', texto: `Usuário ${userSession?.nome || userSession?.login} logado`, hora: getHoraAtual() },
            { tipo: 'sistema', texto: 'Conectado ao banco de dados', hora: getHoraAtual() }
        ];
        
        activityList.innerHTML = atividades.map(atividade => `
            <div class="activity-item">
                <div class="activity-icon ${atividade.tipo}">
                    <i class="fas fa-${getIconeAtividade(atividade.tipo)}"></i>
                </div>
                <div class="activity-details">
                    <p>${atividade.texto}</p>
                    <span class="activity-time">${atividade.hora}</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error("Erro ao carregar atividades:", error);
    }
}

function getIconeAtividade(tipo) {
    const icones = {
        'venda': 'cash-register',
        'estoque': 'boxes',
        'login': 'user-check',
        'sistema': 'cogs'
    };
    return icones[tipo] || 'info-circle';
}

function getHoraAtual() {
    const agora = new Date();
    return agora.getHours().toString().padStart(2, '0') + ':' + 
           agora.getMinutes().toString().padStart(2, '0');
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
        
        // Confirmar logout
        if (!confirm("Deseja realmente sair do sistema?")) {
            ocultarLoading();
            return;
        }
        
        console.log("👋 Fazendo logout...");
        
        // Limpar dados locais
        sessionStorage.removeItem('userSession');
        localStorage.removeItem('userSession');
        
        mostrarMensagem("Logout realizado com sucesso!", "success");
        
        // VOLTAR 2 NÍVEIS para login.html na RAIZ
        // lojas/mj-materiais-construcao → .. → .. → raiz/login.html
        setTimeout(() => {
            window.location.href = '../../login.html';
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
    
    // Limpar sessão
    sessionStorage.removeItem('userSession');
    localStorage.removeItem('userSession');
    
    // VOLTAR 2 NÍVEIS para login.html na RAIZ
    // lojas/mj-materiais-construcao → .. → .. → raiz/login.html
    window.location.href = '../../login.html';
}

function mostrarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function ocultarLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info') {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
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
        closeBtn.onclick = () => {
            alert.style.display = 'none';
        };
    }
    
    // Auto-ocultar (exceto para erros)
    if (tipo !== 'error') {
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

// ===== CONEXÃO =====
function verificarConexao() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    // Simples verificação
    statusElement.innerHTML = '<i class="fas fa-circle online"></i> Sistema online';
}

// ===== INICIALIZAÇÃO =====
// Mostrar loading inicial
mostrarLoading();

// Verificar conexão
verificarConexao();
