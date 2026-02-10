// venda.js - SISTEMA DE VENDAS PDV MULTILOJA
console.log("🛒 Sistema PDV - Página de Vendas");

import { lojaServices } from './firebase_config.js';

function obterURLImagem(produto, tamanho = 'thumb') {
    if (!produto || !produto.imagens) {
        return obterImagemPlaceholderBase64(); // Usar base64 como fallback
    }
    
    const imagens = produto.imagens;
    
    // Escolher tamanho baseado no parâmetro
    switch(tamanho) {
        case 'thumb':
            return imagens.thumbnail || imagens.principal || obterImagemPlaceholderBase64();
        case 'medium':
            return imagens.medium || imagens.principal || obterImagemPlaceholderBase64();
        case 'large':
        case 'principal':
            return imagens.principal || obterImagemPlaceholderBase64();
        default:
            return imagens.principal || obterImagemPlaceholderBase64();
    }
}

// Função para obter imagem placeholder em base64
function obterImagemPlaceholderBase64() {
    return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#f8f9fa"/>
            <circle cx="50" cy="40" r="28" fill="none" stroke="#dee2e6" stroke-width="3"/>
            <line x1="30" y1="25" x2="70" y2="55" stroke="#6c757d" stroke-width="4" stroke-linecap="round"/>
            <line x1="70" y1="25" x2="30" y2="55" stroke="#6c757d" stroke-width="4" stroke-linecap="round"/>
            <text x="50" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#495057" font-weight="bold">
                SEM FOTO
            </text>
        </svg>
    `);
}

// Adicionar ao window para acesso global
window.obterURLImagem = obterURLImagem;

// Variáveis globais
let vendaManager = {
    produtos: [],
    carrinho: [],
    subtotal: 0,
    total: 0,
    desconto: 0,
    formaPagamento: 'dinheiro',
    isLeitorConectado: false,
    configImpressora: null
};



// ============================================
// 1. INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página de vendas carregada");
    
    try {
        // Mostrar loading inicial
        mostrarLoading('Inicializando PDV...');
        
        // Verificar se a loja está carregada
        if (!lojaServices || !lojaServices.lojaId) {
            console.warn('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja. Redirecionando...', 'error');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 2000);
            return;
        }
        
        console.log(`✅ Loja identificada: ${lojaServices.lojaId}`);
        
        // Atualizar interface com dados da loja
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Verificar leitor de código de barras
        verificarLeitorCodigoBarras();
        
        // Carregar configuração da impressora
        await carregarConfigImpressora();
        
        // Carregar produtos
        await carregarProdutos();
        
        // Verificar se há produto pré-selecionado
        verificarProdutoPreSelecionado();
        
        // Esconder loading
        esconderLoading();
        
        console.log("✅ PDV pronto para vendas");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de vendas', 'error');
        esconderLoading();
    }
});

// ============================================
// 2. ATUALIZAR INTERFACE DA LOJA
// ============================================
function atualizarInterfaceLoja() {
    try {
        // Atualizar nome da loja
        const nomeLoja = lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const lojaElement = document.getElementById('nomeLoja');
        const footerLojaElement = document.getElementById('footerLojaNome');
        
        if (lojaElement) lojaElement.textContent = nomeLoja;
        if (footerLojaElement) footerLojaElement.textContent = nomeLoja;
        
        // Atualizar nome do usuário
        const userElement = document.getElementById('userName');
        if (userElement && lojaServices.nomeUsuario) {
            userElement.textContent = lojaServices.nomeUsuario;
        }
        
        // Atualizar data/hora
        atualizarDataHora();
        setInterval(atualizarDataHora, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface:', error);
    }
}

function atualizarDataHora() {
    const elemento = document.getElementById('currentDateTime');
    if (!elemento) return;
    
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    elemento.textContent = dataFormatada;
}

// ============================================
// 3. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function(e) {
            if (vendaManager.carrinho.length > 0) {
                if (!confirm('Há itens no carrinho. Deseja realmente voltar e perder a venda atual?')) {
                    e.preventDefault();
                }
            }
        });
    }
    
    // Botão logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
    }
    
    // Busca de produtos
    const searchInput = document.getElementById('searchProduct');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            buscarProdutos(this.value);
        });
        
        // Focar no campo de busca
        setTimeout(() => searchInput.focus(), 100);
    }
    
    // Botão scan (leitor de código de barras)
    const btnScan = document.getElementById('btnScan');
    if (btnScan) {
        btnScan.addEventListener('click', function() {
            if (vendaManager.isLeitorConectado) {
                ativarModoScan();
            } else {
                mostrarModalConfigLeitor();
            }
        });
    }
    
    // Evento de teclado para scan
    document.addEventListener('keydown', function(e) {
        // Se estiver no modo scan, capturar entrada
        if (vendaManager.modoScanAtivo && e.key !== 'Enter') {
            if (vendaManager.bufferScan) {
                vendaManager.bufferScan += e.key;
            } else {
                vendaManager.bufferScan = e.key;
            }
            
            // Resetar timer do scan
            clearTimeout(vendaManager.scanTimer);
            vendaManager.scanTimer = setTimeout(processarCodigoBarras, 100);
        }
    });
    
    // Botão limpar carrinho
    const btnClearCart = document.getElementById('btnClearCart');
    if (btnClearCart) {
        btnClearCart.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0) {
                if (confirm('Tem certeza que deseja limpar o carrinho?')) {
                    limparCarrinho();
                }
            }
        });
    }
    
    // Desconto
    const descontoInput = document.getElementById('desconto');
    if (descontoInput) {
        descontoInput.addEventListener('change', function() {
            vendaManager.desconto = parseFloat(this.value) || 0;
            atualizarTotais();
        });
    }
    
    // Forma de pagamento
    const paymentRadios = document.querySelectorAll('input[name="payment"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            vendaManager.formaPagamento = this.value;
        });
    });
    
    // Botão imprimir
    const btnImprimir = document.getElementById('btnImprimirNota');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            imprimirNotaFiscal();
        });
    }
    
    // Botão finalizar venda
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', function() {
            finalizarVenda();
        });
    }
    
    // Botão cancelar venda
    const btnCancelar = document.getElementById('btnCancelarVenda');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            if (vendaManager.carrinho.length > 0) {
                if (confirm('Tem certeza que deseja cancelar a venda atual?')) {
                    limparCarrinho();
                }
            } else {
                mostrarMensagem('O carrinho já está vazio', 'info');
            }
        });
    }
}

// ============================================
// 4. LEITOR DE CÓDIGO DE BARRAS
// ============================================
async function verificarLeitorCodigoBarras() {
    try {
        // Tentar detectar leitor via WebUSB (para navegadores modernos)
        if ('usb' in navigator) {
            const dispositivos = await navigator.usb.getDevices();
            vendaManager.isLeitorConectado = dispositivos.some(d => 
                d.vendorId === 0x067b || // PL2303
                d.vendorId === 0x0403 || // FTDI
                d.productName.toLowerCase().includes('barcode') ||
                d.productName.toLowerCase().includes('scanner')
            );
        }
        
        // Alternativa: verificar via Web Serial API
        if ('serial' in navigator && !vendaManager.isLeitorConectado) {
            try {
                const port = await navigator.serial.getPorts();
                vendaManager.isLeitorConectado = port.length > 0;
            } catch (e) {
                // API não suportada ou sem permissão
            }
        }
        
        // Atualizar botão de scan
        const btnScan = document.getElementById('btnScan');
        if (btnScan) {
            if (vendaManager.isLeitorConectado) {
                btnScan.title = "Leitor de código de barras conectado. Clique para ativar modo scan.";
                btnScan.style.background = 'linear-gradient(135deg, #27ae60, #219653)';
            } else {
                btnScan.title = "Leitor de código de barras não detectado. Clique para configurar.";
                btnScan.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            }
        }
        
        console.log(`📷 Leitor de código de barras: ${vendaManager.isLeitorConectado ? 'CONECTADO' : 'NÃO CONECTADO'}`);
        
    } catch (error) {
        console.error('❌ Erro ao verificar leitor:', error);
        vendaManager.isLeitorConectado = false;
    }
}

function ativarModoScan() {
    vendaManager.modoScanAtivo = !vendaManager.modoScanAtivo;
    vendaManager.bufferScan = '';
    
    const btnScan = document.getElementById('btnScan');
    const searchInput = document.getElementById('searchProduct');
    
    if (vendaManager.modoScanAtivo) {
        btnScan.innerHTML = '<i class="fas fa-stop-circle"></i> Parar Scan';
        btnScan.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        searchInput.placeholder = "MODO SCAN ATIVO - Aponte o leitor...";
        searchInput.disabled = true;
        
        mostrarMensagem('Modo scan ativado. Aponte o leitor de código de barras.', 'info');
    } else {
        btnScan.innerHTML = '<i class="fas fa-barcode"></i> Escanear';
        btnScan.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        searchInput.placeholder = "Buscar produto por código ou nome...";
        searchInput.disabled = false;
        searchInput.focus();
    }
}

function processarCodigoBarras() {
    if (!vendaManager.bufferScan || vendaManager.bufferScan.length < 3) {
        vendaManager.bufferScan = '';
        return;
    }
    
    const codigo = vendaManager.bufferScan.trim();
    vendaManager.bufferScan = '';
    
    console.log(`📷 Código de barras lido: ${codigo}`);
    
    // Buscar produto pelo código
    buscarProdutoPorCodigo(codigo);
}

function buscarProdutoPorCodigo(codigo) {
    const produto = vendaManager.produtos.find(p => 
        p.codigo === codigo || 
        p.id === codigo ||
        (p.codigo_barras && p.codigo_barras === codigo)
    );
    
    if (produto) {
        if (produto.quantidade > 0) {
            selecionarProdutoParaVenda(produto.id);
            mostrarMensagem(`Produto encontrado: ${produto.nome}`, 'success');
        } else {
            mostrarMensagem('Produto sem estoque disponível', 'warning');
        }
    } else {
        mostrarMensagem('Produto não encontrado com este código', 'error');
    }
}

function mostrarModalConfigLeitor() {
    // Criar modal de configuração
    const modalHTML = `
        <div id="leitorConfigModal" class="modal">
            <div class="modal-content modal-sm">
                <div class="modal-header">
                    <h3><i class="fas fa-barcode"></i> Configurar Leitor</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Leitor de código de barras não detectado automaticamente.</p>
                    <p>Opções de conexão:</p>
                    <div class="config-options">
                        <button id="btnConfigUSB" class="btn-action btn-primary">
                            <i class="fas fa-usb"></i> Conectar via USB
                        </button>
                        <button id="btnConfigBluetooth" class="btn-action btn-secondary">
                            <i class="fas fa-bluetooth"></i> Conectar via Bluetooth
                        </button>
                        <button id="btnConfigSerial" class="btn-action btn-info">
                            <i class="fas fa-plug"></i> Conectar via Serial (COM)
                        </button>
                        <button id="btnConfigManual" class="btn-action btn-warning">
                            <i class="fas fa-keyboard"></i> Modo Manual (Teclado)
                        </button>
                    </div>
                    <p class="help-text">
                        <small>
                            <i class="fas fa-info-circle"></i>
                            No modo manual, o sistema irá detectar automaticamente a entrada rápida do teclado.
                        </small>
                    </p>
                </div>
                <div class="modal-footer">
                    <button id="btnCancelConfig" class="btn-cancel">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar modal ao DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('leitorConfigModal');
    
    // Configurar eventos
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#btnCancelConfig').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#btnConfigUSB').addEventListener('click', async () => {
        try {
            if ('usb' in navigator) {
                const device = await navigator.usb.requestDevice({
                    filters: [{ vendorId: 0x067b }, { vendorId: 0x0403 }]
                });
                vendaManager.isLeitorConectado = true;
                verificarLeitorCodigoBarras();
                mostrarMensagem('Leitor USB configurado com sucesso!', 'success');
                modal.remove();
            } else {
                mostrarMensagem('API WebUSB não suportada neste navegador', 'error');
            }
        } catch (error) {
            console.error('Erro ao configurar USB:', error);
            mostrarMensagem('Erro ao configurar leitor USB', 'error');
        }
    });
    
    modal.querySelector('#btnConfigBluetooth').addEventListener('click', async () => {
        try {
            if ('bluetooth' in navigator) {
                const device = await navigator.bluetooth.requestDevice({
                    filters: [{ namePrefix: 'Barcode' }, { namePrefix: 'Scanner' }],
                    optionalServices: ['battery_service']
                });
                vendaManager.isLeitorConectado = true;
                verificarLeitorCodigoBarras();
                mostrarMensagem('Leitor Bluetooth configurado!', 'success');
                modal.remove();
            } else {
                mostrarMensagem('API Bluetooth não suportada', 'error');
            }
        } catch (error) {
            console.error('Erro ao configurar Bluetooth:', error);
            mostrarMensagem('Erro ao configurar leitor Bluetooth', 'error');
        }
    });
    
    modal.querySelector('#btnConfigSerial').addEventListener('click', async () => {
        try {
            if ('serial' in navigator) {
                const port = await navigator.serial.requestPort();
                vendaManager.isLeitorConectado = true;
                verificarLeitorCodigoBarras();
                mostrarMensagem('Leitor Serial configurado!', 'success');
                modal.remove();
            } else {
                mostrarMensagem('API Serial não suportada', 'error');
            }
        } catch (error) {
            console.error('Erro ao configurar Serial:', error);
            mostrarMensagem('Erro ao configurar leitor Serial', 'error');
        }
    });
    
    modal.querySelector('#btnConfigManual').addEventListener('click', () => {
        vendaManager.isLeitorConectado = true;
        vendaManager.modoManual = true;
        verificarLeitorCodigoBarras();
        mostrarMensagem('Modo manual ativado. Digite rapidamente os códigos.', 'success');
        modal.remove();
    });
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Fechar ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
}

