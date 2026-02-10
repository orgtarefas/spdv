// estoque.js - SISTEMA DE ESTOQUE DINÂMICO PARA MULTILOJA
console.log("📦 Sistema de Estoque Multiloja - Iniciando...");

import { lojaServices, db } from './firebase_config.js';
import { imagemServices } from './imagem_api.js';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let produtos = [];
let produtosFiltrados = [];
let categorias = [];

// Elementos DOM
let searchInput, btnNovoProduto, btnRelatorioEstoque, btnRefresh, filterStatus;
let estoqueTableBody, totalProdutosElement, totalEstoqueElement, baixoEstoqueElement, valorTotalElement;
let currentCountElement, lastUpdateElement, userNameElement, btnLogout;
let modalProduto, formProduto, produtoIdInput, modalTitle;
let codigoInput, nomeInput, categoriaInput, unidadeSelect, precoCustoInput;
let precoInput, quantidadeInput, estoqueMinimoInput, descricaoTextarea, fornecedorInput;
// Elementos DOM adicionais
let pesoPorUnidadeInput, unidadePesoSelect, totalPesoInput, totalPesoUnidadeSpan;

// VARIÁVEIS PARA IMAGENS
let imagemAtual = null;
let imagemPreviewURL = null;
let imagemUploadResult = null;
let uploadArea, fileInput, previewImage, imagePreview;
let uploadProgress, progressFill, progressPercent, imageStatus;

// ============================================
// 1. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📄 Página estoque carregada");
    
    // Mostrar loading inicial
    mostrarLoading('Inicializando estoque...', 'Carregando configurações...');
    
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
        
        // Inicializar elementos DOM
        inicializarElementosDOM();
        
        // Atualizar interface com dados da loja
        atualizarInterfaceLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar dados iniciais
        await carregarDadosIniciais();
        
        // Atualizar data/hora
        atualizarUltimaAtualizacao();
        setInterval(atualizarUltimaAtualizacao, 60000);
        
        // Esconder loading
        esconderLoading();
        
        console.log("✅ Sistema de estoque pronto para uso");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar sistema de estoque', 'error');
        esconderLoading();
    }
});

// ============================================
// GERENCIAMENTO DE IMAGENS
// ============================================

function inicializarUploadImagem() {
    if (!uploadArea || !fileInput) return;
    
    // Clique na área de upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Seleção de arquivo
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processarImagemSelecionada(e.target.files[0]);
        }
    });
    
    // Arrastar e soltar
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
        mostrarDragPreview(e);
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
        document.getElementById('dragPreview').style.display = 'none';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        document.getElementById('dragPreview').style.display = 'none';
        
        if (e.dataTransfer.files.length > 0) {
            processarImagemSelecionada(e.dataTransfer.files[0]);
        }
    });
}

function processarImagemSelecionada(file) {
    // Validar
    if (!file.type.startsWith('image/')) {
        mostrarMensagem('Selecione um arquivo de imagem válido', 'error');
        return;
    }
    
    if (file.size > 32 * 1024 * 1024) {
        mostrarMensagem('Imagem muito grande. Máximo 32MB', 'error');
        return;
    }
    
    // Salvar imagem
    imagemAtual = file;
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagemPreviewURL = e.target.result;
        mostrarPreviewImagem();
    };
    reader.readAsDataURL(file);
    
    // Atualizar status
    if (imageStatus) {
        imageStatus.textContent = 'Pronto para enviar';
        imageStatus.className = 'status-pending';
    }
}

function mostrarPreviewImagem() {
    if (!imagemPreviewURL) return;
    
    if (previewImage) previewImage.src = imagemPreviewURL;
    if (imagePreview) imagePreview.style.display = 'block';
    if (uploadArea) uploadArea.style.display = 'none';
}

function mostrarDragPreview(e) {
    const dragPreview = document.getElementById('dragPreview');
    const dragImage = document.getElementById('dragImage');
    
    if (dragPreview) {
        // Verificar se há imagem sendo arrastada
        if (e.dataTransfer.items) {
            for (const item of e.dataTransfer.items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    dragPreview.style.display = 'flex';
                    
                    // Tentar mostrar prévia se possível
                    const file = item.getAsFile();
                    if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (dragImage) {
                                dragImage.src = event.target.result;
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                    break;
                }
            }
        }
    }
}

function trocarImagem() {
    if (fileInput) fileInput.click();
}

function removerImagem() {
    imagemAtual = null;
    imagemPreviewURL = null;
    imagemUploadResult = null;
    
    if (imagePreview) imagePreview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileInput) fileInput.value = '';
    if (previewImage) previewImage.src = '';
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (imageStatus) {
        imageStatus.textContent = '';
        imageStatus.className = '';
    }
}

async function fazerUploadImagem() {
    if (!imagemAtual) {
        return null;
    }
    
    try {
        mostrarProgressoUpload(0, 'Preparando...');
        
        // Verificar se a loja tem álbum configurado
        const temAlbum = lojaServices.imgbbAlbumId ? true : false;
        console.log(`📁 Álbum configurado: ${temAlbum ? 'Sim' : 'Não'}`);
        if (temAlbum) {
            console.log(`🎯 Album ID: ${lojaServices.imgbbAlbumId}`);
        }
        
        // Fazer upload usando o serviço de imagens COM ALBUM
        const resultado = await imagemServices.uploadImagem(
            imagemAtual,
            `produto_${Date.now()}_${lojaServices.lojaId}`,
            lojaServices
        );
        
        if (resultado.success) {
            imagemUploadResult = resultado;
            mostrarProgressoUpload(100, 'Upload completo!');
            
            // Mostrar informações do álbum
            if (resultado.album_id) {
                console.log(`📁 Imagem salva no álbum: ${resultado.album_id}`);
                
                // Verificar se foi para o álbum correto
                if (resultado.album_configurado && resultado.album_id === resultado.album_configurado) {
                    console.log('🎉 Imagem enviada para o álbum correto!');
                    if (imageStatus) {
                        imageStatus.textContent = `Imagem enviada (Álbum: ${resultado.album_id})`;
                        imageStatus.className = 'status-success';
                    }
                } else {
                    console.warn('⚠️ Imagem não foi para o álbum configurado');
                    if (imageStatus) {
                        imageStatus.textContent = 'Imagem enviada (sem álbum)';
                        imageStatus.className = 'status-warning';
                    }
                }
            } else {
                console.log('ℹ️ Imagem salva sem álbum');
                if (imageStatus) {
                    imageStatus.textContent = 'Imagem enviada (sem álbum)';
                    imageStatus.className = 'status-success';
                }
            }
            
            return resultado;
        } else {
            throw new Error(resultado.error || 'Erro no upload');
        }
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        mostrarMensagem(`Erro ao enviar imagem: ${error.message}`, 'error');
        if (imageStatus) {
            imageStatus.textContent = 'Erro no upload';
            imageStatus.className = 'status-error';
        }
        return null;
    }
}

