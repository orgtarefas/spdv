// home.js - SISTEMA HOME PDV MULTILOJA (Versão Corrigida - IMGBB)
console.log("🏠 Sistema PDV - Página Inicial (Versão IMGBB)");

import { lojaServices } from './firebase_config.js';

// Variáveis globais
let produtos = [];
let estatisticas = null;
let atividades = [];

// ============================================
// CONSTANTES GLOBAIS
// ============================================

// IMAGEM GERADA EM BASE64 QUANDO NÃO HOUVER IMAGENS
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjBmMWYyIiByeD0iMTAiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMjAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIiBzdHJva2U9IiNlNzRjM2MiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNNDAgMzVMNjAgNTVNNTAgNDVMNzAgMjVNNjAgMzVMMzAgNjVNNzAgMzVMNTAgNTVNMzAgMzVMMzUgMzBNNzAgNTVMNjUgNjBNMzUgNjVMMzAgNjBNNjUgMzVMNzAgMzAiIHN0cm9rZT0iI2U3NGMzYyIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8dGV4dCB4PSI1MCIgeT0iODUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzZjNzU3ZCIgZm9udC13ZWlnaHQ9IjUwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U0VNIEZPVE88L3RleHQ+Cjwvc3ZnPg==";

// ============================================
// 1. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página home carregada");
    
    // Mostrar loading inicial
    mostrarLoading('Inicializando sistema...', 'Carregando configurações...');
    
    try {
        // Verificar se a loja está carregada
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = '../../login.html';
            }, 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaServices.lojaId}`);
        console.log(`👤 Usuário: ${lojaServices.nomeUsuario}`);
        
        // Atualizar interface com dados da loja
        await atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Atualizar data/hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 60000);
        
        // Carregar dados iniciais
        await carregarDadosIniciais();
        
        // Esconder loading
        esconderLoading();
        
        console.log("✅ Sistema home pronto para uso");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        esconderLoading();
    }
});

// ============================================
// 2. ATUALIZAR INTERFACE DA LOJA
// ============================================
async function atualizarInterfaceLoja() {
    try {
        mostrarLoading('Carregando dados da loja...', 'Buscando informações...');
        
        // Buscar dados da loja do Firebase
        const resultado = await lojaServices.buscarDadosLoja();
        
        if (resultado.success) {
            const dadosLoja = resultado.data;
            
            console.log('🎯 Dados da loja carregados:', dadosLoja);
            
            // 1. Atualizar nome da loja em todos os elementos
            const nomeLoja = dadosLoja.nome || lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const elementosNome = [
                'lojaNomeHeader',
                'lojaNomeBemVindo', 
                'lojaNomeFooter'
            ];
            
            elementosNome.forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) {
                    elemento.textContent = nomeLoja;
                }
            });
            
            // 2. Atualizar título da página
            document.title = `${nomeLoja} - PDV Sistema`;
            
            // 3. Atualizar local da loja
            const lojaLocal = document.getElementById('lojaLocal');
            if (lojaLocal && dadosLoja.local) {
                lojaLocal.textContent = dadosLoja.local;
            }
            
            // 4. Atualizar informações adicionais no rodapé
            const footerInfo = document.getElementById('footerInfo');
            if (footerInfo) {
                let infoText = '';
                if (dadosLoja.telefone) infoText += `📞 ${dadosLoja.telefone}`;
                if (dadosLoja.email) infoText += infoText ? ` | ✉️ ${dadosLoja.email}` : `✉️ ${dadosLoja.email}`;
                if (dadosLoja.cnpj) infoText += infoText ? ` | 🏢 ${dadosLoja.cnpj}` : `🏢 ${dadosLoja.cnpj}`;
                
                footerInfo.textContent = infoText;
            }
            
        } else {
            console.warn('⚠️ Dados da loja não encontrados no Firebase, usando dados básicos');
            
            // Fallback: usar ID da loja formatado como nome
            const nomeLoja = lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const elementosNome = [
                'lojaNomeHeader',
                'lojaNomeBemVindo', 
                'lojaNomeFooter'
            ];
            
            elementosNome.forEach(id => {
                const elemento = document.getElementById(id);
                if (elemento) {
                    elemento.textContent = nomeLoja;
                }
            });
            
            document.title = `${nomeLoja} - PDV Sistema`;
        }
        
        // 5. Atualizar informações do usuário
        const userName = document.getElementById('userName');
        const userWelcome = document.getElementById('userWelcome');
        const userPerfil = document.getElementById('userPerfil');
        
        if (userName) userName.textContent = lojaServices.nomeUsuario;
        if (userWelcome) userWelcome.textContent = lojaServices.nomeUsuario;
        if (userPerfil) {
            const perfil = lojaServices.perfil || 'usuario';
            userPerfil.textContent = perfil.includes('admin') ? '👑 Administrador' : '👤 Vendedor';
            userPerfil.className = `user-perfil ${perfil.includes('admin') ? 'admin' : 'user'}`;
        }

        // 6. CARREGAR LOGO DA LOJA
        await carregarLogoLoja();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface da loja:', error);
        
        // Fallback mínimo
        const elementosNome = [
            'lojaNomeHeader',
            'lojaNomeBemVindo', 
            'lojaNomeFooter'
        ];
        
        elementosNome.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = lojaServices.lojaId || 'Loja';
            }
        });
    }
}

// ============================================
// 2.1. CARREGAR LOGO DA LOJA
// ============================================
async function carregarLogoLoja() {
    try {
        const lojaId = lojaServices.lojaId;
        if (!lojaId) return;
        
        // CAMINHO ABSOLUTO BASEADO NA ORIGEM
        const baseUrl = window.location.origin + '/spdv/';
        const caminhoLogo = `${baseUrl}imagens/${lojaId}/logo.png`;
        
        console.log(`🖼️ Carregando logo: ${caminhoLogo}`);
        
        const welcomeIcon = document.querySelector('.welcome-icon');
        if (!welcomeIcon) return;
        
        // Testa se a imagem existe
        fetch(caminhoLogo, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    welcomeIcon.innerHTML = '';
                    welcomeIcon.style.background = 'none';
                    welcomeIcon.style.padding = '0';
                    welcomeIcon.style.opacity = '1';
                    
                    const logoImg = document.createElement('img');
                    logoImg.src = caminhoLogo;
                    logoImg.alt = 'Logo da Loja';
                    logoImg.style.maxWidth = '120px';
                    logoImg.style.maxHeight = '120px';
                    logoImg.style.objectFit = 'contain';
                    logoImg.style.borderRadius = '8px';
                    
                    welcomeIcon.appendChild(logoImg);
                    console.log(`✅ Logo carregada com sucesso!`);
                } else {
                    console.log(`ℹ️ Logo não encontrada (${response.status})`);
                }
            })
            .catch(() => {
                console.log(`ℹ️ Logo não disponível`);
            });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// ============================================
// 3. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        // 1. Carregar produtos para consulta rápida
        await carregarProdutos();
        
        // 2. Carregar estatísticas
        await carregarEstatisticas();
        
        // 3. Carregar atividades recentes
        await carregarAtividadesRecentes();
        
        // 4. Atualizar status de conexão
        atualizarStatusConexao(true);
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
        mostrarMensagem("Erro ao carregar dados do sistema", "error");
    }
}

// ============================================
// 4. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
    }
    
    // Botão consulta rápida
    const btnConsultaRapida = document.getElementById('btnConsultaRapida');
    if (btnConsultaRapida) {
        btnConsultaRapida.addEventListener('click', abrirModalConsulta);
    }
    
    // BOTÃO RELATÓRIO
    const btnRelatorio = document.getElementById('btnRelatorio');
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', function(event) {
            event.preventDefault();
            mostrarMensagem('📊 Relatório em desenvolvimento! Em breve você poderá visualizar todos os relatórios do sistema.', 'info', 5000);
        });
    }
    
    // Modal consulta rápida
    const modalConsulta = document.getElementById('quickSearchModal');
    if (modalConsulta) {
        const modalClose = modalConsulta.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modalConsulta.style.display = 'none';
            });
        }
        
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                const searchInput = document.getElementById('searchProductInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    buscarProdutoConsultaRapida('');
                }
            });
        }
        
        modalConsulta.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
        
        const searchProductInput = document.getElementById('searchProductInput');
        if (searchProductInput) {
            searchProductInput.addEventListener('input', function() {
                buscarProdutoConsultaRapida(this.value);
            });
            
            searchProductInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarProdutoConsultaRapida(this.value);
                }
            });
        }
        
        const filterBtns = modalConsulta.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const searchInput = document.getElementById('searchProductInput');
                if (searchInput) {
                    buscarProdutoConsultaRapida(searchInput.value);
                }
            });
        });
    }
    
    // Filtros de atividades
    const activityFilters = document.querySelectorAll('.activity-filters .filter-btn');
    activityFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            activityFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filtro = this.dataset.filter;
            filtrarAtividades(filtro);
        });
    });
}

// ============================================
// 5. CARREGAR PRODUTOS PARA CONSULTA - CORRIGIDO!
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...', 'Atualizando catálogo...');
        
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            
            // ✅ CORRIGIDO: Só aplica BASE64 para produtos SEM imagem
            let contadorImgBB = 0;
            let contadorSemImagem = 0;
            
            produtos = produtos.map(produto => {
                // Verifica se TEM imagem do IMGBB (URL HTTP/HTTPS)
                const temImgBB = produto.imagem && 
                                typeof produto.imagem === 'string' && 
                                (produto.imagem.startsWith('http://') || 
                                 produto.imagem.startsWith('https://')) &&
                                produto.imagem.length > 20;
                
                if (temImgBB) {
                    // ✅ MANTÉM A IMAGEM ORIGINAL DO IMGBB
                    contadorImgBB++;
                    return produto;
                } else {
                    // ❌ SÓ APLICA BASE64 SE NÃO TIVER IMAGEM IMGBB
                    contadorSemImagem++;
                    produto.imagem = IMAGEM_PADRAO_BASE64;
                    return produto;
                }
            });
            
            // Atualizar badge
            const totalProdutosBadge = document.getElementById('totalProdutosBadge');
            if (totalProdutosBadge) {
                totalProdutosBadge.textContent = produtos.length;
                totalProdutosBadge.style.display = produtos.length > 0 ? 'flex' : 'none';
            }
            
            console.log(`✅ ${produtos.length} produtos carregados:`);
            console.log(`   🖼️ IMGBB: ${contadorImgBB} produtos`);
            console.log(`   📦 BASE64: ${contadorSemImagem} produtos (sem foto)`);
            
            const modal = document.getElementById('quickSearchModal');
            if (modal && modal.style.display === 'flex') {
                exibirTodosProdutos();
            }
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

// ============================================
// EXIBIR TODOS OS PRODUTOS
// ============================================
function exibirTodosProdutos() {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (!produtos || produtos.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto encontrado</p>
                <small>Não há produtos cadastrados no estoque</small>
            </div>
        `;
        return;
    }
    
    exibirResultadosBusca(produtos);
}

