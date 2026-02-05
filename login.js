// login.js - SISTEMA DE LOGIN DINÂMICO COM ADMIN GLOBAL
console.log("🔐 Sistema de Login PDV Multi-Lojas - Iniciando...");

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let db;
let configFirebase;
let firebaseApp = null;

// Elementos DOM
let lojaSelect, usuarioInput, senhaInput, togglePassword;
let btnLogin, loadingOverlay, messageAlert, loadingMessage, rememberMe;

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 Página de login carregada');
    
    // Inicializar elementos DOM
    inicializarElementosDOM();
    
    // Verificar se o sistema de lojas está carregado
    if (typeof SISTEMA_LOJAS === 'undefined') {
        console.error("❌ SISTEMA_LOJAS não está definido!");
        mostrarMensagem("Erro: Sistema de lojas não carregado. Recarregue a página.", "error");
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Inicializar Firebase para o login
    if (!inicializarFirebaseLogin()) {
        mostrarMensagem("Não foi possível conectar ao banco de dados.", "error");
        return;
    }
    
    // Carregar lojas dinamicamente
    await carregarLojas();
    
    // Carregar dados do último usuário
    carregarUltimoUsuario();
    
    console.log('✅ Sistema de login pronto');
});

// ============================================
// 2. INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementosDOM() {
    console.log("🔍 Buscando elementos DOM...");
    
    lojaSelect = document.getElementById('lojaSelect') || document.getElementById('loja');
    usuarioInput = document.getElementById('username') || document.getElementById('usuario');
    senhaInput = document.getElementById('password') || document.getElementById('senha');
    togglePassword = document.getElementById('togglePassword');
    btnLogin = document.getElementById('btnLogin') || document.getElementById('btnEntrar');
    loadingOverlay = document.getElementById('loadingOverlay') || document.getElementById('loading');
    messageAlert = document.getElementById('messageAlert') || document.getElementById('message');
    loadingMessage = document.getElementById('loadingMessage');
    rememberMe = document.getElementById('rememberMe');
    
    console.log("Elementos encontrados:", {
        lojaSelect: !!lojaSelect,
        usuarioInput: !!usuarioInput,
        senhaInput: !!senhaInput,
        btnLogin: !!btnLogin
    });
}

// ============================================
// 3. CONFIGURAR FIREBASE PARA LOGIN
// ============================================
function inicializarFirebaseLogin() {
    try {
        // Usar configuração do sistema de lojas
        configFirebase = SISTEMA_LOJAS.obterFirebaseConfig();
        
        // Inicializar Firebase apenas para login (app padrão)
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(configFirebase, 'pdv-login-app');
        } else {
            firebaseApp = firebase.app('pdv-login-app') || firebase.initializeApp(configFirebase, 'pdv-login-app');
        }
        
        db = firebase.firestore(firebaseApp);
        
        console.log("✅ Firebase inicializado para login");
        return true;
        
    } catch (error) {
        console.error("❌ Erro ao inicializar Firebase:", error);
        return false;
    }
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão mostrar/ocultar senha
    if (togglePassword && senhaInput) {
        togglePassword.addEventListener('click', function() {
            const type = senhaInput.getAttribute('type');
            const isPassword = type === 'password';
            
            senhaInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            const icon = this.querySelector('i');
            if (isPassword) {
                icon.className = 'fas fa-eye-slash';
                this.title = "Ocultar senha";
            } else {
                icon.className = 'fas fa-eye';
                this.title = "Mostrar senha";
            }
            
            senhaInput.focus();
        });
    }
    
    // Evento de login com Enter
    if (usuarioInput) {
        usuarioInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (senhaInput) senhaInput.focus();
            }
        });
    }
    
    if (senhaInput) {
        senhaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (btnLogin) btnLogin.click();
            }
        });
    }
    
    // Botão de login
    if (btnLogin) {
        btnLogin.addEventListener('click', fazerLogin);
    }
    
    // Formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            fazerLogin();
        });
    }
    
    // Fechar mensagem
    const messageClose = messageAlert?.querySelector('.message-close');
    if (messageClose) {
        messageClose.addEventListener('click', function() {
            if (messageAlert) messageAlert.style.display = 'none';
        });
    }
}

