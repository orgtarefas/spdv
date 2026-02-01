// home.js - SUPER SIMPLES E FUNCIONAL
console.log("🏠 Home carregando...");

// Esperar a página carregar completamente
window.addEventListener('load', function() {
    console.log("✅ Página totalmente carregada");
    
    // Esconder o loading
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
        console.log("⏳ Loading escondido");
    }
    
    // Encontrar o botão de VENDA
    const botaoVenda = document.querySelector('a[href="venda.html"]');
    console.log("🔍 Procurando botão venda.html...");
    console.log("Botão encontrado?", botaoVenda);
    
    if (botaoVenda) {
        console.log("🎯 Botão encontrado! Configurando clique...");
        
        // ADICIONAR evento de clique
        botaoVenda.addEventListener('click', function(evento) {
            console.log("🖱️ CLICOU NO BOTÃO VENDA!");
            
            // IMPORTANTE: Impedir o comportamento normal do link
            evento.preventDefault();
            evento.stopPropagation();
            
            console.log("📍 Navegando para venda.html...");
            
            // Navegar para venda.html (na MESMA pasta)
            window.location.href = 'venda.html';
        });
        
        console.log("✅ Botão configurado com sucesso!");
    } else {
        console.error("❌ ERRO: Não encontrei o botão de Venda!");
        
        // Mostrar todos os links na página para debug
        console.log("📋 Todos os links da página:");
        document.querySelectorAll('a').forEach((link, index) => {
            console.log(`${index + 1}. href="${link.getAttribute('href')}"`);
        });
    }
    
    // Configurar data/hora
    atualizarDataHora();
});

// Função para atualizar data/hora
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

// Adicionar este script também para garantir
console.log("🎯 home.js executado - pronto para cliques!");
