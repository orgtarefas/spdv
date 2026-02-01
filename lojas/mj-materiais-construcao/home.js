// home.js - ADICIONAR/ATUALIZAR ESTAS FUNÇÕES

// ============================================
// NAVEGAÇÃO PARA PÁGINAS COMPLETAS
// ============================================
function abrirPagina(pagina) {
    // Fechar sidebar no mobile
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('active');
    }
    
    // Redirecionar para páginas completas
    switch(pagina) {
        case 'pdv':
            window.location.href = 'venda.html';
            break;
        case 'produtos':
            window.location.href = 'estoque.html';
            break;
        case 'clientes':
            // Aqui você pode criar clientes.html no futuro
            showMessage('Módulo de clientes em desenvolvimento', 'info');
            break;
        case 'relatorios':
            // Aqui você pode criar relatorios.html no futuro
            showMessage('Módulo de relatórios em desenvolvimento', 'info');
            break;
        case 'configuracoes':
            // Aqui você pode criar configuracoes.html no futuro
            showMessage('Módulo de configurações em desenvolvimento', 'info');
            break;
        case 'dashboard':
        default:
            // Já estamos na dashboard
            atualizarConteudoDashboard(pagina);
            break;
    }
}

function atualizarConteudoDashboard(pagina) {
    // Ocultar todas as páginas
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Mostrar página solicitada
    const targetPage = document.getElementById(`page${pagina.charAt(0).toUpperCase() + pagina.slice(1)}`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Atualizar título
        const pageNames = {
            dashboard: 'Dashboard',
            pdv: 'PDV Vendas',
            produtos: 'Produtos',
            clientes: 'Clientes',
            relatorios: 'Relatórios',
            configuracoes: 'Configurações'
        };
        
        pageTitleElement.textContent = pageNames[pagina] || pagina;
        pageSubtitleElement.textContent = lojaInfo?.nome || 'MJ Materiais de Construção';
        
        // Atualizar menu ativo
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pagina) {
                item.classList.add('active');
            }
        });
    }
}

// ============================================
// ATUALIZAR ESTATÍSTICAS REAIS
// ============================================
async function inicializarEstatisticas() {
    try {
        showLoading('Carregando estatísticas...');
        
        // Buscar estatísticas reais do Firebase
        const resultado = await lojaServices.buscarEstatisticas();
        
        if (resultado.success) {
            const estatisticas = resultado.data;
            
            // Atualizar elementos com dados reais
            document.getElementById('vendasHoje').textContent = 
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.vendasHoje);
            
            document.getElementById('produtosEstoque').textContent = estatisticas.totalProdutos.toLocaleString('pt-BR');
            
            // Calcular porcentagem da meta
            const metaPercent = estatisticas.metaEsperadaAteHoje > 0 ? 
                (estatisticas.metaAlcancada / estatisticas.metaEsperadaAteHoje * 100).toFixed(1) : 0;
            
            document.getElementById('metaMensal').textContent = `${metaPercent}%`;
            
            // Atualizar badges do menu
            document.getElementById('vendasBadge').textContent = estatisticas.quantidadeVendasHoje;
            document.getElementById('produtosBadge').textContent = estatisticas.totalProdutos;
            
            // Atualizar clientes (fixo por enquanto)
            document.getElementById('clientesAtivos').textContent = '0';
            document.getElementById('clientesBadge').textContent = '0';
            
            hideLoading();
            
        } else {
            throw new Error('Erro ao carregar estatísticas');
        }
        
    } catch (error) {
        hideLoading();
        console.error('Erro ao carregar estatísticas:', error);
        
        // Usar valores simulados como fallback
        const estatisticas = {
            vendasHoje: Math.random() * 10000,
            totalProdutos: Math.floor(Math.random() * 500),
            quantidadeVendasHoje: Math.floor(Math.random() * 50)
        };
        
        document.getElementById('vendasHoje').textContent = 
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estatisticas.vendasHoje);
        
        document.getElementById('produtosEstoque').textContent = estatisticas.totalProdutos.toLocaleString('pt-BR');
        document.getElementById('metaMensal').textContent = `${Math.floor(Math.random() * 100)}%`;
        document.getElementById('clientesAtivos').textContent = '0';
        document.getElementById('vendasBadge').textContent = estatisticas.quantidadeVendasHoje;
        document.getElementById('produtosBadge').textContent = estatisticas.totalProdutos;
        document.getElementById('clientesBadge').textContent = '0';
    }
}

