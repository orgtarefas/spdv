// carrinho.js - Carrinho de Compras Integrado com Login
console.log("🛒 Carrinho de Compras - Cliente Logado");

import { lojaServices } from './firebase_config.js';
import { getLojaConfig } from '/spdv/lojas.js';

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
        return lojaIdAtual;
    }
    
    return null;
}

// ============================================
// CARREGAR DADOS DA LOJA
// ============================================
function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    const config = getLojaConfig(lojaId);
    if (config) {
        dadosLoja = config;
        
        const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const lojaNomeHeader = document.getElementById('lojaNomeHeader');
        const footerLojaNome = document.getElementById('footerLojaNome');
        
        if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
        if (footerLojaNome) footerLojaNome.textContent = nomeLoja;
        
        document.title = `${nomeLoja} - Meu Carrinho`;
    }
}

// ============================================
// EVENTOS DO LOGIN
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario } = event.detail;
    
    usuarioLogado = usuario;
    
    console.log('✅ Usuário logado no carrinho:', usuario);
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    
    if (userName) {
        let tipoDisplay = '';
        if (usuario.tipo === 'admin') tipoDisplay = ' (Admin)';
        else if (usuario.tipo === 'funcionario') tipoDisplay = ` (${usuario.nivel})`;
        userName.textContent = usuario.nome + tipoDisplay;
    }
    
    if (btnLogout) btnLogout.style.display = 'inline-flex';
    if (btnLogin) btnLogin.style.display = 'none';
    
    // Carregar carrinho do usuário
    carregarCarrinhoDoUsuario();
});

window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = null;
    carrinho.itens = [];
    atualizarInterface();
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    
    if (userName) userName.textContent = 'Visitante';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    
    // Redirecionar para login se estiver em área restrita
    if (window.location.pathname.includes('carrinho.html')) {
        abrirModal('loginModal');
    }
});

window.addEventListener('usuarioNaoAutorizado', () => {
    usuarioLogado = null;
    carrinho.itens = [];
    atualizarInterface();
    abrirModal('loginModal');
});

// ============================================
// FUNÇÕES DO CARRINHO
// ============================================

// Carregar carrinho do usuário do sessionStorage
function carregarCarrinhoDoUsuario() {
    if (!usuarioLogado) return;
    
    try {
        // Chave única por usuário: carrinho_{email}_{loja}
        const chaveCarrinho = `carrinho_${usuarioLogado.email}_${lojaIdAtual}`;
        const carrinhoSalvo = sessionStorage.getItem(chaveCarrinho);
        
        if (carrinhoSalvo) {
            carrinho.itens = JSON.parse(carrinhoSalvo);
            console.log(`✅ Carrinho carregado para ${usuarioLogado.email}: ${carrinho.itens.length} itens`);
        } else {
            carrinho.itens = [];
        }
        
        atualizarInterface();
        
    } catch (error) {
        console.error('❌ Erro ao carregar carrinho:', error);
        carrinho.itens = [];
    }
}

// Salvar carrinho do usuário
function salvarCarrinhoDoUsuario() {
    if (!usuarioLogado) return;
    
    try {
        const chaveCarrinho = `carrinho_${usuarioLogado.email}_${lojaIdAtual}`;
        sessionStorage.setItem(chaveCarrinho, JSON.stringify(carrinho.itens));
        console.log(`✅ Carrinho salvo para ${usuarioLogado.email}`);
    } catch (error) {
        console.error('❌ Erro ao salvar carrinho:', error);
    }
}

// Adicionar item ao carrinho
function adicionarItem(produto) {
    if (!usuarioLogado) {
        abrirModal('loginModal');
        return false;
    }
    
    const itemExistente = carrinho.itens.find(item => item.id === produto.id);
    
    if (itemExistente) {
        itemExistente.quantidade++;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco_unitario;
    } else {
        carrinho.itens.push({
            id: produto.id,
            codigo: produto.codigo,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: 1,
            subtotal: produto.preco,
            imagem: produto.imagens?.thumbnail || produto.imagens?.principal || null,
            unidade: produto.unidade_venda || produto.unidade || 'UN',
            desconto: 0,
            desconto_valor: 0
        });
    }
    
    atualizarInterface();
    salvarCarrinhoDoUsuario();
    return true;
}

