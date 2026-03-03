// carrinho.js - Carrinho de Compras Integrado com Login (FIREBASE)
console.log("🛒 Carrinho de Compras - Cliente Logado (Firebase)");

import { lojaServices } from './novo_firebase_config.js';
import { getLojaConfig } from '/spdv/novo_lojas.js';

// ============================================
// VERIFICAÇÃO DE ACESSO - REDIRECIONAR SE NÃO LOGADO
// ============================================
(async function() {
    console.log("🔒 Verificando acesso ao carrinho...");
    
    // Aguardar um momento para o login ser processado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar se usuário está logado (de múltiplas fontes)
    const usuarioLogado = window.auth?.currentUser || 
                         window.dadosUsuario || 
                         lojaServices?.usuario ||
                         (() => {
                             try {
                                 const sessionData = sessionStorage.getItem('dadosUsuario');
                                 return sessionData ? JSON.parse(sessionData) : null;
                             } catch (e) {
                                 return null;
                             }
                         })();
    
    if (!usuarioLogado) {
        console.log("🚫 Usuário não logado - Redirecionando para clientes...");
        
        // Extrair lojaId da URL
        const pathMatch = window.location.pathname.match(/\/spdv\/lojas\/([^\/]+)\//);
        const lojaId = pathMatch ? pathMatch[1] : null;
        
        if (lojaId) {
            window.location.href = `/spdv/lojas/${lojaId}/index.html`;
        } else {
            window.location.href = 'index.html';
        }
        return;
    }
    
    console.log("✅ Usuário logado, acesso permitido ao carrinho");
    
    // Se temos dados no sessionStorage mas não nas variáveis, restaurar
    try {
        const sessionData = sessionStorage.getItem('dadosUsuario');
        if (sessionData && !window.dadosUsuario) {
            window.dadosUsuario = JSON.parse(sessionData);
            console.log("✅ Dados do usuário restaurados do sessionStorage");
        }
    } catch (e) {
        console.warn("⚠️ Erro ao restaurar dados:", e);
    }
})();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let carrinho = {
    itens: [],
    subtotal: 0,
    total: 0,
    descontoTotal: 0
};

let usuarioLogado = null;
let lojaIdAtual = null;
let dadosLoja = null;
let produtoSelecionadoIndex = -1;

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID DA URL
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/lojas\/([^\/]+)\//);
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
// CARREGAR DADOS DA LOJA
// ============================================
function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    try {
        const config = getLojaConfig(lojaId);
        if (config) {
            dadosLoja = config;
            
            const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const lojaNomeHeader = document.getElementById('lojaNomeHeader');
            const footerLojaNome = document.getElementById('footerLojaNome');
            const lojaNome = document.getElementById('lojaNome');
            const lojaEndereco = document.getElementById('lojaEndereco');
            const headerLogo = document.getElementById('headerLogo');
            
            if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
            if (footerLojaNome) footerLojaNome.textContent = nomeLoja;
            if (lojaNome) lojaNome.textContent = nomeLoja;
            
            if (lojaEndereco && config.contato?.endereco) {
                const endereco = config.contato.endereco;
                const enderecoStr = `${endereco.rua || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''}/${endereco.uf || ''}`;
                lojaEndereco.textContent = enderecoStr;
            }
            
            if (headerLogo) {
                headerLogo.src = `/spdv/imagens/${lojaId}/logo.png`;
                headerLogo.onerror = () => {
                    headerLogo.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE2IiByPSI4IiBmaWxsPSIjZTc0YzNjIiBvcGFjaXR5PSIwLjEiLz48cGF0aCBkPSJNMTAgMjhMMTUgMThMMjAgMjNMMjUgMTVMMzAgMjNMMzUgMjhIMTBaIiBmaWxsPSIjZTc0YzNjIiBvcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIyMCIgeT0iMzIiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MT0dPPC90ZXh0Pjwvc3ZnPg==';
                };
            }
            
            document.title = `${nomeLoja} - Carrinho de Compras`;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
    }
}

// ============================================
// FUNÇÃO PARA EXTRAIR PERFIL
// ============================================
function extrairPerfil() {
    if (!usuarioLogado) return null;
    
    const perfil = usuarioLogado.nivel || usuarioLogado.perfil || usuarioLogado.tipo;
    console.log('📊 Usuário logado:', usuarioLogado);
    console.log('🎯 Perfil extraído:', perfil);
    
    return perfil;
}

// ============================================
// FUNÇÃO PARA HABILITAR CAMPOS BASEADO NO PERFIL
// ============================================
function habilitarCampoCodigoBarras(perfil) {
    console.log(`🔍 Verificando permissão para código de barras. Perfil: ${perfil}`);
    
    const perfisPermitidos = ['admin', 'gerente', 'supervisor', 'vendedor'];
    const perfilLower = perfil ? perfil.toLowerCase() : '';
    const temPermissao = perfisPermitidos.includes(perfilLower);
    
    console.log(`📋 Tem permissão? ${temPermissao ? 'SIM' : 'NÃO'}`);
    
    const canalFisicoOption = document.getElementById('canalFisicoOption');
    const btnRecolhimento = document.getElementById('btnRecolhimento');
    const btnOrcamento = document.getElementById('btnImprimirOrcamento');
    
    if (canalFisicoOption) {
        canalFisicoOption.style.display = temPermissao ? 'flex' : 'none';
    }
    
    // NÃO mostrar mais os botões aqui - eles serão controlados pelo canal de vendas
    if (btnRecolhimento) {
        btnRecolhimento.style.display = 'none'; // Inicialmente oculto
    }
    
    if (btnOrcamento) {
        btnOrcamento.style.display = 'none'; // Inicialmente oculto
    }
    
    const btnFinalizarTexto = document.getElementById('btnFinalizarTexto');
    if (btnFinalizarTexto) {
        btnFinalizarTexto.textContent = temPermissao ? 'Venda' : 'Compra';
    }
    
    if (!temPermissao) {
        const radioOnline = document.querySelector('input[name="canalVenda"][value="online"]');
        if (radioOnline) radioOnline.checked = true;
    }
}

// ============================================
// EVENTOS DO LOGIN
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario } = event.detail;
    
    usuarioLogado = usuario;
    
    console.log('✅ Usuário logado no carrinho:', usuario);
    console.log('🔑 Nível:', usuario.nivel);
    console.log('🔑 Perfil:', usuario.perfil);
    console.log('🔑 Tipo:', usuario.tipo);
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const perfilBadge = document.getElementById('perfilBadge');
    
    if (userName) {
        let tipoDisplay = '';
        const perfilExibicao = usuario.nivel || usuario.perfil || usuario.tipo;
        
        if (usuario.tipo === 'admin') {
            tipoDisplay = ' (Admin)';
        } else if (usuario.tipo === 'funcionario') {
            const perfilFormatado = perfilExibicao.charAt(0).toUpperCase() + perfilExibicao.slice(1);
            tipoDisplay = ` (${perfilFormatado})`;
        } else if (usuario.tipo === 'cliente') {
            tipoDisplay = ' (Cliente)';
        }
        
        userName.textContent = (usuario.nome || 'Usuário') + tipoDisplay;
    }
    
    if (perfilBadge) {
        const perfil = extrairPerfil();
        perfilBadge.textContent = perfil ? perfil.toUpperCase() : '';
        perfilBadge.className = `perfil-badge ${perfil || ''}`;
        perfilBadge.style.display = 'inline-block';
    }
    
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (btnLogin) btnLogin.style.display = 'none';
    
    const perfil = extrairPerfil();
    console.log('🎯 Perfil para controle de permissões:', perfil);
    
    habilitarCampoCodigoBarras(perfil);
    setTimeout(configurarMenuPerfil, 500); // Configurar menu de perfil
    carregarCarrinhoDoUsuario();
});

