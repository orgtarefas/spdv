// login.js - VERSÃO CORRIGIDA
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
    
    // Verificar se já está autenticado
    if (localStorage.getItem('pdv_autenticado') === 'true') {
        const usuario = JSON.parse(localStorage.getItem('pdv_usuario'));
        const loja = localStorage.getItem('pdv_loja');
        
        if (usuario && loja) {
            console.log(`✅ Usuário já autenticado: ${usuario.login}`);
            // Verificar se é a loja MJ Materiais
            if (loja === 'mj-materiais-construcao') {
                window.location.href = `lojas/${loja}/home.html`;
            } else {
                window.location.href = `lojas/${loja}/home.html`;
            }
            return;
        }
    }
    
    // Carregar dados salvos
    carregarDadosSalvos();
    
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
        messageAlert.style.display = 'none';
    }, tempo);
}

// ============================================
// 4. CARREGAR LOJAS DA COLEÇÃO "lojas" - VERSÃO SIMPLIFICADA
// ============================================
async function carregarLojas() {
    try {
        showLoading('Carregando lojas disponíveis...');
        
        // Vamos usar uma abordagem mais simples para evitar problemas de CORS
        // Primeiro, vamos tentar buscar todas as lojas
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
            
            console.log(`📋 Loja encontrada: ${lojaId}`, dadosLoja);
            
            // Verificar se a loja tem o campo banco_login
            if (!dadosLoja.banco_login) {
                console.log(`⚠️ Loja ${lojaId} não tem banco_login configurado`);
                return;
            }
            
            // Adicionar à lista de lojas válidas
            lojasValidas.push({
                id: lojaId, // ID do documento
                banco_login: dadosLoja.banco_login, // ID para coleção logins
                nome: dadosLoja.nome || `Loja ${lojaId}`,
                local: dadosLoja.local || '',
                telefone: dadosLoja.contato?.telefone || '',
                ativo: dadosLoja.ativo !== false // Padrão é ativo se não especificado
            });
        });
        
        // Se nenhuma loja for encontrada, adicionar a MJ Materiais manualmente
        if (lojasValidas.length === 0) {
            console.log('ℹ️ Nenhuma loja encontrada no Firebase, adicionando MJ Materiais manualmente');
            
            lojasValidas.push({
                id: "mj-materiais-construcao",
                banco_login: "mj-materiais-construcao",
                nome: "MJ Materiais de Construção",
                local: "Cajazeiras 11 - Salvador/BA",
                telefone: "(71) 99999-9999",
                ativo: true
            });
        }
        
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
            console.log(`📊 Lojas carregadas: ${lojasValidas.length}`, lojasValidas);
            showMessage(`${lojasValidas.length} loja(s) disponível(is)`, 'success', 3000);
        }
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao carregar lojas:', error);
        
        // Opção de fallback - Adicionar MJ Materiais manualmente
        console.log('⚠️ Usando fallback para MJ Materiais');
        
        // Limpar select
        lojaSelect.innerHTML = '';
        
        // Adicionar MJ Materials manualmente
        const option = document.createElement('option');
        option.value = "mj-materiais-construcao";
        option.textContent = "MJ Materiais de Construção";
        option.dataset.id = "mj-materiais-construcao";
        option.dataset.local = "Cajazeiras 11 - Salvador/BA";
        lojaSelect.appendChild(option);
        
        // Adicionar opção padrão no início
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Selecione sua loja";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        lojaSelect.insertBefore(defaultOption, lojaSelect.firstChild);
        
        showMessage('Carregado com configuração padrão', 'info');
    }
}