// Remover item do carrinho
function removerItem(index) {
    if (!usuarioLogado) return;
    
    const item = carrinho.itens[index];
    if (confirm(`Remover ${item.nome} do carrinho?`)) {
        carrinho.itens.splice(index, 1);
        atualizarInterface();
        salvarCarrinhoDoUsuario();
        mostrarMensagem('Item removido', 'info');
    }
}

// Atualizar quantidade
function atualizarQuantidade(index, novaQuantidade) {
    if (!usuarioLogado) return;
    
    if (novaQuantidade < 1) {
        removerItem(index);
        return;
    }
    
    carrinho.itens[index].quantidade = novaQuantidade;
    carrinho.itens[index].subtotal = novaQuantidade * carrinho.itens[index].preco_unitario;
    
    atualizarInterface();
    salvarCarrinhoDoUsuario();
}

// Limpar carrinho
function limparCarrinho() {
    if (!usuarioLogado) return;
    
    if (carrinho.itens.length === 0) {
        mostrarMensagem('Carrinho já está vazio', 'info');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
        carrinho.itens = [];
        atualizarInterface();
        salvarCarrinhoDoUsuario();
        mostrarMensagem('Carrinho limpo', 'info');
    }
}

// Calcular totais
function calcularTotais() {
    carrinho.subtotal = carrinho.itens.reduce((acc, item) => acc + item.subtotal, 0);
    carrinho.descontoTotal = carrinho.itens.reduce((acc, item) => acc + (item.desconto_valor || 0), 0);
    carrinho.total = carrinho.subtotal - carrinho.descontoTotal;
}

// Atualizar interface
function atualizarInterface() {
    calcularTotais();
    renderizarItens();
    atualizarResumo();
    atualizarBotoes();
}