// ============================================
// EVENTO USUÁRIO DESLOGADO
// ============================================
window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = null;
    carrinho.itens = [];
    carrinho.subtotal = 0;
    carrinho.total = 0;
    carrinho.descontoTotal = 0;
    
    atualizarInterface();
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const perfilBadge = document.getElementById('perfilBadge');
    const barcodeSection = document.getElementById('barcodeSection');
    const canalFisicoOption = document.getElementById('canalFisicoOption');
    const btnRecolhimento = document.getElementById('btnRecolhimento');
    const btnOrcamento = document.getElementById('btnImprimirOrcamento');

    // Fechar dropdown se estiver aberto
    const dropdown = document.getElementById('profileMenuDropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    if (userName) userName.textContent = 'Visitante';
    if (perfilBadge) perfilBadge.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (barcodeSection) barcodeSection.style.display = 'none';
    if (canalFisicoOption) canalFisicoOption.style.display = 'none';
    
    // 🔥 GARANTIR QUE OS BOTÕES SUMIRAM
    if (btnRecolhimento) {
        btnRecolhimento.style.display = 'none';
    }
    
    if (btnOrcamento) {
        btnOrcamento.style.display = 'none';
    }
    
    const btnFinalizarTexto = document.getElementById('btnFinalizarTexto');
    if (btnFinalizarTexto) btnFinalizarTexto.textContent = 'Compra';
    
    const radioOnline = document.querySelector('input[name="canalVenda"][value="online"]');
    if (radioOnline) radioOnline.checked = true;
    
    console.log('👤 Usuário deslogado - todos os botões de funcionário ocultos');
});

// ============================================
// FUNÇÕES DO CARRINHO (FIREBASE)
// ============================================

/**
 * Carregar carrinho do usuário do Firebase
 */
async function carregarCarrinhoDoUsuario() {
    if (!usuarioLogado || !usuarioLogado.email) {
        console.log('👤 Usuário não logado ou sem email');
        carrinho.itens = [];
        atualizarInterface();
        return;
    }
    
    try {
        mostrarLoading('Carregando carrinho...');
        
        console.log(`🔍 Buscando carrinho de ${usuarioLogado.email} na loja ${lojaIdAtual}...`);
        
        const resultado = await lojaServices.carregarCarrinhoUsuario(usuarioLogado.email);
        
        if (resultado && resultado.success) {
            carrinho.itens = resultado.data || [];
            console.log(`✅ Carrinho carregado: ${carrinho.itens.length} itens (${resultado.tipo})`);
        } else {
            console.error('❌ Erro ao carregar:', resultado?.error || 'Erro desconhecido');
            carrinho.itens = [];
        }
        
        atualizarInterface();
        
    } catch (error) {
        console.error('❌ Erro ao carregar carrinho:', error);
        carrinho.itens = [];
        atualizarInterface();
    } finally {
        esconderLoading();
    }
}

/**
 * Salvar carrinho no Firebase (função auxiliar)
 */
async function salvarCarrinhoNoFirebase() {
    if (!usuarioLogado || !usuarioLogado.email) return;
    
    try {
        await lojaServices.salvarCarrinhoUsuario(usuarioLogado.email, carrinho.itens);
        console.log('✅ Carrinho salvo no Firebase');
    } catch (error) {
        console.error('❌ Erro ao salvar carrinho:', error);
    }
}

/**
 * Atualizar quantidade de um item
 */