function mostrarProgressoUpload(percentual, texto) {
    if (uploadProgress) uploadProgress.style.display = 'block';
    if (progressFill) progressFill.style.width = `${percentual}%`;
    if (progressPercent) progressPercent.textContent = texto;
}

function mostrarImagemExistente(imagens) {
    if (!imagens || !imagens.principal || imagens.principal === '/images/sem-foto.png') {
        removerImagem();
        return;
    }
    
    if (previewImage) previewImage.src = imagens.thumbnail || imagens.principal;
    if (imagePreview) imagePreview.style.display = 'block';
    if (uploadArea) uploadArea.style.display = 'none';
    if (imageStatus) {
        imageStatus.textContent = 'Imagem carregada';
        imageStatus.className = 'status-success';
    }
    
    // Salvar dados da imagem
    imagemUploadResult = {
        url: imagens.principal,
        thumb: imagens.thumbnail,
        medium: imagens.medium || imagens.principal,
        id: imagens.provider_id,
        uploaded_at: imagens.uploaded_at
    };
}

// ============================================
// 2. INICIALIZAR ELEMENTOS DOM
// ============================================
function inicializarElementosDOM() {
    console.log("🔍 Buscando elementos DOM...");
    
    // Elementos principais
    searchInput = document.getElementById('searchInput');
    btnNovoProduto = document.getElementById('btnNovoProduto');
    btnRelatorioEstoque = document.getElementById('btnRelatorioEstoque');
    btnRefresh = document.getElementById('btnRefresh');
    filterStatus = document.getElementById('filterStatus');
    estoqueTableBody = document.getElementById('estoqueTableBody');
    totalProdutosElement = document.getElementById('totalProdutos');
    totalEstoqueElement = document.getElementById('totalEstoque');
    baixoEstoqueElement = document.getElementById('baixoEstoque');
    valorTotalElement = document.getElementById('valorTotal');
    currentCountElement = document.getElementById('currentCount');
    lastUpdateElement = document.getElementById('lastUpdate');
    userNameElement = document.getElementById('userName');
    btnLogout = document.getElementById('btnLogout');
    
    // Modal
    modalProduto = document.getElementById('modalProduto');
    formProduto = document.getElementById('formProduto');
    produtoIdInput = document.getElementById('produtoId');
    modalTitle = document.getElementById('modalTitle');
    
    // Campos do formulário
    codigoInput = document.getElementById('codigo');
    nomeInput = document.getElementById('nome');
    categoriaInput = document.getElementById('categoria');
    unidadeSelect = document.getElementById('unidade');
    precoCustoInput = document.getElementById('preco_custo');
    precoInput = document.getElementById('preco');
    quantidadeInput = document.getElementById('quantidade');
    estoqueMinimoInput = document.getElementById('estoque_minimo');
    descricaoTextarea = document.getElementById('descricao');
    fornecedorInput = document.getElementById('fornecedor');

    // Novos campos de peso
    pesoPorUnidadeInput = document.getElementById('peso_por_unidade');
    unidadePesoSelect = document.getElementById('unidade_peso');
    totalPesoInput = document.getElementById('total_peso');
    totalPesoUnidadeSpan = document.getElementById('total_peso_unidade');    

    // Elementos da seção de imagem
    uploadArea = document.getElementById('uploadArea');
    fileInput = document.getElementById('imagemProduto');
    previewImage = document.getElementById('previewImage');
    imagePreview = document.getElementById('imagePreview');
    
    // Elementos de progresso
    uploadProgress = document.getElementById('uploadProgress');
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    imageStatus = document.getElementById('imageStatus');
    
    // Drag preview - CRIAÇÃO DINÂMICA
    if (!document.getElementById('dragPreview')) {
        const dragPreview = document.createElement('div');
        dragPreview.id = 'dragPreview';
        dragPreview.className = 'drag-preview';
        dragPreview.style.display = 'none';
        dragPreview.innerHTML = `
            <img id="dragImage" src="" alt="Prévia">
            <p>Solte para fazer upload</p>
        `;
        if (uploadArea) {
            uploadArea.appendChild(dragPreview);
        }
    }
    
    console.log("✅ Elementos DOM inicializados");
}

function calcularPesoTotal() {
    if (!pesoPorUnidadeInput || !quantidadeInput || !totalPesoInput || !totalPesoUnidadeSpan) {
        return;
    }
    
    const pesoPorUnidade = parseFloat(pesoPorUnidadeInput.value) || 0;
    const quantidade = parseInt(quantidadeInput.value) || 0;
    const unidadePeso = unidadePesoSelect ? unidadePesoSelect.value : 'kg';
    
    const pesoTotal = pesoPorUnidade * quantidade;
    
    if (totalPesoInput) {
        totalPesoInput.value = pesoTotal.toFixed(2);
    }
    
    if (totalPesoUnidadeSpan) {
        totalPesoUnidadeSpan.textContent = unidadePeso;
    }
}

