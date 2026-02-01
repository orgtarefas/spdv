// home.js - COMPLETO com navegação segura
import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore';

// Variáveis globais
let userSession = null;
let homeInitialized = false;

// ===== INICIALIZAÇÃO PRINCIPAL =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🏠 Home MJ Materiais - Inicializando...");
    
    try {
        // 1. Verificar sessão do localStorage/sessionStorage
        const savedSession = sessionStorage.getItem('userSession') || localStorage.getItem('userSession');
        if (savedSession) {
            userSession = JSON.parse(savedSession);
            console.log("✅ Sessão recuperada:", userSession);
        }
        
        // 2. Configurar verificação de autenticação
        setupAuthListener();
        
        // 3. Configurar navegação segura
        setupSecureNavigation();
        
        // 4. Configurar eventos da UI
        setupUIEvents();
        
    } catch (error) {
        console.error("❌ Erro ao inicializar home:", error);
        mostrarMensagem("Erro ao carregar sistema", "error");
    }
});

// ===== LISTENER DE AUTENTICAÇÃO =====
function setupAuthListener() {
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user?.email);
        
        if (!user) {
            console.log("⚠️ Usuário não autenticado");
            
            // Verificar se já estamos na página de login
            if (!window.location.href.includes('index.html')) {
                console.log("Redirecionando para login...");
                
                // Salvar página atual para possível retorno
                sessionStorage.setItem('paginaRetorno', 'home.html');
                
                // Redirecionar após breve delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
            return;
        }
        
        // Usuário autenticado
        if (!homeInitialized) {
            homeInitialized = true;
            inicializarHome(user);
        }
    });
}

// ===== INICIALIZAR HOME =====
async function inicializarHome(user) {
    try {
        console.log("🚀 Inicializando interface da Home...");
        
        // Atualizar informações do usuário
        atualizarUsuarioUI(user);
        
        // Carregar estatísticas
        await carregarEstatisticas();
        
        // Carregar atividades recentes
        await carregarAtividadesRecentes();
        
        // Atualizar data e hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000); // Atualizar a cada minuto
        
        // Configurar status de conexão
        setupConnectionStatus();
        
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
    
    // 3. Links de Relatórios (se existir)
    const linkRelatorios = document.querySelector('a[href="relatorios.html"]');
    if (linkRelatorios) {
        linkRelatorios.addEventListener('click', function(e) {
            e.preventDefault();
            navegarParaPagina('relatorios.html');
        });
    }
    
    // 4. Botão de Logout
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
        // Pequeno delay para garantir que o auth está pronto
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const user = auth.currentUser;
        console.log("👤 Usuário atual:", user?.email);
        
        if (!user) {
            console.warn("🚫 Usuário não autenticado!");
            
            // Salvar página destino
            sessionStorage.setItem('paginaDestino', pagina);
            
            mostrarMensagem("Sessão expirada! Faça login novamente.", "warning");
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            return;
        }
        
        // Verificar permissões específicas
        if (pagina === 'estoque.html' || pagina === 'relatorios.html') {
            const session = JSON.parse(sessionStorage.getItem('userSession') || '{}');
            if (!['admin_global', 'admin', 'gerente'].includes(session.perfil)) {
                mostrarMensagem("⚠️ Acesso restrito! Permissão necessária.", "warning");
                ocultarLoading();
                return;
            }
        }
        
        // Tudo OK - navegar
        console.log(`✅ Navegando para ${pagina}`);
        
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
    
    // Modal de busca (se existir)
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('quickSearchModal').style.display = 'none';
        });
    }
}

function atualizarUsuarioUI(user) {
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = userSession?.nome || user.email || 'Usuário';
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
        
        const banco = userSession?.banco_login || 'mj-materiais-construcao';
        
        // 1. Produtos em estoque
        try {
            const produtosRef = collection(db, `estoque_${banco}`);
            const snapshot = await getCountFromServer(produtosRef);
            document.getElementById('totalProdutos').textContent = snapshot.data().count || 0;
        } catch (e) {
            console.log("Erro ao contar produtos:", e);
        }
        
        // 2. Vendas de hoje (exemplo simplificado)
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('vendasHoje').textContent = 'R$ 0,00';
        document.getElementById('quantidadeVendas').textContent = '0 vendas';
        
        // 3. Meta do mês (exemplo)
        document.getElementById('metaPercentual').textContent = '0%';
        document.getElementById('metaRestante').textContent = 'R$ 50.000,00';
        
        // 4. Valor em estoque (exemplo)
        document.getElementById('valorEstoque').textContent = 'R$ 0,00';
        
    } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
    }
}

async function carregarAtividadesRecentes() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        // Atividades de exemplo
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
    
    // Simulação - na prática, você verificaria conexão com Firebase
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
        
        // Fazer logout do Firebase
        await auth.signOut();
        
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
