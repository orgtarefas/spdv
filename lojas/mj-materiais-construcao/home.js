// home.js - SOLUÇÃO DEFINITIVA
// Simplesmente navega para venda.html quando clicar no botão

console.log("🚀 Home MJ - Script carregado");

// 1. Aguardar página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Página carregada");
    
    // 2. Encontrar o link de Venda
    const botaoVenda = document.querySelector('a[href="venda.html"]');
    
    if (!botaoVenda) {
        console.error("❌ ERRO: Não encontrei o botão de Venda!");
        console.log("Procurando todos os links:");
        document.querySelectorAll('a').forEach(link => {
            console.log("- Link:", link.href);
        });
        return;
    }
    
    console.log("✅ Botão de Venda encontrado!");
    
    // 3. Remover comportamento normal do link
    botaoVenda.addEventListener('click', function(evento) {
        evento.preventDefault(); // NÃO seguir o link
        evento.stopPropagation(); // Parar propagação
        
        console.log("🎯 Clicou em NOVA VENDA");
        console.log("📍 Indo para: venda.html");
        
        // 4. Navegar para venda.html
        window.location.href = 'venda.html';
    });
    
    // 5. Esconder loading
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
    
    console.log("✅ Tudo configurado! Clique em 'Nova Venda' para testar.");
});

// Mostrar que carregou
console.log("✅ home.js executado");