async function atualizarQuantidade(index, novaQuantidade) {
    if (!usuarioLogado || !usuarioLogado.email) return;
    
    if (novaQuantidade < 1) {
        await removerItem(index);
        return;
    }
    
    const item = carrinho.itens[index];
    if (!item) return;
    
    mostrarLoading('Atualizando...');
    
    try {
        const resultado = await lojaServices.atualizarQuantidadeItem(
            usuarioLogado.email,
            item.id,
            novaQuantidade
        );
        
        if (resultado && resultado.success) {
            carrinho.itens = resultado.data || [];
            atualizarInterface();
            
            if (produtoSelecionadoIndex === index) {
                selecionarProduto(index);
            }
        } else {
            mostrarMensagem(resultado?.error || 'Erro ao atualizar quantidade', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar quantidade:', error);
        mostrarMensagem('Erro ao atualizar quantidade', 'error');
    } finally {
        esconderLoading();
    }
}

/**
 * Remover item do carrinho
 */
async function removerItem(index) {
    if (!usuarioLogado || !usuarioLogado.email) return;
    
    const item = carrinho.itens[index];
    if (!item) return;
    
    if (!confirm(`Remover ${item.nome} do carrinho?`)) return;
    
    mostrarLoading('Removendo item...');
    
    try {
        const resultado = await lojaServices.removerItemDoCarrinho(
            usuarioLogado.email,
            item.id
        );
        
        if (resultado && resultado.success) {
            carrinho.itens = resultado.data || [];
            atualizarInterface();
            
            if (produtoSelecionadoIndex === index) {
                if (carrinho.itens.length > 0) {
                    selecionarProduto(0);
                } else {
                    produtoSelecionadoIndex = -1;
                    const produtoSelecionadoEl = document.getElementById('produtoSelecionado');
                    if (produtoSelecionadoEl) produtoSelecionadoEl.style.display = 'none';
                }
            }
            
            mostrarMensagem('Item removido', 'info');
        }
        
    } catch (error) {
        console.error('❌ Erro ao remover item:', error);
        mostrarMensagem('Erro ao remover item', 'error');
    } finally {
        esconderLoading();
    }
}

/**
 * Limpar carrinho
 */
async function limparCarrinho() {
    if (!usuarioLogado) return;
    
    if (carrinho.itens.length === 0) {
        mostrarMensagem('Carrinho já está vazio', 'info');
        return;
    }
    
    if (!confirm('Tem certeza que deseja limpar o carrinho?')) return;
    
    mostrarLoading('Limpando carrinho...');
    
    try {
        const resultado = await lojaServices.limparCarrinhoUsuario(usuarioLogado.email);
        
        if (resultado && resultado.success) {
            carrinho.itens = [];
            atualizarInterface();
            mostrarMensagem('Carrinho limpo', 'info');
        }
        
    } catch (error) {
        console.error('❌ Erro ao limpar carrinho:', error);
        mostrarMensagem('Erro ao limpar carrinho', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FUNÇÕES DE INTERFACE
// ============================================

// Calcular totais
function calcularTotais() {
    carrinho.subtotal = carrinho.itens.reduce((acc, item) => {
        item.subtotal = (item.preco_unitario * item.quantidade) - (item.desconto_valor || 0);
        return acc + item.subtotal;
    }, 0);
    
    carrinho.descontoTotal = carrinho.itens.reduce((acc, item) => acc + (item.desconto_valor || 0), 0);
    carrinho.total = carrinho.subtotal;
}

// Atualizar interface
function atualizarInterface() {
    console.log('🔄 Atualizando interface...');
    
    calcularTotais();
    renderizarItens();
    atualizarResumo();
    atualizarBotoes();
}

// ATUALIZAR RESUMO
function atualizarResumo() {
    console.log('📊 Atualizando resumo...');
    
    const itemCountEl = document.getElementById('itemCount');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const descontoRowEl = document.getElementById('descontoRow');
    const descontoTotalEl = document.getElementById('descontoTotal');
    
    if (itemCountEl) {
        itemCountEl.textContent = `${carrinho.itens.length} ${carrinho.itens.length === 1 ? 'item' : 'itens'}`;
    }
    
    if (subtotalEl) {
        subtotalEl.textContent = formatarMoeda(carrinho.subtotal);
    }
    
    if (totalEl) {
        totalEl.textContent = formatarMoeda(carrinho.total);
    }
    
    if (descontoRowEl && descontoTotalEl) {
        if (carrinho.descontoTotal > 0) {
            descontoRowEl.style.display = 'flex';
            descontoTotalEl.textContent = `- ${formatarMoeda(carrinho.descontoTotal)}`;
        } else {
            descontoRowEl.style.display = 'none';
        }
    }
}

// Atualizar botões
function atualizarBotoes() {
    const btnFinalizar = document.getElementById('btnFinalizar');
    const btnLimpar = document.getElementById('btnLimparCarrinho');
    const btnOrcamento = document.getElementById('btnImprimirOrcamento');
    
    const temItens = usuarioLogado && carrinho.itens.length > 0;
    
    if (btnFinalizar) btnFinalizar.disabled = !temItens;
    if (btnLimpar) btnLimpar.disabled = !temItens;
    if (btnOrcamento) btnOrcamento.disabled = !temItens;
}

// Renderizar itens na tela
function renderizarItens() {
    const container = document.getElementById('cartItemsList');
    if (!container) {
        console.error('❌ Container cartItemsList não encontrado');
        return;
    }
    
    if (!usuarioLogado) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Faça login para ver seu carrinho</p>
                <small>Você precisa estar logado para acessar o carrinho</small>
                <button class="btn-login-cart" onclick="window.location.href='index.html'">
                    <i class="fas fa-sign-in-alt"></i> Fazer Login
                </button>
            </div>
        `;
        return;
    }
    
    if (carrinho.itens.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
                <small>Adicione produtos para continuar</small>
                <a href="index.html" class="btn-continue">Continuar Comprando</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="cart-items">';
    
    carrinho.itens.forEach((item, index) => {
        const imagem = item.imagem || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTEwIDYwTDIwIDQwTDMwIDUwTDQwIDMwTDUwIDUwTDYwIDQwTDcwIDYwSDEwWiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNFTSBGT1RPPC90ZXh0Pjwvc3ZnPg==';
        
        html += `
            <div class="cart-item ${produtoSelecionadoIndex === index ? 'selected' : ''}" data-index="${index}" onclick="selecionarProduto(${index})">
                <div class="item-image">
                    <img src="${imagem}" alt="${item.nome}" onerror="this.src='${imagem}'">
                </div>
                <div class="item-details">
                    <div class="item-name">${item.nome}</div>
                    <div class="item-code">${item.codigo || '---'}</div>
                    <div class="item-price">${formatarMoeda(item.preco_unitario)}</div>
                </div>
                <div class="item-quantity">
                    <button class="qty-btn" onclick="event.stopPropagation(); alterarQuantidade(${index}, -1)">−</button>
                    <input type="number" class="qty-input" value="${item.quantidade}" 
                           min="1" onchange="event.stopPropagation(); atualizarQuantidade(${index}, this.value)">
                    <button class="qty-btn" onclick="event.stopPropagation(); alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-subtotal">
                    <span class="subtotal-label">Subtotal:</span>
                    <span class="subtotal-value">${formatarMoeda(item.subtotal)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-remove" onclick="event.stopPropagation(); removerItem(${index})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// FUNÇÃO PARA SELECIONAR PRODUTO
// ============================================
window.selecionarProduto = async function(index) {
    console.log(`🔍 Selecionando produto ${index}`);
    
    produtoSelecionadoIndex = index;
    
    document.querySelectorAll('.cart-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`.cart-item[data-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    const produto = carrinho.itens[index];
    if (produto) {
        const produtoSelecionadoEl = document.getElementById('produtoSelecionado');
        const ampliadoImagem = document.getElementById('ampliadoImagem');
        const ampliadoNome = document.getElementById('ampliadoNome');
        const ampliadoCodigo = document.getElementById('ampliadoCodigo');
        const ampliadoPreco = document.getElementById('ampliadoPreco');
        const ampliadoEstoque = document.getElementById('ampliadoEstoque');
        const ampliadoTotal = document.getElementById('ampliadoTotal');
        
        if (produtoSelecionadoEl) produtoSelecionadoEl.style.display = 'block';
        if (ampliadoImagem) ampliadoImagem.src = produto.imagem || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjUwIiByPSIyNSIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTI1IDkwTDMwIDgwTDQwIDkwTDUwIDcwTDYwIDkwTDcwIDc1TDg1IDkwSDI1WiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNjAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=';
        if (ampliadoNome) ampliadoNome.textContent = produto.nome;
        if (ampliadoCodigo) ampliadoCodigo.textContent = produto.codigo || '---';
        if (ampliadoPreco) ampliadoPreco.textContent = formatarMoeda(produto.preco_unitario);
        
        // 🔥 CORREÇÃO: Buscar estoque real do produto
        try {
            mostrarLoading('Buscando estoque...');
            const resultado = await lojaServices.buscarProdutoPorId(produto.id);
            if (resultado && resultado.success) {
                const estoqueReal = resultado.data.quantidade || 0;
                if (ampliadoEstoque) {
                    ampliadoEstoque.textContent = estoqueReal;
                    
                    // Adicionar classe baseada no estoque
                    ampliadoEstoque.className = 'estoque-valor';
                    if (estoqueReal <= 0) {
                        ampliadoEstoque.classList.add('critico');
                    } else if (estoqueReal <= 5) {
                        ampliadoEstoque.classList.add('baixo');
                    }
                }
            } else {
                if (ampliadoEstoque) {
                    ampliadoEstoque.textContent = produto.quantidade_estoque || 'N/A';
                }
            }
        } catch (error) {
            console.error('Erro ao buscar estoque:', error);
            if (ampliadoEstoque) {
                ampliadoEstoque.textContent = produto.quantidade_estoque || 'N/A';
            }
        } finally {
            esconderLoading();
        }
        
        if (ampliadoTotal) ampliadoTotal.textContent = formatarMoeda(produto.subtotal);
    }
};

// ============================================
// FUNÇÕES DE QUANTIDADE
// ============================================
window.alterarQuantidade = function(index, delta) {
    const novaQuantidade = carrinho.itens[index].quantidade + delta;
    if (novaQuantidade < 1) {
        removerItem(index);
    } else {
        atualizarQuantidade(index, novaQuantidade);
    }
};

window.alterarQuantidadeInput = function(delta) {
    const input = document.getElementById('itemQuantity');
    if (input) {
        let valor = parseInt(input.value) || 1;
        valor = Math.max(1, valor + delta);
        input.value = valor;
    }
};

// ============================================
// FUNÇÃO DE CÓDIGO DE BARRAS
// ============================================
async function buscarProdutoPorCodigoBarras(codigo) {
    if (!usuarioLogado) {
        mostrarMensagem('Faça login para adicionar produtos', 'warning');
        return;
    }
    
    mostrarLoading('Buscando produto...');
    
    try {
        const resultado = await lojaServices.buscarProdutoPorCodigoBarras(codigo);
        
        if (resultado && resultado.success) {
            const produto = resultado.data;
            const quantidade = parseInt(document.getElementById('itemQuantity')?.value || 1);
            
            // Verificar estoque
            if (produto.quantidade < quantidade) {
                mostrarMensagem(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'warning');
                esconderLoading();
                return;
            }
            
            const item = {
                id: produto.id,
                codigo: produto.codigo,
                codigo_barras: produto.codigo_barras,
                nome: produto.nome,
                preco_unitario: produto.preco,
                quantidade: quantidade,
                quantidade_estoque: produto.quantidade,
                imagem: produto.imagens?.thumbnail || produto.imagens?.principal,
                unidade: produto.unidade_venda || produto.unidade || 'UN',
                desconto: 0,
                desconto_valor: 0
            };
            
            const resultadoAdd = await lojaServices.adicionarItemAoCarrinho(usuarioLogado.email, item);
            
            if (resultadoAdd && resultadoAdd.success) {
                carrinho.itens = resultadoAdd.data;
                atualizarInterface();
                mostrarMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
                
                const barcodeInput = document.getElementById('barcodeInput');
                if (barcodeInput) {
                    barcodeInput.value = '';
                    barcodeInput.focus();
                }
            }
        } else {
            mostrarMensagem('Produto não encontrado', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        mostrarMensagem('Erro ao buscar produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// CONTROLE DO CANAL DE VENDAS
// ============================================
function configurarCanalVendas() {
    const radioOnline = document.querySelector('input[name="canalVenda"][value="online"]');
    const radioFisica = document.querySelector('input[name="canalVenda"][value="fisica"]');
    const barcodeSection = document.getElementById('barcodeSection');
    const btnRecolhimento = document.getElementById('btnRecolhimento');
    const btnOrcamento = document.getElementById('btnImprimirOrcamento');
    
    if (radioOnline && radioFisica && barcodeSection) {
        radioOnline.addEventListener('change', function() {
            if (this.checked) {
                // Modo Loja Online
                barcodeSection.style.display = 'none';
                
                // 🔥 ESCONDER BOTÕES ESPECÍFICOS DA LOJA FÍSICA
                if (btnRecolhimento) btnRecolhimento.style.display = 'none';
                if (btnOrcamento) btnOrcamento.style.display = 'none';
                
                console.log('🌐 Modo Loja Online ativado - Botões de loja física ocultos');
            }
        });
        
        radioFisica.addEventListener('change', function() {
            if (this.checked) {
                const perfil = extrairPerfil();
                const perfisPermitidos = ['admin', 'gerente', 'supervisor', 'vendedor'];
                const perfilLower = perfil ? perfil.toLowerCase() : '';
                
                if (perfisPermitidos.includes(perfilLower)) {
                    // Modo Loja Física - mostrar tudo
                    barcodeSection.style.display = 'block';
                    
                    // 🔥 MOSTRAR BOTÕES ESPECÍFICOS DA LOJA FÍSICA
                    if (btnRecolhimento) btnRecolhimento.style.display = 'flex';
                    if (btnOrcamento) btnOrcamento.style.display = 'flex';
                    
                    console.log('🏪 Modo Loja Física ativado - Todos os botões visíveis');
                    
                    // Focar no input de código de barras
                    setTimeout(() => {
                        document.getElementById('barcodeInput')?.focus();
                    }, 100);
                } else {
                    // Se não tiver permissão, volta para online
                    radioOnline.checked = true;
                    radioOnline.dispatchEvent(new Event('change'));
                    mostrarMensagem('Você não tem permissão para usar o modo Loja Física', 'warning');
                }
            }
        });
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log('⚙️ Configurando eventos...');
    
    const btnFinalizar = document.getElementById('btnFinalizar');
    const btnLimpar = document.getElementById('btnLimparCarrinho');
    const btnVoltar = document.getElementById('btnVoltar');
    const btnLogout = document.getElementById('btnLogout');
    const btnAddBarcode = document.getElementById('btnAddBarcode');
    const barcodeInput = document.getElementById('barcodeInput');
    const barcodeClear = document.getElementById('barcodeClear');
    const btnConsultarPreco = document.getElementById('btnConsultarPreco');
    const btnRecolhimento = document.getElementById('btnRecolhimento');
    const btnOrcamento = document.getElementById('btnImprimirOrcamento');
    
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if (!usuarioLogado) {
                abrirModal('loginModal');
                return;
            }
            if (carrinho.itens.length === 0) {
                mostrarMensagem('Carrinho vazio', 'warning');
                return;
            }
            abrirModalFinalizacao();
        });
    }
    
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparCarrinho);
    }
    
    if (btnVoltar) {
        btnVoltar.addEventListener('click', (e) => {
            if (carrinho.itens.length > 0 && usuarioLogado) {
                if (!confirm('Há itens no carrinho. Deseja realmente sair?')) {
                    e.preventDefault();
                }
            }
        });
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm('Deseja realmente sair?')) {
                window.fazerLogout();
            }
        });
    }
    
    if (btnAddBarcode && barcodeInput) {
        btnAddBarcode.addEventListener('click', () => {
            const codigo = barcodeInput.value.trim();
            if (codigo) {
                buscarProdutoPorCodigoBarras(codigo);
            } else {
                mostrarMensagem('Digite um código de barras', 'warning');
            }
        });
    }
    
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const codigo = barcodeInput.value.trim();
                if (codigo) {
                    buscarProdutoPorCodigoBarras(codigo);
                }
            }
        });
        
        barcodeInput.addEventListener('input', () => {
            const codigo = barcodeInput.value.replace(/\D/g, '');
            if (codigo.length === 13) {
                buscarProdutoPorCodigoBarras(codigo);
            }
        });
    }
    
    if (barcodeClear) {
        barcodeClear.addEventListener('click', () => {
            if (barcodeInput) {
                barcodeInput.value = '';
                barcodeInput.focus();
            }
        });
    }
    
    if (btnConsultarPreco) {
        btnConsultarPreco.addEventListener('click', () => {
            abrirModal('consultaPrecoModal');
        });
    }
    
    if (btnRecolhimento) {
        btnRecolhimento.addEventListener('click', () => {
            abrirModalRecolhimento();
        });
    }
    
    if (btnOrcamento) {
        btnOrcamento.addEventListener('click', gerarOrcamento);
    }
    
    // Configurar canal de vendas
    configurarCanalVendas();
    
    const btnConfirmarVenda = document.getElementById('btnConfirmarVenda');
    if (btnConfirmarVenda) {
        btnConfirmarVenda.addEventListener('click', finalizarVenda);
    }
    
    setInterval(atualizarRelogio, 1000);
}

// ============================================
// FUNÇÕES DE FINALIZAÇÃO
// ============================================
function abrirModalFinalizacao() {
    const perfil = extrairPerfil();
    const isFuncionario = perfil && ['admin', 'gerente', 'supervisor', 'vendedor'].includes(perfil.toLowerCase());
    
    const modal = document.getElementById('finalizarModal');
    const titulo = document.getElementById('modalFinalizarTitulo');
    const body = document.getElementById('finalizarModalBody');
    
    if (!modal || !body) return;
    
    titulo.innerHTML = isFuncionario ? 
        '<i class="fas fa-cash-register"></i> Finalizar Venda' : 
        '<i class="fas fa-check-circle"></i> Finalizar Compra';
    
    let html = `
        <!-- RESUMO DA COMPRA -->
        <div class="venda-resumo">
            <h4>Resumo do Pedido</h4>
            <div class="resumo-linha">
                <span>Total de Itens:</span>
                <span id="resumoTotalItens">${carrinho.itens.length}</span>
            </div>
            <div class="resumo-linha">
                <span>Subtotal:</span>
                <span id="resumoSubtotal">${formatarMoeda(carrinho.subtotal)}</span>
            </div>
            <div class="resumo-linha total">
                <span>TOTAL:</span>
                <span id="resumoTotal">${formatarMoeda(carrinho.total)}</span>
            </div>
        </div>
    `;
    
    if (isFuncionario) {
        // Modal para funcionários (venda física)
        html += `
            <!-- OPÇÕES DE ENTREGA -->
            <div class="entrega-section">
                <h4><i class="fas fa-truck"></i> Opções de Entrega</h4>
                <div class="entrega-opcoes">
                    <label class="entrega-option">
                        <input type="radio" name="tipoEntrega" value="retirada" checked>
                        <span class="entrega-icon"><i class="fas fa-store"></i></span>
                        <span class="entrega-nome">Retirada na loja</span>
                    </label>
                    <label class="entrega-option">
                        <input type="radio" name="tipoEntrega" value="entrega">
                        <span class="entrega-icon"><i class="fas fa-home"></i></span>
                        <span class="entrega-nome">Receber em casa</span>
                    </label>
                </div>

                <div id="camposEntrega" style="display: none;">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> Nome do Cliente *</label>
                        <input type="text" id="clienteNome" placeholder="Nome completo" value="${usuarioLogado?.nome || ''}">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-phone"></i> Telefone *</label>
                        <input type="text" id="clienteTelefone" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Endereço *</label>
                        <input type="text" id="clienteEndereco" placeholder="Rua, número, bairro">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Cidade</label>
                            <input type="text" id="clienteCidade" placeholder="Cidade">
                        </div>
                        <div class="form-group">
                            <label>CEP</label>
                            <input type="text" id="clienteCep" placeholder="00000-000">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-motorcycle"></i> Taxa de Entrega</label>
                        <input type="text" id="taxaEntrega" value="R$ 0,00">
                    </div>
                </div>
            </div>

            <!-- CPF DO CLIENTE -->
            <div class="form-group">
                <label><i class="fas fa-id-card"></i> CPF do Cliente (opcional)</label>
                <input type="text" id="clienteCpf" placeholder="000.000.000-00">
            </div>
        `;
    } else {
        // Modal para clientes (compra online)
        html += `
            <!-- DADOS DO CLIENTE -->
            <div class="cliente-section">
                <h4><i class="fas fa-user"></i> Dados do Cliente</h4>
                
                <div class="form-group">
                    <label><i class="fas fa-user"></i> Nome *</label>
                    <input type="text" id="clienteNome" readonly class="readonly-field" value="${usuarioLogado?.nome || ''}">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-envelope"></i> E-mail *</label>
                    <input type="email" id="clienteEmail" readonly class="readonly-field" value="${usuarioLogado?.email || ''}">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-phone"></i> Telefone *</label>
                    <input type="text" id="clienteTelefone" placeholder="(00) 00000-0000">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-id-card"></i> CPF (opcional)</label>
                    <input type="text" id="clienteCpf" placeholder="000.000.000-00">
                </div>
            </div>

            <!-- OPÇÕES DE ENTREGA -->
            <div class="entrega-section">
                <h4><i class="fas fa-truck"></i> Opções de Entrega</h4>
                
                <div class="entrega-opcoes">
                    <label class="entrega-option">
                        <input type="radio" name="tipoEntrega" value="retirada" checked>
                        <span class="entrega-icon"><i class="fas fa-store"></i></span>
                        <span class="entrega-nome">Retirada na loja</span>
                    </label>
                    <label class="entrega-option">
                        <input type="radio" name="tipoEntrega" value="entrega">
                        <span class="entrega-icon"><i class="fas fa-home"></i></span>
                        <span class="entrega-nome">Receber em casa</span>
                    </label>
                </div>

                <div id="camposEntrega" style="display: none;">
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Endereço *</label>
                        <input type="text" id="clienteEndereco" placeholder="Rua, número, bairro">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Cidade</label>
                            <input type="text" id="clienteCidade" placeholder="Cidade">
                        </div>
                        <div class="form-group">
                            <label>CEP</label>
                            <input type="text" id="clienteCep" placeholder="00000-000">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-motorcycle"></i> Taxa de Entrega</label>
                        <input type="text" id="taxaEntrega" value="R$ 0,00">
                    </div>
                </div>
            </div>
        `;
    }
    
    // FORMAS DE PAGAMENTO (igual para ambos)
    html += `
        <div class="payment-section">
            <h4><i class="fas fa-credit-card"></i> Forma de Pagamento</h4>
            
            <div class="methods-grid">
                <label class="method-option">
                    <input type="radio" name="payment" value="dinheiro" checked>
                    <span class="method-icon"><i class="fas fa-money-bill-wave"></i></span>
                    <span class="method-name">Dinheiro</span>
                </label>
                <label class="method-option">
                    <input type="radio" name="payment" value="pix">
                    <span class="method-icon"><i class="fas fa-qrcode"></i></span>
                    <span class="method-name">PIX</span>
                </label>
                <label class="method-option">
                    <input type="radio" name="payment" value="debito">
                    <span class="method-icon"><i class="fas fa-credit-card"></i></span>
                    <span class="method-name">Débito</span>
                </label>
                <label class="method-option">
                    <input type="radio" name="payment" value="credito">
                    <span class="method-icon"><i class="fas fa-credit-card"></i></span>
                    <span class="method-name">Crédito</span>
                </label>
            </div>

            <div id="trocoSection" style="display: none;">
                <div class="form-group">
                    <label><i class="fas fa-calculator"></i> Valor Recebido</label>
                    <input type="text" id="valorRecebido" placeholder="R$ 0,00">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-exchange-alt"></i> Troco</label>
                    <input type="text" id="valorTroco" placeholder="R$ 0,00" readonly>
                </div>
            </div>
        </div>
    `;
    
    body.innerHTML = html;
    modal.style.display = 'block';
    
    // Configurar eventos do modal
    document.querySelectorAll('input[name="tipoEntrega"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const camposEntrega = document.getElementById('camposEntrega');
            if (camposEntrega) {
                camposEntrega.style.display = this.value === 'entrega' ? 'block' : 'none';
            }
        });
    });
    
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const trocoSection = document.getElementById('trocoSection');
            if (trocoSection) {
                trocoSection.style.display = this.value === 'dinheiro' ? 'block' : 'none';
            }
        });
    });
}

