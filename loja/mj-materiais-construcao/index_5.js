// index_5.js - Agendamento: Carrossel e Paginação
console.log("📁 Módulo 5 Carregado: Agendamento Carrossel e Paginação");

// ============================================
// RENDERIZAR COLUNA OUTROS NA FILA
// ============================================
function renderizarColunaOutros(outrosNaFila, agendamentosPorServico, servicosOrdenados) {
    const proximosTrack = document.getElementById('proximasSenhasTrack');
    if (!proximosTrack) return;
    
    if (outrosNaFila.length > 0) {
        const ordemServicosEmAtendimento = [];
        const chamandoCards = document.querySelectorAll('#chamandoAgoraCard .card-chamando-item');
        
        chamandoCards.forEach((card) => {
            const servicoTag = card.querySelector('.servico-tag');
            if (servicoTag) {
                const nomeServico = servicoTag.textContent.trim();
                for (const [id, servico] of Object.entries(agendamentosPorServico)) {
                    if (servico.nome === nomeServico) {
                        ordemServicosEmAtendimento.push(id);
                        break;
                    }
                }
            }
        });
        
        const todosServicos = Object.keys(agendamentosPorServico);
        const servicosOrdenadosFinal = [];
        
        ordemServicosEmAtendimento.forEach(servicoId => {
            if (!servicosOrdenadosFinal.includes(servicoId) && agendamentosPorServico[servicoId]) {
                servicosOrdenadosFinal.push(servicoId);
            }
        });
        
        const demaisServicos = todosServicos
            .filter(id => !servicosOrdenadosFinal.includes(id))
            .sort((a, b) => {
                const nomeA = agendamentosPorServico[a]?.nome || a;
                const nomeB = agendamentosPorServico[b]?.nome || b;
                return nomeA.localeCompare(nomeB);
            });
        
        servicosOrdenadosFinal.push(...demaisServicos);
        
        totalPaginasOutrosFila = Math.max(1, Math.ceil(servicosOrdenadosFinal.length / 2));
        
        if (paginaAtualOutrosFila > totalPaginasOutrosFila) {
            paginaAtualOutrosFila = totalPaginasOutrosFila;
        }
        
        const inicio = (paginaAtualOutrosFila - 1) * 2;
        const fim = Math.min(inicio + 2, servicosOrdenadosFinal.length);
        const servicosPaginaAtual = servicosOrdenadosFinal.slice(inicio, fim);
        
        let html = '';
        
        servicosPaginaAtual.forEach((servicoId) => {
            const servico = agendamentosPorServico[servicoId];
            if (!servico) return;
            
            const itensFila = servico.itens.filter(item => 
                ['Na fila', 'Verificado'].includes(item.status)
            );
            
            if (itensFila.length > 0) {
                const servicoIdSafe = servicoId.replace(/[^a-zA-Z0-9]/g, '_');
                const emAtendimento = ordemServicosEmAtendimento.includes(servicoId);
                
                html += `
                    <div class="fila-servico ${emAtendimento ? 'servico-destaque' : ''}" 
                         data-servico-id="${servicoId}">
                        <div class="fila-servico-header">
                            <i class="fas fa-star"></i>
                            <h4 title="${servico.nome}">${servico.nome}</h4>
                            <span class="servico-count">${itensFila.length}</span>
                        </div>
                        
                        <div class="servico-carousel-container">
                            <button class="servico-arrow prev" onclick="scrollServico('${servicoIdSafe}', -192)" ${itensFila.length <= 3 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            
                            <div class="servico-scroll" id="servico-${servicoIdSafe}-scroll">
                                <div class="servico-track">
                `;
                
                itensFila.forEach((item, idx) => {
                    const posicaoReal = idx + 1;
                    html += `
                        <div class="servico-card" data-posicao="${posicaoReal}" data-servico="${servicoIdSafe}">
                            <div class="senha-numero">${item.senha}</div>
                            <div class="senha-cliente">${item.cliente_nome}</div>
                            <span class="senha-posicao">${posicaoReal}° na fila</span>
                        </div>
                    `;
                });
                
                html += `
                                </div>
                            </div>
                            
                            <button class="servico-arrow next" onclick="scrollServico('${servicoIdSafe}', 192)" ${itensFila.length <= 3 ? 'disabled' : ''}>
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        
                        <div class="servico-page-dots" id="dots-${servicoIdSafe}">
                `;
                
                const totalPages = Math.ceil(itensFila.length / 3);
                for (let i = 0; i < totalPages; i++) {
                    html += `<span class="dot ${i === 0 ? 'active' : ''}" onclick="irParaPaginaServico('${servicoIdSafe}', ${i})"></span>`;
                }
                
                html += `</div></div>`;
            }
        });
        
        proximosTrack.innerHTML = html;
        atualizarIndicadorPaginaHeader();
        
        setTimeout(() => {
            servicosPaginaAtual.forEach(servicoId => {
                const servicoIdSafe = servicoId.replace(/[^a-zA-Z0-9]/g, '_');
                configurarScrollServico(servicoIdSafe);
            });
            
            if (carrosselAutomaticoAtivo) {
                pararCarrosselAutomatico();
                iniciarCarrosselSenhasAutomatico();
            }
        }, 100);
        
    } else {
        proximosTrack.innerHTML = `
            <div class="fila-servico">
                <div class="fila-servico-header">
                    <i class="fas fa-star"></i>
                    <h4>Aguardando...</h4>
                    <span class="servico-count">0</span>
                </div>
                <div class="servico-carousel-container">
                    <button class="servico-arrow prev" disabled><i class="fas fa-chevron-left"></i></button>
                    <div class="servico-scroll">
                        <div class="servico-track">
                            <div class="servico-card-placeholder">
                                <div class="placeholder-icon"><i class="fas fa-clock"></i></div>
                                <div class="placeholder-text">Sem agendamentos</div>
                            </div>
                        </div>
                    </div>
                    <button class="servico-arrow next" disabled><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
        
        totalPaginasOutrosFila = 1;
        paginaAtualOutrosFila = 1;
        atualizarIndicadorPaginaHeader();
    }
}

// ============================================
// RENDERIZAR COLUNA PRÓXIMOS A ATENDER
// ============================================
function renderizarColunaProximos(proximosAtender) {
    const proximosEl = document.getElementById('proximosFilaCard');
    if (!proximosEl) return;
    
    if (proximosAtender.length > 0) {
        let html = '';
        proximosAtender.forEach(item => {
            html += `
                <div class="item-fila-vertical urgente">
                    <div class="servico-tag">${item.servico_nome || item.servico_id}</div>
                    <span class="senha-numero">${item.senha}</span>
                    <div class="senha-info">
                        <span class="senha-cliente">${item.cliente_nome}</span>
                    </div>
                </div>
            `;
        });
        proximosEl.innerHTML = html;
    } else {
        proximosEl.innerHTML = `
            <div class="empty-agendamento">
                <i class="fas fa-users"></i>
                <p>Nenhum próximo</p>
            </div>
        `;
    }
}

// ============================================
// RENDERIZAR COLUNA EM ATENDIMENTO
// ============================================
function renderizarColunaAtendimento(emAtendimento) {
    const chamandoEl = document.getElementById('chamandoAgoraCard');
    if (!chamandoEl) return;
    
    if (emAtendimento.length > 0) {
        let html = '';
        emAtendimento.forEach(item => {
            html += `
                <div class="card-chamando-item">
                    <div class="servico-tag">${item.servico_nome || item.servico_id}</div>
                    <div class="senha-grande">${item.senha || '---'}</div>
                    <div class="cliente-nome">${item.cliente_nome}</div>
                </div>
            `;
        });
        chamandoEl.innerHTML = html;
        
        const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
        if (ultimoChamadoHora) {
            const agora = new Date();
            ultimoChamadoHora.textContent = agora.toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit' 
            });
        }
    } else {
        chamandoEl.innerHTML = `
            <div class="empty-agendamento">
                <i class="fas fa-check-circle"></i>
                <p>Nenhum atendimento no momento</p>
            </div>
        `;
        const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
        if (ultimoChamadoHora) ultimoChamadoHora.textContent = '--:--';
    }
}

// ============================================
// ATUALIZAR INDICADOR DE PÁGINA
// ============================================
function atualizarIndicadorPaginaHeader() {
    const pageIndicator = document.getElementById('pageIndicatorOutros');
    if (pageIndicator) {
        pageIndicator.innerHTML = `${paginaAtualOutrosFila}/${totalPaginasOutrosFila}`;
        pageIndicator.title = `Tela ${paginaAtualOutrosFila} de ${totalPaginasOutrosFila}`;
        
        pageIndicator.style.animation = 'none';
        pageIndicator.offsetHeight;
        pageIndicator.style.animation = 'pageChange 0.3s ease';
    }
    
    const controlsContainer = document.getElementById('outrosFilaControls');
    if (controlsContainer) {
        const arrows = controlsContainer.querySelectorAll('.page-nav-arrow');
        if (arrows.length >= 2) {
            arrows[0].disabled = paginaAtualOutrosFila === 1;
            arrows[1].disabled = paginaAtualOutrosFila === totalPaginasOutrosFila;
        }
    }
}

// ============================================
// MUDAR PÁGINA DA COLUNA OUTROS
// ============================================
function mudarPaginaOutrosFila(novaPagina, origem = 'sistema') {
    if (novaPagina < 1 || novaPagina > totalPaginasOutrosFila || novaPagina === paginaAtualOutrosFila) {
        return;
    }
    
    console.log(`📑 Mudando página de ${paginaAtualOutrosFila} para ${novaPagina} (origem: ${origem})`);
    paginaAtualOutrosFila = novaPagina;
    
    if (origem === 'usuario' && carrosselAutomaticoAtivo) {
        console.log('👤 Usuário mudou de página manualmente - pausando carrossel');
        mudancaManual = true;
        alternarCarrosselAutomatico();
    }
    
    renderizarPainelAgendamento();
}

// ============================================
// CONFIGURAR SCROLL DO SERVIÇO
// ============================================
function configurarScrollServico(servicoId) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (!scrollEl) return;
    
    const novoScrollEl = scrollEl.cloneNode(true);
    scrollEl.parentNode.replaceChild(novoScrollEl, scrollEl);
    
    const novoScrollElRef = document.getElementById(`servico-${servicoId}-scroll`);
    if (!novoScrollElRef) return;
    
    novoScrollElRef.scrollLeft = 0;
    
    novoScrollElRef.addEventListener('scroll', function() {
        atualizarEstadoServico(servicoId);
    });
    
    setTimeout(() => {
        atualizarEstadoServico(servicoId);
    }, 50);
}

// ============================================
// ATUALIZAR ESTADO DO SERVIÇO
// ============================================
function atualizarEstadoServico(servicoId) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (!scrollEl) return;
    
    const container = scrollEl.closest('.servico-carousel-container');
    if (!container) return;
    
    const prevBtn = container.querySelector('.prev');
    const nextBtn = container.querySelector('.next');
    
    if (prevBtn && nextBtn) {
        const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
        prevBtn.disabled = scrollEl.scrollLeft <= 5;
        nextBtn.disabled = scrollEl.scrollLeft >= maxScroll - 5;
    }
    
    const dotsContainer = document.getElementById(`dots-${servicoId}`);
    if (dotsContainer) {
        const cardWidth = 192;
        const scrollLeft = scrollEl.scrollLeft;
        const pageIndex = Math.round(scrollLeft / (cardWidth * 3));
        
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx === pageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

// ============================================
// SCROLL MANUAL DO SERVIÇO
// ============================================
function scrollServico(servicoId, amount) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (scrollEl) {
        const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
        let newScroll = scrollEl.scrollLeft + amount;
        newScroll = Math.max(0, Math.min(newScroll, maxScroll));
        
        scrollEl.scrollTo({
            left: newScroll,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            atualizarEstadoServico(servicoId);
        }, 300);
    }
}

// ============================================
// IR PARA PÁGINA ESPECÍFICA DO SERVIÇO
// ============================================
function irParaPaginaServico(servicoId, pageIndex) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (scrollEl) {
        const scrollAmount = pageIndex * 576;
        
        scrollEl.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            atualizarEstadoServico(servicoId);
        }, 300);
    }
}

// ============================================
// INICIAR CARROSSEL AUTOMÁTICO
// ============================================
function iniciarCarrosselSenhasAutomatico() {
    if (!carrosselAutomaticoAtivo) return;
    
    console.log('🎠 Iniciando carrossel automático');
    
    if (carrosselAutomaticoInterval) {
        clearInterval(carrosselAutomaticoInterval);
        carrosselAutomaticoInterval = null;
    }
    
    const estadoCarrossel = new Map();
    let contadorMovimentos = 0;
    const movimentosPorCiclo = 5;
    let ciclosCompletados = 0;
    
    setTimeout(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (maxScroll > 0) {
                scrollEl.scrollTo({
                    left: maxScroll,
                    behavior: 'auto'
                });
                
                const servicoId = scrollEl.id.replace('servico-', '').replace('-scroll', '');
                estadoCarrossel.set(servicoId, {
                    posicao: 'direita',
                    maxScroll: maxScroll,
                    ultimoScroll: maxScroll
                });
            }
        });
    }, 100);
    
    setTimeout(() => {
        carrosselAutomaticoInterval = setInterval(() => {
            if (!carrosselAutomaticoAtivo) {
                pararCarrosselAutomatico();
                return;
            }
            
            let algumScrollFeito = false;
            let todosMaxScroll = [];
            
            document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
                const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
                if (maxScroll <= 5) return;
                
                todosMaxScroll.push(maxScroll);
                
                const servicoId = scrollEl.id.replace('servico-', '').replace('-scroll', '');
                
                if (!estadoCarrossel.has(servicoId)) {
                    estadoCarrossel.set(servicoId, {
                        posicao: 'direita',
                        maxScroll: maxScroll,
                        ultimoScroll: maxScroll
                    });
                }
                
                const estado = estadoCarrossel.get(servicoId);
                let nextScroll;
                
                switch(estado.posicao) {
                    case 'direita':
                        nextScroll = Math.floor(maxScroll / 2);
                        estado.posicao = 'meio_direita';
                        break;
                    case 'meio_direita':
                        nextScroll = 0;
                        estado.posicao = 'esquerda';
                        break;
                    case 'esquerda':
                        nextScroll = Math.floor(maxScroll / 2);
                        estado.posicao = 'meio_esquerda';
                        break;
                    case 'meio_esquerda':
                        nextScroll = maxScroll;
                        estado.posicao = 'direita';
                        break;
                    default:
                        nextScroll = maxScroll;
                        estado.posicao = 'direita';
                }
                
                scrollEl.scrollTo({
                    left: nextScroll,
                    behavior: 'smooth'
                });
                
                estado.ultimoScroll = nextScroll;
                algumScrollFeito = true;
                
                setTimeout(() => {
                    atualizarEstadoServico(servicoId);
                }, 1200);
            });
            
            if (algumScrollFeito && todosMaxScroll.length > 0) {
                contadorMovimentos++;
                
                if (contadorMovimentos >= movimentosPorCiclo) {
                    ciclosCompletados++;
                    contadorMovimentos = 0;
                    
                    if (totalPaginasOutrosFila > 1) {
                        let proximaPagina;
                        if (paginaAtualOutrosFila === totalPaginasOutrosFila) {
                            proximaPagina = 1;
                        } else {
                            proximaPagina = paginaAtualOutrosFila + 1;
                        }
                        
                        if (typeof window.mudarPaginaOutrosFila === 'function') {
                            window.mudarPaginaOutrosFila(proximaPagina, 'sistema');
                        }
                    }
                }
            }
            
        }, 8000);
    }, 200);
}

// ============================================
// PARAR CARROSSEL AUTOMÁTICO
// ============================================
function pararCarrosselAutomatico() {
    if (carrosselAutomaticoInterval) {
        clearInterval(carrosselAutomaticoInterval);
        carrosselAutomaticoInterval = null;
        console.log('⏸️ Carrossel parado');
    }
}

// ============================================
// ALTERNAR CARROSSEL AUTOMÁTICO
// ============================================
function alternarCarrosselAutomatico() {
    carrosselAutomaticoAtivo = !carrosselAutomaticoAtivo;
    
    const btn = document.getElementById('btnCarrosselOutros');
    
    if (carrosselAutomaticoAtivo) {
        iniciarCarrosselSenhasAutomatico();
        if (btn) {
            btn.classList.add('ativo');
            btn.innerHTML = '<i class="fas fa-pause"></i>';
            btn.title = 'Rolagem automática (ligada)';
        }
    } else {
        pararCarrosselAutomatico();
        if (btn) {
            btn.classList.remove('ativo');
            btn.innerHTML = '<i class="fas fa-play"></i>';
            btn.title = 'Rolagem automática (desligada)';
        }
    }
}

// ============================================
// CONFIGURAR PAUSA AO INTERAGIR
// ============================================
function configurarPausaAoInteragir() {
    document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
        const novoScrollEl = scrollEl.cloneNode(true);
        scrollEl.parentNode.replaceChild(novoScrollEl, scrollEl);
    });
    
    setTimeout(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const pausarEventos = ['wheel', 'touchstart', 'mousedown'];
            
            pausarEventos.forEach(evento => {
                scrollEl.addEventListener(evento, () => {
                    if (carrosselAutomaticoAtivo) {
                        console.log('⏸️ Pausando carrossel por interação do usuário');
                        alternarCarrosselAutomatico();
                    }
                }, { once: true });
            });
        });
        
        document.querySelectorAll('.servico-arrow').forEach(arrow => {
            const novoArrow = arrow.cloneNode(true);
            arrow.parentNode.replaceChild(novoArrow, arrow);
            
            novoArrow.addEventListener('click', () => {
                if (carrosselAutomaticoAtivo) {
                    console.log('⏸️ Pausando carrossel por clique na seta');
                    alternarCarrosselAutomatico();
                }
            });
        });
    }, 300);
}

// ============================================
// CRIAR BOTÃO PLAY NO HEADER
// ============================================
function criarBotaoPlayNoHeader() {
    setTimeout(() => {
        const colunaOutros = document.querySelector('.coluna-outros');
        if (!colunaOutros) return;
        
        const colunaHeader = colunaOutros.querySelector('.coluna-header');
        if (!colunaHeader) return;
        
        const controlsExistente = document.getElementById('outrosFilaControls');
        if (controlsExistente) {
            controlsExistente.remove();
        }
        
        const icon = colunaHeader.querySelector('i:first-child');
        const title = colunaHeader.querySelector('h3');
        const badge = colunaHeader.querySelector('.coluna-badge');
        
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'outrosFilaControls';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.alignItems = 'center';
        controlsContainer.style.gap = '8px';
        controlsContainer.style.marginLeft = 'auto';
        
        if (totalPaginasOutrosFila > 1) {
            const prevPageBtn = document.createElement('button');
            prevPageBtn.className = 'page-nav-arrow';
            prevPageBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevPageBtn.title = 'Tela anterior';
            prevPageBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                mudarPaginaOutrosFila(paginaAtualOutrosFila - 1, 'usuario');
            };
            prevPageBtn.disabled = paginaAtualOutrosFila === 1;
            controlsContainer.appendChild(prevPageBtn);
            
            const pageIndicator = document.createElement('span');
            pageIndicator.id = 'pageIndicatorOutros';
            pageIndicator.className = 'page-indicator-badge';
            pageIndicator.innerHTML = `${paginaAtualOutrosFila}/${totalPaginasOutrosFila}`;
            controlsContainer.appendChild(pageIndicator);
            
            const nextPageBtn = document.createElement('button');
            nextPageBtn.className = 'page-nav-arrow';
            nextPageBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextPageBtn.title = 'Próxima tela';
            nextPageBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                mudarPaginaOutrosFila(paginaAtualOutrosFila + 1, 'usuario');
            };
            nextPageBtn.disabled = paginaAtualOutrosFila === totalPaginasOutrosFila;
            controlsContainer.appendChild(nextPageBtn);
            
            const separator = document.createElement('span');
            separator.className = 'controls-separator';
            separator.innerHTML = '|';
            controlsContainer.appendChild(separator);
        }
        
        const btnCarrossel = document.createElement('button');
        btnCarrossel.id = 'btnCarrosselOutros';
        btnCarrossel.className = `btn-carrossel-outros ${carrosselAutomaticoAtivo ? 'ativo' : ''}`;
        btnCarrossel.innerHTML = carrosselAutomaticoAtivo ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        btnCarrossel.title = carrosselAutomaticoAtivo ? 'Rolagem automática (ligada)' : 'Rolagem automática (desligada)';
        
        btnCarrossel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            alternarCarrosselAutomatico();
            
            if (carrosselAutomaticoAtivo) {
                btnCarrossel.innerHTML = '<i class="fas fa-pause"></i>';
                btnCarrossel.title = 'Rolagem automática (ligada)';
            } else {
                btnCarrossel.innerHTML = '<i class="fas fa-play"></i>';
                btnCarrossel.title = 'Rolagem automática (desligada)';
            }
        });
        
        controlsContainer.appendChild(btnCarrossel);
        
        const iconClone = icon ? icon.cloneNode(true) : null;
        const titleClone = title ? title.cloneNode(true) : null;
        const badgeClone = badge ? badge.cloneNode(true) : null;
        
        colunaHeader.innerHTML = '';
        
        if (iconClone) colunaHeader.appendChild(iconClone);
        if (titleClone) colunaHeader.appendChild(titleClone);
        colunaHeader.appendChild(controlsContainer);
        if (badgeClone) colunaHeader.appendChild(badgeClone);
        
        console.log('✅ Controles de navegação e play criados no header');
    }, 500);
}

// ============================================
// VERIFICAR E INICIAR CARROSSEL
// ============================================
function verificarEIniciarCarrossel() {
    const temScroll = document.querySelectorAll('.servico-scroll').length > 0;
    
    if (temScroll && carrosselAutomaticoAtivo) {
        console.log('🎠 Elementos encontrados, iniciando carrossel...');
        setTimeout(() => {
            iniciarCarrosselSenhasAutomatico();
        }, 500);
    } else {
        console.log('⏳ Aguardando elementos do carrossel...');
        let tentativas = 0;
        const maxTentativas = 10;
        
        const intervalo = setInterval(() => {
            tentativas++;
            const temAgora = document.querySelectorAll('.servico-scroll').length > 0;
            
            if (temAgora && carrosselAutomaticoAtivo) {
                console.log('🎠 Elementos encontrados na tentativa', tentativas);
                clearInterval(intervalo);
                setTimeout(() => {
                    iniciarCarrosselSenhasAutomatico();
                }, 500);
            } else if (tentativas >= maxTentativas) {
                console.log('⏹️ Máximo de tentativas atingido');
                clearInterval(intervalo);
            }
        }, 1000);
    }
}

// Exportar para window
window.renderizarColunaOutros = renderizarColunaOutros;
window.renderizarColunaProximos = renderizarColunaProximos;
window.renderizarColunaAtendimento = renderizarColunaAtendimento;
window.atualizarIndicadorPaginaHeader = atualizarIndicadorPaginaHeader;
window.mudarPaginaOutrosFila = mudarPaginaOutrosFila;
window.configurarScrollServico = configurarScrollServico;
window.atualizarEstadoServico = atualizarEstadoServico;
window.scrollServico = scrollServico;
window.irParaPaginaServico = irParaPaginaServico;
window.iniciarCarrosselSenhasAutomatico = iniciarCarrosselSenhasAutomatico;
window.pararCarrosselAutomatico = pararCarrosselAutomatico;
window.alternarCarrosselAutomatico = alternarCarrosselAutomatico;
window.configurarPausaAoInteragir = configurarPausaAoInteragir;
window.criarBotaoPlayNoHeader = criarBotaoPlayNoHeader;
window.verificarEIniciarCarrossel = verificarEIniciarCarrossel;

console.log("✅ Módulo 5 carregado com sucesso!");