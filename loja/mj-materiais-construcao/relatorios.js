// relatorios.js
console.log("📊 Sistema de Relatórios - Iniciando...");

import { 
    lojaServices, 
    db, 
    collection, 
    getDocs, 
    getDoc, 
    doc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from './novo_firebase_config.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let vendas = [];
let vendasFiltradas = [];
let produtosEstoque = [];
let produtosEstoqueFiltrados = [];

let paginaAtualVendas = 1;
let paginaAtualEstoque = 1;
const itensPorPagina = 15;

let dadosUsuario = null;
let lojaIdAtual = null;

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (lojaServices && lojaServices.lojaId) {
        lojaIdAtual = lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// RECUPERAR DADOS DO USUÁRIO
// ============================================
try {
    const usuarioInfo = sessionStorage.getItem('usuarioInfo');
    if (usuarioInfo) {
        const dados = JSON.parse(usuarioInfo);
        dadosUsuario = {
            nome: dados.nome,
            email: dados.email,
            tipo: dados.tipo,
            perfil: dados.perfil,
            loja: dados.loja
        };
        console.log('✅ Dados do usuário recuperados:', dadosUsuario);
    } else {
        const dadosSalvos = sessionStorage.getItem('dadosUsuario');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            dadosUsuario = dados;
            console.log('✅ Dados do usuário recuperados (legado):', dadosUsuario);
        }
    }
} catch (e) {
    console.warn('⚠️ Erro ao recuperar dados do usuário:', e);
}

// ============================================
// VERIFICAR ACESSO
// ============================================
async function verificarAcesso() {
    console.log("🔒 Verificando permissão de acesso aos relatórios...");
    
    let perfil = '';
    
    if (dadosUsuario) {
        perfil = (dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo || '').toLowerCase();
    } else if (window.dadosUsuario) {
        perfil = (window.dadosUsuario.perfil || window.dadosUsuario.nivel || window.dadosUsuario.tipo || '').toLowerCase();
        dadosUsuario = window.dadosUsuario;
    }
    
    console.log(`👤 Perfil: ${perfil}`);
    
    const perfisPermitidos = ['admin', 'gerente'];
    
    if (perfisPermitidos.includes(perfil)) {
        console.log("✅ Acesso permitido aos relatórios");
        return true;
    }
    
    console.log("❌ Acesso negado aos relatórios");
    mostrarMensagem('Acesso restrito a administradores e gerentes', 'error', 3000);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
    return false;
}

// ============================================
// CARREGAR VENDAS - CORRIGIDO
// ============================================
async function carregarVendas() {
    try {
        mostrarLoading('Carregando vendas...');
        
        // 🔥 OBTER O BANCO DE VENDAS DIRETAMENTE DO getLojaConfig
        let bancoVendas = null;
        
        // Tentativa 1: Usar getLojaConfig do window
        if (window.getLojaConfig && lojaIdAtual) {
            const config = window.getLojaConfig(lojaIdAtual);
            bancoVendas = config?.banco_vendas;
            console.log(`📦 Banco de vendas do getLojaConfig: ${bancoVendas}`);
        }
        
        // Tentativa 2: Usar lojaServices.config
        if (!bancoVendas && lojaServices && lojaServices.config) {
            bancoVendas = lojaServices.config?.banco_vendas;
            console.log(`📦 Banco de vendas do lojaServices.config: ${bancoVendas}`);
        }
        
        // Tentativa 3: Fallback baseado no lojaId
        if (!bancoVendas && lojaIdAtual) {
            bancoVendas = `vendas_${lojaIdAtual.replace(/-/g, '_')}`;
            console.log(`📦 Banco de vendas (fallback): ${bancoVendas}`);
        }
        
        if (!bancoVendas) {
            throw new Error('Banco de vendas não identificado');
        }
        
        console.log(`🔍 Buscando vendas em: ${bancoVendas}`);
        console.log(`🏪 Loja ID atual: ${lojaIdAtual}`);
        
        const vendasRef = collection(db, bancoVendas);
        const snapshot = await getDocs(vendasRef);
        
        console.log(`📁 Documentos encontrados: ${snapshot.size}`);
        
        vendas = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Converter timestamps corretamente
            let dataVenda = null;
            if (data.data_venda) {
                if (data.data_venda.toDate) {
                    dataVenda = data.data_venda.toDate();
                } else if (data.data_venda.seconds) {
                    dataVenda = new Date(data.data_venda.seconds * 1000);
                } else {
                    dataVenda = new Date(data.data_venda);
                }
            } else if (data.data_criacao) {
                if (data.data_criacao.toDate) {
                    dataVenda = data.data_criacao.toDate();
                } else if (data.data_criacao.seconds) {
                    dataVenda = new Date(data.data_criacao.seconds * 1000);
                } else {
                    dataVenda = new Date(data.data_criacao);
                }
            } else {
                dataVenda = new Date();
            }
            
            vendas.push({
                id: doc.id,
                ...data,
                data_venda_obj: dataVenda
            });
        });
        
        // Filtrar apenas vendas da loja atual
        vendas = vendas.filter(v => v.loja_id === lojaIdAtual);
        
        // Ordenar por data (mais recentes primeiro)
        vendas.sort((a, b) => {
            const dataA = a.data_venda_obj;
            const dataB = b.data_venda_obj;
            return dataB - dataA;
        });
        
        console.log(`✅ ${vendas.length} vendas carregadas`);
        if (vendas.length > 0) {
            console.log('📋 Primeira venda:', vendas[0]);
        }
        
        // Carregar vendedores para o filtro
        carregarVendedoresFiltro();
        
        // Aplicar filtros iniciais
        aplicarFiltrosVendas();
        
    } catch (error) {
        console.error('❌ Erro ao carregar vendas:', error);
        mostrarMensagem('Erro ao carregar vendas: ' + error.message, 'error');
        
        const tbody = document.getElementById('vendasTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar vendas</p>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }
    } finally {
        esconderLoading();
    }
}