async function finalizarVenda() {
    if (!usuarioLogado) {
        fecharModal('finalizarModal');
        abrirModal('loginModal');
        return;
    }
    
    if (carrinho.itens.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        fecharModal('finalizarModal');
        return;
    }
    
    const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked')?.value;
    const formaPagamento = document.querySelector('input[name="payment"]:checked')?.value;
    
    const telefone = document.getElementById('clienteTelefone')?.value.trim();
    if (!telefone) {
        mostrarMensagem('Telefone é obrigatório', 'warning');
        return;
    }
    
    if (tipoEntrega === 'entrega') {
        const endereco = document.getElementById('clienteEndereco')?.value.trim();
        if (!endereco) {
            mostrarMensagem('Endereço de entrega é obrigatório', 'warning');
            return;
        }
    }
    
    if (formaPagamento === 'dinheiro') {
        const valorRecebidoInput = document.getElementById('valorRecebido');
        if (valorRecebidoInput) {
            const valorRecebido = parseFloat(valorRecebidoInput.value.replace(/[^\d,]/g, '').replace(',', '.') || '0');
            if (valorRecebido < carrinho.total) {
                mostrarMensagem('Valor recebido insuficiente', 'warning');
                return;
            }
        }
    }
    
    mostrarLoading('Processando venda...', 'Aguarde, não feche esta página...');
    fecharModal('finalizarModal');
    
    try {
        const canalVenda = document.querySelector('input[name="canalVenda"]:checked')?.value || 'online';
        const taxaEntrega = parseFloat(document.getElementById('taxaEntrega')?.value.replace(/[^\d,]/g, '').replace(',', '.') || '0');
        const totalComEntrega = carrinho.total + taxaEntrega;
        const cpfCliente = document.getElementById('clienteCpf')?.value.replace(/\D/g, '') || '';
        
        const vendaData = {
            tipo: 'VENDA',
            numero: `V${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`,
            data: new Date(),
            canal_venda: canalVenda,
            itens: carrinho.itens.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                codigo_barras: item.codigo_barras,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal,
                desconto: item.desconto || 0,
                desconto_valor: item.desconto_valor || 0,
                unidade: item.unidade
            })),
            subtotal: carrinho.subtotal,
            total: totalComEntrega,
            total_descontos: carrinho.descontoTotal,
            forma_pagamento: formaPagamento,
            tipo_entrega: tipoEntrega,
            dados_entrega: tipoEntrega === 'entrega' ? {
                endereco: document.getElementById('clienteEndereco')?.value.trim() || '',
                cidade: document.getElementById('clienteCidade')?.value.trim() || '',
                cep: document.getElementById('clienteCep')?.value.trim() || '',
                taxaEntrega: taxaEntrega
            } : null,
            cliente: {
                nome: document.getElementById('clienteNome')?.value || usuarioLogado.nome,
                email: usuarioLogado.email,
                telefone: telefone,
                cpf: cpfCliente
            },
            vendedor: {
                uid: usuarioLogado.uid,
                nome: usuarioLogado.nome,
                email: usuarioLogado.email,
                perfil: usuarioLogado.nivel || usuarioLogado.perfil || usuarioLogado.tipo
            },
            loja_id: lojaIdAtual,
            loja_nome: dadosLoja?.nome || lojaIdAtual,
            status: 'concluida',
            data_criacao: new Date(),
            data_conclusao: new Date()
        };
        
        const resultado = await lojaServices.criarVenda(vendaData);
        
        if (!resultado || !resultado.success) {
            throw new Error(resultado?.error || 'Erro ao processar venda');
        }
        
        await lojaServices.limparCarrinhoUsuario(usuarioLogado.email);
        carrinho.itens = [];
        atualizarInterface();
        
        mostrarNotaFiscal({
            ...vendaData,
            id: resultado.id,
            numero: resultado.numero || vendaData.numero
        });
        
        const mensagem = canalVenda === 'fisica' 
            ? `✅ Venda #${resultado.numero || vendaData.numero} finalizada com sucesso!`
            : `✅ Compra #${resultado.numero || vendaData.numero} realizada com sucesso!`;
        
        mostrarMensagem(mensagem, 'success', 5000);
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        
        let mensagemErro = 'Erro ao processar venda';
        if (error.message.includes('Estoque insuficiente')) {
            mensagemErro = error.message;
        } else if (error.message.includes('permissão')) {
            mensagemErro = 'Erro de permissão. Faça login novamente.';
        }
        
        mostrarMensagem(`❌ ${mensagemErro}`, 'error', 5000);
        abrirModalFinalizacao();
        
    } finally {
        esconderLoading();
    }
}

