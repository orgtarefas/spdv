// login.js - VERSÃO COMPLETA E CORRIGIDA
import { db, collection, getDocs, doc, getDoc } from './firebase_login.js';

// Elementos DOM
const lojaSelect = document.getElementById('loja');
const usuarioInput = document.getElementById('usuario');
const senhaInput = document.getElementById('senha');
const togglePassword = document.getElementById('togglePassword');
const btnLogin = document.getElementById('btnLogin');
const loadingOverlay = document.getElementById('loading');
const messageAlert = document.getElementById('message');

// ============================================
// 1. CORREÇÃO: Botão mostrar/ocultar senha
// ============================================
togglePassword.addEventListener('click', function() {
    const type = senhaInput.getAttribute('type');
    const isPassword = type === 'password';
    
    // Alternar tipo
    senhaInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // Alternar ícone
    const icon = this.querySelector('i');
    if (isPassword) {
        icon.className = 'fas fa-eye-slash';
        this.title = "Ocultar senha";
    } else {
        icon.className = 'fas fa-eye';
        this.title = "Mostrar senha";
    }
    
    // Manover foco no campo
    senhaInput.focus();
});

// ============================================
// 2. CORREÇÃO: Carregar lojas do Firebase
// ============================================
async function carregarLojas() {
    try {
        showLoading('Carregando lojas...');
        
        const lojasRef = collection(db, "logins");
        const querySnapshot = await getDocs(lojasRef);
        
        // Limpar options existentes (mantendo apenas a primeira)
        while (lojaSelect.options.length > 1) {
            lojaSelect.remove(1);
        }
        
        // Contador de lojas válidas
        let lojasCarregadas = 0;
        
        querySnapshot.forEach((doc) => {
            const lojaId = doc.id;
            const dadosLoja = doc.data();
            
            // Verificar se é uma loja válida (não é admin e tem usuários)
            const isAdmin = lojaId === "admin";
            const temUsuarios = Object.keys(dadosLoja).length > 0;
            
            if (!isAdmin && temUsuarios) {
                const option = document.createElement('option');
                option.value = lojaId;
                
                // Formatar nome da loja (capitalizar e remunderlines)
                let nomeFormatado = lojaId
                    .replace(/_/g, ' ') // Substituir underlines por espaços
                    .split(' ') // Separar por espaços
                    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
                    .join(' ');
                
                option.textContent = nomeFormatado;
                lojaSelect.appendChild(option);
                lojasCarregadas++;
            }
        });
        
        hideLoading();
        
        // Se não houver lojas
        if (lojasCarregadas === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Nenhuma loja cadastrada";
            option.disabled = true;
            lojaSelect.appendChild(option);
            lojaSelect.disabled = true;
            
            showMessage("Nenhuma loja disponível para acesso", "warning");
        } else {
            // Selecionar a primeira loja por padrão
            lojaSelect.selectedIndex = 1;
            
            // Mostrar mensagem informativa
            if (lojasCarregadas === 1) {
                showMessage(`1 loja carregada do sistema`, "success", 3000);
            } else {
                showMessage(`${lojasCarregadas} lojas carregadas do sistema`, "success", 3000);
            }
        }
        
    } catch (error) {
        hideLoading();
        console.error("Erro ao carregar lojas:", error);
        
        // Opção de fallback para desenvolvimento
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Erro ao carregar lojas";
        option.disabled = true;
        lojaSelect.appendChild(option);
        lojaSelect.disabled = true;
        
        showMessage("Erro ao conectar com o servidor", "error");
    }
}