// ============================================
// 5. VALIDAÇÃO DE LOGIN (usando coleção "logins")
// ============================================
async function validarLogin(banco_login, usuario, senha) {
    try {
        console.log(`🔍 Validando login: ${usuario} na loja ${banco_login}`);
        
        // Para MJ Materiais, usar validação simplificada
        if (banco_login === 'mj-materiais-construcao') {
            // Validação direta para MJ Materiais
            // Em produção, isso viria do Firebase
            const usuariosMJ = {
                'admin': { senha: 'admin123', perfil: 'admin', nomeCompleto: 'Administrador' },
                'vendedor': { senha: 'venda123', perfil: 'vendedor', nomeCompleto: 'Vendedor' },
                'pia': { senha: 'pia123', perfil: 'admin', nomeCompleto: 'Pia' }
            };
            
            const usuarioData = usuariosMJ[usuario];
            
            if (!usuarioData) {
                return { success: false, message: "Usuário não encontrado" };
            }
            
            if (usuarioData.senha !== senha) {
                return { success: false, message: "Senha incorreta" };
            }
            
            // Login bem-sucedido
            return { 
                success: true, 
                usuario: {
                    login: usuario,
                    perfil: usuarioData.perfil,
                    loja: banco_login,
                    loja_nome: "MJ Materiais de Construção",
                    loja_local: "Cajazeiras 11 - Salvador/BA",
                    loja_telefone: "(71) 99999-9999",
                    nomeCompleto: usuarioData.nomeCompleto,
                    acessoTotal: true,
                    data_validade: null
                }
            };
        }
        
        // Para outras lojas, tentar buscar do Firebase
        try {
            const loginRef = doc(db, "logins", banco_login);
            const loginDoc = await getDoc(loginRef);
            
            if (!loginDoc.exists()) {
                return { 
                    success: false, 
                    message: "Credenciais de acesso não encontradas" 
                };
            }
            
            const dadosLogin = loginDoc.data();
            
            // Buscar usuário pelo login
            let usuarioData = null;
            for (const [key, userData] of Object.entries(dadosLogin)) {
                if (userData.login === usuario) {
                    usuarioData = userData;
                    break;
                }
            }
            
            if (!usuarioData) {
                return { success: false, message: "Usuário não encontrado" };
            }
            
            // Verificar senha
            if (usuarioData.senha !== senha) {
                return { success: false, message: "Senha incorreta" };
            }
            
            // Buscar informações da loja
            const lojaInfo = await buscarInformacoesLoja(banco_login);
            
            // Login bem-sucedido
            return { 
                success: true, 
                usuario: {
                    login: usuario,
                    perfil: usuarioData.perfil,
                    loja: banco_login,
                    loja_nome: lojaInfo.nome || banco_login,
                    loja_local: lojaInfo.local || '',
                    loja_telefone: lojaInfo.telefone || '',
                    nomeCompleto: usuarioData.nomeCompleto || usuario,
                    acessoTotal: false,
                    data_validade: usuarioData.data_validade || null
                }
            };
            
        } catch (firebaseError) {
            console.error('Erro ao acessar Firebase:', firebaseError);
            return { 
                success: false, 
                message: "Erro de conexão com o servidor" 
            };
        }
        
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
        // Para MJ Materiais, retornar informações fixas
        if (banco_login === 'mj-materiais-construcao') {
            return {
                nome: "MJ Materiais de Construção",
                local: "Cajazeiras 11 - Salvador/BA",
                telefone: "(71) 99999-9999"
            };
        }
        
        // Para outras lojas, buscar do Firebase
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
            // Salvar dados do usuário
            const usuarioData = resultado.usuario;
            localStorage.setItem('pdv_usuario', JSON.stringify(usuarioData));
            localStorage.setItem('pdv_autenticado', 'true');
            localStorage.setItem('pdv_loja', banco_login);
            localStorage.setItem('pdv_loja_nome', usuarioData.loja_nome);
            localStorage.setItem('pdv_login_time', new Date().getTime());
            
            // Salvar usuário se "lembrar" estiver marcado
            if (rememberMe.checked) {
                localStorage.setItem('pdv_last_user', usuario);
            } else {
                localStorage.removeItem('pdv_last_user');
            }
            
            // Registrar log de acesso
            console.log(`✅ Login realizado: ${usuario} na loja ${usuarioData.loja_nome}`);
            
            // Mostrar mensagem de sucesso
            showMessage(`Bem-vindo(a) à ${usuarioData.loja_nome}!`, 'success');
            
            // Redirecionar para a loja específica
            setTimeout(() => {
                if (banco_login === 'mj-materiais-construcao') {
                    window.location.href = `lojas/${banco_login}/home.html`;
                } else {
                    window.location.href = `lojas/${banco_login}/home.html`;
                }
            }, 1500);
            
        } else {
            hideLoading();
            showMessage(resultado.message, "error");
            
            // Limpar senha e focar
            senhaInput.value = '';
            senhaInput.focus();
            
            console.log(`❌ Tentativa de login falhou: ${usuario}`);
        }
        
    } catch (error) {
        hideLoading();
        showMessage("Erro ao conectar com o servidor", "error");
        console.error("❌ Erro no processo de login:", error);
    }
}

// ============================================
// 8. FUNÇÕES AUXILIARES
// ============================================
function carregarDadosSalvos() {
    const lastUser = localStorage.getItem('pdv_last_user');
    if (lastUser) {
        usuarioInput.value = lastUser;
        rememberMe.checked = true;
    }
}

// ============================================
// 9. ADICIONAR FAVICON DINAMICAMENTE
// ============================================
// Criar favicon dinamicamente para evitar erro 404
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏪</text></svg>';
document.head.appendChild(link);