function abrirModalRecolhimento() {
    const modal = document.getElementById('recolhimentoModal');
    if (!modal) return;
    
    const operadorInput = document.getElementById('recolhimentoOperador');
    const dataHoraInput = document.getElementById('recolhimentoDataHora');
    
    if (operadorInput) operadorInput.value = usuarioLogado?.nome || '';
    if (dataHoraInput) dataHoraInput.value = new Date().toLocaleString('pt-BR');
    
    modal.style.display = 'block';
}

function gerarOrcamento() {
    mostrarMensagem('Gerando orçamento...', 'info');
}

// ============================================
// CONFIGURAR MENU DE PERFIL (3 PONTINHOS)
// ============================================
function configurarMenuPerfil() {
    console.log('🔧 Configurando menu de perfil...');
    
    const menuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (!menuBtn || !dropdown) {
        console.log('❌ Elementos do menu não encontrados');
        return;
    }
    
    console.log('✅ Elementos do menu encontrados');
    
    // Mostrar/esconder itens baseado no perfil
    const perfil = extrairPerfil();
    const perfisPermitidos = ['admin', 'gerente', 'supervisor'];
    const perfilLower = perfil ? perfil.toLowerCase() : '';
    const temAcessoTotal = perfisPermitidos.includes(perfilLower);
    
    const menuRelatorios = document.getElementById('menuRelatorios');
    const menuGestaoLogins = document.getElementById('menuGestaoLogins');
    const menuEstoque = document.getElementById('menuEstoque');
    
    if (menuRelatorios) {
        menuRelatorios.style.display = temAcessoTotal ? 'flex' : 'none';
    }
    
    if (menuGestaoLogins) {
        menuGestaoLogins.style.display = temAcessoTotal ? 'flex' : 'none';
    }
    
    if (menuEstoque) {
        // Vendedores também podem ver estoque
        menuEstoque.style.display = (temAcessoTotal || perfilLower === 'vendedor') ? 'flex' : 'none';
    }
    
    // Remover event listeners antigos
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);
    
    // Reatribuir variáveis com os novos elementos
    const finalMenuBtn = document.getElementById('profileMenuBtn');
    const finalDropdown = document.getElementById('profileMenuDropdown');
    
    // Abrir/fechar menu ao clicar no botão
    finalMenuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔹 Botão do menu clicado');
        
        // Toggle da classe show
        finalDropdown.classList.toggle('show');
        
        // Toggle classe active no botão
        this.classList.toggle('active');
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(e) {
        if (!finalMenuBtn.contains(e.target) && !finalDropdown.contains(e.target)) {
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
        }
    });
    
    // Fechar menu ao pressionar ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
        }
    });
    
    // Configurar ações dos itens do menu
    if (menuRelatorios) {
        menuRelatorios.addEventListener('click', (e) => {
            e.preventDefault();
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
            mostrarMensagem('Em desenvolvimento.', 'info');
        });
    }
    
    if (menuGestaoLogins) {
        menuGestaoLogins.addEventListener('click', (e) => {
            e.preventDefault();
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
            mostrarMensagem('Em desenvolvimento.', 'info');
        });
    }
    
    if (menuEstoque) {
        menuEstoque.addEventListener('click', function(e) {
            e.preventDefault();
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
            console.log('📦 Abrir estoque');
            window.location.href = 'estoque.html';
        });
    }
    
    const menuLogout = document.getElementById('menuLogout');
    if (menuLogout) {
        menuLogout.addEventListener('click', function(e) {
            e.preventDefault();
            finalDropdown.classList.remove('show');
            finalMenuBtn.classList.remove('active');
            
            if (confirm('Deseja realmente sair?')) {
                if (window.fazerLogout) {
                    window.fazerLogout();
                } else {
                    window.location.href = 'index.html';
                }
            }
        });
    }
    
    console.log('✅ Menu de perfil configurado');
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