// ============================================
// 5. IMPRESSÃO DE NOTA FISCAL
// ============================================
async function carregarConfigImpressora() {
    try {
        // Tentar carregar do localStorage
        const configSalva = localStorage.getItem(`impressora_config_${lojaServices.lojaId}`);
        if (configSalva) {
            vendaManager.configImpressora = JSON.parse(configSalva);
        } else {
            // Configuração padrão
            vendaManager.configImpressora = {
                tipo: 'usb',
                modelo: 'epson',
                largura: 80,
                cortarAutomatico: true,
                abrirGaveta: false
            };
        }
        
        // Atualizar botão de impressão
        const btnImprimir = document.getElementById('btnImprimirNota');
        if (btnImprimir) {
            btnImprimir.disabled = !vendaManager.configImpressora;
            btnImprimir.title = vendaManager.configImpressora ? 
                `Impressora: ${vendaManager.configImpressora.modelo.toUpperCase()}` :
                'Configure a impressora primeiro';
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar configuração da impressora:', error);
        vendaManager.configImpressora = null;
    }
}

function mostrarModalConfigImpressora() {
    const modalHTML = `
        <div id="impressoraConfigModal" class="modal modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-print"></i> Configurar Impressora</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="printer-config">
                        <div class="config-group">
                            <label>Tipo de Conexão:</label>
                            <select id="tipoImpressora">
                                <option value="usb">USB</option>
                                <option value="bluetooth">Bluetooth</option>
                                <option value="serial">Serial (COM)</option>
                                <option value="rede">Rede</option>
                                <option value="nuvem">Impressora na Nuvem</option>
                            </select>
                        </div>
                        
                        <div class="config-group">
                            <label>Modelo da Impressora:</label>
                            <select id="modeloImpressora">
                                <option value="epson">Epson TM-T20/T81</option>
                                <option value="bematech">Bematech MP-4200 TH</option>
                                <option value="daruma">Daruma DR700</option>
                                <option value="elgin">Elgin i9</option>
                                <option value="sweda">Sweda SI-300</option>
                                <option value="outro">Outro Modelo</option>
                            </select>
                        </div>
                        
                        <div class="config-group">
                            <label>Largura da Nota (colunas):</label>
                            <input type="number" id="larguraImpressora" min="40" max="120" value="80">
                        </div>
                        
                        <div class="config-options">
                            <label>
                                <input type="checkbox" id="cortarAutomatico" checked>
                                Cortar papel automaticamente
                            </label>
                            <label>
                                <input type="checkbox" id="abrirGaveta">
                                Abrir gaveta de dinheiro
                            </label>
                            <label>
                                <input type="checkbox" id="imprimirLogo">
                                Imprimir logo da loja
                            </label>
                        </div>
                        
                        <div class="config-group">
                            <label>Endereço/Porta (se necessário):</label>
                            <input type="text" id="enderecoImpressora" placeholder="Ex: COM3, 192.168.1.100, 00:11:22:33:44:55">
                        </div>
                        
                        <div class="config-actions">
                            <button id="btnTestImpressora" class="btn-test">
                                <i class="fas fa-print"></i> Testar Impressão
                            </button>
                            <button id="btnSalvarImpressora" class="btn-save">
                                <i class="fas fa-save"></i> Salvar Configuração
                            </button>
                            <button id="btnCancelImpressora" class="btn-cancel">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('impressoraConfigModal');
    const config = vendaManager.configImpressora || {};
    
    // Preencher valores atuais
    if (config.tipo) document.getElementById('tipoImpressora').value = config.tipo;
    if (config.modelo) document.getElementById('modeloImpressora').value = config.modelo;
    if (config.largura) document.getElementById('larguraImpressora').value = config.largura;
    if (config.endereco) document.getElementById('enderecoImpressora').value = config.endereco;
    
    const cortarAutomatico = document.getElementById('cortarAutomatico');
    const abrirGaveta = document.getElementById('abrirGaveta');
    const imprimirLogo = document.getElementById('imprimirLogo');
    
    if (cortarAutomatico) cortarAutomatico.checked = config.cortarAutomatico !== false;
    if (abrirGaveta) abrirGaveta.checked = config.abrirGaveta === true;
    if (imprimirLogo) imprimirLogo.checked = config.imprimirLogo === true;
    
    // Eventos
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#btnCancelImpressora').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#btnSalvarImpressora').addEventListener('click', () => {
        const novaConfig = {
            tipo: document.getElementById('tipoImpressora').value,
            modelo: document.getElementById('modeloImpressora').value,
            largura: parseInt(document.getElementById('larguraImpressora').value) || 80,
            endereco: document.getElementById('enderecoImpressora').value,
            cortarAutomatico: document.getElementById('cortarAutomatico').checked,
            abrirGaveta: document.getElementById('abrirGaveta').checked,
            imprimirLogo: document.getElementById('imprimirLogo').checked
        };
        
        vendaManager.configImpressora = novaConfig;
        localStorage.setItem(`impressora_config_${lojaServices.lojaId}`, JSON.stringify(novaConfig));
        
        // Atualizar botão
        const btnImprimir = document.getElementById('btnImprimirNota');
        if (btnImprimir) {
            btnImprimir.disabled = false;
            btnImprimir.title = `Impressora: ${novaConfig.modelo.toUpperCase()}`;
        }
        
        mostrarMensagem('Configuração da impressora salva!', 'success');
        modal.remove();
    });
    
    modal.querySelector('#btnTestImpressora').addEventListener('click', () => {
        testarImpressao();
    });
    
    modal.style.display = 'flex';
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
}

async function imprimirNotaFiscal() {
    if (!vendaManager.configImpressora) {
        mostrarModalConfigImpressora();
        return;
    }
    
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho para imprimir', 'warning');
        return;
    }
    
    try {
        mostrarLoading('Preparando impressão...', 'Gerando nota fiscal...');
        
        // Gerar conteúdo da nota fiscal
        const conteudoNota = gerarConteudoNotaFiscal();
        
        // Diferentes métodos de impressão baseado no tipo
        switch (vendaManager.configImpressora.tipo) {
            case 'usb':
                await imprimirViaUSB(conteudoNota);
                break;
                
            case 'bluetooth':
                await imprimirViaBluetooth(conteudoNota);
                break;
                
            case 'serial':
                await imprimirViaSerial(conteudoNota);
                break;
                
            case 'rede':
                await imprimirViaRede(conteudoNota);
                break;
                
            case 'nuvem':
                await imprimirViaNuvem(conteudoNota);
                break;
                
            default:
                // Fallback: impressão no navegador
                imprimirNoNavegador(conteudoNota);
                break;
        }
        
        esconderLoading();
        mostrarMensagem('Nota fiscal impressa com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao imprimir:', error);
        esconderLoading();
        mostrarMensagem('Erro ao imprimir nota fiscal', 'error');
    }
}

function gerarConteudoNotaFiscal() {
    const config = vendaManager.configImpressora;
    const largura = config.largura || 48;
    const nomeLoja = lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const dataHora = new Date().toLocaleString('pt-BR');
    const numeroVenda = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const vendedor = lojaServices.nomeUsuario || 'Vendedor';
    
    let conteudo = '';
    
    // Cabeçalho
    conteudo += '='.repeat(largura) + '\n';
    conteudo += nomeLoja.padStart((largura + nomeLoja.length) / 2).trim() + '\n';
    conteudo += 'PDV - SISTEMA DE VENDAS\n';
    conteudo += '='.repeat(largura) + '\n';
    conteudo += `Data: ${dataHora}\n`;
    conteudo += `Venda: #${numeroVenda}\n`;
    conteudo += `Vendedor: ${vendedor}\n`;
    conteudo += '-'.repeat(largura) + '\n';
    conteudo += 'PRODUTOS\n';
    conteudo += '-'.repeat(largura) + '\n';
    
    // Itens
    vendaManager.carrinho.forEach(item => {
        const nome = item.nome.length > 30 ? item.nome.substring(0, 27) + '...' : item.nome;
        conteudo += `${nome}\n`;
        conteudo += `  ${item.quantidade}x ${formatarMoeda(item.preco_unitario)} = ${formatarMoeda(item.subtotal)}\n`;
    });
    
    // Totais
    conteudo += '-'.repeat(largura) + '\n';
    conteudo += `Subtotal: ${' '.repeat(largura - 20)}${formatarMoeda(vendaManager.subtotal)}\n`;
    conteudo += `Desconto: ${' '.repeat(largura - 20)}${formatarMoeda(vendaManager.subtotal * (vendaManager.desconto / 100))}\n`;
    conteudo += `TOTAL: ${' '.repeat(largura - 20)}${formatarMoeda(vendaManager.total)}\n`;
    conteudo += `Pagamento: ${vendaManager.formaPagamento.replace('_', ' ').toUpperCase()}\n`;
    conteudo += '-'.repeat(largura) + '\n';
    conteudo += 'Obrigado pela preferência!\n';
    conteudo += 'Volte sempre!\n';
    conteudo += '*'.repeat(largura) + '\n';
    
    // Comandos específicos da impressora
    if (config.modelo === 'epson') {
        conteudo += '\x1B\x40'; // Inicializar
        if (config.cortarAutomatico) {
            conteudo += '\x1D\x56\x41\x03'; // Cortar papel
        }
        if (config.abrirGaveta) {
            conteudo += '\x1B\x70\x00\x19\x19'; // Abrir gaveta
        }
    }
    
    return conteudo;
}

async function imprimirViaUSB(conteudo) {
    try {
        if ('usb' in navigator) {
            const device = await navigator.usb.requestDevice({
                filters: [{ vendorId: 0x04b8 }, { vendorId: 0x067b }] // Epson, Prolific
            });
            
            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);
            
            // Converter texto para bytes
            const encoder = new TextEncoder();
            const data = encoder.encode(conteudo);
            
            await device.transferOut(1, data);
            await device.close();
            
            return true;
        }
    } catch (error) {
        console.error('Erro impressão USB:', error);
        throw error;
    }
}