// ============================================
// 3. ATUALIZAR INTERFACE DA LOJA
// ============================================
function atualizarInterfaceLoja() {
    try {
        // Atualizar nome do usuário
        if (userNameElement) {
            userNameElement.textContent = lojaServices.nomeUsuario;
        }
        
        // Atualizar título da página com nome da loja
        const resultadoLoja = lojaServices.dadosLoja;
        const nomeLoja = resultadoLoja?.nome || lojaServices.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Atualizar título da página
        document.title = `${nomeLoja} - Estoque`;
        
        // Atualizar subtítulo se existir
        const pageSubtitle = document.querySelector('.page-subtitle');
        if (pageSubtitle) {
            pageSubtitle.textContent = nomeLoja;
        }
        
        // Atualizar rodapé
        const footerText = document.querySelector('.main-footer p:first-child');
        if (footerText) {
            footerText.innerHTML = `<i class="fas fa-store"></i> ${nomeLoja} - Estoque`;
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar interface da loja:', error);
    }
}

// ============================================
// 4. CARREGAR DADOS INICIAIS
// ============================================
async function carregarDadosIniciais() {
    try {
        // 1. Carregar categorias
        await carregarCategorias();
        
        // 2. Carregar produtos
        await carregarProdutos();
        
        // 3. Atualizar estatísticas
        atualizarEstatisticas();
        
    } catch (error) {
        console.error("❌ Erro ao carregar dados iniciais:", error);
        mostrarMensagem("Erro ao carregar dados do estoque", "error");
    }
}

// ============================================
// 5. CARREGAR PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        mostrarLoading('Carregando produtos...', 'Buscando estoque...');
        
        const resultado = await lojaServices.buscarProdutos();
        
        if (resultado.success) {
            produtos = resultado.data;
            produtosFiltrados = [...produtos];
            
            console.log(`✅ ${produtos.length} produtos carregados`);
            
            renderizarProdutos();
            atualizarEstatisticas();
            
        } else {
            console.error('❌ Erro ao carregar produtos:', resultado.error);
            produtos = [];
            produtosFiltrados = [];
            
            if (estoqueTableBody) {
                estoqueTableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Erro ao carregar estoque</p>
                            <small>${resultado.error || 'Tente novamente mais tarde'}</small>
                        </td>
                    </tr>
                `;
            }
        }
        
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
        produtosFiltrados = [];
        
        if (estoqueTableBody) {
            estoqueTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Erro ao carregar estoque</p>
                        <small>${error.message}</small>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// 6. CARREGAR CATEGORIAS
// ============================================
async function carregarCategorias() {
    try {
        const resultado = await lojaServices.buscarCategorias();
        
        if (resultado.success) {
            categorias = resultado.data;
            
            // Atualizar datalist de categorias
            const categoriasList = document.getElementById('categoriasList');
            if (categoriasList) {
                categoriasList.innerHTML = '';
                categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria;
                    categoriasList.appendChild(option);
                });
            }
            
            console.log(`✅ ${categorias.length} categorias carregadas`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
    }
}

// ============================================
// 7. RENDERIZAR PRODUTOS NA TABELA
// ============================================
function renderizarProdutos() {
    if (!estoqueTableBody) return;
    
    if (produtosFiltrados.length === 0) {
        estoqueTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto encontrado</p>
                    <small>${produtos.length === 0 ? 'Cadastre o primeiro produto' : 'Tente outro filtro'}</small>
                </td>
            </tr>
        `;
        
        if (currentCountElement) {
            currentCountElement.textContent = '0';
        }
        return;
    }
    
    let html = '';
    
    produtosFiltrados.forEach(produto => {
        const statusClass = !produto.ativo ? 'status-inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'status-baixo' : 'status-ativo';
        
        const statusText = !produto.ativo ? 'Inativo' : 
                          produto.quantidade <= produto.estoque_minimo ? 'Baixo' : 'Ativo';
        
        // Calcular informações de peso se existirem
        const pesoPorUnidade = produto.peso_por_unidade || 0;
        const unidadeMedida = produto.unidade_medida || 'und';
        const quantidade = produto.quantidade || 0;
        
        let pesoInfoHtml = '';
        if (pesoPorUnidade > 0 && unidadeMedida !== 'und') {
            const totalMedida = pesoPorUnidade * quantidade;
            
            // Formatador de unidades para exibição amigável
            const formatarUnidade = (unidade) => {
                const unidades = {
                    'kg': 'kg',
                    'g': 'g',
                    'ton': 't',
                    'l': 'L',
                    'ml': 'mL',
                    'm': 'm',
                    'cm': 'cm',
                    'm2': 'm²',
                    'm3': 'm³',
                    'und': 'und'
                };
                return unidades[unidade] || unidade;
            };
            
            // Determinar casas decimais para formatação
            const casasDecimais = ['kg', 'l', 'm'].includes(unidadeMedida) ? 2 : 
                                  ['g', 'ml', 'cm'].includes(unidadeMedida) ? 0 : 
                                  ['ton', 'm2', 'm3'].includes(unidadeMedida) ? 3 : 2;
            
            const unidadeFormatada = formatarUnidade(unidadeMedida);
            const pesoFormatado = pesoPorUnidade.toFixed(casasDecimais);
            const totalFormatado = totalMedida.toFixed(casasDecimais);
            
            pesoInfoHtml = `
                <br>
                <div class="peso-info">
                    <small class="text-info">
                        <i class="fas fa-weight-hanging"></i> 
                        ${pesoFormatado} ${unidadeFormatada}/unid
                        <span class="peso-total">
                            (Total: ${totalFormatado} ${unidadeFormatada})
                        </span>
                    </small>
                </div>
            `;
        }
        
        html += `
            <tr data-id="${produto.id}">
                <td class="codigo-cell">${produto.codigo || 'N/A'}</td>
                <td class="nome-cell">
                    <div class="produto-info">
                        <strong class="produto-nome">${produto.nome || 'Produto sem nome'}</strong>
                        ${produto.descricao ? `
                            <div class="produto-descricao">
                                <small class="text-muted">${produto.descricao.substring(0, 60)}${produto.descricao.length > 60 ? '...' : ''}</small>
                            </div>
                        ` : ''}
                        ${pesoInfoHtml}
                    </div>
                </td>
                <td class="categoria-cell">
                    <span class="categoria-badge">${produto.categoria || 'Sem categoria'}</span>
                </td>
                <td class="estoque-cell">
                    <div class="estoque-info">
                        <strong class="estoque-quantidade">${quantidade.toLocaleString('pt-BR')}</strong>
                        <span class="estoque-unidade">${produto.unidade || 'UN'}</span>
                    </div>
                </td>
                <td class="minimo-cell">${produto.estoque_minimo || 5}</td>
                <td class="custo-cell">${formatarMoeda(produto.preco_custo || 0)}</td>
                <td class="venda-cell">
                    <strong class="preco-venda">${formatarMoeda(produto.preco || 0)}</strong>
                </td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">
                        <i class="status-icon ${statusClass === 'status-ativo' ? 'fas fa-check-circle' : 
                                             statusClass === 'status-baixo' ? 'fas fa-exclamation-circle' : 
                                             'fas fa-times-circle'}"></i>
                        ${statusText}
                    </span>
                </td>
                <td class="acoes-cell">
                    <div class="acoes-container">
                        <button class="btn-acao btn-editar" title="Editar produto" data-id="${produto.id}">
                            <i class="fas fa-edit"></i>
                            <span class="acao-tooltip">Editar</span>
                        </button>
                        <button class="btn-acao ${produto.ativo ? 'btn-desativar' : 'btn-ativar'}" 
                                title="${produto.ativo ? 'Desativar produto' : 'Ativar produto'}" 
                                data-id="${produto.id}">
                            <i class="fas ${produto.ativo ? 'fa-ban' : 'fa-check'}"></i>
                            <span class="acao-tooltip">${produto.ativo ? 'Desativar' : 'Ativar'}</span>
                        </button>
                        <button class="btn-acao btn-entrada" title="Entrada de estoque" data-id="${produto.id}">
                            <i class="fas fa-plus-circle"></i>
                            <span class="acao-tooltip">Entrada</span>
                        </button>
                        <!-- BOTÃO DE EXCLUIR - CORRIGIDO: SEMPRE MOSTRAR -->
                        <button class="btn-acao btn-excluir" title="Excluir produto permanentemente" data-id="${produto.id}">
                            <i class="fas fa-trash-alt"></i>
                            <span class="acao-tooltip">
                                Excluir permanentemente
                            </span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    estoqueTableBody.innerHTML = html;
    
    if (currentCountElement) {
        currentCountElement.textContent = produtosFiltrados.length;
    }
    
    // Adicionar eventos aos botões
    adicionarEventosBotoes();
}

// ============================================
// 8. ADICIONAR EVENTOS AOS BOTÕES
// ============================================
function adicionarEventosBotoes() {
    // Botão editar
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
            abrirModalEditar(produtoId);
        });
    });
    
    // Botão ativar/desativar
    document.querySelectorAll('.btn-ativar, .btn-desativar').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                alterarStatusProduto(produto);
            }
        });
    });
    
    // Botão entrada de estoque
    document.querySelectorAll('.btn-entrada').forEach(btn => {
        btn.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                abrirModalEntradaEstoque(produto);
            }
        });
    });
    
    // BOTÃO EXCLUIR
    // BOTÃO EXCLUIR - SEMPRE HABILITADO
    document.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const produtoId = this.getAttribute('data-id');
            const produto = produtos.find(p => p.id === produtoId);
            
            if (!produto) {
                mostrarMensagem('Produto não encontrado', 'error');
                return;
            }
            
            // Pergunta de confirmação
            const confirmMessage = `ATENÇÃO: Esta ação é PERMANENTE!\n\n` +
                                  `Deseja EXCLUIR o produto:\n` +
                                  `"${produto.nome}"\n` +
                                  `Código: ${produto.codigo || 'sem código'}\n` +
                                  `Estoque atual: ${produto.quantidade}\n\n` +
                                  `Esta ação não poderá ser desfeita!`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Se tem estoque, confirmação extra
            if (produto.quantidade > 0) {
                const estoqueConfirm = confirm(
                    `ATENÇÃO: O produto tem ${produto.quantidade} unidades em estoque!\n\n` +
                    `Você realmente deseja excluir mesmo com estoque?\n` +
                    `Todo o estoque será perdido permanentemente.`
                );
                
                if (!estoqueConfirm) {
                    return;
                }
            }
            
            excluirProduto(produto);
        });
    });
}

// ============================================
// 9. FILTRAR PRODUTOS
// ============================================
function filtrarProdutos() {
    if (!searchInput || !filterStatus) return;
    
    const termoBusca = searchInput.value.toLowerCase().trim();
    const statusSelecionado = filterStatus.value;
    
    produtosFiltrados = produtos.filter(produto => {
        // Filtro por busca
        if (termoBusca) {
            const buscaNome = (produto.nome || '').toLowerCase().includes(termoBusca);
            const buscaCodigo = (produto.codigo || '').toLowerCase().includes(termoBusca);
            const buscaDescricao = (produto.descricao || '').toLowerCase().includes(termoBusca);
            const buscaCategoria = (produto.categoria || '').toLowerCase().includes(termoBusca);
            
            if (!(buscaNome || buscaCodigo || buscaDescricao || buscaCategoria)) {
                return false;
            }
        }
        
        // Filtro por status
        if (statusSelecionado === 'ativo' && !produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'inativo' && produto.ativo) {
            return false;
        }
        if (statusSelecionado === 'baixo' && 
            (produto.quantidade > produto.estoque_minimo || !produto.ativo)) {
            return false;
        }
        
        return true;
    });
    
    renderizarProdutos();
    atualizarEstatisticas();
}

// ============================================
// 10. ATUALIZAR ESTATÍSTICAS
// ============================================
function atualizarEstatisticas() {
    if (!totalProdutosElement || !totalEstoqueElement || 
        !baixoEstoqueElement || !valorTotalElement) {
        return;
    }
    
    if (!produtosFiltrados || produtosFiltrados.length === 0) {
        totalProdutosElement.textContent = '0';
        totalEstoqueElement.textContent = '0';
        baixoEstoqueElement.textContent = '0';
        valorTotalElement.textContent = 'R$ 0,00';
        return;
    }
    
    const produtosAtivos = produtosFiltrados.filter(p => p.ativo);
    
    const totalProdutos = produtosAtivos.length;
    const totalEstoque = produtosAtivos.reduce((sum, p) => sum + (p.quantidade || 0), 0);
    const baixoEstoque = produtosAtivos.filter(p => p.quantidade <= p.estoque_minimo).length;
    const valorTotal = produtosAtivos.reduce((sum, p) => {
        const valor = (p.preco_custo || 0) * (p.quantidade || 0);
        return sum + valor;
    }, 0);
    
    // Atualizar elementos
    totalProdutosElement.textContent = totalProdutos.toLocaleString('pt-BR');
    totalEstoqueElement.textContent = totalEstoque.toLocaleString('pt-BR');
    baixoEstoqueElement.textContent = baixoEstoque.toLocaleString('pt-BR');
    valorTotalElement.textContent = formatarMoeda(valorTotal);
}

// ============================================
// 11. MODAL - NOVO PRODUTO
// ============================================
function abrirModalNovoProduto() {
    if (!produtoIdInput || !modalTitle || !formProduto) {
        mostrarMensagem('Erro: Elementos do modal não encontrados', 'error');
        return;
    }
    
    produtoIdInput.value = '';
    modalTitle.textContent = 'Novo Produto';
    formProduto.reset();
    
    // Gerar código automático
    if (codigoInput) {
        const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
        codigoInput.value = `${prefixo}-${Date.now().toString().slice(-6)}`;
    }
    
    // Limpar datalist e adicionar categorias existentes
    if (categoriaInput) {
        const datalist = document.getElementById('categoriasList');
        if (datalist) {
            datalist.innerHTML = '';
            categorias.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria;
                datalist.appendChild(option);
            });
        }
        categoriaInput.value = '';
    }
    
    // Configurar valores padrão
    if (quantidadeInput) quantidadeInput.value = '0';
    if (estoqueMinimoInput) estoqueMinimoInput.value = '5';
    if (precoCustoInput) precoCustoInput.value = '0.00';
    if (precoInput) precoInput.value = '0.00';
    
    removerImagem();
    
    // Abrir modal
    if (modalProduto) {
        modalProduto.style.display = 'flex';
    }
}

// ============================================
// 12. MODAL - EDITAR PRODUTO
// ============================================
async function abrirModalEditar(produtoId) {
    try {
        mostrarLoading('Carregando produto...', 'Aguarde...');
        
        const resultado = await lojaServices.buscarProdutoPorId(produtoId);
        
        if (resultado.success) {
            const produto = resultado.data;
            
            produtoIdInput.value = produto.id;
            modalTitle.textContent = 'Editar Produto';
            
            // Preencher formulário
            if (codigoInput) codigoInput.value = produto.codigo || '';
            if (nomeInput) nomeInput.value = produto.nome || '';
            if (categoriaInput) categoriaInput.value = produto.categoria || '';
            if (unidadeSelect) unidadeSelect.value = produto.unidade || 'UN';
            
            // Novos campos de peso
            if (pesoPorUnidadeInput) pesoPorUnidadeInput.value = produto.peso_por_unidade || 0;
            if (unidadePesoSelect) unidadePesoSelect.value = produto.unidade_peso || 'kg';
            
            if (precoCustoInput) precoCustoInput.value = produto.preco_custo || 0;
            if (precoInput) precoInput.value = produto.preco || 0;
            if (quantidadeInput) quantidadeInput.value = produto.quantidade || 0;
            if (estoqueMinimoInput) estoqueMinimoInput.value = produto.estoque_minimo || 5;
            if (descricaoTextarea) descricaoTextarea.value = produto.descricao || '';
            if (fornecedorInput) fornecedorInput.value = produto.fornecedor || '';
            
            // Calcular peso total
            calcularPesoTotal();

            // Carregar imagem se existir
            if (produto.imagens && produto.imagens.principal) {
                mostrarImagemExistente(produto.imagens);
            } else {
                removerImagem();
            }
            
            // Abrir modal
            if (modalProduto) {
                modalProduto.style.display = 'flex';
            }
            
        } else {
            mostrarMensagem('Produto não encontrado', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        mostrarMensagem('Erro ao carregar produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 13. SALVAR PRODUTO
// ============================================
async function salvarProduto(e) {
    e.preventDefault();
    
    try {
        mostrarLoading('Salvando produto...', 'Aguarde...');
        
        // 1. VALIDAÇÕES BÁSICAS
        // Validar campos obrigatórios
        if (!nomeInput || !nomeInput.value.trim()) {
            throw new Error('Nome do produto é obrigatório');
        }
        
        if (!precoInput || parseFloat(precoInput.value) <= 0) {
            throw new Error('Preço de venda deve ser maior que zero');
        }
        
        // Validar quantidade
        const quantidade = parseInt(quantidadeInput ? quantidadeInput.value : 0);
        if (isNaN(quantidade) || quantidade < 0) {
            throw new Error('Quantidade deve ser um número positivo ou zero');
        }
        
        // Validar estoque mínimo
        const estoqueMinimo = parseInt(estoqueMinimoInput ? estoqueMinimoInput.value : 5);
        if (isNaN(estoqueMinimo) || estoqueMinimo < 0) {
            throw new Error('Estoque mínimo deve ser um número positivo ou zero');
        }
        
        // 2. UPLOAD DE IMAGEM (se houver nova imagem)
        let dadosImagem = null;
        
        // Verificar se há uma NOVA imagem para upload
        // imagemAtual é um objeto File quando é uma imagem nova
        if (imagemAtual instanceof File) {
            console.log('📤 Nova imagem detectada, fazendo upload...');
            mostrarLoading('Enviando imagem...', 'Aguarde um momento...');
            
            // Fazer upload da nova imagem
            const uploadResult = await fazerUploadImagem();
            
            if (uploadResult && uploadResult.success && uploadResult.url) {
                dadosImagem = {
                    imagens: {
                        principal: uploadResult.url,
                        thumbnail: uploadResult.thumb || uploadResult.url,
                        medium: uploadResult.medium || uploadResult.url,
                        provider: 'imgbb',
                        provider_id: uploadResult.id || `imgbb_${Date.now()}`,
                        uploaded_at: new Date().toISOString()
                    }
                };
                console.log('✅ Upload de imagem bem-sucedido:', uploadResult.url.substring(0, 50) + '...');
            } else {
                console.warn('⚠️ Upload de imagem falhou ou não retornou URL, usando fallback');
                // Se o upload falhar, use o fallback local
                dadosImagem = {
                    imagens: {
                        principal: '/images/sem-foto.png',
                        thumbnail: '/images/sem-foto.png',
                        medium: '/images/sem-foto.png',
                        provider: 'local',
                        provider_id: `local_${Date.now()}`,
                        uploaded_at: new Date().toISOString()
                    }
                };
            }
            mostrarLoading('Salvando produto...', 'Finalizando...');
        } 
        // Se já tinha uma imagem carregada anteriormente (de um produto sendo editado)
        else if (imagemUploadResult && imagemUploadResult.url) {
            console.log('📷 Usando imagem existente:', imagemUploadResult.url.substring(0, 50) + '...');
            dadosImagem = {
                imagens: {
                    principal: imagemUploadResult.url,
                    thumbnail: imagemUploadResult.thumb || imagemUploadResult.url,
                    medium: imagemUploadResult.medium || imagemUploadResult.url,
                    provider: imagemUploadResult.provider || 'imgbb',
                    provider_id: imagemUploadResult.id || `imgbb_${Date.now()}`,
                    uploaded_at: imagemUploadResult.uploaded_at || new Date().toISOString()
                }
            };
        }
        // Se NÃO tem imagem nem nova nem existente
        else {
            console.log('🖼️ Sem imagem, usando placeholder padrão');
            dadosImagem = {
                imagens: {
                    principal: '/images/sem-foto.png',
                    thumbnail: '/images/sem-foto.png',
                    medium: '/images/sem-foto.png',
                    provider: 'local',
                    provider_id: `local_${Date.now()}`,
                    uploaded_at: new Date().toISOString()
                }
            };
        }
        
        // 3. PREPARAR DADOS DO PRODUTO
        const dadosProduto = {
            // Informações básicas
            nome: nomeInput.value.trim(),
            categoria: categoriaInput ? categoriaInput.value.trim() : 'Sem Categoria',
            unidade: unidadeSelect ? unidadeSelect.value : 'UN',
            
            // Campos de peso
            peso_por_unidade: pesoPorUnidadeInput ? parseFloat(pesoPorUnidadeInput.value) || 0 : 0,
            unidade_peso: unidadePesoSelect ? unidadePesoSelect.value : 'kg',
            
            // Campos financeiros
            preco_custo: precoCustoInput ? parseFloat(precoCustoInput.value.replace(',', '.')) || 0 : 0,
            preco: precoInput ? parseFloat(precoInput.value.replace(',', '.')) || 0 : 0,
            
            // Campos de estoque
            quantidade: quantidade,
            estoque_minimo: estoqueMinimo,
            
            // Informações adicionais
            descricao: descricaoTextarea ? descricaoTextarea.value.trim() : '',
            fornecedor: fornecedorInput ? fornecedorInput.value.trim() : '',
            
            // Status e metadata
            ativo: true,
            data_cadastro: new Date().toISOString(),
            data_atualizacao: new Date().toISOString(),
            
            // Loja
            loja_id: lojaServices.lojaId,
            loja_nome: lojaServices.dadosLoja?.nome || lojaServices.lojaId
        };
        
        // 4. ADICIONAR CÓDIGO (se existir)
        if (codigoInput && codigoInput.value.trim()) {
            dadosProduto.codigo = codigoInput.value.trim();
        } else {
            // Gerar código automático se não tiver
            const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
            dadosProduto.codigo = `${prefixo}-${Date.now().toString().slice(-8)}`;
        }
        
        // 5. ADICIONAR DADOS DA IMAGEM
        Object.assign(dadosProduto, dadosImagem);
        
        // 6. CALCULAR PESO TOTAL
        if (dadosProduto.peso_por_unidade > 0 && dadosProduto.quantidade > 0) {
            dadosProduto.peso_total = dadosProduto.peso_por_unidade * dadosProduto.quantidade;
            dadosProduto.unidade_peso_total = dadosProduto.unidade_peso;
        }
        
        // 7. VALIDAR DADOS FINAIS
        if (dadosProduto.preco <= 0) {
            throw new Error('O preço de venda deve ser maior que R$ 0,00');
        }
        
        if (dadosProduto.quantidade < 0) {
            throw new Error('A quantidade não pode ser negativa');
        }
        
        // 8. SALVAR OU ATUALIZAR NO FIREBASE
        const produtoId = produtoIdInput.value;
        let resultadoFirebase = null;
        
        if (produtoId) {
            console.log(`✏️ Atualizando produto ${produtoId}...`);
            // Atualizar produto existente
            resultadoFirebase = await lojaServices.atualizarProduto(produtoId, dadosProduto);
            mostrarMensagem('✅ Produto atualizado com sucesso!', 'success');
        } else {
            console.log('🆕 Cadastrando novo produto...');
            // Criar novo produto
            resultadoFirebase = await lojaServices.cadastrarProduto(dadosProduto);
            mostrarMensagem('✅ Produto cadastrado com sucesso!', 'success');
        }
        
        // 9. VERIFICAR RESULTADO DO FIREBASE
        if (!resultadoFirebase || !resultadoFirebase.success) {
            throw new Error(resultadoFirebase?.error || 'Erro ao salvar no banco de dados');
        }
        
        console.log('📊 Dados salvos no Firebase com sucesso');
        
        // 10. LIMPAR VARIÁVEIS E ESTADOS
        imagemAtual = null;
        imagemPreviewURL = null;
        imagemUploadResult = null;
        
        // 11. FECHAR MODAL
        if (modalProduto) {
            modalProduto.style.display = 'none';
        }
        
        // 12. LIMPAR FORMULÁRIO COMPLETAMENTE
        if (formProduto) {
            formProduto.reset();
            // Resetar campos específicos
            if (quantidadeInput) quantidadeInput.value = '0';
            if (estoqueMinimoInput) estoqueMinimoInput.value = '5';
            if (precoCustoInput) precoCustoInput.value = '0.00';
            if (precoInput) precoInput.value = '0.00';
            if (pesoPorUnidadeInput) pesoPorUnidadeInput.value = '0';
            if (unidadePesoSelect) unidadePesoSelect.value = 'kg';
            calcularPesoTotal();
        }
        
        // 13. REMOVER PREVIEW DE IMAGEM
        removerImagem();
        
        // 14. RECARREGAR DADOS DA TELA
        await carregarProdutos();
        atualizarEstatisticas();
        
        // 15. GERAR CÓDIGO PARA PRÓXIMO PRODUTO (se for novo cadastro)
        if (!produtoId) {
            setTimeout(() => {
                const prefixo = lojaServices.lojaId.slice(0, 2).toUpperCase();
                if (codigoInput) {
                    codigoInput.value = `${prefixo}-${Date.now().toString().slice(-8)}`;
                }
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        
        // Mensagens de erro mais amigáveis
        let mensagemErro = error.message;
        
        if (error.message.includes('permission')) {
            mensagemErro = 'Você não tem permissão para salvar produtos. Verifique seu acesso.';
        } else if (error.message.includes('network')) {
            mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Firebase')) {
            mensagemErro = 'Erro no servidor. Tente novamente em alguns instantes.';
        }
        
        mostrarMensagem(mensagemErro, 'error');
        
        // Não fechar o modal se houver erro
        // O usuário pode corrigir os dados
        
    } finally {
        esconderLoading();
    }
}

// ============================================
// 14. ALTERAR STATUS DO PRODUTO
// ============================================
async function alterarStatusProduto(produto) {
    if (!produto) return;
    
    const confirmMessage = produto.ativo ? 
        `Desativar o produto "${produto.nome}"?` : 
        `Ativar o produto "${produto.nome}"?`;
    
    const confirmAction = produto.ativo ? 'Desativar' : 'Ativar';
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        mostrarLoading(`${confirmAction} produto...`, 'Processando...');
        
        await lojaServices.atualizarProduto(produto.id, {
            ativo: !produto.ativo
        });
        
        mostrarMensagem(`Produto ${produto.ativo ? 'desativado' : 'ativado'} com sucesso!`, 'success');
        
        // Recarregar produtos
        await carregarProdutos();
        
    } catch (error) {
        console.error(`❌ Erro ao ${produto.ativo ? 'desativar' : 'ativar'} produto:`, error);
        mostrarMensagem(`Erro ao ${produto.ativo ? 'desativar' : 'ativar'} produto`, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 15. ENTRADA DE ESTOQUE (FUNÇÃO SIMPLIFICADA)
// ============================================
async function abrirModalEntradaEstoque(produto) {
    if (!produto) return;
    
    const promptText = `Entrada de estoque para: ${produto.nome}\n\n` +
        `Estoque atual: ${produto.quantidade || 0} ${produto.unidade || 'UN'}\n` +
        `${produto.peso_por_unidade > 0 ? `Peso/unidade: ${produto.peso_por_unidade} ${produto.unidade_peso || 'kg'}\n` : ''}\n` +
        `Digite:\n` +
        `• Número positivo para ADICIONAR estoque\n` +
        `• Número negativo para REMOVER estoque\n` +
        `(Ex: -10 para remover 10 unidades)\n\n` +
        `Quantidade:`;
    
    const quantidade = prompt(promptText, "1");
    
    if (quantidade === null) return;
    
    const qtd = parseInt(quantidade);
    if (isNaN(qtd)) {
        mostrarMensagem('Quantidade inválida', 'error');
        return;
    }
    
    const tipo = qtd >= 0 ? 'entrada' : 'saida';
    const quantidadeAbs = Math.abs(qtd);
    
    try {
        mostrarLoading('Registrando alteração de estoque...', 'Processando...');
        
        const resultado = await lojaServices.atualizarEstoque(
            produto.id, 
            quantidadeAbs, 
            tipo
        );
        
        if (resultado.success) {
            if (tipo === 'entrada') {
                mostrarMensagem(`${quantidadeAbs} unidade(s) adicionada(s) ao estoque!`, 'success');
            } else {
                mostrarMensagem(`${quantidadeAbs} unidade(s) removida(s) do estoque!`, 'warning');
                
                // Se estoque chegou a zero, sugerir exclusão
                if ((produto.quantidade - quantidadeAbs) === 0) {
                    setTimeout(() => {
                        mostrarMensagem('Estoque zerado. Você pode agora excluir o produto se desejar.', 'info');
                    }, 1500);
                }
            }
            
            // Recarregar produtos
            await carregarProdutos();
            
        } else {
            mostrarMensagem(resultado.error || 'Erro ao registrar alteração de estoque', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao registrar alteração de estoque:', error);
        mostrarMensagem('Erro ao registrar alteração de estoque', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 16. EXCLUIR PRODUTO PERMANENTEMENTE
// ============================================
async function excluirProduto(produto) {
    if (!produto) return;
    
    try {
        mostrarLoading('Excluindo produto...', 'Esta ação é permanente...');
        
        const resultado = await lojaServices.excluirProduto(produto.id);
        
        if (resultado.success) {
            mostrarMensagem('Produto excluído permanentemente!', 'success');
            
            // Recarregar produtos
            await carregarProdutos();
            
        } else {
            mostrarMensagem(resultado.error || 'Erro ao excluir produto', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        mostrarMensagem('Erro ao excluir produto', 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// 17. CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    // Botão novo produto
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirModalNovoProduto);
    }
    
    // Botão atualizar
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async function() {
            await carregarProdutos();
            mostrarMensagem('Estoque atualizado', 'success');
        });
    }
    
    // Busca
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
    
    // Filtro
    if (filterStatus) {
        filterStatus.addEventListener('change', filtrarProdutos);
    }
    
    // Botão relatório
    if (btnRelatorioEstoque) {
        btnRelatorioEstoque.addEventListener('click', function() {
            mostrarMensagem('Relatório em desenvolvimento', 'info');
        });
    }
    
    // Modal - fechar
    const modalClose = modalProduto?.querySelector('.modal-close');
    const btnCancel = document.querySelector('.btn-cancel');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (modalProduto) modalProduto.style.display = 'none';
        });
    }
    
    // Modal - fechar ao clicar fora
    if (modalProduto) {
        modalProduto.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // Formulário de produto
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }
    
    // Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Deseja sair do sistema?")) {
                lojaServices.logout();
            }
        });
    }

    // Eventos para calcular peso
    if (quantidadeInput) {
        quantidadeInput.addEventListener('input', calcularPesoTotal);
    }
    if (pesoPorUnidadeInput) {
        pesoPorUnidadeInput.addEventListener('input', calcularPesoTotal);
    }
    if (unidadePesoSelect) {
        unidadePesoSelect.addEventListener('change', function() {
            if (totalPesoUnidadeSpan) {
                totalPesoUnidadeSpan.textContent = this.value;
            }
        });
    }
    
    // Eventos de imagem
    inicializarUploadImagem();
    
    // Botões do preview de imagem
    const btnChange = document.querySelector('.btn-change');
    const btnRemove = document.querySelector('.btn-remove');
    
    if (btnChange) {
        btnChange.addEventListener('click', trocarImagem);
    }
    
    if (btnRemove) {
        btnRemove.addEventListener('click', removerImagem);
    }
    
    console.log("✅ Eventos configurados com sucesso");
}

// ============================================
// 18. FUNÇÕES UTILITÁRIAS
// ============================================
function formatarMoeda(valor) {
    const numero = parseFloat(valor) || 0;
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function atualizarUltimaAtualizacao() {
    if (lastUpdateElement) {
        const agora = new Date();
        const horaFormatada = agora.toLocaleTimeString('pt-BR');
        lastUpdateElement.textContent = `Última atualização: ${horaFormatada}`;
    }
}

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
    
    // Ícone
    const icon = alert.querySelector('.message-icon');
    const icons = {
        success: 'fas fa-check-circle',
        warning: 'fas fa-exclamation-triangle',
        error: 'fas fa-times-circle',
        info: 'fas fa-info-circle'
    };
    
    if (icon) icon.className = `message-icon ${icons[tipo] || icons.info}`;
    
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

// ============================================
// 19. ESTILOS DINÂMICOS
// ============================================
(function adicionarEstilos() {
    const estiloBadge = document.createElement('style');
    estiloBadge.textContent = `
        /* Estilos específicos para a página de estoque */
        
        .status-badge {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-block;
        }
        
        .status-ativo {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-baixo {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-inativo {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .text-muted {
            color: #6c757d;
            font-size: 0.85rem;
        }
        
        .text-primary {
            color: #3498db;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 15px;
            color: #bdc3c7;
        }
        
        .btn-acao {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            margin: 0 5px;
            padding: 5px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .btn-acao:hover {
            background-color: #f8f9fa;
            transform: scale(1.1);
        }
        
               
        .btn-editar { color: #3498db; }
        .btn-desativar { color: #e74c3c; }
        .btn-ativar { color: #27ae60; }
        .btn-entrada { color: #f39c12; }
        .btn-excluir { color: #e74c3c; }
        
        .acoes-cell {
            display: flex;
            justify-content: center;
            gap: 5px;
        }


                /* ESTILOS PARA IMAGENS (ADICIONE ESTE BLOCO) */
        .form-section {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .form-section h4 {
            margin-top: 0;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .image-upload-container {
            margin-top: 15px;
        }
        
        .upload-area {
            border: 2px dashed #ddd;
            border-radius: 8px;
            padding: 30px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            background: white;
            position: relative;
            overflow: hidden;
        }
        
        .upload-area:hover {
            border-color: #3498db;
            background: #f8f9fa;
        }
        
        .upload-area.dragover {
            border-color: #27ae60;
            background: #f0fff4;
        }
        
        .upload-content i {
            font-size: 2.5rem;
            color: #7f8c8d;
            margin-bottom: 10px;
        }
        
        .upload-content h5 {
            margin: 0 0 5px 0;
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .upload-content p {
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.95rem;
        }
        
        .upload-content small {
            color: #95a5a6;
            font-size: 0.85rem;
        }
        
        .drag-preview {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(52, 152, 219, 0.9);
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .drag-preview img {
            max-width: 80px;
            max-height: 80px;
            margin-bottom: 10px;
            border-radius: 6px;
            border: 2px solid white;
        }
        
        .drag-preview p {
            font-weight: 600;
            margin: 0;
        }
        
        .image-preview {
            margin-top: 15px;
            animation: fadeIn 0.3s ease;
        }
        
        .preview-container {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 300px;
            margin: 0 auto;
        }
        
        .preview-container img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }
        
        .preview-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            gap: 10px;
            padding: 10px;
            justify-content: center;
        }
        
        .preview-overlay button {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.2s;
        }
        
        .btn-change {
            background: #3498db;
            color: white;
        }
        
        .btn-change:hover {
            background: #2980b9;
        }
        
        .btn-remove {
            background: #e74c3c;
            color: white;
        }
        
        .btn-remove:hover {
            background: #c0392b;
        }
        
        .image-info {
            margin-top: 10px;
            text-align: center;
        }
        
        .info-row {
            display: flex;
            justify-content: center;
            gap: 10px;
            font-size: 0.9rem;
        }
        
        .info-row .label {
            font-weight: 600;
            color: #555;
        }
        
        .status-pending {
            color: #f39c12;
            font-weight: 600;
        }
        
        .status-success {
            color: #27ae60;
            font-weight: 600;
        }
        
        .status-error {
            color: #e74c3c;
            font-weight: 600;
        }
        
        .upload-progress {
            margin-top: 15px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        
        .progress-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .progress-bar {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2ecc71);
            border-radius: 3px;
            transition: width 0.3s ease;
            width: 0%;
        }
        
        .image-tips {
            margin-top: 15px;
            padding: 10px 15px;
            background: #fff9e6;
            border-radius: 6px;
            border-left: 4px solid #f39c12;
            font-size: 0.9rem;
            color: #7d6608;
        }
        
        .image-tips i {
            color: #f39c12;
            margin-right: 5px;
        }
        
        /* Estilos para o formulário no modal */
        .form-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        .form-group {
            flex: 1;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        
        .input-with-icon {
            position: relative;
        }
        
        .input-with-icon i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #666;
        }
        
        .input-with-icon input {
            padding-left: 2.5rem;
        }
        
        .form-hint {
            font-size: 0.85rem;
            color: #6c757d;
            margin-top: 0.25rem;
        }
        
        .acoes-container {
            display: flex;
            gap: 8px;
            justify-content: center;
            align-items: center;
        }
        
        /* Estilos para a tabela */
        .estoque-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        .estoque-table thead {
            background: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
        }
        
        .estoque-table th {
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
        }
        
        .estoque-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #dee2e6;
            vertical-align: middle;
        }
        
        .estoque-table tbody tr:hover {
            background-color: #f8f9fa;
        }

        /* Estilos para botão excluir
        .btn-excluir {
            color: #e74c3c;
        }
        
        .btn-excluir:hover:not(:disabled) {
            background-color: #e74c3c;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
        }
        
        .btn-excluir:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            color: #95a5a6;
            background-color: transparent;
        }
        
        .btn-excluir:disabled:hover {
            background-color: transparent;
            color: #95a5a6;
            transform: none;
            box-shadow: none;
        }
        
        /* Garantir que o ícone aparece */
        .btn-excluir i {
            font-size: 1rem;
            display: inline-block;
        }
        
        /* Tooltip para botão excluir */
        .btn-excluir .acao-tooltip {
            background-color: #e74c3c;
        }
        
        .btn-excluir:disabled .acao-tooltip {
            background-color: #7f8c8d;
        }
        
        .btn-excluir .acao-tooltip::after {
            border-color: #e74c3c transparent transparent transparent;
        }
        
        .btn-excluir:disabled .acao-tooltip::after {
            border-color: #7f8c8d transparent transparent transparent;
        }
        
        /* Responsividade */
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .acoes-cell {
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .estoque-table {
                font-size: 0.9rem;
            }
            
            .estoque-table th,
            .estoque-table td {
                padding: 0.5rem;
            }
        }
    `;
    document.head.appendChild(estiloBadge);
})();

console.log("✅ Sistema de estoque dinâmico completamente carregado!");