// ============================================
// 5. CARREGAR LOJAS DINAMICAMENTE
// ============================================
async function carregarLojas() {
    try {
        mostrarLoading('Carregando lojas disponíveis...');
        
        // Limpar opções existentes
        if (lojaSelect) {
            lojaSelect.innerHTML = '<option value="">Selecione uma loja...</option>';
            
            // Obter lojas do sistema
            const lojas = SISTEMA_LOJAS.listarLojas();
            
            if (lojas.length === 0) {
                lojaSelect.innerHTML = '<option value="">Nenhuma loja configurada</option>';
                lojaSelect.disabled = true;
                mostrarMensagem('Nenhuma loja configurada no sistema', 'warning');
                return;
            }
            
            // Adicionar cada loja como opção
            lojas.forEach(loja => {
                const option = document.createElement('option');
                option.value = loja.id;
                option.textContent = loja.nome;
                
                // Adicionar descrição como tooltip
                if (loja.descricao) {
                    option.title = loja.descricao;
                }
                
                lojaSelect.appendChild(option);
            });
            
            console.log(`✅ ${lojas.length} lojas carregadas no select`);
        }
        
        esconderLoading();
        
    } catch (error) {
        esconderLoading();
        console.error('❌ Erro ao carregar lojas:', error);
        mostrarMensagem('Erro ao carregar lista de lojas', 'error');
    }
}

// ============================================
// 6. VALIDAÇÃO DE LOGIN DINÂMICA
// ============================================
async function validarLoginDinamico(lojaId, usuario, senha) {
    try {
        console.log(`🔍 Validando login: ${usuario} na loja ${lojaId}`);
        
        // Verificar se loja existe
        if (!SISTEMA_LOJAS.lojaExiste(lojaId)) {
            console.log(`❌ Loja ${lojaId} não encontrada`);
            return { success: false, message: "Loja não encontrada" };
        }
        
        // Obter configuração da loja
        const loja = SISTEMA_LOJAS.obterLoja(lojaId);
        
        // PRIMEIRO: Verificar se é ADMIN GLOBAL
        // Os admins globais estão na coleção de usuários global
        console.log("🔍 Verificando admin global...");
        
        try {
            const adminGlobalRef = db.collection('usuarios_globais').doc('administradores');
            const adminGlobalDoc = await adminGlobalRef.get();
            
            if (adminGlobalDoc.exists()) {
                const admins = adminGlobalDoc.data();
                
                // Buscar usuário admin pelo login
                let adminEncontrado = null;
                
                for (const [userId, userData] of Object.entries(admins)) {
                    if (userData && userData.login === usuario) {
                        adminEncontrado = { id: userId, ...userData };
                        break;
                    }
                }
                
                // Se encontrou um admin global
                if (adminEncontrado) {
                    console.log(`✅ Admin global encontrado: ${usuario}`);
                    
                    // Verificar se admin está ativo
                    if (adminEncontrado.ativo === false) {
                        console.log(`❌ Admin global inativo: ${usuario}`);
                        return { success: false, message: "Usuário admin inativo" };
                    }
                    
                    // Verificar senha do admin
                    if (adminEncontrado.senha !== senha) {
                        console.log(`❌ Senha incorreta para admin: ${usuario}`);
                        return { success: false, message: "Senha incorreta" };
                    }
                    
                    // ADMIN GLOBAL TEM ACESSO A QUALQUER LOJA!
                    console.log(`✅ Admin global ${usuario} acessando loja ${loja.nome}`);
                    
                    return { 
                        success: true, 
                        data: {
                            id: adminEncontrado.id,
                            login: usuario,
                            nome: adminEncontrado.nome || adminEncontrado.nomeCompleto || usuario,
                            tipo: 'admin_global',
                            perfil: 'admin_global',
                            loja_id: lojaId,
                            loja_nome: loja.nome,
                            loja_config: loja.config,
                            is_admin_global: true,
                            pode_acessar_todas_lojas: true,
                            data_login: new Date().toISOString(),
                            permissoes: ['tudo'] // Admin global tem todas as permissões
                        }
                    };
                }
            }
        } catch (adminError) {
            console.warn("⚠️ Erro ao verificar admin global:", adminError);
            // Continua com verificação normal
        }
        
        // SEGUNDO: Se não é admin global, verificar login normal da loja
        console.log(`🔍 Verificando login normal da loja ${lojaId}...`);
        
        // Acessar coleção de usuários específica da loja
        const colecaoUsuarios = loja.config.colecao_usuarios || `usuarios_${lojaId.replace(/-/g, '_')}`;
        const usuariosRef = db.collection(colecaoUsuarios);
        
        // Buscar usuário pelo login
        const querySnapshot = await usuariosRef
            .where('login', '==', usuario)
            .where('ativo', '!=', false) // Ativo ou não definido
            .limit(1)
            .get();
        
        if (querySnapshot.empty) {
            console.log(`❌ Usuário não encontrado: ${usuario}`);
            return { success: false, message: "Usuário não encontrado" };
        }
        
        const usuarioDoc = querySnapshot.docs[0];
        const usuarioData = usuarioDoc.data();
        
        console.log(`✅ Usuário encontrado:`, usuarioData);
        
        // Verificar senha
        if (usuarioData.senha !== senha) {
            console.log(`❌ Senha incorreta para: ${usuario}`);
            return { success: false, message: "Senha incorreta" };
        }
        
        // Verificar validade da conta
        if (usuarioData.data_validade) {
            try {
                const dataValidade = usuarioData.data_validade.toDate();
                const agora = new Date();
                
                if (dataValidade < agora) {
                    console.log(`❌ Conta expirada: ${usuario}`);
                    return { success: false, message: "Conta expirada" };
                }
            } catch (dateError) {
                console.warn('⚠️ Erro ao verificar data de validade:', dateError);
                // Continua mesmo se houver erro na data
            }
        }
        
        // Verificar perfil do usuário
        const perfil = usuarioData.perfil || 'vendedor';
        
        // Verificar se usuário tem permissão para esta loja
        if (!SISTEMA_LOJAS.verificarPermissao(lojaId, perfil, 'acesso')) {
            console.log(`❌ Usuário não tem permissão para acessar esta loja`);
            return { success: false, message: "Sem permissão para acessar esta loja" };
        }
        
        // Login bem-sucedido - usuário normal da loja
        return { 
            success: true, 
            data: {
                id: usuarioDoc.id,
                login: usuario,
                nome: usuarioData.nome || usuarioData.nomeCompleto || usuario,
                tipo: perfil,
                perfil: perfil,
                loja_id: lojaId,
                loja_nome: loja.nome,
                loja_config: loja.config,
                is_admin_global: false,
                pode_acessar_todas_lojas: false,
                data_login: new Date().toISOString(),
                permissoes: loja.permissoes?.[perfil] || ['vender', 'ver_estoque']
            }
        };
        
    } catch (error) {
        console.error("❌ Erro ao validar login:", error);
        return { 
            success: false, 
            message: "Erro de conexão com o servidor" 
        };
    }
}

