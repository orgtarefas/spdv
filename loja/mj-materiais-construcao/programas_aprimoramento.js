// ============================================
// programas_aprimoramento.js
// Programas de Aprimoramento - Versão Simplificada
// ============================================

console.log("📁 Módulo Aprimoramento Carregado");

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let lojaId = null;
let usuarioAtual = null;
let loginDb = null;
let db = null;

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Programas de Aprimoramento...');
    
    mostrarLoading('Carregando...');
    
    try {
        // 1. Aguardar um pouco para garantir que tudo foi carregado
        await delay(500);
        
        // 2. Capturar dados do usuário (já existentes do login)
        carregarDadosUsuario();
        
        // 3. Verificar se está logado
        if (!usuarioAtual || !usuarioAtual.email) {
            console.error('❌ Usuário não identificado');
            mostrarMensagem('Faça login para acessar os programas de aprimoramento', 'warning');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            esconderLoading();
            return;
        }
        
        // 4. Atualizar interface
        atualizarInterface();
        
        // 5. Verificar se programa está habilitado (com retry)
        await verificarHabilitacaoComRetry();
        
        // 6. Configurar eventos
        configurarEventListeners();
        
        // 7. Inicializar dados no Firebase
        await inicializarDadosFirebase();
        
        esconderLoading();
        
        console.log('✅ Programas de Aprimoramento inicializado!');
        console.log(`📍 Loja: ${lojaId}`);
        console.log(`👤 Usuário: ${usuarioAtual.email} (${usuarioAtual.perfil})`);
        console.log(`📁 loginDb: ${loginDb ? 'Disponível' : 'Indisponível'}`);
        console.log(`📁 db (loja): ${db ? 'Disponível' : 'Indisponível'}`);
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        esconderLoading();
        mostrarMensagem('Erro ao carregar programas de aprimoramento', 'error');
    }
});

// ============================================
// DELAY AUXILIAR
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// CARREGAR DADOS DO USUÁRIO (já existentes)
// ============================================
function carregarDadosUsuario() {
    console.log('🔍 Capturando dados do usuário existentes...');
    
    // Tentar obter loginDb de várias fontes
    if (window.loginDb) {
        loginDb = window.loginDb;
        console.log('✅ loginDb via window.loginDb');
    }
    
    // Tentar obter db do Firebase da loja
    if (window.db) {
        db = window.db;
        console.log('✅ db via window.db');
    }
    
    if (!db && window.lojaServices?.db) {
        db = window.lojaServices.db;
        console.log('✅ db via lojaServices.db');
    }
    
    // Tentar obter de window.dadosUsuario (definido pelo login_firebase.js)
    if (window.dadosUsuario && window.dadosUsuario.email) {
        usuarioAtual = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente',
            tipo: window.dadosUsuario.tipo || 'cliente'
        };
        console.log('✅ Usuário via window.dadosUsuario:', usuarioAtual.email);
    }
    
    // Tentar obter de sessionStorage
    if (!usuarioAtual?.email) {
        const info = sessionStorage.getItem('usuarioInfo');
        if (info) {
            try {
                const dados = JSON.parse(info);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email.split('@')[0],
                    perfil: dados.perfil || 'cliente',
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário via sessionStorage:', usuarioAtual.email);
            } catch(e) {
                console.warn('Erro ao parsear sessionStorage:', e);
            }
        }
    }
    
    // Tentar obter de pdv_sessao_temporaria
    if (!usuarioAtual?.email) {
        const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
        if (sessao) {
            try {
                const dados = JSON.parse(sessao);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email.split('@')[0],
                    perfil: dados.perfil || dados.nivel || 'cliente',
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário via pdv_sessao_temporaria:', usuarioAtual.email);
            } catch(e) {
                console.warn('Erro ao parsear pdv_sessao_temporaria:', e);
            }
        }
    }
    
    // Obter lojaId
    if (window.lojaIdAtual) {
        lojaId = window.lojaIdAtual;
    } else if (window.lojaServices?.lojaId) {
        lojaId = window.lojaServices.lojaId;
    } else {
        const pathParts = window.location.pathname.split('/');
        const lojaIndex = pathParts.indexOf('loja');
        if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
            lojaId = pathParts[lojaIndex + 1];
        }
    }
    
    console.log('📍 Loja:', lojaId);
}

// ============================================
// VERIFICAR HABILITAÇÃO COM RETRY
// ============================================
async function verificarHabilitacaoComRetry(tentativas = 0) {
    const maxTentativas = 5;
    
    if (!loginDb && tentativas < maxTentativas) {
        console.log(`⏳ Aguardando loginDb... tentativa ${tentativas + 1}/${maxTentativas}`);
        await delay(500);
        
        // Tentar obter novamente
        if (window.loginDb) {
            loginDb = window.loginDb;
            console.log('✅ loginDb obtido na tentativa', tentativas + 1);
        }
        
        return verificarHabilitacaoComRetry(tentativas + 1);
    }
    
    if (!loginDb) {
        console.warn('⚠️ loginDb não disponível após', maxTentativas, 'tentativas');
        console.log('💡 Os programas de aprimoramento podem não funcionar corretamente');
        return;
    }
    
    await verificarHabilitacao();
}

