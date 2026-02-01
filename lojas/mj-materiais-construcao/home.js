// home.js - VERSÃO SUPER SIMPLES QUE FUNCIONA
console.log("✅ home.js carregado - MJ Materiais");

// 1. Quando a página carregar
window.onload = function() {
    console.log("🏠 Página home carregada");
    
    // Esconder o loading
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
    
    // Configurar data/hora
    atualizarDataHora();
    
    // Configurar o botão de VENDA
    configurarBotaoVenda();
};

// 2. Função para configurar o botão de Venda
function configurarBotaoVenda() {
    console.log("🔧 Configurando botão Nova Venda...");
    
    // Encontrar o botão pelo HTML EXATO que você tem
    const botaoVenda = document.querySelector('a[href="venda.html"]');
    
    if (botaoVenda) {
        console.log("🎯 Botão encontrado:", botaoVenda);
        
        // Adicionar evento de clique SIMPLES
        botaoVenda.addEventListener('click', function(evento) {
            console.log("🖱️ CLICOU EM NOVA VENDA!");
            
            // Impedir o comportamento normal
            evento.preventDefault();
            
            // Verificar se tem sessão (opcional, mas importante)
            const temSessao = sessionStorage.getItem('userSession');
            if (!temSessao) {
                alert("Sessão expirada! Faça login novamente.");
                window.location.href = '../../login.html';
                return;
            }
            
            console.log("📍 Indo para venda.html...");
            
            // Navegar para venda.html na MESMA pasta
            window.location.href = 'venda.html';
        });
        
        console.log("✅ Botão configurado com sucesso!");
    } else {
        console.error("❌ ERRO: Não encontrei o botão de Venda!");
    }
}

// 3. Função para atualizar data/hora
function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (elemento) {
        const agora = new Date();
        elemento.textContent = agora.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// 4. Configurar botão de Logout (opcional)
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', function() {
        if (confirm("Deseja sair do sistema?")) {
            sessionStorage.removeItem('userSession');
            window.location.href = '../../login.html';
        }
    });
}

console.log("🚀 home.js pronto!");
