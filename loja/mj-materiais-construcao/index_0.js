// ============================================
// INDEX_0.JS - ARQUIVO CENTRAL DE CONTROLE
// ============================================
// Este arquivo importa e gerencia todos os módulos do sistema
// Fornece uma visão completa de todas as funções disponíveis
// ============================================

console.log("🎮 INDEX_0.JS - Sistema de Controle Central Carregado");

// ============================================
// 1. IMPORTAR TODOS OS MÓDULOS
// ============================================

// Módulo 1: Configuração Inicial, Constantes e Utilitários
import './index_1.js';

// Módulo 2: Agendamento - Configuração e Verificação
import './index_2.js';

// Módulo 3: Agendamento - Gerenciamento de Fila e Status
import './index_3.js';

// Módulo 4: Agendamento - Escuta e Renderização
import './index_4.js';

// Módulo 5: Agendamento - Carrossel e Paginação
import './index_5.js';

// Módulo 6: Produtos, Categorias e Carrinho
import './index_6.js';

// Módulo 7: Login, Cadastro e Autenticação
import './index_7.js';

// Módulo 8: UI/Modal, Configurações de Loja e Inicialização
import './index_8.js';

// Módulo 9: Funções Auxiliares e Exportações
import './index_9.js';

// ============================================
// 2. REGISTRO CENTRAL DE FUNÇÕES
// ============================================

// Objeto global que contém TODAS as funções do sistema
window.SPDV = window.SPDV || {};

// Função para registrar módulos e suas funções
function registrarModulo(nomeModulo, funcoes) {
    if (!window.SPDV.modulos) window.SPDV.modulos = {};
    window.SPDV.modulos[nomeModulo] = funcoes;
    console.log(`📦 Módulo registrado: ${nomeModulo} (${Object.keys(funcoes).length} funções)`);
}

// ============================================
// 3. MAPA COMPLETO DE FUNÇÕES DO SISTEMA
// ============================================

