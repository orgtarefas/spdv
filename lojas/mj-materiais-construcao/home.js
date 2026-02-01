// home.js - VERSÃO SUPER SIMPLES
console.log("🏠 Home - Versão SUPER SIMPLES");

// Mostrar loading
document.getElementById('loadingOverlay').style.display = 'flex';

// Aguardar um pouco e verificar sessão
setTimeout(function() {
    // Verificar se tem sessão
    const session = sessionStorage.getItem('userSession');
    
    if (!session) {
        console.log("SEM SESSÃO - Indo para login");
        window.location.href = '../../login.html';
        return;
    }
    
    console.log("COM SESSÃO - Mostrando home");
    
    try {
        const userData = JSON.parse(session);
        
        // Mostrar nome do usuário
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userData.nome || userData.login;
        }
        
        // Configurar botão de logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.onclick = function() {
                if (confirm("Sair do sistema?")) {
                    sessionStorage.removeItem('userSession');
                    window.location.href = '../../login.html';
                }
            };
        }
        
        // Atualizar data/hora
        const dateElement = document.getElementById('currentDateTime');
        if (dateElement) {
            const now = new Date();
            dateElement.textContent = now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Esconder loading
        document.getElementById('loadingOverlay').style.display = 'none';
        
    } catch (error) {
        console.error("Erro:", error);
        // Em caso de erro, mostrar home mesmo sem dados
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}, 1000);
