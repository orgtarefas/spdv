// home.js - SOLUÇÃO FINAL 100% FUNCIONAL

// PASSO 1: Quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log("1. DOM carregado");
    
    // PASSO 2: Aguardar um pouco
    setTimeout(function() {
        console.log("2. Procurando botão...");
        
        // PASSO 3: Encontrar o botão
        const botaoVenda = document.querySelector('a[href="venda.html"]');
        
        if (botaoVenda) {
            console.log("3. Botão encontrado!");
            
            // PASSO 4: Adicionar evento SIMPLES
            botaoVenda.onclick = function(e) {
                console.log("4. Clique registrado!");
                e.preventDefault();
                window.location.href = 'venda.html';
                return false;
            };
            
            console.log("5. Tudo configurado!");
        }
        
        // Esconder loading
        document.getElementById('loadingOverlay').style.display = 'none';
        
    }, 500); // Meio segundo de delay
});

console.log("home.js carregado!");