// ============================================
// CARREGAR ESTOQUE
// ============================================
async function carregarEstoque() {
    try {
        mostrarLoading('Carregando estoque...');
        
        const resultado = await lojaServices.buscarProdutos();
        
        if (resultado.success) {
            produtosEstoque = resultado.data;
            console.log(`✅ ${produtosEstoque.length} produtos carregados`);
            
            carregarCategoriasFiltro();
            aplicarFiltrosEstoque();
        } else {
            console.error('Erro ao carregar estoque:', resultado.error);
            produtosEstoque = [];
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar estoque:', error);
        produtosEstoque = [];
    } finally {
        esconderLoading();
    }
}

// ============================================
// FUNÇÕES DE FILTRO E RENDERIZAÇÃO (manter as existentes)
// ============================================
// ... (coloque aqui as funções que você já tem: carregarVendedoresFiltro, 
// aplicarFiltrosVendas, atualizarResumoVendas, renderizarTabelaVendas,
// carregarCategoriasFiltro, aplicarFiltrosEstoque, etc.)

// ============================================
// INICIALIZAÇÃO
// ============================================
(async function() {
    console.log("📄 Inicializando relatórios...");
    
    mostrarLoading('Carregando sistema...');
    
    try {
        // Extrair loja ID primeiro
        extrairLojaIdDaURL();
        
        if (!lojaIdAtual && lojaServices) {
            lojaIdAtual = lojaServices.lojaId;
        }
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // Verificar acesso
        const acessoPermitido = await verificarAcesso();
        if (!acessoPermitido) return;
        
        // Carregar dados
        carregarDadosLoja();
        configurarEventos();
        
        // Atualizar nome do usuário
        const userName = document.getElementById('userName');
        if (userName && dadosUsuario) {
            let tipoDisplay = '';
            if (dadosUsuario.tipo === 'admin') {
                tipoDisplay = ' (Admin)';
            } else if (dadosUsuario.tipo === 'funcionario') {
                const perfilFormatado = (dadosUsuario.perfil || dadosUsuario.nivel || '').charAt(0).toUpperCase() + 
                                        (dadosUsuario.perfil || dadosUsuario.nivel || '').slice(1);
                tipoDisplay = ` (${perfilFormatado})`;
            }
            userName.textContent = (dadosUsuario.nome || 'Usuário') + tipoDisplay;
        }
        
        // Carregar dados
        await carregarVendas();
        await carregarEstoque();
        
        setInterval(atualizarRelogio, 1000);
        atualizarRelogio();
        
        esconderLoading();
        console.log("✅ Relatórios prontos!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar relatórios', 'error');
        esconderLoading();
    }
})();

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function carregarDadosLoja() {
    const lojaId = lojaIdAtual;
    if (!lojaId) return;
    
    try {
        const nomeLoja = lojaServices?.dadosLoja?.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const lojaNomeHeader = document.getElementById('lojaNomeHeader');
        const footerLojaNome = document.getElementById('footerLojaNome');
        const headerLogo = document.getElementById('headerLogo');
        
        if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
        if (footerLojaNome) footerLojaNome.textContent = nomeLoja;
        
        if (headerLogo) {
            headerLogo.src = `../../imagens/${lojaId}/logo.png`;
            headerLogo.onerror = () => {
                headerLogo.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE2IiByPSI4IiBmaWxsPSIjZTc0YzNjIiBvcGFjaXR5PSIwLjEiLz48cGF0aCBkPSJNMTAgMjhMMTUgMThMMjAgMjNMMjUgMTVMMzAgMjNMMzUgMjhIMTBaIiBmaWxsPSIjZTc0YzNjIiBvcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIyMCIgeT0iMzIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MT0dPPC90ZXh0Pjwvc3ZnPg==';
            };
        }
        
        document.title = `${nomeLoja} - Relatórios`;
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
    }
}

function carregarVendedoresFiltro() {
    const vendedores = new Set();
    vendas.forEach(v => {
        if (v.vendedor_nome) vendedores.add(v.vendedor_nome);
        else if (v.vendedor?.nome) vendedores.add(v.vendedor.nome);
    });
    
    const select = document.getElementById('filtroVendedor');
    if (select) {
        select.innerHTML = '<option value="todos">Todos</option>';
        Array.from(vendedores).sort().forEach(nome => {
            select.innerHTML += `<option value="${nome}">${nome}</option>`;
        });
    }
}

function carregarCategoriasFiltro() {
    const categorias = new Set();
    produtosEstoque.forEach(p => {
        if (p.categoria) categorias.add(p.categoria);
    });
    
    const select = document.getElementById('filtroCategoriaEstoque');
    if (select) {
        select.innerHTML = '<option value="todos">Todas</option>';
        Array.from(categorias).sort().forEach(cat => {
            select.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
    
    // Filtro período
    document.getElementById('filtroPeriodo')?.addEventListener('change', (e) => {
        const isPersonalizado = e.target.value === 'personalizado';
        document.getElementById('dataRangeGroup').style.display = isPersonalizado ? 'block' : 'none';
        document.getElementById('dataFimGroup').style.display = isPersonalizado ? 'block' : 'none';
    });
    
    // Botões vendas
    document.getElementById('btnAplicarFiltros')?.addEventListener('click', aplicarFiltrosVendas);
    document.getElementById('btnLimparFiltros')?.addEventListener('click', () => {
        document.getElementById('filtroPeriodo').value = 'hoje';
        document.getElementById('filtroCanal').value = 'todos';
        document.getElementById('filtroPagamento').value = 'todos';
        document.getElementById('filtroVendedor').value = 'todos';
        document.getElementById('dataInicio').value = '';
        document.getElementById('dataFim').value = '';
        document.getElementById('dataRangeGroup').style.display = 'none';
        document.getElementById('dataFimGroup').style.display = 'none';
        aplicarFiltrosVendas();
    });
    document.getElementById('btnExportarVendas')?.addEventListener('click', () => exportarParaExcel('vendas'));
    document.getElementById('btnImprimirVendas')?.addEventListener('click', () => imprimirRelatorio('vendas'));
    
    // Paginação vendas
    document.getElementById('prevPageVendas')?.addEventListener('click', () => {
        if (paginaAtualVendas > 1) {
            paginaAtualVendas--;
            renderizarTabelaVendas();
        }
    });
    document.getElementById('nextPageVendas')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(vendasFiltradas.length / itensPorPagina);
        if (paginaAtualVendas < totalPaginas) {
            paginaAtualVendas++;
            renderizarTabelaVendas();
        }
    });
    
    // Busca vendas
    document.getElementById('buscaVendas')?.addEventListener('input', (e) => {
        const busca = e.target.value.toLowerCase();
        if (busca) {
            vendasFiltradas = vendasFiltradas.filter(v => {
                const numero = (v.numero || v.numero_venda || '').toLowerCase();
                const cliente = (v.cliente?.nome || v.cliente_nome || '').toLowerCase();
                return numero.includes(busca) || cliente.includes(busca);
            });
        } else {
            aplicarFiltrosVendas();
        }
        paginaAtualVendas = 1;
        renderizarTabelaVendas();
    });
    
    // Botões estoque
    document.getElementById('btnAplicarFiltrosEstoque')?.addEventListener('click', aplicarFiltrosEstoque);
    document.getElementById('btnLimparFiltrosEstoque')?.addEventListener('click', () => {
        document.getElementById('filtroCategoriaEstoque').value = 'todos';
        document.getElementById('filtroStatusEstoque').value = 'todos';
        document.getElementById('filtroMinimoEstoque').value = 'todos';
        document.getElementById('buscaEstoque').value = '';
        aplicarFiltrosEstoque();
    });
    document.getElementById('btnExportarEstoque')?.addEventListener('click', () => exportarParaExcel('estoque'));
    document.getElementById('btnImprimirEstoque')?.addEventListener('click', () => imprimirRelatorio('estoque'));
    
    // Paginação estoque
    document.getElementById('prevPageEstoque')?.addEventListener('click', () => {
        if (paginaAtualEstoque > 1) {
            paginaAtualEstoque--;
            renderizarTabelaEstoque();
        }
    });
    document.getElementById('nextPageEstoque')?.addEventListener('click', () => {
        const totalPaginas = Math.ceil(produtosEstoqueFiltrados.length / itensPorPagina);
        if (paginaAtualEstoque < totalPaginas) {
            paginaAtualEstoque++;
            renderizarTabelaEstoque();
        }
    });
    
    // Busca estoque
    document.getElementById('buscaEstoque')?.addEventListener('input', aplicarFiltrosEstoque);
    
    // Menu de perfil
    configurarMenuPerfil();
    
    // Botão imprimir detalhes
    document.getElementById('btnImprimirDetalhes')?.addEventListener('click', () => {
        const modalBody = document.getElementById('detalhesVendaBody');
        if (modalBody) {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head><title>Detalhes da Venda</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f8f9fa; }
                    </style>
                    </head>
                    <body>${modalBody.innerHTML}</body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 500);
            }
        }
    });
    
    console.log("✅ Eventos configurados");
}