async function imprimirViaBluetooth(conteudo) {
    try {
        if ('bluetooth' in navigator) {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Printer' }, { namePrefix: 'EPSON' }],
                optionalServices: ['generic_access']
            });
            
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('generic_access');
            const characteristic = await service.getCharacteristic('device_name');
            
            // Converter e enviar dados (simplificado)
            const encoder = new TextEncoder();
            const data = encoder.encode(conteudo);
            
            await characteristic.writeValue(data);
            
            return true;
        }
    } catch (error) {
        console.error('Erro impressão Bluetooth:', error);
        throw error;
    }
}

function imprimirNoNavegador(conteudo) {
    // Criar janela de impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Nota Fiscal - ${lojaServices.lojaId}</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.2;
                        margin: 0;
                        padding: 10px;
                        width: ${vendaManager.configImpressora.largura * 6}px;
                    }
                    .nota-fiscal {
                        white-space: pre;
                        word-wrap: break-word;
                    }
                    @media print {
                        body { margin: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <pre class="nota-fiscal">${conteudo}</pre>
                <button onclick="window.print()">Imprimir</button>
                <button onclick="window.close()">Fechar</button>
            </body>
        </html>
    `);
    printWindow.document.close();
}

async function testarImpressao() {
    try {
        const conteudoTeste = 
            '='.repeat(48) + '\n' +
            'TESTE DE IMPRESSORA\n' +
            '='.repeat(48) + '\n' +
            'Data: ' + new Date().toLocaleString('pt-BR') + '\n' +
            'Loja: ' + lojaServices.lojaId + '\n' +
            '='.repeat(48) + '\n' +
            'Esta é uma página de teste.\n' +
            'Se esta mensagem apareceu,\n' +
            'sua impressora está configurada\n' +
            'corretamente.\n' +
            '='.repeat(48) + '\n';
        
        await imprimirNotaFiscalTeste(conteudoTeste);
        mostrarMensagem('Teste de impressão enviado!', 'success');
        
    } catch (error) {
        mostrarMensagem('Erro no teste de impressão', 'error');
    }
}

// ============================================
// 6. FUNÇÕES DE PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...');
        
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            vendaManager.produtos = resultado.data;
            exibirProdutos(vendaManager.produtos);
            
            // Atualizar contador
            atualizarContadorProdutos(vendaManager.produtos.length);
            
            console.log(`✅ ${vendaManager.produtos.length} produtos carregados`);
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            vendaManager.produtos = [];
            exibirProdutos([]);
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        vendaManager.produtos = [];
        exibirProdutos([]);
    }
}

function exibirProdutos(produtos) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    if (!produtos || produtos.length === 0) {
        document.getElementById('loadingProducts').style.display = 'none';
        document.getElementById('emptyProducts').style.display = 'flex';
        return;
    }
    
    let html = '';
    
    produtos.forEach(produto => {
        const temEstoque = produto.quantidade > 0;
        const estoqueBaixo = produto.quantidade <= (produto.estoque_minimo || 5);
        const precoFormatado = formatarMoeda(produto.preco);
        
        // Obter URL da imagem - AGORA SEMPRE RETORNA ALGO (base64 se não houver imagem)
        const imagemURL = obterURLImagem(produto, 'thumb');
        const temImagem = imagemURL && !imagemURL.includes('data:image/svg+xml'); // Verifica se é base64
        
        html += `
            <div class="product-card ${!temEstoque ? 'disabled' : ''}" 
                 onclick="window.vendaManager.selecionarProdutoParaVenda('${produto.id}')" 
                 title="${produto.nome} - Estoque: ${produto.quantidade} ${produto.unidade || 'UN'}">
                
                <!-- IMAGEM DO PRODUTO -->
                <div class="product-image">
                    <img src="${imagemURL}" 
                         alt="${produto.nome}"
                         class="${temImagem ? 'has-image' : 'no-image'}">
                    ${!temImagem ? '<div class="image-placeholder"><i class="fas fa-image"></i></div>' : ''}
                </div>
                
                <div class="product-header">
                    <span class="product-code">${produto.codigo || 'SEM CÓDIGO'}</span>
                    <span class="product-stock ${estoqueBaixo ? 'low' : ''}">
                        ${produto.quantidade} ${produto.unidade || 'UN'}
                    </span>
                </div>
                
                <div class="product-name">${produto.nome}</div>
                
                ${produto.categoria ? `<div class="product-category">${produto.categoria}</div>` : ''}
                
                <div class="product-footer">
                    <span class="product-price">${precoFormatado}</span>
                    <button class="btn-add-product" 
                            onclick="event.stopPropagation(); window.vendaManager.selecionarProdutoParaVenda('${produto.id}')"
                            ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('loadingProducts').style.display = 'none';
    document.getElementById('emptyProducts').style.display = 'none';
    productsGrid.innerHTML = html;
}

function buscarProdutos(termo) {
    if (!termo.trim()) {
        exibirProdutos(vendaManager.produtos);
        return;
    }
    
    const termoLower = termo.toLowerCase();
    const produtosFiltrados = vendaManager.produtos.filter(produto => 
        (produto.codigo && produto.codigo.toLowerCase().includes(termoLower)) ||
        (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
        (produto.categoria && produto.categoria.toLowerCase().includes(termoLower))
    );
    
    exibirProdutos(produtosFiltrados);
    atualizarContadorProdutos(produtosFiltrados.length);
}

function atualizarContadorProdutos(total) {
    const countElement = document.getElementById('productCount');
    if (countElement) {
        countElement.textContent = `${total} produto${total !== 1 ? 's' : ''}`;
    }
}

function verificarProdutoPreSelecionado() {
    const produtoId = sessionStorage.getItem('produto_selecionado_venda');
    if (produtoId) {
        setTimeout(() => {
            selecionarProdutoParaVenda(produtoId);
            sessionStorage.removeItem('produto_selecionado_venda');
        }, 500);
    }
}

// ============================================
// 7. FUNÇÕES DO CARRINHO
// ============================================
window.vendaManager = {
    selecionarProdutoParaVenda: async function(produtoId) {
        try {
            const resultado = await lojaServices.buscarProdutoPorId(produtoId);
            
            if (resultado.success) {
                const produto = resultado.data;
                
                if (produto.quantidade <= 0) {
                    mostrarMensagem('Produto sem estoque disponível', 'warning');
                    return;
                }
                
                // Verificar se produto já está no carrinho
                const itemExistente = vendaManager.carrinho.find(item => item.id === produtoId);
                
                if (itemExistente) {
                    // Abrir modal para atualizar quantidade
                    abrirModalQuantidade(produto, itemExistente.quantidade);
                } else {
                    // Abrir modal para adicionar novo item
                    abrirModalQuantidade(produto, 1);
                }
                
            } else {
                mostrarMensagem('Produto não encontrado', 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao selecionar produto:', error);
            mostrarMensagem('Erro ao carregar produto', 'error');
        }
    }
};

function abrirModalQuantidade(produto, quantidadeAtual = 1) {
    const maxQuantidade = produto.quantidade;
    
    const modalHTML = `
        <div id="quantidadeModal" class="modal modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-cart-plus"></i> Adicionar ao Carrinho</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="product-info">
                        <h4>${produto.nome}</h4>
                        <p>Código: ${produto.codigo || 'N/A'}</p>
                        <p>Estoque: ${produto.quantidade} ${produto.unidade || 'UN'}</p>
                        <p>Preço: ${formatarMoeda(produto.preco)}</p>
                    </div>
                    
                    <div class="quantity-control">
                        <label for="quantidade">Quantidade:</label>
                        <div class="quantity-input">
                            <button class="qty-btn" onclick="alterarQuantidadeModal(-1, ${maxQuantidade})">-</button>
                            <input type="number" id="quantidade" value="${quantidadeAtual}" min="1" max="${maxQuantidade}" step="1">
                            <button class="qty-btn" onclick="alterarQuantidadeModal(1, ${maxQuantidade})">+</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="btnCancelQuantidade" class="btn-cancel">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button id="btnAddQuantidade" class="btn-add">
                        <i class="fas fa-cart-plus"></i> Adicionar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    const modal = document.getElementById('quantidadeModal');
    const quantidadeInput = modal.querySelector('#quantidade');
    
    // Eventos
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#btnCancelQuantidade').addEventListener('click', () => modal.remove());
    
    modal.querySelector('#btnAddQuantidade').addEventListener('click', () => {
        const quantidade = parseInt(quantidadeInput.value) || 1;
        adicionarAoCarrinho(produto, quantidade);
        modal.remove();
    });
    
    quantidadeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const quantidade = parseInt(this.value) || 1;
            adicionarAoCarrinho(produto, quantidade);
            modal.remove();
        }
    });
    
    quantidadeInput.addEventListener('change', function() {
        let valor = parseInt(this.value) || 1;
        if (valor < 1) valor = 1;
        if (valor > maxQuantidade) valor = maxQuantidade;
        this.value = valor;
    });
    
    modal.style.display = 'flex';
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            modal.remove();
        }
    });
    
    // Focar no input
    setTimeout(() => quantidadeInput.select(), 100);
}

window.alterarQuantidadeModal = function(mudanca, maximo) {
    const input = document.getElementById('quantidade');
    if (!input) return;
    
    let valor = parseInt(input.value) || 1;
    valor += mudanca;
    
    if (valor < 1) valor = 1;
    if (valor > maximo) valor = maximo;
    
    input.value = valor;
};

function adicionarAoCarrinho(produto, quantidade) {
    if (quantidade <= 0) {
        mostrarMensagem('Quantidade inválida', 'error');
        return;
    }
    
    if (quantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    // Verificar se já existe no carrinho
    const index = vendaManager.carrinho.findIndex(item => item.id === produto.id);
    
    if (index !== -1) {
        // Atualizar quantidade existente
        vendaManager.carrinho[index].quantidade += quantidade;
        vendaManager.carrinho[index].subtotal = vendaManager.carrinho[index].quantidade * vendaManager.carrinho[index].preco_unitario;
    } else {
        // Adicionar novo item
        vendaManager.carrinho.push({
            id: produto.id,
            codigo: produto.codigo,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: quantidade,
            subtotal: produto.preco * quantidade,
            unidade: produto.unidade || 'UN'
        });
    }
    
    atualizarCarrinho();
    atualizarTotais();
    
    mostrarMensagem(`${quantidade}x ${produto.nome} adicionado ao carrinho`, 'success');
}

function atualizarCarrinho() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    
    if (vendaManager.carrinho.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrinho vazio</p>
                <small>Adicione produtos para iniciar a venda</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    vendaManager.carrinho.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nome}</div>
                    <div class="cart-item-details">
                        <span>Código: ${item.codigo || 'N/A'}</span>
                        <span>Preço: ${formatarMoeda(item.preco_unitario)}</span>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="alterarQuantidadeCarrinho(${index}, -1)">-</button>
                        <input type="number" class="qty-input" value="${item.quantidade}" 
                               min="1" max="999" 
                               onchange="atualizarQuantidadeCarrinho(${index}, this.value)">
                        <button class="qty-btn" onclick="alterarQuantidadeCarrinho(${index}, 1)">+</button>
                    </div>
                    <div class="cart-item-price">${formatarMoeda(item.subtotal)}</div>
                    <button class="btn-remove-item" onclick="removerDoCarrinho(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

window.alterarQuantidadeCarrinho = function(index, mudanca) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    const produto = vendaManager.produtos.find(p => p.id === item.id);
    
    if (!produto) return;
    
    const novaQuantidade = item.quantidade + mudanca;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        return;
    }
    
    vendaManager.carrinho[index].quantidade = novaQuantidade;
    vendaManager.carrinho[index].subtotal = novaQuantidade * item.preco_unitario;
    
    atualizarCarrinho();
    atualizarTotais();
};

window.atualizarQuantidadeCarrinho = function(index, valor) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    const produto = vendaManager.produtos.find(p => p.id === item.id);
    
    if (!produto) return;
    
    const novaQuantidade = parseInt(valor) || 1;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novaQuantidade > produto.quantidade) {
        mostrarMensagem(`Quantidade indisponível. Estoque: ${produto.quantidade}`, 'warning');
        vendaManager.carrinho[index].quantidade = 1;
    } else {
        vendaManager.carrinho[index].quantidade = novaQuantidade;
    }
    
    vendaManager.carrinho[index].subtotal = vendaManager.carrinho[index].quantidade * item.preco_unitario;
    
    atualizarCarrinho();
    atualizarTotais();
};

window.removerDoCarrinho = function(index) {
    if (index < 0 || index >= vendaManager.carrinho.length) return;
    
    const item = vendaManager.carrinho[index];
    
    if (confirm(`Remover ${item.nome} do carrinho?`)) {
        vendaManager.carrinho.splice(index, 1);
        atualizarCarrinho();
        atualizarTotais();
        mostrarMensagem('Item removido do carrinho', 'info');
    }
};

function limparCarrinho() {
    vendaManager.carrinho = [];
    vendaManager.subtotal = 0;
    vendaManager.total = 0;
    vendaManager.desconto = 0;
    
    atualizarCarrinho();
    atualizarTotais();
    
    document.getElementById('desconto').value = 0;
    
    mostrarMensagem('Carrinho limpo', 'info');
}

function atualizarTotais() {
    // Calcular subtotal
    vendaManager.subtotal = vendaManager.carrinho.reduce((total, item) => total + item.subtotal, 0);
    
    // Calcular total com desconto
    const valorDesconto = vendaManager.subtotal * (vendaManager.desconto / 100);
    vendaManager.total = vendaManager.subtotal - valorDesconto;
    
    // Atualizar UI
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');
    
    if (subtotalElement) subtotalElement.textContent = formatarMoeda(vendaManager.subtotal);
    if (totalElement) totalElement.textContent = formatarMoeda(vendaManager.total);
    
    // Atualizar botão finalizar
    const btnFinalizar = document.getElementById('btnFinalizarVenda');
    if (btnFinalizar) {
        btnFinalizar.disabled = vendaManager.carrinho.length === 0;
        btnFinalizar.title = vendaManager.carrinho.length === 0 ? 'Adicione produtos ao carrinho' : 'Finalizar venda';
    }
    
    // Atualizar botão imprimir
    const btnImprimir = document.getElementById('btnImprimirNota');
    if (btnImprimir && vendaManager.configImpressora) {
        btnImprimir.disabled = vendaManager.carrinho.length === 0;
    }
}

// ============================================
// 8. FINALIZAR VENDA
// ============================================
async function finalizarVenda() {
    if (vendaManager.carrinho.length === 0) {
        mostrarMensagem('Adicione produtos ao carrinho primeiro', 'warning');
        return;
    }
    
    if (!confirm(`Finalizar venda no valor de ${formatarMoeda(vendaManager.total)}?`)) {
        return;
    }
    
    try {
        mostrarLoading('Processando venda...', 'Atualizando estoque e gerando comprovante...');
        
        // Preparar dados da venda
        const vendaData = {
            itens: vendaManager.carrinho.map(item => ({
                produto_id: item.id,
                codigo: item.codigo,
                nome: item.nome,
                preco_unitario: item.preco_unitario,
                quantidade: item.quantidade,
                subtotal: item.subtotal
            })),
            subtotal: vendaManager.subtotal,
            desconto: vendaManager.desconto,
            valor_desconto: vendaManager.subtotal * (vendaManager.desconto / 100),
            total: vendaManager.total,
            forma_pagamento: vendaManager.formaPagamento,
            vendedor_id: lojaServices.usuarioId,
            vendedor_nome: lojaServices.nomeUsuario,
            data_venda: new Date(),
            status: 'concluida'
        };
        
        // Registrar venda no Firebase
        const resultado = await lojaServices.registrarVenda(vendaData);
        
        if (resultado.success) {
            // Atualizar estoque dos produtos
            await atualizarEstoqueProdutos();
            
            // Imprimir nota fiscal se configurado
            if (vendaManager.configImpressora) {
                try {
                    await imprimirNotaFiscal();
                } catch (error) {
                    console.warn('⚠️ Erro ao imprimir, mas venda foi registrada:', error);
                }
            }
            
            // Mostrar sucesso
            mostrarMensagem(`Venda finalizada com sucesso! Total: ${formatarMoeda(vendaManager.total)}`, 'success');
            
            // Limpar carrinho após 2 segundos
            setTimeout(() => {
                limparCarrinho();
                document.getElementById('searchProduct').focus();
            }, 2000);
            
        } else {
            throw new Error(resultado.error);
        }
        
        esconderLoading();
        
    } catch (error) {
        console.error('❌ Erro ao finalizar venda:', error);
        esconderLoading();
        mostrarMensagem('Erro ao finalizar venda: ' + error.message, 'error');
    }
}

async function atualizarEstoqueProdutos() {
    try {
        for (const item of vendaManager.carrinho) {
            const produto = vendaManager.produtos.find(p => p.id === item.id);
            if (produto) {
                await lojaServices.atualizarEstoqueProduto(
                    item.id, 
                    produto.quantidade - item.quantidade
                );
            }
        }
        
        // Recarregar produtos para atualizar estoque
        await carregarProdutos();
        
    } catch (error) {
        console.error('❌ Erro ao atualizar estoque:', error);
        throw error;
    }
}

// ============================================
// 9. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
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
    
    // Configurar alerta
    alert.className = `message-alert ${tipo}`;
    alert.style.display = 'block';
    
    // Texto
    const text = alert.querySelector('.message-text');
    if (text) text.textContent = texto;
    
    // Botão fechar
    const closeBtn = alert.querySelector('.message-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.display = 'none';
        };
    }
    
    // Auto-ocultar
    setTimeout(function() {
        if (alert.style.display === 'block') {
            alert.style.display = 'none';
        }
    }, tempo);
}

console.log("✅ Sistema de vendas PDV completamente carregado!");








