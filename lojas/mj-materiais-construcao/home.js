// home.js - COM LOGIN VIA FIRESTORE (sem Firebase Auth)
import { db, mjServices } from './firebase_config.js';
import { collection, getDocs, query, where } from './firebase_config.js';

// Variáveis globais
let userSession = null;
let homeInitialized = false;

// ===== INICIALIZAÇÃO PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🏠 Home MJ Materiais - Inicializando...");
    
    try {
        // 1. Verificar sessão do localStorage/sessionStorage
        const savedSession = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
        
        if (!savedSession) {
            console.log("⚠️ Nenhuma sessão encontrada");
            redirecionarParaLogin();
            return;
        }
        
        userSession = JSON.parse(savedSession);
        console.log("✅ Sessão recuperada:", userSession);
        
        // 2. Verificar se a sessão ainda é válida (opcional)
        const sessaoValida = await verificarSessao(userSession);
        
        if (!sessaoValida) {
            console.log("⚠️ Sessão expirada ou inválida");
            sessionStorage.removeItem('userSession');
            localStorage.removeItem('userSession');
            redirecionarParaLogin();
            return;
        }
        
        // 3. Inicializar home
        inicializarHome();
        
        // 4. Configurar navegação segura
        setupSecureNavigation();
        
        // 5. Configurar eventos da UI
        setupUIEvents();
        
    } catch (error) {
        console.error("❌ Erro ao inicializar home:", error);
        mostrarMensagem("Erro ao carregar sistema", "error");
        
        // Em caso de erro, tentar recarregar ou ir para login
        setTimeout(() => {
            redirecionarParaLogin();
        }, 2000);
    }
});

// ===== VERIFICAR SESSÃO =====
async function verificarSessao(session) {
    try {
        console.log("🔍 Verificando sessão...");
        
        // Verificar dados básicos da sessão
        if (!session.id || !session.login || !session.perfil) {
            console.log("Sessão incompleta");
            return false;
        }
        
        // Verificar se usuário ainda existe no banco (opcional)
        // Se quiser fazer esta verificação, descomente:
        /*
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, 
            where('id', '==', session.id),
            where('login', '==', session.login),
            where('ativo', '==', true)
        );
        
        const snapshot = await getDocs(q);
        return !snapshot.empty;
        */
        
        // Por enquanto, aceitar sessão se tiver dados básicos
        return true;
        
    } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        return false;
    }
}

// ===== INICIALIZAR HOME =====
async function inicializarHome() {
    try {
        console.log("🚀 Inicializando interface da Home...");
        
        // 1. Atualizar informações do usuário na UI
        atualizarUsuarioUI();
        
        // 2. Carregar estatísticas
        await carregarEstatisticas();
        
        // 3. Carregar atividades recentes
        await carregarAtividadesRecentes();
        
        // 4. Atualizar data e hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000); // Atualizar a cada minuto
        
        // 5. Configurar status de conexão
        setupConnectionStatus();
        
        console.log("✅ Home MJ Materiais carregada com sucesso!");
        
        // 6. Esconder loading
        setTimeout(() => {
            ocultarLoading();
        }, 500);
        
    } catch (error) {
        console.error("Erro ao inicializar home:", error);
        mostrarMensagem("Erro ao carregar dados", "error");
    }
}

// ===== NAVEGAÇÃO SEGURA =====
function setupSecureNavigation() {
    console.log("🔒 Configurando navegação segura...");
    
    // 1. Links de Venda
    const linkVenda = document.querySelector('a[href="venda.html"]');
    if (linkVenda) {
        linkVenda.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("🛒 Navegando para Venda...");
            navegarParaPagina('venda.html');
        });
    }
    
    // 2. Links de Estoque
    const linkEstoque = document.querySelector('a[href="estoque.html"]');
    if (linkEstoque) {
        linkEstoque.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("📦 Navegando para Estoque...");
            navegarParaPagina('estoque.html');
        });
    }
    
    // 3. Botão de Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', fazerLogout);
    }
}