function configurarMenuPerfil() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
    
    document.getElementById('menuRelatorios')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'relatorios.html';
    });
    
    document.getElementById('menuGestaoLogins')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Gestão de logins em desenvolvimento', 'info');
    });
    
    document.getElementById('menuEstoque')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'estoque.html';
    });
    
    document.getElementById('menuLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Deseja realmente sair?')) {
            if (window.fazerLogout) {
                window.fazerLogout();
            } else {
                window.location.href = 'index.html';
            }
        }
    });
}

// ============================================
// FUNÇÕES DE FILTRO E RENDERIZAÇÃO
// ============================================
function aplicarFiltrosVendas() {
    const periodo = document.getElementById('filtroPeriodo')?.value || 'hoje';
    const canal = document.getElementById('filtroCanal')?.value || 'todos';
    const pagamento = document.getElementById('filtroPagamento')?.value || 'todos';
    const vendedor = document.getElementById('filtroVendedor')?.value || 'todos';
    let dataInicio, dataFim;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    switch(periodo) {
        case 'hoje':
            dataInicio = hoje;
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'ontem':
            dataInicio = new Date(hoje);
            dataInicio.setDate(dataInicio.getDate() - 1);
            dataInicio.setHours(0, 0, 0, 0);
            dataFim = new Date(dataInicio);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            dataInicio = new Date(hoje);
            dataInicio.setDate(dataInicio.getDate() - 7);
            dataInicio.setHours(0, 0, 0, 0);
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'mes':
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            dataFim.setHours(23, 59, 59, 999);
            break;
        case 'personalizado':
            const inicioStr = document.getElementById('dataInicio')?.value;
            const fimStr = document.getElementById('dataFim')?.value;
            if (inicioStr && fimStr) {
                dataInicio = new Date(inicioStr);
                dataInicio.setHours(0, 0, 0, 0);
                dataFim = new Date(fimStr);
                dataFim.setHours(23, 59, 59, 999);
            } else {
                dataInicio = hoje;
                dataFim = new Date(hoje);
                dataFim.setHours(23, 59, 59, 999);
            }
            break;
        default:
            dataInicio = hoje;
            dataFim = new Date(hoje);
            dataFim.setHours(23, 59, 59, 999);
    }
    
    console.log(`📅 Filtro período: ${periodo}`);
    console.log(`📅 Data início: ${dataInicio.toLocaleString()}`);
    console.log(`📅 Data fim: ${dataFim.toLocaleString()}`);
    
    vendasFiltradas = vendas.filter(v => {
        const dataVenda = v.data_venda_obj;
        
        if (!dataVenda || isNaN(dataVenda.getTime())) {
            return false;
        }
        
        if (dataVenda < dataInicio || dataVenda > dataFim) return false;
        if (canal !== 'todos' && v.canal_venda !== canal) return false;
        if (pagamento !== 'todos' && v.forma_pagamento !== pagamento) return false;
        
        if (vendedor !== 'todos') {
            const nomeVendedor = v.vendedor_nome || v.vendedor?.nome;
            if (nomeVendedor !== vendedor) return false;
        }
        
        return true;
    });
    
    console.log(`📊 ${vendasFiltradas.length} vendas após filtros`);
    
    atualizarResumoVendas();
    paginaAtualVendas = 1;
    renderizarTabelaVendas();
}