// ============================================
// VERIFICAR HABILITAÇÃO
// ============================================
async function verificarHabilitacao() {
    if (!lojaId) {
        console.warn('⚠️ Loja não identificada');
        return;
    }
    
    try {
        console.log(`🔍 Verificando habilitação para loja: ${lojaId}`);
        
        const lojaDoc = await loginDb.collection('lojas').doc(lojaId).get();
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            const habilitado = dados.habilitar_programas_aprimoramento === true;
            
            console.log(`📚 Programas de Aprimoramento habilitado: ${habilitado ? 'SIM' : 'NÃO'}`);
            
            if (!habilitado) {
                mostrarMensagem('Programa de Aprimoramento não está habilitado para esta loja.', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            console.warn('⚠️ Documento da loja não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar habilitação:', error);
    }
}

// ============================================
// ATUALIZAR INTERFACE
// ============================================
function atualizarInterface() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && usuarioAtual) {
        const nomeExibicao = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
        userNameDisplay.textContent = nomeExibicao;
        userNameDisplay.title = `${nomeExibicao} (${usuarioAtual.perfil})`;
    }
}

// ============================================
// INICIALIZAR DADOS NO FIREBASE DA LOJA
// ============================================
async function inicializarDadosFirebase() {
    if (!db || !lojaId || !usuarioAtual?.email) {
        console.warn('⚠️ Dados insuficientes para inicializar no Firebase');
        console.log('   db:', !!db, 'lojaId:', lojaId, 'email:', usuarioAtual?.email);
        return;
    }
    
    console.log('💾 Inicializando dados do usuário no Firebase...');
    
    try {
        const colecaoAprimoramento = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        console.log(`📁 Coleção: ${colecaoAprimoramento}`);
        
        // Verificar se as funções do Firebase estão disponíveis
        if (typeof window.doc === 'undefined') {
            console.warn('⚠️ Funções do Firebase não disponíveis globalmente');
            console.log('💡 Tentando usar window.db diretamente');
            
            // Tentar usar o db diretamente com os métodos do Firestore
            const usuarioRef = db.collection(colecaoAprimoramento).doc(usuarioAtual.email);
            const usuarioDoc = await usuarioRef.get();
            
            if (!usuarioDoc.exists) {
                const dadosUsuario = {
                    email: usuarioAtual.email,
                    nome: usuarioAtual.nome,
                    perfil: usuarioAtual.perfil,
                    loja_id: lojaId,
                    data_inicio: new Date().toISOString(),
                    pontos_totais: 0,
                    treinamentos_concluidos: [],
                    videos_assistidos: [],
                    testes_realizados: [],
                    conquistas: [],
                    ultimo_acesso: new Date().toISOString()
                };
                
                await usuarioRef.set(dadosUsuario);
                console.log('✅ Documento CRIADO para o usuário');
            } else {
                console.log('✅ Documento já existe para o usuário');
                await usuarioRef.update({
                    ultimo_acesso: new Date().toISOString()
                });
            }
            return;
        }
        
        // Usar as funções importadas
        const usuarioRef = window.doc(db, colecaoAprimoramento, usuarioAtual.email);
        const usuarioDoc = await window.getDoc(usuarioRef);
        
        if (!usuarioDoc.exists()) {
            const dadosUsuario = {
                email: usuarioAtual.email,
                nome: usuarioAtual.nome,
                perfil: usuarioAtual.perfil,
                loja_id: lojaId,
                data_inicio: new Date().toISOString(),
                pontos_totais: 0,
                treinamentos_concluidos: [],
                videos_assistidos: [],
                testes_realizados: [],
                conquistas: [],
                ultimo_acesso: new Date().toISOString()
            };
            
            await window.setDoc(usuarioRef, dadosUsuario);
            console.log('✅ Documento CRIADO para o usuário');
        } else {
            console.log('✅ Documento já existe para o usuário');
            await window.updateDoc(usuarioRef, {
                ultimo_acesso: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar dados:', error);
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventListeners() {
    console.log('⚙️ Configurando eventos...');
    
    // Botão voltar
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            mudarTab(tabId);
        });
    });
    
    console.log('✅ Eventos configurados');
}

// ============================================
// MUDAR TAB
// ============================================
function mudarTab(tabId) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar painéis
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
        targetPane.classList.add('active');
        console.log(`✅ Tab ativada: ${tabId}`);
        
        // Mensagem de desenvolvimento
        console.log(`📢 [${tabId.toUpperCase()}] Funcionalidade em desenvolvimento`);
    }
}

// ============================================
// UTILITÁRIOS
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

function mostrarMensagem(texto, tipo = 'info') {
    console.log(`[${tipo.toUpperCase()}] ${texto}`);
    
    // Criar toast
    const toast = document.createElement('div');
    toast.className = `message-toast ${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${texto}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
}

// Adicionar estilos de animação
if (!document.querySelector('#toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0%); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0%); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// EXPORTAR PARA DEBUG
// ============================================
window.debugAprimoramento = {
    getUsuario: () => usuarioAtual,
    getLoja: () => lojaId,
    getLoginDb: () => loginDb,
    getDb: () => db
};

console.log("✅ Módulo Aprimoramento carregado com sucesso!");