// ============================================
// 7. PROCESSO DE LOGIN PRINCIPAL
// ============================================
async function fazerLogin() {
    const lojaId = lojaSelect?.value;
    const usuario = usuarioInput?.value.trim();
    const senha = senhaInput?.value;
    
    // Validações básicas
    if (!lojaId) {
        mostrarMensagem("Selecione uma loja", "warning");
        if (lojaSelect) lojaSelect.focus();
        return;
    }
    
    if (!usuario) {
        mostrarMensagem("Digite o usuário", "warning");
        if (usuarioInput) usuarioInput.focus();
        return;
    }
    
    if (!senha) {
        mostrarMensagem("Digite a senha", "warning");
        if (senhaInput) senhaInput.focus();
        return;
    }
    
    // Mostrar loading
    mostrarLoading('Validando credenciais...');
    
    try {
        // Validar login
        const resultado = await validarLoginDinamico(lojaId, usuario, senha);
        
        if (resultado.success) {
            // Salvar sessão usando o sistema de lojas
            SISTEMA_LOJAS.salvarLojaSelecionada(lojaId, resultado.data);
            
            // Salvar último usuário se marcado "Lembrar-me"
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('pdv_ultimo_usuario', usuario);
                localStorage.setItem('pdv_ultima_loja', lojaId);
            } else {
                localStorage.removeItem('pdv_ultimo_usuario');
                localStorage.removeItem('pdv_ultima_loja');
            }
            
            // Registrar log de acesso (opcional)
            await registrarLogAcesso(lojaId, usuario, resultado.data.is_admin_global);
            
            // Mensagem de sucesso
            let mensagemSucesso = `Bem-vindo(a) ${resultado.data.nome}!`;
            if (resultado.data.is_admin_global) {
                mensagemSucesso = `👑 Admin Global ${resultado.data.nome} - Acessando ${resultado.data.loja_nome}`;
            }
            
            mostrarMensagem(mensagemSucesso, 'success');
            
            console.log(`✅ Login realizado com sucesso:`, {
                usuario: resultado.data.nome,
                tipo: resultado.data.tipo,
                loja: resultado.data.loja_nome,
                is_admin_global: resultado.data.is_admin_global
            });
            
            // Redirecionar para a home da loja
            setTimeout(() => {
                const loja = SISTEMA_LOJAS.obterLoja(lojaId);
                if (loja && loja.arquivos && loja.arquivos.home) {
                    window.location.href = loja.arquivos.home;
                } else {
                    // Fallback: redirecionar para home.html
                    window.location.href = 'home.html';
                }
            }, 1500);
            
        } else {
            esconderLoading();
            mostrarMensagem(resultado.message, "error");
            
            // Limpar senha e focar
            if (senhaInput) {
                senhaInput.value = '';
                senhaInput.focus();
            }
            
            console.log(`❌ Tentativa de login falhou: ${usuario} - ${resultado.message}`);
        }
        
    } catch (error) {
        esconderLoading();
        mostrarMensagem("Erro ao conectar com o servidor", "error");
        console.error("❌ Erro no processo de login:", error);
    }
}