window.SPDV.funcoes = {
    // ========== UTILITÁRIOS (Módulo 1) ==========
    utilitarios: {
        extrairLojaIdDaURL: 'Extrai o ID da loja a partir da URL',
        mostrarLoading: 'Exibe overlay de carregamento',
        esconderLoading: 'Esconde overlay de carregamento',
        mostrarMensagem: 'Exibe mensagem toast',
        rolarAteModal: 'Rola a página até o modal especificado',
        configurarFavicon: 'Configura o favicon da loja',
        carregarLogoLoja: 'Carrega o logo da loja',
        getPlaceholderIcon: 'Retorna ícone placeholder'
    },
    
    // ========== AGENDAMENTO - CONFIGURAÇÃO (Módulo 2) ==========
    agendamentoConfig: {
        verificarAgendamentoHabilitado: 'Verifica se agendamento está habilitado no Firestore',
        toggleAgendamentoContainer: 'Mostra/esconde container de agendamento',
        mostrarSkeletonAgendamento: 'Exibe skeleton loading',
        alternarModoOperacao: 'Alterna entre modo automático/manual',
        carregarConfiguracoesServicos: 'Carrega configurações dos serviços'
    },
    
    // ========== AGENDAMENTO - FILA E STATUS (Módulo 3) ==========
    agendamentoFila: {
        processarNovaSenha: 'Processa nova senha na fila',
        verificarEAvancarFila: 'Verifica e avança fila automaticamente',
        atualizarStatusAgendamento: 'Atualiza status de um agendamento',
        gerarSenha: 'Gera senha baseada no serviço',
        finalizarAtendimento: 'Finaliza atendimento',
        chamarProximo: 'Chama próximo cliente',
        calcularTempoMedioEsperaReal: 'Calcula tempo médio de espera'
    },
    
    // ========== AGENDAMENTO - ESCUTA E RENDER (Módulo 4) ==========
    agendamentoRender: {
        iniciarEscutaAgendamentos: 'Inicia escuta em tempo real',
        reconstruirListaAgendamentos: 'Reconstrói lista de agendamentos',
        renderizarPainelAgendamento: 'Renderiza painel principal',
        pararEscutaAgendamentos: 'Para escuta de agendamentos',
        gerenciarFilaAtendimento: 'Gerencia fila de atendimento'
    },
    
    // ========== AGENDAMENTO - CARROSSEL (Módulo 5) ==========
    agendamentoCarrossel: {
        iniciarCarrosselSenhasAutomatico: 'Inicia carrossel automático',
        pararCarrosselAutomatico: 'Para carrossel automático',
        alternarCarrosselAutomatico: 'Alterna liga/desliga carrossel',
        configurarPausaAoInteragir: 'Configura pausa ao interagir',
        mudarPaginaOutrosFila: 'Muda página da coluna outros',
        scrollServico: 'Scroll manual do serviço',
        irParaPaginaServico: 'Vai para página específica',
        configurarScrollServico: 'Configura scroll do serviço',
        atualizarEstadoServico: 'Atualiza estado do serviço',
        atualizarIndicadorPaginaHeader: 'Atualiza indicador de página',
        criarBotaoPlayNoHeader: 'Cria botão play/pause'
    },
    
    // ========== PRODUTOS E CATEGORIAS (Módulo 6) ==========
    produtos: {
        carregarProdutos: 'Carrega produtos do Firestore',
        carregarCategorias: 'Carrega categorias',
        carregarProdutosDestaque: 'Carrega produtos em destaque',
        verProdutoDetalhe: 'Exibe detalhes do produto',
        adicionarAoCarrinho: 'Adiciona produto ao carrinho',
        filtrarPorCategoria: 'Filtra produtos por categoria',
        filtrarProdutosPorBusca: 'Filtra produtos por busca',
        buscarProdutoPorCodigo: 'Busca produto por código',
        exibirProdutosFiltrados: 'Exibe produtos filtrados',
        inicializarSwiper: 'Inicializa carrossel Swiper',
        inicializarCarrosselCategorias: 'Inicializa carrossel de categorias'
    },
    
    // ========== LOGIN E CADASTRO (Módulo 7) ==========
    auth: {
        fazerLoginCliente: 'Faz login do cliente',
        fazerCadastroCliente: 'Faz cadastro do cliente',
        fazerLogoutCliente: 'Faz logout do cliente',
        configurarMenuPerfil: 'Configura menu de perfil',
        atualizarMenuPerfil: 'Atualiza menu baseado no perfil',
        atualizarTempoRestante: 'Atualiza tempo restante para verificação'
    },
    
    // ========== UI E MODAIS (Módulo 8) ==========
    ui: {
        abrirModal: 'Abre modal',
        fecharModal: 'Fecha modal',
        abrirModalAgendamento: 'Abre modal de agendamento',
        abrirModalNovaSenhaHoje: 'Abre modal nova senha',
        abrirModalMeusAgendamentos: 'Abre modal meus agendamentos',
        carregarAgendamentosParaModal: 'Carrega agendamentos no modal',
        aplicarFiltroAgendamentosModal: 'Aplica filtro no modal',
        renderizarAgendamentosModal: 'Renderiza agendamentos no modal',
        cancelarAgendamento: 'Cancela agendamento',
        isAgendamentoExpirado: 'Verifica se agendamento expirou',
        configurarDropdownAgendamento: 'Configura dropdown de agendamento'
    },
    
    // ========== LOJA E CONFIGURAÇÕES (Módulo 8) ==========
    loja: {
        carregarDadosLoja: 'Carrega dados da loja',
        renderizarContatos: 'Renderiza contatos',
        renderizarEndereco: 'Renderiza endereço',
        renderizarChat: 'Renderiza chat',
        configurarEventos: 'Configura eventos da interface'
    },
    
    // ========== AUXILIARES (Módulo 9) ==========
    auxiliares: {
        carregarServicosComPrimeiroHorario: 'Carrega serviços com primeiro horário',
        encontrarPrimeiroHorarioDisponivel: 'Encontra primeiro horário disponível',
        carregarHorariosCliente: 'Carrega horários para cliente',
        carregarServicosCliente: 'Carrega serviços para cliente',
        carregarClientesParaSelect: 'Carrega clientes para select',
        carregarPrimeiroHorarioDisponivel: 'Carrega primeiro horário disponível',
        diagnosticarLogin: 'Diagnóstico de login'
    }
};