// ============================================
// 6. CARREGAR ESTATÍSTICAS
// ============================================
async function carregarEstatisticas() {
    try {
        mostrarLoading('Calculando estatísticas...', 'Analisando dados...');
        
        const resultado = await lojaServices.buscarEstatisticas();
        
        if (resultado.success) {
            estatisticas = resultado.data;
            atualizarEstatisticasUI();
        } else {
            console.error('❌ Erro ao carregar estatísticas:', resultado.error);
            estatisticas = null;
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar estatísticas:", error);
        estatisticas = null;
    }
}

function atualizarEstatisticasUI() {
    if (!estatisticas) return;
    
    try {
        const vendasHojeElement = document.getElementById('vendasHoje');
        const quantidadeVendasElement = document.getElementById('quantidadeVendas');
        
        if (vendasHojeElement) {
            vendasHojeElement.textContent = formatarMoeda(estatisticas.vendasHoje);
        }
        if (quantidadeVendasElement) {
            quantidadeVendasElement.textContent = `${estatisticas.quantidadeVendasHoje} venda${estatisticas.quantidadeVendasHoje !== 1 ? 's' : ''}`;
        }
        
        const totalProdutosElement = document.getElementById('totalProdutos');
        const produtosBaixoElement = document.getElementById('produtosBaixo');
        
        if (totalProdutosElement) totalProdutosElement.textContent = estatisticas.totalProdutos;
        if (produtosBaixoElement) produtosBaixoElement.textContent = `${estatisticas.produtosBaixoEstoque} com baixo estoque`;
        
        const valorEstoqueElement = document.getElementById('valorEstoque');
        if (valorEstoqueElement) {
            valorEstoqueElement.textContent = formatarMoeda(estatisticas.totalValorEstoque);
        }
        
        const metaMensal = estatisticas.meta_mensal || 10000;
        const vendasHojeNumero = parseFloat(estatisticas.vendasHoje) || 0;
        const percentual = metaMensal > 0 ? Math.min(Math.round((vendasHojeNumero / metaMensal) * 100), 100) : 0;
        const restante = Math.max(metaMensal - vendasHojeNumero, 0);
        
        const metaPercentualElement = document.getElementById('metaPercentual');
        const metaRestanteElement = document.getElementById('metaRestante');
        const metaProgressBar = document.getElementById('metaProgressBar');
        
        if (metaPercentualElement) metaPercentualElement.textContent = `${percentual}%`;
        if (metaRestanteElement) metaRestanteElement.textContent = formatarMoeda(restante);
        if (metaProgressBar) metaProgressBar.style.width = `${percentual}%`;
        
        const progressBar = document.querySelector('.stat-progress .progress-bar');
        if (progressBar && estatisticas.quantidadeVendasHoje > 0) {
            progressBar.style.width = '100%';
        }
        
        const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');
        if (ultimaAtualizacao) {
            ultimaAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        console.log('✅ Estatísticas atualizadas na interface');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas UI:', error);
    }
}

// ============================================
// 7. CARREGAR ATIVIDADES RECENTES
// ============================================
async function carregarAtividadesRecentes() {
    try {
        mostrarLoading('Carregando atividades...', 'Buscando histórico...');
        
        const resultado = await lojaServices.buscarVendas(10);
        
        if (resultado.success) {
            atividades = resultado.data;
            exibirAtividades(atividades);
        } else {
            console.error('❌ Erro ao carregar atividades:', resultado.error);
            atividades = [];
            exibirAtividades([]);
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar atividades:", error);
        atividades = [];
        exibirAtividades([]);
    }
}

function exibirAtividades(listaAtividades) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!listaAtividades || listaAtividades.length === 0) {
        activityList.innerHTML = `
            <div class="empty-activity">
                <i class="fas fa-history"></i>
                <p>Nenhuma atividade recente</p>
                <small>Realize vendas para ver atividades</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    listaAtividades.forEach(atividade => {
        let dataVenda;
        
        try {
            if (atividade.data_venda && typeof atividade.data_venda.toDate === 'function') {
                dataVenda = atividade.data_venda.toDate();
            } else if (atividade.data_criacao && typeof atividade.data_criacao.toDate === 'function') {
                dataVenda = atividade.data_criacao.toDate();
            } else if (atividade.data_venda) {
                dataVenda = new Date(atividade.data_venda);
            } else {
                dataVenda = new Date();
            }
        } catch (e) {
            dataVenda = new Date();
        }
        
        const horaFormatada = dataVenda.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dataFormatada = dataVenda.toLocaleDateString('pt-BR');
        
        let iconClass = 'fas fa-shopping-cart';
        if (atividade.status === 'cancelada') iconClass = 'fas fa-ban';
        if (atividade.status === 'pendente') iconClass = 'fas fa-clock';
        
        html += `
            <div class="activity-item" data-type="venda" data-status="${atividade.status || 'concluida'}">
                <div class="activity-icon ${atividade.status || 'concluida'}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">
                        <strong>Venda #${atividade.numero_venda || atividade.id.slice(-6)}</strong>
                        <span class="activity-time">${dataFormatada} ${horaFormatada}</span>
                    </div>
                    <div class="activity-details">
                        <span class="activity-vendedor">
                            <i class="fas fa-user"></i>
                            ${atividade.vendedor_nome || atividade.vendedor || 'Vendedor'}
                        </span>
                        <span class="activity-status ${atividade.status || 'concluida'}">
                            ${atividade.status === 'concluida' ? '✅ Concluída' : 
                              atividade.status === 'pendente' ? '⏳ Pendente' : 
                              atividade.status === 'cancelada' ? '❌ Cancelada' : '✅ Concluída'}
                        </span>
                        <span class="activity-amount">${formatarMoeda(atividade.total || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    activityList.innerHTML = html;
}

function filtrarAtividades(filtro) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    let atividadesFiltradas = atividades;
    
    if (filtro === 'vendas') {
        atividadesFiltradas = atividades;
    } else if (filtro === 'estoque') {
        atividadesFiltradas = [];
    }
    
    exibirAtividades(atividadesFiltradas);
}

// ============================================
// 8. CONSULTA RÁPIDA - MODAL
// ============================================

function abrirModalConsulta() {
    const modal = document.getElementById('quickSearchModal');
    const searchInput = document.getElementById('searchProductInput');
    
    if (modal && searchInput) {
        modal.style.display = 'flex';
        searchInput.value = '';
        searchInput.focus();
        
        const filterBtns = modal.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
        });
        
        exibirTodosProdutos();
        console.log('📱 Modal aberto - exibindo todos os produtos');
    }
}

function buscarProdutoConsultaRapida(termo) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        exibirResultadosBusca(produtos);
        return;
    }
    
    const filtroAtivo = document.querySelector('.search-filters .filter-btn.active');
    const tipoFiltro = filtroAtivo ? filtroAtivo.dataset.filter : 'all';
    
    let resultados = produtos.filter(produto => {
        const codigo = (produto.codigo || '').toLowerCase();
        const nome = (produto.nome || '').toLowerCase();
        const categoria = (produto.categoria || '').toLowerCase();
        const descricao = (produto.descricao || '').toLowerCase();
        
        return codigo.includes(termoLimpo) || 
               nome.includes(termoLimpo) || 
               categoria.includes(termoLimpo) || 
               descricao.includes(termoLimpo);
    });
    
    if (tipoFiltro === 'estoque') {
        resultados = resultados.filter(p => p.quantidade > 0);
    } else if (tipoFiltro === 'baixo') {
        resultados = resultados.filter(p => p.quantidade <= (p.estoque_minimo || 5) && p.quantidade > 0);
    }
    
    exibirResultadosBusca(resultados);
}

