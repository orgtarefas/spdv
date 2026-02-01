// home.js - APENAS PARA VENDA
console.log("🏠 Home - Script inicializado");

// 1. Aguardar a página carregar
window.onload = function() {
    console.log("✅ Página carregada");
    
    // 2. Esconder loading
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
    
    // 3. Encontrar o botão de Venda pelo SEU HTML
    const botaoVenda = document.querySelector('.action-card[href="venda.html"]');
    
    console.log("🔍 Procurando botão:", botaoVenda);
    
    if (botaoVenda) {
        console.log("🎯 Botão encontrado! Configurando...");
        
        // REMOVER o comportamento padrão do link
        botaoVenda.addEventListener('click', function(e) {
            console.log("🖱️ CLICOU EM NOVA VENDA!");
            
            // IMPORTANTE: Impedir o navegador de seguir o link normalmente
            e.preventDefault();
            e.stopPropagation();
            
            // Primeiro, salvar uma sessão temporária
            sessionStorage.setItem('pagina_atual', 'home');
            
            console.log("📍 Indo para venda.html na MESMA pasta");
            
            // Navegar programaticamente
            window.location.assign('venda.html');
        });
    } else {
        console.error("❌ Botão não encontrado!");
    }
    
    // 4. Atualizar data/hora
    const dataElemento = document.getElementById('currentDateTime');
    if (dataElemento) {
        dataElemento.textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    console.log("✅ Tudo configurado!");
};