function atualizarResumoVendas() {
    const totalVendas = vendasFiltradas.length;
    const faturamento = vendasFiltradas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
    const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;
    
    const clientes = new Set();
    vendasFiltradas.forEach(v => {
        if (v.cliente?.email) clientes.add(v.cliente.email);
        else if (v.cliente_email) clientes.add(v.cliente_email);
    });
    
    console.log(`📊 Resumo: ${totalVendas} vendas, R$ ${faturamento.toFixed(2)} faturamento`);
    
    document.getElementById('totalVendas').textContent = totalVendas;
    document.getElementById('totalFaturamento').textContent = formatarMoeda(faturamento);
    document.getElementById('ticketMedio').textContent = formatarMoeda(ticketMedio);
    document.getElementById('totalClientes').textContent = clientes.size;
}

function renderizarTabelaVendas() {
    const tbody = document.getElementById('vendasTableBody');
    if (!tbody) return;
    
    const inicio = (paginaAtualVendas - 1) * itensPorPagina;
    const paginados = vendasFiltradas.slice(inicio, inicio + itensPorPagina);
    const totalPaginas = Math.ceil(vendasFiltradas.length / itensPorPagina);
    
    if (paginados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Nenhuma venda encontrada</p>
                    <small>Período: ${document.getElementById('filtroPeriodo')?.value || 'hoje'}</small>
                </td>
            </tr>
        `;
        document.getElementById('pageInfoVendas').textContent = `Página 1 de 1`;
        return;
    }
    
    let html = '';
    paginados.forEach(v => {
        const dataVenda = v.data_venda_obj;
        const dataFormatada = dataVenda.toLocaleDateString('pt-BR');
        const horaFormatada = dataVenda.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const clienteNome = v.cliente?.nome || v.cliente_nome || 'Cliente não identificado';
        const vendedorNome = v.vendedor_nome || v.vendedor?.nome || 'Sistema';
        
        html += `
            <tr>
                <td><strong>${v.numero || v.numero_venda || v.id?.slice(-8)}</strong></td>
                <td>${dataFormatada} ${horaFormatada}</td>
                <td>${clienteNome}</td>
                <td>${vendedorNome}</td>
                <td>${v.canal_venda === 'online' ? '🌐 Online' : '🏪 Loja Física'}</td>
                <td>${v.forma_pagamento || 'N/I'}</td>
                <td><strong>${formatarMoeda(v.total || 0)}</strong></td>
                <td>
                    <button class="btn-acao" onclick="verDetalhesVenda('${v.id}')" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.getElementById('pageInfoVendas').textContent = `Página ${paginaAtualVendas} de ${totalPaginas || 1}`;
    document.getElementById('prevPageVendas').disabled = paginaAtualVendas === 1;
    document.getElementById('nextPageVendas').disabled = paginaAtualVendas === totalPaginas || totalPaginas === 0;
}

// ============================================
// FUNÇÕES DE ESTOQUE
// ============================================
function aplicarFiltrosEstoque() {
    const categoria = document.getElementById('filtroCategoriaEstoque')?.value || 'todos';
    const status = document.getElementById('filtroStatusEstoque')?.value || 'todos';
    const minimo = document.getElementById('filtroMinimoEstoque')?.value || 'todos';
    const busca = document.getElementById('buscaEstoque')?.value.toLowerCase() || '';
    
    produtosEstoqueFiltrados = produtosEstoque.filter(p => {
        if (categoria !== 'todos' && p.categoria !== categoria) return false;
        
        if (status !== 'todos') {
            if (status === 'ativo' && !p.ativo) return false;
            if (status === 'inativo' && p.ativo) return false;
            if (status === 'baixo' && (p.quantidade > p.estoque_minimo || !p.ativo)) return false;
        }
        
        if (minimo !== 'todos') {
            if (minimo === 'abaixo' && p.quantidade > p.estoque_minimo) return false;
            if (minimo === 'acima' && p.quantidade <= p.estoque_minimo) return false;
        }
        
        if (busca) {
            const nome = (p.nome || '').toLowerCase();
            const codigo = (p.codigo || '').toLowerCase();
            return nome.includes(busca) || codigo.includes(busca);
        }
        
        return true;
    });
    
    console.log(`📊 ${produtosEstoqueFiltrados.length} produtos após filtros`);
    
    atualizarResumoEstoque();
    paginaAtualEstoque = 1;
    renderizarTabelaEstoque();
}

function atualizarResumoEstoque() {
    const totalProdutos = produtosEstoqueFiltrados.length;
    const totalUnidades = produtosEstoqueFiltrados.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    const baixoEstoque = produtosEstoqueFiltrados.filter(p => p.ativo && p.quantidade <= p.estoque_minimo).length;
    const valorTotal = produtosEstoqueFiltrados.reduce((sum, p) => sum + ((p.preco_custo || 0) * (p.quantidade || 0)), 0);
    
    document.getElementById('totalProdutosEstoque').textContent = totalProdutos;
    document.getElementById('totalUnidadesEstoque').textContent = totalUnidades;
    document.getElementById('baixoEstoqueCount').textContent = baixoEstoque;
    document.getElementById('valorTotalEstoque').textContent = formatarMoeda(valorTotal);
}

function renderizarTabelaEstoque() {
    const tbody = document.getElementById('estoqueTableBody');
    if (!tbody) return;
    
    const inicio = (paginaAtualEstoque - 1) * itensPorPagina;
    const paginados = produtosEstoqueFiltrados.slice(inicio, inicio + itensPorPagina);
    const totalPaginas = Math.ceil(produtosEstoqueFiltrados.length / itensPorPagina);
    
    if (paginados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                </td>
            </tr>
        `;
        document.getElementById('pageInfoEstoque').textContent = `Página 1 de 1`;
        return;
    }
    
    let html = '';
    paginados.forEach(p => {
        const statusClass = !p.ativo ? 'inativo' : (p.quantidade <= p.estoque_minimo ? 'baixo' : 'ativo');
        const statusText = !p.ativo ? 'Inativo' : (p.quantidade <= p.estoque_minimo ? 'Baixo' : 'Ativo');
        
        html += `
            <tr>
                <td>${p.codigo || '-'}</td>
                <td><strong>${p.nome || '-'}</strong></td>
                <td>${p.categoria || '-'}</td>
                <td>${p.quantidade || 0}</td>
                <td>${p.estoque_minimo || 5}</td>
                <td>${formatarMoeda(p.preco_custo || 0)}</td>
                <td><strong>${formatarMoeda(p.preco || 0)}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.getElementById('pageInfoEstoque').textContent = `Página ${paginaAtualEstoque} de ${totalPaginas || 1}`;
    document.getElementById('prevPageEstoque').disabled = paginaAtualEstoque === 1;
    document.getElementById('nextPageEstoque').disabled = paginaAtualEstoque === totalPaginas || totalPaginas === 0;
}

// ============================================
// FUNÇÕES DE EXPORTAÇÃO E IMPRESSÃO
// ============================================
function exportarParaExcel(tipo) {
    try {
        let data = [];
        let headers = [];
        
        if (tipo === 'vendas') {
            headers = ['N° Venda', 'Data', 'Cliente', 'Vendedor', 'Canal', 'Pagamento', 'Total'];
            data = vendasFiltradas.map(v => {
                const dataVenda = v.data_venda_obj;
                return [
                    v.numero || v.numero_venda || v.id?.slice(-8),
                    dataVenda.toLocaleDateString('pt-BR') + ' ' + dataVenda.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    v.cliente?.nome || v.cliente_nome || 'Cliente não identificado',
                    v.vendedor_nome || v.vendedor?.nome || 'Sistema',
                    v.canal_venda === 'online' ? 'Online' : 'Loja Física',
                    v.forma_pagamento || 'N/I',
                    formatarMoeda(v.total || 0)
                ];
            });
        } else {
            headers = ['Código', 'Produto', 'Categoria', 'Quantidade', 'Mínimo', 'Preço Custo', 'Preço Venda', 'Status'];
            data = produtosEstoqueFiltrados.map(p => [
                p.codigo || '-',
                p.nome || '-',
                p.categoria || '-',
                p.quantidade || 0,
                p.estoque_minimo || 5,
                formatarMoeda(p.preco_custo || 0),
                formatarMoeda(p.preco || 0),
                !p.ativo ? 'Inativo' : (p.quantidade <= p.estoque_minimo ? 'Baixo Estoque' : 'Ativo')
            ]);
        }
        
        const csvContent = [headers, ...data].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `relatorio_${tipo}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarMensagem('Relatório exportado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        mostrarMensagem('Erro ao exportar relatório', 'error');
    }
}

function imprimirRelatorio(tipo) {
    try {
        let html = '';
        const titulo = tipo === 'vendas' ? 'Relatório de Vendas' : 'Relatório de Estoque';
        const dataAtual = new Date().toLocaleString('pt-BR');
        const nomeLoja = lojaServices?.dadosLoja?.nome || lojaIdAtual?.replace(/-/g, ' ') || 'Sistema PDV';
        
        if (tipo === 'vendas') {
            const totalVendas = vendasFiltradas.length;
            const faturamento = vendasFiltradas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
            
            html = `
                <html>
                <head>
                    <title>${titulo} - ${nomeLoja}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #2c3e50; text-align: center; }
                        .info { text-align: center; margin-bottom: 20px; color: #6c757d; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f8f9fa; }
                        .resumo { display: flex; justify-content: space-between; margin-bottom: 20px; }
                        .resumo-card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; flex: 1; margin: 0 5px; }
                        .resumo-card h3 { margin: 0; font-size: 12px; color: #6c757d; }
                        .resumo-card p { margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #2c3e50; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${nomeLoja}</h1>
                    <div class="info">${titulo} - Gerado em ${dataAtual}</div>
                    
                    <div class="resumo">
                        <div class="resumo-card"><h3>Total Vendas</h3><p>${totalVendas}</p></div>
                        <div class="resumo-card"><h3>Faturamento</h3><p>${formatarMoeda(faturamento)}</p></div>
                        <div class="resumo-card"><h3>Ticket Médio</h3><p>${formatarMoeda(totalVendas > 0 ? faturamento / totalVendas : 0)}</p></div>
                    </div>
                    
                     <table>
                        <thead>
                            <tr><th>N° Venda</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Total</th> </tr>
                        </thead>
                        <tbody>
                            ${vendasFiltradas.map(v => `
                                 <tr>
                                    <td>${v.numero || v.numero_venda || v.id?.slice(-8)}</td>
                                    <td>${v.data_venda_obj.toLocaleString('pt-BR')}</td>
                                    <td>${v.cliente?.nome || v.cliente_nome || '-'}</td>
                                    <td>${v.vendedor_nome || v.vendedor?.nome || '-'}</td>
                                    <td>${formatarMoeda(v.total || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()">Imprimir</button>
                        <button onclick="window.close()">Fechar</button>
                    </div>
                </body>
                </html>
            `;
        } else {
            html = `
                <html>
                <head>
                    <title>${titulo} - ${nomeLoja}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #2c3e50; text-align: center; }
                        .info { text-align: center; margin-bottom: 20px; color: #6c757d; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f8f9fa; }
                        .resumo { display: flex; justify-content: space-between; margin-bottom: 20px; }
                        .resumo-card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; flex: 1; margin: 0 5px; }
                        .resumo-card h3 { margin: 0; font-size: 12px; color: #6c757d; }
                        .resumo-card p { margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #2c3e50; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${nomeLoja}</h1>
                    <div class="info">${titulo} - Gerado em ${dataAtual}</div>
                    
                    <div class="resumo">
                        <div class="resumo-card"><h3>Total Produtos</h3><p>${produtosEstoqueFiltrados.length}</p></div>
                        <div class="resumo-card"><h3>Unidades</h3><p>${produtosEstoqueFiltrados.reduce((s,p)=>s+(p.quantidade||0),0)}</p></div>
                        <div class="resumo-card"><h3>Valor Total</h3><p>${formatarMoeda(produtosEstoqueFiltrados.reduce((s,p)=>s+((p.preco_custo||0)*(p.quantidade||0)),0))}</p></div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Preço Venda</th><th>Status</th> </tr>
                        </thead>
                        <tbody>
                            ${produtosEstoqueFiltrados.map(p => `
                                 <tr>
                                    <td>${p.codigo || '-'}</td>
                                    <td>${p.nome || '-'}</td>
                                    <td>${p.categoria || '-'}</td>
                                    <td>${p.quantidade || 0}</td>
                                    <td>${formatarMoeda(p.preco || 0)}</td>
                                    <td>${!p.ativo ? 'Inativo' : (p.quantidade <= p.estoque_minimo ? 'Baixo' : 'Ativo')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="no-print" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()">Imprimir</button>
                        <button onclick="window.close()">Fechar</button>
                    </div>
                </body>
                </html>
            `;
        }
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Erro ao imprimir:', error);
        mostrarMensagem('Erro ao imprimir relatório', 'error');
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loading) {
        if (loadingMessage) loadingMessage.textContent = mensagem;
        loading.style.display = 'flex';
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info', tempo = 3000) {
    const alert = document.getElementById('messageAlert');
    if (!alert) {
        console.log(`[${tipo.toUpperCase()}] ${texto}`);
        return;
    }
    
    alert.className = `message-alert ${tipo}`;
    const textEl = alert.querySelector('.message-text');
    if (textEl) textEl.textContent = texto;
    alert.style.display = 'flex';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
};

function atualizarRelogio() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = new Date().toLocaleString('pt-BR');
    }
}

window.verDetalhesVenda = async function(vendaId) {
    try {
        mostrarLoading('Carregando detalhes...');
        
        const venda = vendas.find(v => v.id === vendaId);
        if (!venda) {
            mostrarMensagem('Venda não encontrada', 'error');
            return;
        }
        
        const modalBody = document.getElementById('detalhesVendaBody');
        const dataVenda = venda.data_venda_obj;
        
        let itensHtml = '';
        if (venda.itens && venda.itens.length > 0) {
            itensHtml = `
                <h4>Itens da Venda</h4>
                <table class="itens-table">
                    <thead>
                        <tr><th>Produto</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                        ${venda.itens.map(item => `
                            <tr>
                                <td>${item.nome || item.produto_nome || '-'}</td>
                                <td>${item.quantidade}</td>
                                <td>${formatarMoeda(item.preco_unitario || 0)}</td>
                                <td>${formatarMoeda(item.subtotal || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        modalBody.innerHTML = `
            <div class="detalhes-venda">
                <div class="detalhes-header">
                    <p><strong>N° Venda:</strong> ${venda.numero || venda.numero_venda || venda.id?.slice(-8)}</p>
                    <p><strong>Data:</strong> ${dataVenda.toLocaleDateString('pt-BR')} ${dataVenda.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Cliente:</strong> ${venda.cliente?.nome || venda.cliente_nome || 'Cliente não identificado'}</p>
                    <p><strong>Vendedor:</strong> ${venda.vendedor_nome || venda.vendedor?.nome || 'Sistema'}</p>
                    <p><strong>Canal:</strong> ${venda.canal_venda === 'online' ? 'Online' : 'Loja Física'}</p>
                    <p><strong>Pagamento:</strong> ${venda.forma_pagamento || 'N/I'}</p>
                    ${venda.tipo_entrega ? `<p><strong>Entrega:</strong> ${venda.tipo_entrega === 'entrega' ? 'Em casa' : 'Retirada na loja'}</p>` : ''}
                </div>
                
                ${itensHtml}
                
                <div class="total-venda">
                    <p>Total: ${formatarMoeda(venda.total || 0)}</p>
                </div>
            </div>
        `;
        
        abrirModal('detalhesVendaModal');
        
    } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error);
        mostrarMensagem('Erro ao carregar detalhes', 'error');
    } finally {
        esconderLoading();
    }
};