// ============================================
// EXIBIR RESULTADOS DA BUSCA - CORRIGIDO!
// ============================================
function exibirResultadosBusca(resultados) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    if (!resultados || resultados.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-search"></i>
                <p>Nenhum produto encontrado</p>
                <small>Tente outro termo de busca ou altere o filtro</small>
            </div>
        `;
        return;
    }
    
    let html = '<div class="results-list">';
    
    resultados.forEach(produto => {
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        const temEstoque = produto.quantidade > 0;
        const precoFormatado = formatarMoeda(produto.preco);
        
        // ✅ CORRIGIDO: Usa a imagem do IMGBB ou BASE64, mas NUNCA substitui IMGBB por BASE64
        const imagemProduto = produto.imagem && 
                            typeof produto.imagem === 'string' && 
                            produto.imagem.length > 0 ? produto.imagem : IMAGEM_PADRAO_BASE64;
        
        let stockClass = 'normal';
        let stockText = `${produto.quantidade || 0} ${produto.unidade || 'UN'}`;
        if (!temEstoque) {
            stockClass = 'out';
            stockText = 'ESGOTADO';
        } else if (estoqueBaixo) {
            stockClass = 'low';
            stockText = `${produto.quantidade} ${produto.unidade || 'UN'} ⚠️`;
        }
        
        html += `
            <div class="product-result">
                <div class="product-image-container">
                    <img src="${imagemProduto}" 
                         alt="${produto.nome || 'Produto'}" 
                         class="product-image"
                         loading="lazy"
                         onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                </div>
                <div class="product-result-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${stockClass}">
                        ${stockText}
                    </span>
                </div>
                <div class="product-name">${produto.nome || 'Produto sem nome'}</div>
                ${produto.categoria ? `<div class="product-category"><i class="fas fa-tag"></i> ${produto.categoria}</div>` : ''}
                <div class="product-details">
                    <div class="product-price">
                        <strong>Preço:</strong>
                        <span>${precoFormatado}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-action btn-info" onclick="verDetalhesProduto('${produto.id}')">
                            <i class="fas fa-info-circle"></i> Detalhes
                        </button>
                        ${temEstoque ? `
                        <button class="btn-action btn-sell" onclick="irParaVendaComProduto('${produto.id}')">
                            <i class="fas fa-cart-plus"></i> Vender
                        </button>
                        ` : `
                        <button class="btn-action btn-info" disabled style="opacity: 0.5; cursor: not-allowed;">
                            <i class="fas fa-times-circle"></i> Indisponível
                        </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    searchResults.innerHTML = html;
}

// ============================================
// FUNÇÕES DOS BOTÕES DO MODAL
// ============================================
window.verDetalhesProduto = async function(produtoId) {
    try {
        const resultado = await lojaServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
            const estoqueStatus = estoqueBaixo ? 'BAIXO' : 'NORMAL';
            
            let mensagem = `📦 DETALHES DO PRODUTO\n\n`;
            mensagem += `Código: ${produto.codigo || 'Não informado'}\n`;
            mensagem += `Nome: ${produto.nome || 'Sem nome'}\n`;
            mensagem += `Categoria: ${produto.categoria || 'Não informada'}\n`;
            mensagem += `Estoque: ${produto.quantidade || 0} ${produto.unidade || 'UN'}\n`;
            mensagem += `Estoque mínimo: ${produto.estoque_minimo || 5} ${produto.unidade || 'UN'}\n`;
            mensagem += `Status: ${estoqueStatus}\n`;
            mensagem += `Preço venda: ${formatarMoeda(produto.preco)}\n`;
            mensagem += `Preço custo: ${formatarMoeda(produto.preco_custo)}\n`;
            
            if (produto.preco_custo && produto.preco_custo > 0) {
                const margem = calcularMargem(produto.preco_custo, produto.preco);
                mensagem += `Margem: ${margem}%\n`;
            }
            
            if (produto.descricao) mensagem += `Descrição: ${produto.descricao}\n`;
            if (produto.fornecedor) mensagem += `Fornecedor: ${produto.fornecedor}\n`;
            
            alert(mensagem);
        } else {
            mostrarMensagem('Produto não encontrado', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do produto:', error);
        mostrarMensagem('Erro ao carregar detalhes', 'error');
    }
};

window.irParaVendaComProduto = function(produtoId) {
    sessionStorage.setItem('produto_selecionado_venda', produtoId);
    
    const modal = document.getElementById('quickSearchModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    window.location.href = 'venda.html';
};

function calcularMargem(custo, venda) {
    if (!custo || custo <= 0) return 'N/A';
    const margem = ((venda - custo) / custo) * 100;
    return margem.toFixed(1);
}

// ============================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    elemento.textContent = dataFormatada;
}

function atualizarStatusConexao(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const statusText = statusElement.querySelector('#statusText');
    const icon = statusElement.querySelector('i');
    
    if (conectado) {
        if (statusText) statusText.textContent = 'Conectado';
        if (icon) icon.style.color = '#27ae60';
        statusElement.style.color = '#27ae60';
    } else {
        if (statusText) statusText.textContent = 'Desconectado';
        if (icon) icon.style.color = '#e74c3c';
        statusElement.style.color = '#e74c3c';
    }
}

function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail');
        
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarMensagem(texto, tipo = 'info', tempo = 4000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    const icon = alert.querySelector('.message-icon');
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    const closeBtn = alert.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

// Adicionar estilos CSS dinâmicos
(function adicionarEstilos() {
    const estilo = document.createElement('style');
    estilo.textContent = `
        /* Estilos específicos para a versão dinâmica */
        
        .user-perfil {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-left: 0.5rem;
            font-weight: 500;
        }
        
        .user-perfil.admin {
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: white;
        }
        
        .user-perfil.user {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .user-welcome {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.5rem;
            color: #555;
        }
        
        .user-welcome i {
            font-size: 1.5rem;
            color: #3498db;
        }
        
        .action-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #e74c3c;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .stat-progress {
            height: 4px;
            background: #ecf0f1;
            border-radius: 2px;
            margin-top: 0.5rem;
            overflow: hidden;
        }
        
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #2ecc71, #27ae60);
            border-radius: 2px;
            transition: width 0.5s ease;
        }
        
        .stat-trend {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 0.5rem;
        }
        
        .stat-detail {
            font-size: 0.85rem;
            color: #7f8c8d;
            margin-top: 0.5rem;
        }
        
        .activity-filters {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .filter-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #ddd;
            background: white;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        
        .filter-btn:hover {
            border-color: #3498db;
            color: #3498db;
        }
        
        .filter-btn.active {
            background: #3498db;
            color: white;
            border-color: #3498db;
        }
        
        .search-clear {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.5rem;
        }
        
        .search-clear:hover {
            color: #e74c3c;
        }
        
        .search-filters {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .product-stock.out {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .product-stock.low {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .product-stock.normal {
            background-color: #d4edda;
            color: #155724;
        }
        
        .activity-status.concluida {
            color: #27ae60;
        }
        
        .activity-status.pendente {
            color: #f39c12;
        }
        
        .activity-status.cancelada {
            color: #e74c3c;
        }
        
        .activity-vendedor {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: #555;
        }
        
        .footer-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-top: 0.5rem;
        }
        
        #footerVersao {
            font-size: 0.9rem;
            color: #95a5a6;
        }
        
        .header-info {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.25rem;
        }
        
        /* Estilos para o modal de consulta */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .modal-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .modal-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-close:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .modal-body {
            padding: 1.5rem;
        }
        
        .search-box {
            position: relative;
            margin-bottom: 1rem;
        }
        
        .search-box i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
        }
        
        .search-box input {
            width: 100%;
            padding: 1rem 3rem 1rem 3rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .search-box input:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        
        .search-results {
            max-height: 400px;
            overflow-y: auto;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #eee;
        }
        
        .product-image-container {
            width: 100%;
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        
        .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .results-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 16px;
            padding: 8px;
        }
        
        .product-result {
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: all 0.3s;
            border: 1px solid #eee;
        }
        
        .product-result:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.1);
            border-color: #3498db;
        }
        
        .product-code {
            font-size: 0.75rem;
            color: #7f8c8d;
            background: #f1f3f4;
            padding: 4px 8px;
            border-radius: 12px;
        }
        
        .product-name {
            font-size: 1rem;
            font-weight: 600;
            color: #2c3e50;
            margin: 8px 0 4px;
        }
        
        .product-category {
            font-size: 0.8rem;
            color: #7f8c8d;
            margin-bottom: 12px;
        }
        
        .product-price {
            display: flex;
            align-items: baseline;
            gap: 6px;
            margin-bottom: 12px;
        }
        
        .product-price strong {
            font-size: 0.85rem;
            color: #7f8c8d;
        }
        
        .product-price span {
            font-size: 1.2rem;
            font-weight: 700;
            color: #27ae60;
        }
        
        .product-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        
        .btn-action {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-info {
            background: #ecf0f1;
            color: #2c3e50;
        }
        
        .btn-info:hover {
            background: #e0e6e8;
        }
        
        .btn-sell {
            background: linear-gradient(135deg, #27ae60, #219a52);
            color: white;
        }
        
        .btn-sell:hover {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(46,204,113,0.3);
        }
        
        .empty-results {
            text-align: center;
            padding: 40px 20px;
            color: #7f8c8d;
        }
        
        .empty-results i {
            font-size: 3rem;
            margin-bottom: 16px;
            opacity: 0.3;
        }
        
        @media (max-width: 768px) {
            .results-list {
                grid-template-columns: 1fr;
            }
            
            .product-actions {
                grid-template-columns: 1fr;
            }
        }
        
        /* Estilos para loading em atividades */
        .loading-activity {
            text-align: center;
            padding: 2rem;
        }
        
        .loading-activity .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
            .header-right {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .header-info {
                margin-top: 0.5rem;
            }
            
            .user-welcome {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
            }
            
            .footer-info {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .modal-content {
                width: 95%;
                max-height: 90vh;
            }
        }
    `;
    document.head.appendChild(estilo);
})();

console.log("✅ Sistema home dinâmico completamente carregado!");
