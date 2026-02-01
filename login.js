// login.js - VERSÃO COM ACESSO ADMIN PARA TODAS AS LOJAS
import { db, collection, getDocs, doc, getDoc } from './firebase_login.js';

// Elementos DOM
const lojaSelect = document.getElementById('loja');
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
const togglePassword = document.getElementById('togglePassword');
const btnLogin = document.getElementById('btnLogin');
const loadingOverlay = document.getElementById('loading');
const messageAlert = document.getElementById('message');
const loadingMessage = document.getElementById('loadingMessage');
const rememberMe = document.getElementById('rememberMe');
const forgotPassword = document.getElementById('forgotPassword');

// ============================================
// 1. INICIALIZAÇÃO DO SISTEMA
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 PDV Sistema - Iniciando login...');
    
    // Configurar eventos
    configurarEventos();
    
    // Carregar dados salvos do último usuário (apenas para conveniência)
    carregarUltimoUsuario();
    
    // Carregar lojas do Firebase
    await carregarLojas();
});

// ============================================
// 2. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão mostrar/ocultar senha
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
    
    // Evento de login com Enter
    usuarioInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            senhaInput.focus();
        }
    });
    
    senhaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnLogin.click();
        }
    });
    
    // Botão de login
    btnLogin.addEventListener('click', fazerLogin);
    
    // Esqueceu senha
    forgotPassword.addEventListener('click', function(e) {
        e.preventDefault();
        showMessage('Entre em contato com o administrador do sistema', 'info');
    });
    
    // Fechar mensagem
    const messageClose = messageAlert.querySelector('.message-close');
    if (messageClose) {
        messageClose.addEventListener('click', function() {
            messageAlert.style.display = 'none';
        });
    }
}

// ============================================
// 3. FUNÇÕES DE LOADING E MENSAGENS
// ============================================
function showLoading(mensagem = 'Processando...') {
    loadingMessage.textContent = mensagem;
    loadingOverlay.style.display = 'flex';
    btnLogin.classList.add('loading');
    btnLogin.disabled = true;
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
    btnLogin.classList.remove('loading');
    btnLogin.disabled = false;
}