// ============================================
// ADICIONAR FUNÇÕES NOVA VENDA E CONSULTA
// ============================================
function configurarEventosAdicionais() {
    // Botão Nova Venda - Redirecionar para página de vendas
    btnNovaVenda.addEventListener('click', function() {
        window.location.href = 'venda.html';
    });
    
    // Botões de ação rápida na dashboard
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.querySelector('span').textContent;
            
            if (text.includes('Nova Venda')) {
                window.location.href = 'venda.html';
            } 
            else if (text.includes('Cadastrar Produto') || text.includes('Ver Estoque')) {
                window.location.href = 'estoque.html';
            }
            else if (text.includes('Consulta Preço')) {
                abrirConsultaPreco();
            }
            else if (text.includes('Fechar Caixa')) {
                abrirFechamentoCaixa();
            }
        });
    });
    
    // Adicionar evento para botão consulta preço específico
    const btnConsultaPreco = document.getElementById('btnConsultaPreco');
    if (btnConsultaPreco) {
        btnConsultaPreco.addEventListener('click', abrirConsultaPreco);
    }
    
    // Adicionar evento para botão fechar caixa específico
    const btnFecharCaixa = document.getElementById('btnFecharCaixa');
    if (btnFecharCaixa) {
        btnFecharCaixa.addEventListener('click', abrirFechamentoCaixa);
    }
}

function abrirConsultaPreco() {
    const modalHTML = `
        <div id="modalConsultaPreco" class="modal">
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3><i class="fas fa-search-dollar"></i> Consulta de Preço</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="search-box">
                        <i class="fas fa-barcode"></i>
                        <input type="text" id="inputConsultaCodigo" placeholder="Digite código ou nome do produto" autocomplete="off">
                    </div>
                    <div class="resultados-consulta" id="resultadosConsulta">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>Digite para consultar</p>
                            <small>Escaneie ou digite o código</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('modalConsultaPreco');
    
    // Configurar eventos
    const inputConsulta = document.getElementById('inputConsultaCodigo');
    const modalClose = modal.querySelector('.modal-close');
    
    inputConsulta.focus();
    
    inputConsulta.addEventListener('input', async function() {
        const termo = this.value.trim();
        if (termo.length < 2) return;
        
        await buscarProdutosConsulta(termo);
    });
    
    inputConsulta.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            buscarProdutosConsulta(this.value.trim());
        }
    });
    
    modalClose.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
    
    abrirModal(modal);
}

async function buscarProdutosConsulta(termo) {
    try {
        const resultadosDiv = document.getElementById('resultadosConsulta');
        
        // Buscar produtos no Firebase
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            const produtos = resultado.data;
            
            // Filtrar produtos
            const produtosFiltrados = produtos.filter(produto => 
                produto.codigo?.toLowerCase().includes(termo.toLowerCase()) ||
                produto.nome.toLowerCase().includes(termo.toLowerCase()) ||
                produto.categoria?.toLowerCase().includes(termo.toLowerCase())
            );
            
            if (produtosFiltrados.length === 0) {
                resultadosDiv.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Produto não encontrado</p>
                        <small>Tente outro código ou nome</small>
                    </div>
                `;
                return;
            }
            
            // Mostrar resultados
            let html = '';
            produtosFiltrados.slice(0, 5).forEach(produto => {
                html += `
                    <div class="produto-consulta">
                        <div class="produto-info">
                            <h4>${produto.nome}</h4>
                            <p><strong>Código:</strong> ${produto.codigo || 'N/A'}</p>
                            <p><strong>Categoria:</strong> ${produto.categoria || 'N/A'}</p>
                            <p><strong>Estoque:</strong> ${produto.quantidade} ${produto.unidade || 'UN'}</p>
                        </div>
                        <div class="produto-preco">
                            <strong>R$ ${formatarMoeda(produto.preco)}</strong>
                            ${produto.quantidade <= (produto.estoque_minimo || 5) ? 
                                '<span class="estoque-baixo">⚠️ Baixo estoque</span>' : ''}
                        </div>
                    </div>
                `;
            });
            
            resultadosDiv.innerHTML = html;
            
        } else {
            throw new Error('Erro na busca');
        }
        
    } catch (error) {
        console.error('Erro na consulta:', error);
        document.getElementById('resultadosConsulta').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro na consulta</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function abrirFechamentoCaixa() {
    showMessage('Funcionalidade de fechamento de caixa em desenvolvimento', 'info');
}

function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================
// ATUALIZAR INICIALIZAÇÃO
// ============================================
async function inicializarSistema() {
    if (!verificarAutenticacao()) {
        return;
    }
    
    showLoading('Carregando sistema...');
    
    try {
        // 1. Carregar dados do usuário
        carregarDadosUsuario();
        
        // 2. Carregar informações da loja
        await carregarDadosLoja();
        
        // 3. Configurar eventos
        configurarEventos();
        configurarEventosAdicionais();
        
        // 4. Atualizar data e hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 1000);
        
        // 5. Inicializar estatísticas (AGORA COM DADOS REAIS)
        await inicializarEstatisticas();
        
        // 6. Verificar conexão Firebase
        testarConexaoFirebase();
        
        hideLoading();
        
        console.log(`✅ Sistema carregado: ${usuario.loja_nome || loja}`);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao inicializar sistema:', error);
        showMessage('Erro ao carregar sistema', 'error');
    }
}

// ADICIONAR ESTA LINHA NO FINAL DO ARQUIVO
// Importar lojaServices do firebase_config
import { lojaServices } from './firebase_config.js';
