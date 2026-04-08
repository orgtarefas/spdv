// ============================================
// programas_aprimoramento.js - VERSÃO CORRIGIDA
// SEM CONFLITOS COM OUTROS SCRIPTS
// ============================================

(function() {
    'use strict';
    
    console.log('🚀 Inicializando Programas de Aprimoramento...');

    // Estado global (dentro do escopo da função)
    let lojaId = null;
    let usuarioAtual = null;
    let db = null;
    let loginDb = null;

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM carregado, iniciando programas_aprimoramento.html...');
        
        mostrarLoading('Carregando...');
        
        try {
            // 1. Aguardar Firebase e serviços
            await aguardarFirebase();
            
            // 2. Carregar dados do usuário
            await carregarDadosUsuario();
            
            // 3. Verificar se o usuário está logado
            if (!usuarioAtual || !usuarioAtual.email) {
                console.error('❌ Usuário não identificado. Redirecionando para login...');
                mostrarMensagem('Faça login para acessar os programas de aprimoramento', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                esconderLoading();
                return;
            }
            
            // 4. Verificar se programas de aprimoramento está habilitado
            await verificarHabilitacao();
            
            // 5. Configurar interface
            configurarEventListeners();
            
            // 6. Inicializar dados no Firebase (se db disponível)
            if (db) {
                await inicializarDadosUsuarioFirebase();
            } else {
                console.warn('⚠️ db não disponível, dados não serão salvos no Firebase');
            }
            
            esconderLoading();
            
            console.log('✅ Programas de Aprimoramento inicializado com sucesso!');
            console.log(`📍 Loja: ${lojaId}`);
            console.log(`👤 Usuário: ${usuarioAtual.email} (${usuarioAtual.perfil})`);
            console.log(`📁 Firebase db: ${db ? 'Conectado' : 'NÃO CONECTADO'}`);
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            esconderLoading();
            mostrarMensagem('Erro ao carregar programas de aprimoramento', 'error');
        }
    });

    // ============================================
    // AGUARDAR FIREBASE
    // ============================================
    async function aguardarFirebase() {
        let tentativas = 0;
        const maxTentativas = 50;
        const intervalo = 200;
        
        console.log('⏳ Aguardando Firebase...');
        
        while (tentativas < maxTentativas) {
            // Tentar obter db de várias fontes
            if (window.db) {
                db = window.db;
                console.log('✅ Firebase db via window.db');
            }
            
            if (!db && window.lojaServices && window.lojaServices.db) {
                db = window.lojaServices.db;
                console.log('✅ Firebase db via lojaServices.db');
            }
            
            if (!db && window.lojaManager && window.lojaManager.db) {
                db = window.lojaManager.db;
                console.log('✅ Firebase db via lojaManager.db');
            }
            
            // loginDb (do login_firebase.js)
            if (window.loginDb) {
                loginDb = window.loginDb;
                console.log('✅ loginDb via window.loginDb');
            }
            
            if (db && loginDb) {
                console.log(`✅ Firebase conectado após ${tentativas + 1} tentativas`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, intervalo));
            tentativas++;
        }
        
        if (!db) {
            console.warn('⚠️ Firebase db não encontrado após', tentativas, 'tentativas');
        }
        
        if (!loginDb) {
            console.warn('⚠️ loginDb não encontrado após', tentativas, 'tentativas');
        }
    }

    // ============================================
    // CARREGAR DADOS DO USUÁRIO
    // ============================================
    async function carregarDadosUsuario() {
        console.log('🔍 Buscando dados do usuário logado...');
        
        // FONTE 1: window.dadosUsuario
        if (window.dadosUsuario && window.dadosUsuario.email) {
            usuarioAtual = {
                email: window.dadosUsuario.email,
                nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
                perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente',
                tipo: window.dadosUsuario.tipo || 'cliente',
                uid: window.dadosUsuario.uid || null
            };
            console.log('✅ Usuário carregado de window.dadosUsuario:', usuarioAtual.email);
        }
        
        // FONTE 2: sessionStorage usuarioInfo
        if (!usuarioAtual?.email) {
            const infoBasica = sessionStorage.getItem('usuarioInfo');
            if (infoBasica) {
                try {
                    const dados = JSON.parse(infoBasica);
                    usuarioAtual = {
                        email: dados.email,
                        nome: dados.nome || dados.email?.split('@')[0],
                        perfil: dados.perfil || 'cliente',
                        tipo: dados.tipo || 'cliente'
                    };
                    console.log('✅ Usuário carregado de sessionStorage:', usuarioAtual.email);
                } catch (e) {
                    console.warn('Erro ao parsear sessionStorage:', e);
                }
            }
        }
        
        // Extrair loja da URL
        if (window.getLojaDaURL) {
            lojaId = window.getLojaDaURL();
        }
        
        if (!lojaId) {
            const pathParts = window.location.pathname.split('/');
            const lojaIndex = pathParts.indexOf('loja');
            if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
                lojaId = pathParts[lojaIndex + 1];
            }
        }
        
        if (!lojaId && window.lojaIdAtual) {
            lojaId = window.lojaIdAtual;
        }
        
        if (!lojaId && window.lojaServices?.lojaId) {
            lojaId = window.lojaServices.lojaId;
        }
        
        // Atualizar display
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay && usuarioAtual) {
            const nomeExibicao = usuarioAtual.nome || usuarioAtual.email?.split('@')[0] || 'Usuário';
            userNameDisplay.textContent = nomeExibicao;
            userNameDisplay.title = `${nomeExibicao} (${usuarioAtual.perfil || 'cliente'})`;
        }
        
        if (!usuarioAtual?.email) {
            console.error('❌ NÃO FOI POSSÍVEL IDENTIFICAR O USUÁRIO LOGADO');
        }
    }

    // ============================================
    // VERIFICAR HABILITAÇÃO
    // ============================================
    async function verificarHabilitacao() {
        if (!lojaId || !loginDb) {
            console.warn('⚠️ lojaId ou loginDb não disponível para verificar habilitação');
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
            }
        } catch (error) {
            console.error('❌ Erro ao verificar habilitação:', error);
        }
    }

    // ============================================
    // INICIALIZAR DADOS NO FIREBASE
    // ============================================
    async function inicializarDadosUsuarioFirebase() {
        if (!db || !lojaId || !usuarioAtual?.email) {
            console.warn('⚠️ Dados insuficientes para inicializar no Firebase');
            return;
        }
        
        console.log('💾 Inicializando dados do usuário no Firebase...');
        
        try {
            // Verificar se as funções do Firebase estão disponíveis
            if (typeof doc === 'undefined' || typeof getDoc === 'undefined' || typeof setDoc === 'undefined') {
                console.warn('⚠️ Funções do Firebase não disponíveis globalmente');
                console.log('💡 Tentando obter do window...');
                
                // Tentar obter do escopo global
                if (window.getDoc) window.getDoc = getDoc;
                if (window.doc) window.doc = doc;
                if (window.setDoc) window.setDoc = setDoc;
                if (window.updateDoc) window.updateDoc = updateDoc;
            }
            
            const colecaoAprimoramento = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
            console.log(`📁 Coleção: ${colecaoAprimoramento}`);
            
            const usuarioRef = doc(db, colecaoAprimoramento, usuarioAtual.email);
            const usuarioDoc = await getDoc(usuarioRef);
            
            if (!usuarioDoc.exists()) {
                const dadosUsuario = {
                    email: usuarioAtual.email,
                    nome: usuarioAtual.nome || usuarioAtual.email.split('@')[0],
                    perfil: usuarioAtual.perfil || 'cliente',
                    loja_id: lojaId,
                    data_inicio: new Date().toISOString(),
                    pontos_totais: 0,
                    treinamentos_concluidos: [],
                    videos_assistidos: [],
                    testes_realizados: [],
                    conquistas: [],
                    ultimo_acesso: new Date().toISOString()
                };
                
                await setDoc(usuarioRef, dadosUsuario);
                console.log('✅ Documento CRIADO para o usuário:', usuarioAtual.email);
            } else {
                console.log('✅ Documento já existe para o usuário:', usuarioAtual.email);
                await updateDoc(usuarioRef, { ultimo_acesso: new Date().toISOString() });
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar dados no Firebase:', error);
        }
    }

    // ============================================
    // CONFIGURAR EVENT LISTENERS
    // ============================================
    function configurarEventListeners() {
        console.log('⚙️ Configurando event listeners...');
        
        const btnBack = document.getElementById('btnBack');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                mudarTab(tabId);
            });
        });
        
        console.log('✅ Event listeners configurados');
    }

    // ============================================
    // MUDAR TAB
    // ============================================
    function mudarTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        const targetPane = document.getElementById(`tab-${tabId}`);
        if (targetPane) {
            targetPane.classList.add('active');
            console.log(`✅ Tab ativada: ${tabId}`);
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

    // Adicionar estilos
    if (!document.querySelector('#toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Expor debug
    window.debugAprimoramento = {
        getUsuario: () => usuarioAtual,
        getLoja: () => lojaId,
        getDb: () => db,
        getLoginDb: () => loginDb
    };

    console.log('✅ programas_aprimoramento.js carregado com sucesso!');
    console.log('📖 Para debug, use window.debugAprimoramento');
    
})();