// Renderizar itens na tela
function renderizarItens() {
    const container = document.getElementById('cartItemsList');
    if (!container) return;
    
    if (!usuarioLogado) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Faça login para ver seu carrinho</p>
                <button class="btn-login-cart" onclick="window.location.href='novo_clientes.html'">
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
                <a href="novo_clientes.html" class="btn-continue">Continuar Comprando</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="cart-items">';
    
    carrinho.itens.forEach((item, index) => {
        const imagem = item.imagem || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjMyIiByPSIxNiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTEwIDYwTDIwIDQwTDMwIDUwTDQwIDMwTDUwIDUwTDYwIDQwTDcwIDYwSDEwWiIgZmlsbD0iI2U3NGMzYyIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM2Yzc1N2QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNFTSBGT1RPPC90ZXh0Pjwvc3ZnPg==';
        
        html += `
            <div class="cart-item">
                <div class="item-image">
                    <img src="${imagem}" alt="${item.nome}" onerror="this.src='${imagem}'">
                </div>
                <div class="item-details">
                    <div class="item-name">${item.nome}</div>
                    <div class="item-code">${item.codigo || '---'}</div>
                    <div class="item-price">${formatarMoeda(item.preco_unitario)}</div>
                </div>
                <div class="item-quantity">
                    <button class="qty-btn" onclick="window.alterarQuantidade(${index}, -1)">−</button>
                    <input type="number" class="qty-input" value="${item.quantidade}" 
                           min="1" onchange="window.atualizarQuantidade(${index}, this.value)">
                    <button class="qty-btn" onclick="window.alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-subtotal">
                    <span class="subtotal-label">Subtotal:</span>
                    <span class="subtotal-value">${formatarMoeda(item.subtotal)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-remove" onclick="window.removerItem(${index})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Atualizar resumo
function atualizarResumo() {
    document.getElementById('itemCount').textContent = `${carrinho.itens.length} itens`;
    document.getElementById('subtotal').textContent = formatarMoeda(carrinho.subtotal);
    document.getElementById('total').textContent = formatarMoeda(carrinho.total);
    
    const descontoRow = document.getElementById('descontoRow');
    const descontoTotal = document.getElementById('descontoTotal');
    
    if (carrinho.descontoTotal > 0) {
        descontoRow.style.display = 'flex';
        descontoTotal.textContent = `- ${formatarMoeda(carrinho.descontoTotal)}`;
    } else {
        descontoRow.style.display = 'none';
    }
}

// Atualizar botões
function atualizarBotoes() {
    const btnFinalizar = document.getElementById('btnFinalizar');
    const btnLimpar = document.getElementById('btnLimparCarrinho');
    
    const temItens = usuarioLogado && carrinho.itens.length > 0;
    
    if (btnFinalizar) btnFinalizar.disabled = !temItens;
    if (btnLimpar) btnLimpar.disabled = !temItens;
}

// ============================================
// FUNÇÕES DE FINALIZAÇÃO
// ============================================
function abrirModalFinalizacao() {
    if (!usuarioLogado) {
        abrirModal('loginModal');
        return;
    }
    
    if (carrinho.itens.length === 0) {
        mostrarMensagem('Carrinho vazio', 'warning');
        return;
    }
    
    abrirModal('finalizarModal');
    
    // Preencher dados do cliente
    document.getElementById('clienteNome').value = usuarioLogado.nome || '';
    document.getElementById('clienteEmail').value = usuarioLogado.email || '';
    document.getElementById('clienteTelefone').value = usuarioLogado.dados?.telefone || '';
    document.getElementById('clienteCpf').value = '';
    
    // Preencher resumo
    document.getElementById('resumoTotalItens').textContent = carrinho.itens.length;
    document.getElementById('resumoSubtotal').textContent = formatarMoeda(carrinho.subtotal);
    document.getElementById('resumoTotal').textContent = formatarMoeda(carrinho.total);
    
    // Resetar campos
    document.getElementById('clienteEndereco').value = '';
    document.getElementById('clienteCidade').value = '';
    document.getElementById('clienteCep').value = '';
    document.getElementById('taxaEntrega').value = 'R$ 0,00';
    document.getElementById('valorRecebido').value = '';
    document.getElementById('valorTroco').value = '';
    
    document.querySelector('input[name="tipoEntrega"][value="retirada"]').checked = true;
    document.querySelector('input[name="payment"][value="dinheiro"]').checked = true;
    
    document.getElementById('camposEntrega').style.display = 'none';
    document.getElementById('trocoSection').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('valorRecebido')?.focus();
    }, 500);
}

async function finalizarVenda() {
    if (!usuarioLogado) {
        fecharModal('finalizarModal');
        abrirModal('loginModal');
        return;
    }
    
    // Validar campos obrigatórios
    const tipoEntrega = document.querySelector('input[name="tipoEntrega"]:checked').value;
    const formaPagamento = document.querySelector('input[name="payment"]:checked').value;
    
    if (tipoEntrega === 'entrega') {
        const endereco = document.getElementById('clienteEndereco').value.trim();
        if (!endereco) {
            mostrarMensagem('Preencha o endereço de entrega', 'warning');
            return;
        }
    }
    
    if (formaPagamento === 'dinheiro') {
        const valorRecebido = parseFloat(
            document.getElementById('valorRecebido').value
                .replace('R$', '')
                .replace('.', '')
                .replace(',', '.')
                .trim() || '0'
        );
        
        if (valorRecebido < carrinho.total) {
            mostrarMensagem('Valor recebido insuficiente', 'warning');
            return;
        }
    }
    
    try {
        mostrarLoading('Processando venda...');
        fecharModal('finalizarModal');
        
        const numeroVenda = gerarNumeroVenda('V');
        const taxaEntrega = parseFloat(
            document.getElementById('taxaEntrega').value
                .replace('R$', '')
                .replace('.', '')
                .replace(',', '.')
                .trim() || '0'
        );
        
        const totalComEntrega = carrinho.total + taxaEntrega;
        const cpfCliente = document.getElementById('clienteCpf').value.replace(/\D/g, '') || '';
        
        const vendaData = {
            tipo: 'VENDA',
            numero: numeroVenda,
            data: new Date(),
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
                endereco: document.getElementById('clienteEndereco').value.trim(),
                cidade: document.getElementById('clienteCidade').value.trim(),
                cep: document.getElementById('clienteCep').value.trim(),
                taxaEntrega: taxaEntrega
            } : null,
            cliente: {
                nome: document.getElementById('clienteNome').value,
                email: usuarioLogado.email,
                telefone: document.getElementById('clienteTelefone').value.trim(),
                cpf: cpfCliente
            },
            vendedor_id: usuarioLogado.uid,
            vendedor_nome: usuarioLogado.nome,
            vendedor_login: usuarioLogado.email,
            loja_id: lojaIdAtual,
            status: 'concluida',
            data_criacao: new Date()
        };
        
        const resultado = await lojaServices.criarVenda(vendaData);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao salvar venda');
        }
        
        // Atualizar estoque
        for (const item of carrinho.itens) {
            await lojaServices.atualizarEstoque(
                item.id,
                item.quantidade,
                'saida'
            );
        }
        
        // Limpar carrinho
        carrinho.itens = [];
        salvarCarrinhoDoUsuario();
        atualizarInterface();
        
        mostrarMensagem(`Venda #${numeroVenda} finalizada com sucesso!`, 'success');
        mostrarNotaFiscal({ ...vendaData, id: resultado.id });
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        mostrarMensagem(`Erro ao finalizar venda: ${error.message}`, 'error');
    } finally {
        esconderLoading();
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

window.mascaraMoeda = function(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = (parseInt(valor) / 100).toFixed(2);
    input.value = formatarMoeda(valor);
};

window.mascaraCPF = function(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 11) {
        valor = valor.slice(0, 11);
    }
    
    if (valor.length <= 11) {
        if (valor.length > 9) {
            valor = valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        } else if (valor.length > 6) {
            valor = valor.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
        } else if (valor.length > 3) {
            valor = valor.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
        }
    }
    
    input.value = valor;
};

window.calcularTroco = function() {
    const valorRecebido = parseFloat(
        document.getElementById('valorRecebido').value
            .replace('R$', '')
            .replace('.', '')
            .replace(',', '.')
            .trim() || '0'
    );
    
    const troco = valorRecebido - carrinho.total;
    document.getElementById('valorTroco').value = 
        troco >= 0 ? formatarMoeda(troco) : 'R$ 0,00';
};

window.alterarQuantidade = function(index, delta) {
    const novaQuantidade = carrinho.itens[index].quantidade + delta;
    if (novaQuantidade < 1) {
        removerItem(index);
    } else {
        atualizarQuantidade(index, novaQuantidade);
    }
};

window.atualizarQuantidade = atualizarQuantidade;
window.removerItem = removerItem;
window.limparCarrinho = limparCarrinho;

function gerarNumeroVenda(prefixo = 'V') {
    const agora = new Date();
    const ano = agora.getFullYear().toString().slice(-2);
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const dia = agora.getDate().toString().padStart(2, '0');
    const hora = agora.getHours().toString().padStart(2, '0');
    const min = agora.getMinutes().toString().padStart(2, '0');
    const seg = agora.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefixo}${ano}${mes}${dia}${hora}${min}${seg}${random}`;
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

function mostrarLoading(texto = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = texto;
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
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    document.getElementById('btnFinalizar')?.addEventListener('click', abrirModalFinalizacao);
    document.getElementById('btnLimparCarrinho')?.addEventListener('click', limparCarrinho);
    document.getElementById('btnVoltar')?.addEventListener('click', (e) => {
        if (carrinho.itens.length > 0 && usuarioLogado) {
            if (!confirm('Há itens no carrinho. Deseja realmente sair?')) {
                e.preventDefault();
            }
        }
    });
    
    document.getElementById('btnConfirmarVenda')?.addEventListener('click', finalizarVenda);
    document.getElementById('btnLogout')?.addEventListener('click', () => {
        if (confirm('Deseja realmente sair?')) {
            window.fazerLogout();
        }
    });
    
    document.querySelectorAll('input[name="tipoEntrega"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('camposEntrega').style.display = 
                this.value === 'entrega' ? 'block' : 'none';
        });
    });
    
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('trocoSection').style.display = 
                this.value === 'dinheiro' ? 'block' : 'none';
        });
    });
    
    setInterval(atualizarRelogio, 1000);
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
            setTimeout(() => window.location.href = '../../../login.html', 2000);
            return;
        }
        
        carregarDadosLoja();
        configurarEventos();
        
        // Se já estiver logado, carregar carrinho
        if (window.auth?.currentUser) {
            console.log('👤 Usuário já logado detectado');
            // O evento 'usuarioLogado' será disparado pelo login_firebase.js
        }
        
        esconderLoading();
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar carrinho', 'error');
        esconderLoading();
    }
});

// Exportar funções globais
window.adicionarItem = adicionarItem;
window.finalizarVenda = finalizarVenda;
window.abrirModalFinalizacao = abrirModalFinalizacao;

console.log("✅ carrinho.js carregado com sucesso!");