// ============================================
// Funções auxiliares
// ============================================
function showLoading(mensagem = 'Carregando...') {
    loadingOverlay.querySelector('p').textContent = mensagem;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showMessage(text, type = 'error', tempo = 5000) {
    messageAlert.textContent = text;
    messageAlert.className = `message-alert ${type}`;
    messageAlert.style.display = 'block';
    messageAlert.style.animation = 'slideInRight 0.3s ease';
    
    setTimeout(() => {
        messageAlert.style.animation = 'fadeOut 0.5s ease';
        setTimeout(() => {
            messageAlert.style.display = 'none';
        }, 500);
    }, tempo);
}

// ============================================
// 3. Função para validar login (já corrigida)
// ============================================
async function validarLogin(loja, usuario, senha) {
    try {
        // Verificar se é acesso administrativo (admin)
        if (loja === "admin") {
            const adminRef = doc(db, "logins", "admin");
            const adminDoc = await getDoc(adminRef);
            
            if (!adminDoc.exists()) {
                return { success: false, message: "Conta administrativa não configurada" };
            }
            
            const adminData = adminDoc.data();
            
            // Buscar pelo campo login
            let usuarioAdminData = null;
            for (const [key, userData] of Object.entries(adminData)) {
                if (userData.login === usuario) {
                    usuarioAdminData = userData;
                    break;
                }
            }
            
            if (!usuarioAdminData) {
                return { success: false, message: "Usuário administrativo não encontrado" };
            }
            
            // Verificar senha
            if (usuarioAdminData.senha !== senha) {
                return { success: false, message: "Senha incorreta" };
            }
            
            // Verificar se usuário está ativo
            if (!usuarioAdminData.ativo) {
                return { success: false, message: "Usuário administrativo inativo" };
            }
            
            // Login administrativo bem-sucedido
            return { 
                success: true, 
                usuario: {
                    login: usuario,
                    perfil: usuarioAdminData.perfil,
                    loja: "admin",
                    nomeCompleto: usuarioAdminData.nomeCompleto || usuario,
                    acessoTotal: true
                }
            };
        }
        
        // Acesso normal à loja
        const lojaRef = doc(db, "logins", loja);
        const lojaDoc = await getDoc(lojaRef);
        
        if (!lojaDoc.exists()) {
            return { success: false, message: "Loja não encontrada" };
        }
        
        const dadosLoja = lojaDoc.data();
        
        // Buscar pelo campo login
        let usuarioData = null;
        for (const [key, userData] of Object.entries(dadosLoja)) {
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
        
        // Verificar se usuário está ativo
        if (!usuarioData.ativo) {
            return { success: false, message: "Usuário inativo" };
        }
        
        // Verificar validade (se existir)
        if (usuarioData.data_validade) {
            const dataValidade = usuarioData.data_validade.toDate();
            const agora = new Date();
            
            if (dataValidade < agora) {
                return { success: false, message: "Conta expirada" };
            }
        }
        
        // Login bem-sucedido
        return { 
            success: true, 
            usuario: {
                login: usuario,
                perfil: usuarioData.perfil,
                loja: loja,
                nomeCompleto: usuarioData.nomeCompleto || usuario,
                acessoTotal: false
            }
        };
        
    } catch (error) {
        console.error("Erro ao validar login:", error);
        return { success: false, message: "Erro no servidor. Tente novamente." };
    }
}

// ============================================
// 4. Evento de login
// ============================================
btnLogin.addEventListener('click', async function() {
    const loja = lojaSelect.value;
    const usuario = usuarioInput.value.trim();
    const senha = senhaInput.value.trim();
    
    // Validações básicas
    if (!loja) {
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
    showLoading('Autenticando...');
    
    try {
        // Validar login
        const resultado = await validarLogin(loja, usuario, senha);
        
        if (resultado.success) {
            // Salvar dados do usuário no localStorage
            localStorage.setItem('pdv_usuario', JSON.stringify(resultado.usuario));
            localStorage.setItem('pdv_autenticado', 'true');
            localStorage.setItem('pdv_loja', loja);
            
            showMessage("Login realizado com sucesso! Redirecionando...", "success");
            
            // Redirecionar conforme o tipo de usuário
            setTimeout(() => {
                if (resultado.usuario.loja === "admin") {
                    window.location.href = 'admin/home.html';
                } else {
                    window.location.href = `lojas/${loja}/home.html`;
                }
            }, 1500);
            
        } else {
            hideLoading();
            showMessage(resultado.message, "error");
            
            // Limpar campo de senha em caso de erro
            senhaInput.value = '';
            senhaInput.focus();
        }
        
    } catch (error) {
        hideLoading();
        showMessage("Erro ao conectar com o servidor", "error");
        console.error("Erro:", error);
    }
});

// ============================================
// 5. Permitir login com Enter
// ============================================
senhaInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        btnLogin.click();
    }
});

usuarioInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        senhaInput.focus();
    }
});

// ============================================
// 6. Inicializar sistema
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está autenticado
    if (localStorage.getItem('pdv_autenticado') === 'true') {
        const usuario = JSON.parse(localStorage.getItem('pdv_usuario'));
        const loja = localStorage.getItem('pdv_loja');
        
        if (usuario.loja === "admin") {
            window.location.href = 'admin/home.html';
        } else {
            window.location.href = `lojas/${loja}/home.html`;
        }
        return;
    }
    
    // Carregar lojas do Firebase
    carregarLojas();
    
    // Focar no campo de usuário após carregar
    setTimeout(() => {
        if (lojaSelect.options.length > 1) {
            usuarioInput.focus();
        } else {
            lojaSelect.focus();
        }
    }, 500);
});