function showMessage(text, type = 'info', tempo = 5000) {
    const messageText = messageAlert.querySelector('.message-text');
    messageText.textContent = text;
    messageAlert.className = `message-alert ${type}`;
    messageAlert.style.display = 'block';
    
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

// ============================================
// 4. CARREGAR LOJAS DA COLEÇÃO "lojas"
// ============================================
async function carregarLojas() {
    try {
        showLoading('Carregando lojas disponíveis...');
        
        // Buscar todas as lojas ativas da coleção "lojas"
        const lojasRef = collection(db, "lojas");
        const querySnapshot = await getDocs(lojasRef);
        
        // Limpar options existentes
        while (lojaSelect.options.length > 0) {
            lojaSelect.remove(0);
        }
        
        // Adicionar opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Selecione sua loja";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        lojaSelect.appendChild(defaultOption);
        
        // Array para armazenar lojas válidas
        const lojasValidas = [];
        
        querySnapshot.forEach((doc) => {
            const lojaId = doc.id;
            const dadosLoja = doc.data();
            
            // Verificar se a loja está ativa
            if (dadosLoja.ativo === false) {
                console.log(`⚠️ Loja ${lojaId} está inativa`);
                return;
            }
            
            // Verificar se tem o campo banco_login
            if (!dadosLoja.banco_login) {
                console.log(`⚠️ Loja ${lojaId} não tem banco_login configurado`);
                return;
            }
            
            // Adicionar à lista de lojas válidas
            lojasValidas.push({
                id: lojaId, // ID do documento (ex: "loja1")
                banco_login: dadosLoja.banco_login, // ID para coleção logins
                nome: dadosLoja.nome || `Loja ${lojaId}`,
                local: dadosLoja.local || '',
                telefone: dadosLoja.contato?.telefone ? 
                    String(dadosLoja.contato.telefone) : ''
            });
        });
        
        // Ordenar lojas por nome
        lojasValidas.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar lojas ao select
        lojasValidas.forEach(loja => {
            const option = document.createElement('option');
            option.value = loja.banco_login; // Usar banco_login como valor
            option.textContent = loja.nome;
            option.dataset.id = loja.id; // Guardar ID do documento
            option.dataset.local = loja.local;
            lojaSelect.appendChild(option);
        });
        
        hideLoading();
        
        if (lojasValidas.length === 0) {
            showMessage('Nenhuma loja disponível no momento', 'warning');
            lojaSelect.disabled = true;
        } else {
            // Selecionar primeira loja se houver apenas uma
            if (lojasValidas.length === 1) {
                lojaSelect.selectedIndex = 1;
            }
            
            showMessage(`${lojasValidas.length} loja(s) carregada(s)`, 'success', 3000);
            console.log(`📊 Lojas carregadas:`, lojasValidas);
        }
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao carregar lojas:', error);
        
        // Opção de fallback
        const errorOption = document.createElement('option');
        errorOption.value = "";
        errorOption.textContent = "Erro ao carregar lojas";
        errorOption.disabled = true;
        lojaSelect.innerHTML = '';
        lojaSelect.appendChild(errorOption);
        lojaSelect.disabled = true;
        
        showMessage('Erro ao carregar lista de lojas', 'error');
    }
}

// ============================================
// 5. VALIDAÇÃO DE LOGIN (com acesso admin global)
// ============================================
async function validarLogin(banco_login, usuario, senha) {
    try {
        console.log(`🔍 Validando login: ${usuario} na loja ${banco_login}`);
        
        // PRIMEIRO: Verificar se é um usuário ADMIN GLOBAL
        // Os admins globais estão no documento "admin" da coleção "logins"
        const adminRef = doc(db, "logins", "admin");
        const adminDoc = await getDoc(adminRef);
        
        if (adminDoc.exists()) {
            const dadosAdmin = adminDoc.data();
            console.log(`🔍 Verificando admin global:`, dadosAdmin);
            
            // Buscar usuário admin pelo login
            let adminEncontrado = null;
            let adminKey = null;
            
            for (const [key, userData] of Object.entries(dadosAdmin)) {
                if (userData && typeof userData === 'object' && userData.login === usuario) {
                    adminEncontrado = userData;
                    adminKey = key;
                    console.log(`✅ Admin global encontrado na chave: ${adminKey}`);
                    break;
                }
            }
            
            // Se encontrou um admin global
            if (adminEncontrado) {
                console.log(`✅ Verificando admin global: ${usuario}`);
                
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
                
                // Buscar informações da loja selecionada
                const lojaInfo = await buscarInformacoesLoja(banco_login);
                
                // Admin tem acesso a qualquer loja!
                console.log(`✅ Admin ${usuario} tem acesso à loja ${banco_login}`);
                
                return { 
                    success: true, 
                    data: {
                        id: adminKey,
                        login: usuario,
                        perfil: adminEncontrado.perfil || 'admin_global',
                        banco_login: banco_login, // Loja selecionada
                        loja_nome: lojaInfo.nome || banco_login,
                        loja_local: lojaInfo.local || '',
                        loja_telefone: lojaInfo.telefone || '',
                        nome: adminEncontrado.nome || adminEncontrado.nomeCompleto || usuario,
                        data_login: new Date().toISOString(),
                        is_admin_global: true, // Flag especial para admin global
                        pode_acessar_todas_lojas: true
                    }
                };
            }
        }
        
        // SEGUNDO: Se não é admin global, verificar login normal da loja
        console.log(`🔍 Não é admin global, verificando login da loja ${banco_login}`);
        
        // Acessar documento específico na coleção "logins"
        const loginRef = doc(db, "logins", banco_login);
        const loginDoc = await getDoc(loginRef);
        
        if (!loginDoc.exists()) {
            console.log(`❌ Documento de login não encontrado: ${banco_login}`);
            return { 
                success: false, 
                message: "Credenciais de acesso não encontradas para esta loja" 
            };
        }
        
        const dadosLogin = loginDoc.data();
        console.log(`📄 Dados do documento login da loja:`, dadosLogin);
        
        // Buscar usuário pelo login nos subdocumentos/mapas
        let usuarioEncontrado = null;
        let usuarioKey = null;
        
        // Percorrer todas as chaves do documento para encontrar o usuário
        for (const [key, userData] of Object.entries(dadosLogin)) {
            // Verificar se é um objeto de usuário (tem propriedade login)
            if (userData && typeof userData === 'object' && userData.login === usuario) {
                usuarioEncontrado = userData;
                usuarioKey = key;
                console.log(`✅ Usuário encontrado na chave: ${usuarioKey}`);
                break;
            }
        }
        
        if (!usuarioEncontrado) {
            console.log(`❌ Usuário não encontrado: ${usuario}`);
            return { success: false, message: "Usuário não encontrado" };
        }
        
        console.log(`✅ Dados do usuário:`, usuarioEncontrado);
        
        // Verificar se usuário está ativo
        if (usuarioEncontrado.ativo === false) {
            console.log(`❌ Usuário inativo: ${usuario}`);
            return { success: false, message: "Usuário inativo" };
        }
        
        // Verificar senha
        if (usuarioEncontrado.senha !== senha) {
            console.log(`❌ Senha incorreta para: ${usuario}`);
            return { success: false, message: "Senha incorreta" };
        }
        
        // Verificar validade da conta
        if (usuarioEncontrado.data_validade) {
            try {
                const dataValidade = usuarioEncontrado.data_validade.toDate();
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
        
        // Buscar informações da loja na coleção "lojas"
        const lojaInfo = await buscarInformacoesLoja(banco_login);
        
        // Login bem-sucedido - usuário normal da loja
        return { 
            success: true, 
            data: {
                id: usuarioKey,
                login: usuario,
                perfil: usuarioEncontrado.perfil || 'usuario',
                banco_login: banco_login, // ID da loja no Firebase
                loja_nome: lojaInfo.nome || banco_login,
                loja_local: lojaInfo.local || '',
                loja_telefone: lojaInfo.telefone || '',
                nome: usuarioEncontrado.nome || usuarioEncontrado.nomeCompleto || usuario,
                data_login: new Date().toISOString(),
                is_admin_global: false, // Não é admin global
                pode_acessar_todas_lojas: false
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
// 6. BUSCAR INFORMAÇÕES DA LOJA
// ============================================
async function buscarInformacoesLoja(banco_login) {
    try {
        // Buscar na coleção "lojas" onde banco_login = banco_login
        const lojasRef = collection(db, "lojas");
        const querySnapshot = await getDocs(lojasRef);
        
        for (const doc of querySnapshot.docs) {
            const dadosLoja = doc.data();
            if (dadosLoja.banco_login === banco_login) {
                return {
                    nome: dadosLoja.nome,
                    local: dadosLoja.local,
                    telefone: dadosLoja.contato?.telefone ? 
                        String(dadosLoja.contato.telefone) : ''
                };
            }
        }
        
        // Se não encontrou, retornar informações básicas
        return {
            nome: banco_login,
            local: '',
            telefone: ''
        };
        
    } catch (error) {
        console.error("Erro ao buscar informações da loja:", error);
        return {
            nome: banco_login,
            local: '',
            telefone: ''
        };
    }
}

// ============================================
// 7. PROCESSO DE LOGIN
// ============================================
async function fazerLogin() {
    const banco_login = lojaSelect.value;
    const usuario = usuarioInput.value.trim();
    const senha = senhaInput.value.trim();
    
    // Validações
    if (!banco_login) {
        showMessage("Selecione uma loja", "warning");
        lojaSelect.focus();
        return;
    }
    
    if (!usuario) {
        showMessage("Digite o usuário", "warning");
        usuarioInput.focus();
        return;
    }
    
    if (!senha) {
        showMessage("Digite a senha", "warning");
        senhaInput.focus();
        return;
    }
    
    // Mostrar loading
    showLoading('Validando credenciais...');
    
    try {
        // Validar login
        const resultado = await validarLogin(banco_login, usuario, senha);
        
        if (resultado.success) {
            // Salvar sessão temporária
            sessionStorage.setItem('pdv_sessao_temporaria', JSON.stringify(resultado.data));
            
            // Salvar apenas o último usuário para conveniência (se marcado "Lembrar")
            if (rememberMe.checked) {
                localStorage.setItem('pdv_ultimo_usuario', usuario);
                localStorage.setItem('pdv_ultima_loja', banco_login);
            } else {
                localStorage.removeItem('pdv_ultimo_usuario');
                localStorage.removeItem('pdv_ultima_loja');
            }
            
            // Registrar log de acesso no Firebase (opcional)
            await registrarLogAcesso(banco_login, usuario, resultado.data.is_admin_global);
            
            console.log(`✅ Login realizado: ${usuario} (${resultado.data.perfil}) na loja ${resultado.data.loja_nome}`);
            
            // Mensagem especial para admin global
            let mensagem = `Bem-vindo(a) ${resultado.data.nome}!`;
            if (resultado.data.is_admin_global) {
                mensagem = `👑 Admin Global ${resultado.data.nome} acessando ${resultado.data.loja_nome}`;
            }
            
            showMessage(mensagem, 'success');
            
            // Redirecionar após delay
            setTimeout(() => {
                window.location.href = `lojas/${banco_login}/home.html`;
            }, 1500);
            
        } else {
            hideLoading();
            showMessage(resultado.message, "error");
            
            // Limpar senha e focar
            senhaInput.value = '';
            senhaInput.focus();
            
            console.log(`❌ Tentativa de login falhou: ${usuario} - ${resultado.message}`);
        }
        
    } catch (error) {
        hideLoading();
        showMessage("Erro ao conectar com o servidor", "error");
        console.error("❌ Erro no processo de login:", error);
    }
}

// ============================================
// 8. REGISTRAR LOG DE ACESSO NO FIREBASE
// ============================================
async function registrarLogAcesso(banco_login, usuario, is_admin_global = false) {
    try {
        console.log(`📝 Log de acesso: ${usuario} (${is_admin_global ? 'Admin Global' : 'Usuário Normal'}) na loja ${banco_login} - ${new Date().toLocaleString()}`);
        
        // Aqui você pode implementar o registro no Firebase se quiser
        /*
        import { collection, addDoc, serverTimestamp } from './firebase_login.js';
        
        const logsRef = collection(db, "logs_acesso");
        await addDoc(logsRef, {
            loja_id: banco_login,
            usuario: usuario,
            tipo_usuario: is_admin_global ? "admin_global" : "usuario_loja",
            data_acesso: serverTimestamp(),
            ip: await getIP(),
            navegador: navigator.userAgent
        });
        */
        
    } catch (error) {
        console.warn('⚠️ Erro ao registrar log de acesso:', error);
    }
}

// ============================================
// 9. FUNÇÕES AUXILIARES
// ============================================
function carregarUltimoUsuario() {
    // Apenas para conveniência do usuário - NÃO É AUTENTICAÇÃO
    const ultimoUsuario = localStorage.getItem('pdv_ultimo_usuario');
    const ultimaLoja = localStorage.getItem('pdv_ultima_loja');
    
    if (ultimoUsuario) {
        usuarioInput.value = ultimoUsuario;
        rememberMe.checked = true;
        
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
// 10. CONFIGURAÇÕES ADICIONAIS
// ============================================
// Criar favicon dinamicamente
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>';
document.head.appendChild(link);

// Adicionar crossorigin ao Font Awesome
const fontAwesomeLinks = document.querySelectorAll('link[href*="font-awesome"]');
fontAwesomeLinks.forEach(link => {
    link.crossOrigin = 'anonymous';
});

console.log('✅ login.js carregado com sucesso! Sistema com Admin Global ativado.');
