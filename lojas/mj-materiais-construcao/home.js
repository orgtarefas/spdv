// home.js - VERSÃO CORRETA PARA SEU SISTEMA
console.log("🏠 Home MJ - Carregando...");

// Aguardar página carregar
window.addEventListener('load', function() {
    console.log("✅ Página totalmente carregada");
    
    // 1. Verificar se tem sessão
    verificarSessao();
    
    // 2. Configurar botões
    configurarBotoes();
    
    // 3. Esconder loading
    setTimeout(function() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 500);
});

// ===== VERIFICAR SESSÃO =====
function verificarSessao() {
    console.log("🔍 Verificando sessão...");
    
    // Seu login salva a sessão como 'pdv_sessao_temporaria'
    const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
    
    if (!sessao) {
        console.log("❌ Nenhuma sessão encontrada!");
        alert("Sessão não encontrada. Faça login novamente.");
        
        // Voltar para login (2 níveis acima: lojas/mj-materiais-construcao → raiz)
        setTimeout(function() {
            window.location.href = '../../login.html';
        }, 1000);
        return;
    }
    
    try {
        const dadosUsuario = JSON.parse(sessao);
        console.log("✅ Usuário logado:", dadosUsuario);
        
        // Mostrar nome do usuário
        const nomeElemento = document.getElementById('userName');
        if (nomeElemento) {
            nomeElemento.textContent = dadosUsuario.nome || dadosUsuario.login;
        }
        
    } catch (error) {
        console.error("Erro ao ler sessão:", error);
    }
}

// ===== CONFIGURAR BOTÕES =====
function configurarBotoes() {
    console.log("🔧 Configurando botões...");
    
    // BOTÃO NOVA VENDA
    const botaoVenda = document.querySelector('a[href="venda.html"]');
    if (botaoVenda) {
        console.log("✅ Botão Nova Venda encontrado");
        
        botaoVenda.addEventListener('click', function(e) {
            e.preventDefault(); // IMPORTANTE!
            
            console.log("🖱️ Clicou em Nova Venda");
            
            // Verificar sessão novamente
            const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
            if (!sessao) {
                alert("Sessão expirada! Faça login novamente.");
                window.location.href = '../../login.html';
                return;
            }
            
            // Salvar sessão também no localStorage para garantir
            localStorage.setItem('pdv_sessao_backup', sessao);
            
            console.log("📍 Indo para venda.html...");
            
            // Navegar para venda.html na MESMA pasta
            window.location.href = 'venda.html';
        });
    } else {
        console.error("❌ Botão Nova Venda não encontrado!");
    }
    
    // BOTÃO LOGOUT
    const botaoLogout = document.getElementById('btnLogout');
    if (botaoLogout) {
        botaoLogout.addEventListener('click', function() {
            if (confirm("Deseja realmente sair do sistema?")) {
                // Limpar sessões
                sessionStorage.removeItem('pdv_sessao_temporaria');
                localStorage.removeItem('pdv_sessao_backup');
                
                // Voltar para login
                window.location.href = '../../login.html';
            }
        });
    }
}

// ===== ATUALIZAR DATA/HORA =====
function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    const opcoes = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    elemento.textContent = agora.toLocaleDateString('pt-BR', opcoes);
}

// Chamar função inicial
atualizarDataHora();
setInterval(atualizarDataHora, 60000);

console.log("✅ home.js configurado!");