function mostrarNotaFiscal(venda) {
    const modal = document.getElementById('notaFiscalModal');
    const conteudo = document.getElementById('notaFiscalConteudo');
    
    if (!modal || !conteudo) return;
    
    modal.style.display = 'block';
    
    const nomeLoja = dadosLoja?.nome || lojaIdAtual?.replace(/-/g, ' ') || 'SUA LOJA';
    const dataVenda = new Date(venda.data || venda.data_criacao).toLocaleString('pt-BR');
    
    let nota = '';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto(nomeLoja, 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('CUPOM NÃO FISCAL', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    nota += `VENDA..: ${venda.numero}\n`;
    nota += `DATA...: ${dataVenda}\n`;
    nota += `CLIENTE: ${venda.cliente.nome}\n`;
    if (venda.cliente.cpf) {
        let cpf = venda.cliente.cpf;
        if (cpf.length === 11) {
            cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        nota += `CPF....: ${cpf}\n`;
    }
    nota += '-'.repeat(48) + '\n';
    nota += 'ITEM  DESCRIÇÃO                 QTD  UNIT    TOTAL\n';
    nota += '-'.repeat(48) + '\n';
    
    venda.itens.forEach((item, i) => {
        const num = (i + 1).toString().padEnd(5, ' ');
        const nome = item.nome.substring(0, 25).padEnd(25, ' ');
        const qtd = item.quantidade.toString().padStart(3, ' ');
        const unit = formatarMoedaResumida(item.preco_unitario).padStart(7, ' ');
        const total = formatarMoedaResumida(item.subtotal).padStart(7, ' ');
        
        nota += `${num}${nome} ${qtd} ${unit} ${total}\n`;
    });
    
    nota += '-'.repeat(48) + '\n';
    nota += `SUBTOTAL:${formatarMoedaResumida(venda.subtotal).padStart(38)}\n`;
    nota += `TOTAL:${formatarMoedaResumida(venda.total).padStart(41)}\n`;
    nota += '='.repeat(48) + '\n';
    nota += centralizarTexto('OBRIGADO PELA PREFERÊNCIA!', 48) + '\n';
    nota += centralizarTexto('VOLTE SEMPRE!', 48) + '\n';
    nota += '='.repeat(48) + '\n';
    
    conteudo.textContent = nota;
}

function formatarMoedaResumida(valor) {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).replace('R$', '').trim();
}

function centralizarTexto(texto, largura) {
    if (texto.length >= largura) return texto;
    const espacos = Math.floor((largura - texto.length) / 2);
    return ' '.repeat(espacos) + texto;
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

function mostrarLoading(titulo = 'Carregando...', detalhe = '') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        const p = loading.querySelector('#loadingDetail') || loading.querySelector('p');
        
        if (h3) h3.textContent = titulo;
        if (p && detalhe) p.textContent = detalhe;
        
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
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, tempo);
}

window.imprimirNotaFiscal = function() {
    const conteudo = document.getElementById('notaFiscalConteudo');
    if (!conteudo) return;
    
    const html = `
        <html>
        <head>
            <title>Nota Fiscal</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; }
                pre { margin: 0; }
            </style>
        </head>
        <body>
            <pre>${conteudo.textContent}</pre>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
};

function atualizarRelogio() {
    const el = document.getElementById('currentDateTime');
    if (el) {
        el.textContent = new Date().toLocaleString('pt-BR');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página de carrinho carregada");
    
    mostrarLoading('Carregando carrinho...');
    
    try {
        extrairLojaIdDaURL();
        
        if (!lojaIdAtual && lojaServices) {
            lojaIdAtual = lojaServices.lojaId;
        }
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            setTimeout(() => window.location.href = '../../../index.html', 2000);
            return;
        }
        
        carregarDadosLoja();
        configurarEventos();

        if (usuarioLogado) {
            setTimeout(configurarMenuPerfil, 500);
        }
        
        // Garantir que Loja Online esteja selecionado inicialmente
        const radioOnline = document.querySelector('input[name="canalVenda"][value="online"]');
        if (radioOnline) radioOnline.checked = true;
        
        // Esconder seção de código de barras e botões da loja física inicialmente
        const barcodeSection = document.getElementById('barcodeSection');
        const btnRecolhimento = document.getElementById('btnRecolhimento');
        const btnOrcamento = document.getElementById('btnImprimirOrcamento');
        
        if (barcodeSection) barcodeSection.style.display = 'none';
        if (btnRecolhimento) btnRecolhimento.style.display = 'none';
        if (btnOrcamento) btnOrcamento.style.display = 'none';
        
        if (window.auth?.currentUser) {
            console.log('👤 Usuário já logado detectado');
        }
        
        esconderLoading();
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar carrinho', 'error');
        esconderLoading();
    }
});

// Exportar funções globais
window.atualizarQuantidade = atualizarQuantidade;
window.removerItem = removerItem;
window.limparCarrinho = limparCarrinho;
window.selecionarProduto = selecionarProduto;
window.alterarQuantidade = alterarQuantidade;
window.alterarQuantidadeInput = alterarQuantidadeInput;
window.abrirModalFinalizacao = abrirModalFinalizacao;
window.finalizarVenda = finalizarVenda;

console.log("✅ carrinho.js carregado com sucesso!");