// Função principal de navegação
async function navegarParaPagina(pagina) {
    console.log(`📍 Tentando acessar: ${pagina}`);
    
    mostrarLoading();
    
    try {
        // Verificar se há sessão ativa
        if (!userSession) {
            console.warn("🚫 Nenhuma sessão ativa!");
            
            // Salvar página destino
            sessionStorage.setItem('paginaDestino', pagina);
            
            mostrarMensagem("Sessão expirada! Faça login novamente.", "warning");
            
            setTimeout(() => {
                redirecionarParaLogin();
            }, 1500);
            return;
        }
        
        // Verificar permissões específicas
        if (pagina === 'estoque.html') {
            if (!['admin_global', 'admin'].includes(userSession.perfil)) {
                mostrarMensagem("⚠️ Acesso restrito! Apenas administradores.", "warning");
                ocultarLoading();
                return;
            }
        }
        
        // Tudo OK - navegar
        console.log(`✅ Navegando para ${pagina}`);
        
        // Salvar sessão na página destino
        sessionStorage.setItem('userSession', JSON.stringify(userSession));
        
        // Pequeno delay para experiência do usuário
        setTimeout(() => {
            window.location.href = pagina;
        }, 300);
        
    } catch (error) {
        console.error("❌ Erro na navegação:", error);
        mostrarMensagem("Erro: " + error.message, "error");
        ocultarLoading();
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
    
    // Mostrar badge de admin se for o caso
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
        
        // Usar o mjServices do firebase_config.js
        if (mjServices && mjServices.buscarEstatisticas) {
            const resultado = await mjServices.buscarEstatisticas();
            
            if (resultado.success) {
                const stats = resultado.data;
                
                // Atualizar UI
                document.getElementById('totalProdutos').textContent = 
                    stats.totalProdutos?.toLocaleString('pt-BR') || '0';
                
                document.getElementById('vendasHoje').textContent = 
                    stats.vendasHoje?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
                
                document.getElementById('quantidadeVendas').textContent = 
                    `${stats.quantidadeVendasHoje || 0} vendas`;
                
                document.getElementById('valorEstoque').textContent = 
                    stats.totalValorEstoque?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
                
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
    }
}

async function carregarAtividadesRecentes() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Atividades de exemplo ou buscar do banco
        const atividades = [
            { tipo: 'venda', texto: 'Nova venda realizada - R$ 450,00', hora: '10:30' },
            { tipo: 'estoque', texto: 'Produto "Cimento" atualizado no estoque', hora: '09:15' },
            { tipo: 'login', texto: 'Usuário logado no sistema', hora: '08:00' },
            { tipo: 'sistema', texto: 'Backup automático realizado', hora: '07:00' }
        ];
        
        activityList.innerHTML = atividades.map(atividade => `
            <div class="activity-item">
                <div class="activity-icon ${atividade.tipo}">
                    <i class="fas fa-${getActivityIcon(atividade.tipo)}"></i>
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

function getActivityIcon(tipo) {
    const icons = {
        'venda': 'cash-register',
        'estoque': 'boxes',
        'login': 'user-check',
        'sistema': 'cogs'
    };
    return icons[tipo] || 'info-circle';
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

function setupConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    statusElement.innerHTML = '<i class="fas fa-circle online"></i> Conectado ao sistema';
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
        sessionStorage.removeItem('paginaDestino');
        sessionStorage.removeItem('paginaRetorno');
        
        mostrarMensagem("Logout realizado com sucesso!", "success");
        
        // Redirecionar para login
        setTimeout(() => {
            window.location.href = 'index.html';
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
    sessionStorage.removeItem('userSession');
    localStorage.removeItem('userSession');
    window.location.href = 'index.html';
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
    
    // Configurar alerta
    const icon = alert.querySelector('.message-icon');
    const text = alert.querySelector('.message-text');
    const closeBtn = alert.querySelector('.message-close');
    
    // Reset e configurar classes
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

// Inicializar loading
mostrarLoading();

// Verificar se está na página correta
if (!window.location.href.includes('home.html')) {
    console.log("Página incorreta, redirecionando...");
    redirecionarParaLogin();
}