// ============================================
// 8. REGISTRAR LOG DE ACESSO (OPCIONAL)
// ============================================
async function registrarLogAcesso(lojaId, usuario, isAdminGlobal = false) {
    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const logData = {
            usuario: usuario,
            loja_id: lojaId,
            tipo_usuario: isAdminGlobal ? 'admin_global' : 'normal',
            data_acesso: timestamp,
            ip: 'registrado_no_cliente', // Em produção, você capturaria o IP real
            user_agent: navigator.userAgent
        };
        
        // Registrar em uma coleção de logs
        await db.collection('logs_acesso').add(logData);
        
        console.log(`📝 Log de acesso registrado: ${usuario} na loja ${lojaId}`);
        
    } catch (error) {
        console.warn('⚠️ Erro ao registrar log de acesso:', error);
        // Não falha o login se o log falhar
    }
}

// ============================================
// 9. FUNÇÕES AUXILIARES
// ============================================
function carregarUltimoUsuario() {
    if (!usuarioInput || !lojaSelect) return;
    
    const ultimoUsuario = localStorage.getItem('pdv_ultimo_usuario');
    const ultimaLoja = localStorage.getItem('pdv_ultima_loja');
    
    if (ultimoUsuario) {
        usuarioInput.value = ultimoUsuario;
        
        if (rememberMe) {
            rememberMe.checked = true;
        }
        
        // Tentar selecionar a última loja usada
        if (ultimaLoja && lojaSelect.options.length > 0) {
            for (let i = 0; i < lojaSelect.options.length; i++) {
                if (lojaSelect.options[i].value === ultimaLoja) {
                    lojaSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }
}

// ============================================
// 10. FUNÇÕES DE LOADING E MENSAGENS
// ============================================
function mostrarLoading(mensagem = 'Processando...') {
    if (loadingOverlay) {
        if (loadingMessage) {
            loadingMessage.textContent = mensagem;
        }
        loadingOverlay.style.display = 'flex';
    }
    
    if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.classList.add('loading');
    }
}

function esconderLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.classList.remove('loading');
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 5000) {
    // Tentar usar messageAlert primeiro
    if (messageAlert) {
        const icon = messageAlert.querySelector('.message-icon');
        const text = messageAlert.querySelector('.message-text');
        const closeBtn = messageAlert.querySelector('.message-close');
        
        messageAlert.className = `message-alert ${tipo}`;
        messageAlert.style.display = 'block';
        
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
            closeBtn.onclick = function() {
                messageAlert.style.display = 'none';
            };
        }
        
        // Auto-ocultar
        setTimeout(function() {
            if (messageAlert && messageAlert.style.display === 'block') {
                messageAlert.style.display = 'none';
            }
        }, tempo);
        
    } else {
        // Fallback: console e alert simples
        console.log(`[${tipo}] ${texto}`);
        if (tipo === 'error') {
            alert(texto);
        }
    }
}

// ============================================
// 11. INICIALIZAÇÃO FINAL
// ============================================
console.log('✅ login.js carregado com sucesso! Sistema dinâmico com Admin Global.');