// ============================================
// 4. FUNÇÃO DE DIAGNÓSTICO COMPLETO
// ============================================

window.SPDV.diagnosticar = function() {
    console.log('🔍 ========== SPDV DIAGNÓSTICO COMPLETO ==========');
    console.log('📅 Data/Hora:', new Date().toLocaleString());
    console.log('📍 Loja ID:', lojaIdAtual);
    console.log('👤 Usuário Logado:', usuarioLogado);
    console.log('📧 Email:', dadosUsuario?.email || 'N/A');
    console.log('🔑 Perfil:', dadosUsuario?.perfil || dadosUsuario?.nivel || dadosUsuario?.tipo || 'N/A');
    console.log('📅 Agendamento Habilitado:', agendamentoHabilitado);
    console.log('🎠 Carrossel Automático:', carrosselAutomaticoAtivo);
    console.log('🔄 Modo Operação:', modoAutomatico ? 'Automático' : 'Manual');
    console.log('📊 Agendamentos Ativos:', agendamentosAtivos.length);
    console.log('📦 Produtos:', produtos.length);
    console.log('🏷️ Categorias:', categorias.length);
    
    console.log('\n📋 ========== MÓDULOS CARREGADOS ==========');
    if (window.SPDV.modulos) {
        Object.keys(window.SPDV.modulos).forEach(modulo => {
            const qtd = Object.keys(window.SPDV.modulos[modulo]).length;
            console.log(`  ✅ ${modulo}: ${qtd} funções`);
        });
    }
    
    console.log('\n🎯 ========== FUNÇÕES DISPONÍVEIS ==========');
    for (const [categoria, funcoes] of Object.entries(window.SPDV.funcoes)) {
        console.log(`\n  📁 ${categoria.toUpperCase()}:`);
        for (const [funcao, desc] of Object.entries(funcoes)) {
            console.log(`     - ${funcao}: ${desc}`);
        }
    }
    
    console.log('\n✅ Diagnóstico concluído!');
};

// ============================================
// 5. FUNÇÃO PARA VERIFICAR INTEGRIDADE DOS MÓDULOS
// ============================================

window.SPDV.verificarIntegridade = function() {
    const problemas = [];
    const modulosEsperados = [
        'utilitarios', 'agendamentoConfig', 'agendamentoFila', 
        'agendamentoRender', 'agendamentoCarrossel', 'produtos', 
        'auth', 'ui', 'loja', 'auxiliares'
    ];
    
    for (const modulo of modulosEsperados) {
        if (!window.SPDV.funcoes[modulo]) {
            problemas.push(`Módulo ausente: ${modulo}`);
        } else {
            const qtdFuncoes = Object.keys(window.SPDV.funcoes[modulo]).length;
            if (qtdFuncoes === 0) {
                problemas.push(`Módulo vazio: ${modulo}`);
            }
        }
    }
    
    if (problemas.length > 0) {
        console.warn('⚠️ Problemas encontrados:');
        problemas.forEach(p => console.warn(`  - ${p}`));
        return false;
    }
    
    console.log('✅ Todos os módulos estão íntegros!');
    return true;
};

// ============================================
// 6. EXPOR SPDV GLOBALMENTE
// ============================================

window.SPDV = window.SPDV;
window.SPDV.version = '1.0.0';
window.SPDV.dataCriacao = new Date().toISOString();

console.log('✅ SPDV - Sistema de Controle Central Inicializado');
console.log('📖 Digite window.SPDV.diagnosticar() para diagnóstico completo');
console.log('📖 Digite window.SPDV.verificarIntegridade() para verificar módulos');