// login.js - ATUALIZADO PARA REDIRECIONAMENTO CORRETO
import { db, collection, getDocs, doc, getDoc } from './firebase_login.js';

// Elementos DOM (mantenha os mesmos)

// ============================================
// 7. PROCESSO DE LOGIN (ATUALIZADO)
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
            
            // Redirecionar para home específica da loja
            // Verificar se é a loja "mj-materiais-construcao"
            if (banco_login === 'mj-materiais-construcao') {
                // Redirecionar para home da loja MJ Materiais
                setTimeout(() => {
                    window.location.href = `lojas/${banco_login}/home.html`;
                }, 1500);
            } else {
                // Para outras lojas, usar estrutura padrão
                setTimeout(() => {
                    window.location.href = `lojas/${banco_login}/home.html`;
                }, 1500);
            }
            
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
