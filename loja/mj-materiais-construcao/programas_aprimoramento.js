// ============================================
// programas_aprimoramento.js
// Sistema de Programas de Aprimoramento
// ============================================

// Estado global
let lojaId = null;
let usuarioAtual = null;
let isGestor = false;
let currentItemToComplete = null;
let currentTesteToSubmit = null;
let allTreinamentos = [];
let allTestes = [];
let allVideos = [];
let userProgress = null;
let chatUnsubscribe = null;
let currentFilter = 'todos';

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Programas de Aprimoramento...');
    
    await carregarDadosUsuario();
    await verificarHabilitacao();
    
    configurarEventListeners();
    
    // Aguardar lojaServices estar disponível
    if (window.lojaServices) {
        await carregarDados();
        await carregarProgresso();
        await iniciarChat();
    } else {
        console.log('⏳ Aguardando lojaServices...');
        const checkInterval = setInterval(async () => {
            if (window.lojaServices) {
                clearInterval(checkInterval);
                await carregarDados();
                await carregarProgresso();
                await iniciarChat();
            }
        }, 500);
    }
});

// Carregar dados do usuário
async function carregarDadosUsuario() {
    try {
        const usuarioInfo = window.getUsuarioInfo ? window.getUsuarioInfo() : null;
        
        if (usuarioInfo) {
            usuarioAtual = {
                email: usuarioInfo.email,
                nome: usuarioInfo.nome,
                perfil: usuarioInfo.perfil,
                tipo: usuarioInfo.tipo
            };
        } else if (window.dadosUsuario) {
            usuarioAtual = window.dadosUsuario;
        }
        
        if (usuarioAtual) {
            document.getElementById('userNameDisplay').textContent = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
            isGestor = usuarioAtual.perfil === 'admin' || usuarioAtual.perfil === 'gerente';
            
            if (isGestor) {
                document.getElementById('btnGestao').style.display = 'flex';
                document.getElementById('btnAdicionarTreinamento').style.display = 'flex';
                document.getElementById('btnAdicionarTeste').style.display = 'flex';
                document.getElementById('btnAdicionarVideo').style.display = 'flex';
            }
        }
        
        // Extrair loja da URL
        const pathParts = window.location.pathname.split('/');
        const lojaIndex = pathParts.indexOf('loja');
        if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
            lojaId = pathParts[lojaIndex + 1];
        }
        
        console.log(`📍 Loja: ${lojaId}, Usuário: ${usuarioAtual?.email}, Gestor: ${isGestor}`);
        
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Verificar se o programa está habilitado para a loja
async function verificarHabilitacao() {
    try {
        if (!window.loginDb || !lojaId) {
            console.error('loginDb ou lojaId não disponível');
            return;
        }
        
        const lojaDoc = await window.loginDb.collection('lojas').doc(lojaId).get();
        
        if (lojaDoc.exists) {
            const habilitado = lojaDoc.data().habilitar_programas_aprimoramento === true;
            
            if (!habilitado) {
                mostrarMensagem('❌ Programa de Aprimoramento não está habilitado para esta loja.', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } else {
            console.warn('Documento da loja não encontrado');
        }
        
    } catch (error) {
        console.error('Erro ao verificar habilitação:', error);
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Botão voltar
    document.getElementById('btnBack').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Botão gestão
    document.getElementById('btnGestao').addEventListener('click', () => {
        abrirGestao();
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            mudarTab(tabId);
        });
    });
    
    // Buscas
    document.getElementById('searchTreinamento').addEventListener('input', (e) => {
        filtrarTreinamentos(e.target.value);
    });
    
    document.getElementById('searchTeste').addEventListener('input', (e) => {
        filtrarTestes(e.target.value);
    });
    
    document.getElementById('searchVideo').addEventListener('input', (e) => {
        filtrarVideos(e.target.value);
    });
    
    // Chat
    document.getElementById('btnEnviarChat').addEventListener('click', enviarMensagemChat);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensagemChat();
        }
    });
    
    // Formulários
    document.getElementById('treinamentoForm').addEventListener('submit', salvarTreinamento);
    document.getElementById('testeForm').addEventListener('submit', salvarTeste);
    document.getElementById('videoForm').addEventListener('submit', salvarVideo);
    document.getElementById('btnAddQuestao').addEventListener('click', adicionarQuestaoForm);
    
    // Botão confirmar conclusão
    document.getElementById('btnConfirmarConcluir').addEventListener('click', confirmarConclusao);
    
    // Botão enviar respostas do teste
    document.getElementById('btnEnviarRespostas').addEventListener('click', enviarRespostasTeste);
    
    // Botão marcar assistido
    document.getElementById('btnMarcarAssistido').addEventListener('click', marcarVideoAssistido);
}

// Mudar tab
function mudarTab(tabId) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Atualizar badge do chat
    if (tabId === 'chat') {
        document.getElementById('chatBadge').style.display = 'none';
    }
}

// Carregar dados do Firebase
async function carregarDados() {
    await Promise.all([
        carregarTreinamentos(),
        carregarTestes(),
        carregarVideos()
    ]);
}

async function carregarTreinamentos() {
    try {
        const treinamentosRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const treinamentosSub = collection(treinamentosRef, 'treinamentos');
        const snapshot = await getDocs(treinamentosSub);
        
        allTreinamentos = [];
        snapshot.forEach(doc => {
            allTreinamentos.push({ id: doc.id, ...doc.data() });
        });
        
        allTreinamentos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        
        renderizarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
        document.getElementById('treinamentosGrid').innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Erro ao carregar treinamentos</span>
            </div>
        `;
    }
}

async function carregarTestes() {
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const testesSub = collection(aprimoramentoRef, 'testes');
        const snapshot = await getDocs(testesSub);
        
        allTestes = [];
        snapshot.forEach(doc => {
            allTestes.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarTestes();
        
    } catch (error) {
        console.error('Erro ao carregar testes:', error);
    }
}

async function carregarVideos() {
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const videosSub = collection(aprimoramentoRef, 'videos');
        const snapshot = await getDocs(videosSub);
        
        allVideos = [];
        snapshot.forEach(doc => {
            allVideos.push({ id: doc.id, ...doc.data() });
        });
        
        renderizarVideos();
        
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
    }
}

// Renderizar treinamentos
function renderizarTreinamentos(filtro = '') {
    const grid = document.getElementById('treinamentosGrid');
    let treinamentos = [...allTreinamentos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        treinamentos = treinamentos.filter(t => 
            t.titulo.toLowerCase().includes(termo) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (treinamentos.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-book-open"></i>
                <span>Nenhum treinamento encontrado</span>
                ${isGestor ? '<small>Clique em "Novo Treinamento" para começar</small>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = treinamentos.map(t => {
        const isCompleted = userProgress?.treinamentos_concluidos?.includes(t.id);
        const isLocked = !isGestor && !isCompleted && !verificarPreRequisitos(t);
        
        return `
            <div class="treinamento-card">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="card-badge ${t.categoria || 'iniciante'}">${getCategoriaNome(t.categoria)}</span>
                </div>
                <div class="card-descricao">${escapeHtml(t.descricao || 'Sem descrição')}</div>
                <div class="card-footer">
                    <span class="card-pontos"><i class="fas fa-star"></i> ${t.pontos || 10} pts</span>
                    ${isGestor ? `
                        <div>
                            <button class="btn-editar" onclick="editarTreinamento('${t.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-excluir" onclick="excluirTreinamento('${t.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : `
                        ${isCompleted ? 
                            `<button class="btn-acao completed" disabled><i class="fas fa-check"></i> Concluído</button>` :
                            `<button class="btn-acao" onclick="marcarConcluido('treinamento', '${t.id}', ${t.pontos || 10})">
                                <i class="fas fa-check-circle"></i> Marcar como Lido
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filtrarTreinamentos(termo) {
    renderizarTreinamentos(termo);
}

function filtrarTestes(termo) {
    renderizarTestes(termo);
}

function filtrarVideos(termo) {
    renderizarVideos(termo);
}

function renderizarTestes(filtro = '') {
    const grid = document.getElementById('testesGrid');
    let testes = [...allTestes];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        testes = testes.filter(t => 
            t.titulo.toLowerCase().includes(termo) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (testes.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-clipboard-list"></i>
                <span>Nenhum teste encontrado</span>
                ${isGestor ? '<small>Clique em "Novo Teste" para começar</small>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = testes.map(t => {
        const userTeste = userProgress?.testes_resultados?.find(tr => tr.teste_id === t.id);
        const isCompleted = userTeste?.aprovado === true;
        const nota = userTeste?.pontuacao || 0;
        
        return `
            <div class="teste-card">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="card-badge">${t.questoes?.length || 0} questões</span>
                </div>
                <div class="card-descricao">${escapeHtml(t.descricao || 'Sem descrição')}</div>
                <div class="card-footer">
                    <span class="card-pontos"><i class="fas fa-star"></i> ${t.pontos_max || 100} pts</span>
                    ${isGestor ? `
                        <div>
                            <button class="btn-editar" onclick="editarTeste('${t.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-excluir" onclick="excluirTeste('${t.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : `
                        ${isCompleted ? 
                            `<button class="btn-acao completed" disabled>
                                <i class="fas fa-check"></i> Nota: ${nota}/${t.pontos_max}
                            </button>` :
                            `<button class="btn-acao" onclick="iniciarTeste('${t.id}')">
                                <i class="fas fa-play"></i> Iniciar Teste
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function renderizarVideos(filtro = '') {
    const grid = document.getElementById('videosGrid');
    let videos = [...allVideos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        videos = videos.filter(v => 
            v.titulo.toLowerCase().includes(termo) ||
            (v.descricao && v.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (videos.length === 0) {
        grid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-video"></i>
                <span>Nenhum vídeo encontrado</span>
                ${isGestor ? '<small>Clique em "Novo Vídeo" para começar</small>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = videos.map(v => {
        const isWatched = userProgress?.videos_assistidos?.includes(v.id);
        
        return `
            <div class="video-card">
                <div class="card-header">
                    <h4>${escapeHtml(v.titulo)}</h4>
                    <span class="card-badge ${v.categoria || 'iniciante'}">${getCategoriaNome(v.categoria)}</span>
                </div>
                <div class="card-descricao">${escapeHtml(v.descricao || 'Sem descrição')}</div>
                <div class="card-footer">
                    <span class="card-pontos"><i class="fas fa-star"></i> ${v.pontos || 5} pts</span>
                    ${isGestor ? `
                        <div>
                            <button class="btn-editar" onclick="editarVideo('${v.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-excluir" onclick="excluirVideo('${v.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : `
                        ${isWatched ? 
                            `<button class="btn-acao completed" disabled><i class="fas fa-check"></i> Assistido</button>` :
                            `<button class="btn-acao" onclick="assistirVideo('${v.id}')">
                                <i class="fas fa-play"></i> Assistir
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// Carregar progresso do usuário
async function carregarProgresso() {
    if (!usuarioAtual?.email) return;
    
    try {
        const progressoRef = doc(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        const userDoc = await getDoc(doc(progressoSub, usuarioAtual.email));
        
        if (userDoc.exists()) {
            userProgress = userDoc.data();
        } else {
            userProgress = {
                email: usuarioAtual.email,
                nome: usuarioAtual.nome,
                pontos_totais: 0,
                treinamentos_concluidos: [],
                videos_assistidos: [],
                testes_resultados: [],
                conquistas: [],
                data_inicio: new Date().toISOString()
            };
            await salvarProgresso();
        }
        
        atualizarJornada();
        
    } catch (error) {
        console.error('Erro ao carregar progresso:', error);
    }
}

async function salvarProgresso() {
    if (!usuarioAtual?.email) return;
    
    try {
        const progressoRef = doc(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        await setDoc(doc(progressoSub, usuarioAtual.email), userProgress, { merge: true });
        
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

function atualizarJornada() {
    // Atualizar stats
    document.getElementById('totalPontos').textContent = userProgress?.pontos_totais || 0;
    
    const totalTreinamentos = allTreinamentos.length;
    const treinamentosConcluidos = userProgress?.treinamentos_concluidos?.length || 0;
    const totalVideos = allVideos.length;
    const videosAssistidos = userProgress?.videos_assistidos?.length || 0;
    const totalTestes = allTestes.length;
    const testesAprovados = userProgress?.testes_resultados?.filter(tr => tr.aprovado)?.length || 0;
    
    const totalItens = totalTreinamentos + totalVideos + totalTestes;
    const totalConcluidos = treinamentosConcluidos + videosAssistidos + testesAprovados;
    const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    
    document.getElementById('totalConcluidos').textContent = `${totalConcluidos}/${totalItens}`;
    document.getElementById('progressoPercentual').textContent = `${percentual}%`;
    document.getElementById('progressoFill').style.width = `${percentual}%`;
    
    // Definir nível
    let nivel = 'Iniciante';
    if (percentual >= 80) nivel = 'Expert';
    else if (percentual >= 60) nivel = 'Avançado';
    else if (percentual >= 30) nivel = 'Intermediário';
    document.getElementById('nivelAtual').textContent = nivel;
    
    // Renderizar timeline
    renderizarTimeline();
    
    // Renderizar conquistas
    renderizarConquistas();
}

function renderizarTimeline() {
    const timelineList = document.getElementById('timelineList');
    const todosItens = [
        ...allTreinamentos.map(t => ({ ...t, tipo: 'treinamento', pontos: t.pontos || 10 })),
        ...allVideos.map(v => ({ ...v, tipo: 'video', pontos: v.pontos || 5 })),
        ...allTestes.map(t => ({ ...t, tipo: 'teste', pontos: t.pontos_max || 100 }))
    ];
    
    todosItens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    if (todosItens.length === 0) {
        timelineList.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-road"></i>
                <span>Nenhum conteúdo disponível ainda</span>
            </div>
        `;
        return;
    }
    
    timelineList.innerHTML = todosItens.map(item => {
        let isCompleted = false;
        if (item.tipo === 'treinamento') {
            isCompleted = userProgress?.treinamentos_concluidos?.includes(item.id);
        } else if (item.tipo === 'video') {
            isCompleted = userProgress?.videos_assistidos?.includes(item.id);
        } else if (item.tipo === 'teste') {
            const testeResult = userProgress?.testes_resultados?.find(tr => tr.teste_id === item.id);
            isCompleted = testeResult?.aprovado === true;
        }
        
        const icon = item.tipo === 'treinamento' ? 'fa-book-open' : (item.tipo === 'video' ? 'fa-video' : 'fa-clipboard-list');
        
        return `
            <div class="timeline-item ${isCompleted ? 'completed' : 'pending'}">
                <div class="timeline-icon ${isCompleted ? 'completed' : 'pending'}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="timeline-content">
                    <h4>${escapeHtml(item.titulo)}</h4>
                    <p>${escapeHtml(item.descricao || '')}</p>
                </div>
                <div class="timeline-pontos">${item.pontos} pts</div>
                <div class="timeline-status ${isCompleted ? 'completed' : 'pending'}">
                    ${isCompleted ? 'Concluído' : 'Pendente'}
                </div>
            </div>
        `;
    }).join('');
}

function renderizarConquistas() {
    const conquistasGrid = document.getElementById('conquistasGrid');
    
    const conquistas = [
        { id: 'primeiro_passo', nome: 'Primeiro Passo', descricao: 'Complete seu primeiro conteúdo', icone: 'fa-flag-checkered', condicao: () => (userProgress?.treinamentos_concluidos?.length || 0) > 0 || (userProgress?.videos_assistidos?.length || 0) > 0 },
        { id: 'estudante_dedicado', nome: 'Estudante Dedicado', descricao: 'Complete 5 conteúdos', icone: 'fa-graduation-cap', condicao: () => {
            const total = (userProgress?.treinamentos_concluidos?.length || 0) + (userProgress?.videos_assistidos?.length || 0) + (userProgress?.testes_resultados?.filter(tr => tr.aprovado)?.length || 0);
            return total >= 5;
        }},
        { id: 'mestre_do_conhecimento', nome: 'Mestre do Conhecimento', descricao: 'Complete 10 conteúdos', icone: 'fa-crown', condicao: () => {
            const total = (userProgress?.treinamentos_concluidos?.length || 0) + (userProgress?.videos_assistidos?.length || 0) + (userProgress?.testes_resultados?.filter(tr => tr.aprovado)?.length || 0);
            return total >= 10;
        }},
        { id: 'expert', nome: 'Expert', descricao: 'Atinga 1000 pontos', icone: 'fa-star', condicao: () => (userProgress?.pontos_totais || 0) >= 1000 }
    ];
    
    conquistasGrid.innerHTML = conquistas.map(c => {
        const desbloqueada = c.condicao();
        return `
            <div class="conquista-card ${desbloqueada ? 'unlocked' : 'locked'}">
                <i class="fas ${c.icone}"></i>
                <div class="conquista-info">
                    <h4>${c.nome}</h4>
                    <p>${c.descricao}</p>
                    ${!desbloqueada ? '<small>🔒 Bloqueada</small>' : '<small>✅ Desbloqueada</small>'}
                </div>
            </div>
        `;
    }).join('');
}

// Funções de conclusão
window.marcarConcluido = function(tipo, id, pontos) {
    currentItemToComplete = { tipo, id, pontos };
    document.getElementById('concluirMensagem').textContent = `Tem certeza que deseja marcar este ${tipo} como concluído?`;
    document.getElementById('concluirPontos').textContent = pontos;
    document.getElementById('concluirModal').style.display = 'flex';
}

async function confirmarConclusao() {
    if (!currentItemToComplete) return;
    
    const { tipo, id, pontos } = currentItemToComplete;
    
    if (tipo === 'treinamento') {
        if (!userProgress.treinamentos_concluidos.includes(id)) {
            userProgress.treinamentos_concluidos.push(id);
            userProgress.pontos_totais += pontos;
        }
    } else if (tipo === 'video') {
        if (!userProgress.videos_assistidos.includes(id)) {
            userProgress.videos_assistidos.push(id);
            userProgress.pontos_totais += pontos;
        }
    }
    
    await salvarProgresso();
    fecharModal('concluirModal');
    currentItemToComplete = null;
    
    await carregarProgresso();
    renderizarTreinamentos();
    renderizarVideos();
    
    mostrarMensagem(`✅ Concluído! Você ganhou ${pontos} pontos!`, 'success');
}

// Testes
window.iniciarTeste = function(testeId) {
    const teste = allTestes.find(t => t.id === testeId);
    if (!teste) return;
    
    currentTesteToSubmit = teste;
    document.getElementById('testeRealizarTitulo').textContent = teste.titulo;
    
    const container = document.getElementById('testeQuestoesContainer');
    container.innerHTML = '';
    
    teste.questoes.forEach((questao, idx) => {
        const questaoDiv = document.createElement('div');
        questaoDiv.className = 'questao-item';
        questaoDiv.innerHTML = `
            <div class="questao-header">
                <span class="questao-numero">Questão ${idx + 1}</span>
            </div>
            <p style="margin-bottom: 12px; font-weight: 500;">${escapeHtml(questao.texto)}</p>
            <div class="alternativas-container">
                ${questao.alternativas.map((alt, altIdx) => `
                    <label class="alternativa-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <input type="radio" name="questao_${idx}" value="${altIdx}">
                        <span>${escapeHtml(alt)}</span>
                    </label>
                `).join('')}
            </div>
        `;
        container.appendChild(questaoDiv);
    });
    
    document.getElementById('realizarTesteModal').style.display = 'flex';
}

async function enviarRespostasTeste() {
    if (!currentTesteToSubmit) return;
    
    let acertos = 0;
    const questoes = currentTesteToSubmit.questoes;
    
    for (let i = 0; i < questoes.length; i++) {
        const selected = document.querySelector(`input[name="questao_${i}"]:checked`);
        if (selected && parseInt(selected.value) === questoes[i].correta) {
            acertos++;
        }
    }
    
    const percentual = (acertos / questoes.length) * 100;
    const pontuacao = Math.round((percentual / 100) * currentTesteToSubmit.pontos_max);
    const aprovado = percentual >= (currentTesteToSubmit.pontos_min || 70);
    
    const resultadoExistente = userProgress.testes_resultados.find(tr => tr.teste_id === currentTesteToSubmit.id);
    
    if (resultadoExistente) {
        resultadoExistente.pontuacao = pontuacao;
        resultadoExistente.aprovado = aprovado;
        resultadoExistente.data_realizacao = new Date().toISOString();
        resultadoExistente.acertos = acertos;
        resultadoExistente.total_questoes = questoes.length;
    } else {
        userProgress.testes_resultados.push({
            teste_id: currentTesteToSubmit.id,
            teste_titulo: currentTesteToSubmit.titulo,
            pontuacao: pontuacao,
            aprovado: aprovado,
            data_realizacao: new Date().toISOString(),
            acertos: acertos,
            total_questoes: questoes.length
        });
    }
    
    if (aprovado && (!resultadoExistente || !resultadoExistente.aprovado)) {
        userProgress.pontos_totais += pontuacao;
    }
    
    await salvarProgresso();
    fecharModal('realizarTesteModal');
    currentTesteToSubmit = null;
    
    await carregarProgresso();
    renderizarTestes();
    
    if (aprovado) {
        mostrarMensagem(`✅ Parabéns! Você acertou ${acertos}/${questoes.length} e ganhou ${pontuacao} pontos!`, 'success');
    } else {
        mostrarMensagem(`❌ Você acertou ${acertos}/${questoes.length}. Pontuação mínima: ${currentTesteToSubmit.pontos_min}%. Tente novamente!`, 'error');
    }
}

// Vídeos
window.assistirVideo = function(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    if (!video) return;
    
    document.getElementById('videoVerTitulo').textContent = video.titulo;
    document.getElementById('videoVerDescricao').textContent = video.descricao || '';
    
    const videoUrl = video.url;
    let embedUrl = videoUrl;
    
    if (videoUrl.includes('youtube.com/watch?v=')) {
        embedUrl = videoUrl.replace('watch?v=', 'embed/');
    } else if (videoUrl.includes('youtu.be/')) {
        const id = videoUrl.split('youtu.be/')[1].split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (videoUrl.includes('vimeo.com')) {
        const id = videoUrl.split('vimeo.com/')[1].split('?')[0];
        embedUrl = `https://player.vimeo.com/video/${id}`;
    }
    
    document.getElementById('videoIframe').src = embedUrl;
    document.getElementById('verVideoModal').style.display = 'flex';
    
    window.currentVideoWatching = video;
}

async function marcarVideoAssistido() {
    if (!window.currentVideoWatching) return;
    
    const video = window.currentVideoWatching;
    
    if (!userProgress.videos_assistidos.includes(video.id)) {
        userProgress.videos_assistidos.push(video.id);
        userProgress.pontos_totais += (video.pontos || 5);
        await salvarProgresso();
        
        await carregarProgresso();
        renderizarVideos();
        
        mostrarMensagem(`✅ Vídeo marcado como assistido! Você ganhou ${video.pontos || 5} pontos!`, 'success');
    }
    
    fecharModal('verVideoModal');
    document.getElementById('videoIframe').src = '';
    window.currentVideoWatching = null;
}

// Chat
async function iniciarChat() {
    try {
        const chatRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'chat');
        const q = query(chatRef, orderBy('timestamp', 'desc'), limit(100));
        
        if (chatUnsubscribe) {
            chatUnsubscribe();
        }
        
        chatUnsubscribe = onSnapshot(q, (snapshot) => {
            const mensagens = [];
            snapshot.forEach(doc => {
                mensagens.push({ id: doc.id, ...doc.data() });
            });
            mensagens.reverse();
            renderizarMensagensChat(mensagens);
        });
        
    } catch (error) {
        console.error('Erro ao iniciar chat:', error);
    }
}

function renderizarMensagensChat(mensagens) {
    const container = document.getElementById('chatMessages');
    
    if (mensagens.length === 0) {
        container.innerHTML = `
            <div class="chat-welcome">
                <i class="fas fa-comments"></i>
                <p>Bem-vindo ao chat da equipe!</p>
                <small>Compartilhe dúvidas, dicas e conquistas</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = mensagens.map(msg => {
        const isCurrentUser = msg.email === usuarioAtual?.email;
        const initials = msg.nome ? msg.nome.substring(0, 2).toUpperCase() : msg.email.substring(0, 2).toUpperCase();
        const time = msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        return `
            <div class="chat-message ${isCurrentUser ? 'current-user' : ''}">
                <div class="chat-message-avatar">
                    ${initials}
                </div>
                <div class="chat-message-content">
                    <div class="chat-message-name">${escapeHtml(msg.nome || msg.email)}</div>
                    <div class="chat-message-text">${escapeHtml(msg.mensagem)}</div>
                    <div class="chat-message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function enviarMensagemChat() {
    const input = document.getElementById('chatInput');
    const mensagem = input.value.trim();
    
    if (!mensagem) return;
    
    try {
        const chatRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'chat');
        await addDoc(chatRef, {
            email: usuarioAtual?.email,
            nome: usuarioAtual?.nome,
            mensagem: mensagem,
            timestamp: serverTimestamp(),
            loja_id: lojaId
        });
        
        input.value = '';
        
        // Atualizar badge
        const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (currentTab !== 'chat') {
            document.getElementById('chatBadge').style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        mostrarMensagem('Erro ao enviar mensagem', 'error');
    }
}

// Gestão
async function abrirGestao() {
    await carregarMembros();
    document.getElementById('gestaoModal').style.display = 'flex';
    
    // Configurar tabs da gestão
    document.querySelectorAll('.gestao-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.gestaoTab;
            document.querySelectorAll('.gestao-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.gestao-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(`gestao-${tabId}`).classList.add('active');
            
            if (tabId === 'relatorios') {
                carregarRelatorios();
            }
        });
    });
}

async function carregarMembros() {
    try {
        const usuariosRef = collection(window.loginDb, 'usuarios');
        const lojaDoc = doc(usuariosRef, lojaId);
        
        const funcionariosSnapshot = await getDocs(collection(lojaDoc, 'funcionarios'));
        const clientesSnapshot = await getDocs(collection(lojaDoc, 'clientes'));
        
        const membros = [];
        
        funcionariosSnapshot.forEach(doc => {
            const data = doc.data();
            membros.push({
                email: doc.id,
                nome: data.nome,
                perfil: data.perfil,
                tipo: 'funcionario'
            });
        });
        
        clientesSnapshot.forEach(doc => {
            const data = doc.data();
            membros.push({
                email: doc.id,
                nome: data.nome,
                perfil: 'cliente',
                tipo: 'cliente'
            });
        });
        
        // Carregar progresso de cada membro
        const progressoRef = doc(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        
        const membrosComProgresso = await Promise.all(membros.map(async (membro) => {
            const progressoDoc = await getDoc(doc(progressoSub, membro.email));
            const progresso = progressoDoc.exists() ? progressoDoc.data() : { pontos_totais: 0 };
            return { ...membro, progresso };
        }));
        
        renderizarMembrosTabela(membrosComProgresso);
        
        // Popular select de relatórios
        const select = document.getElementById('relatorioMembroSelect');
        select.innerHTML = '<option value="todos">Todos os Membros</option>' + 
            membrosComProgresso.map(m => `<option value="${m.email}">${m.nome} (${m.perfil})</option>`).join('');
        
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
    }
}

function renderizarMembrosTabela(membros) {
    const tbody = document.getElementById('membrosTableBody');
    
    const totalTreinamentos = allTreinamentos.length;
    const totalVideos = allVideos.length;
    const totalTestes = allTestes.length;
    const totalItens = totalTreinamentos + totalVideos + totalTestes;
    
    tbody.innerHTML = membros.map(m => {
        const progresso = m.progresso;
        const treinamentosConcluidos = progresso?.treinamentos_concluidos?.length || 0;
        const videosAssistidos = progresso?.videos_assistidos?.length || 0;
        const testesAprovados = progresso?.testes_resultados?.filter(tr => tr.aprovado)?.length || 0;
        const totalConcluidos = treinamentosConcluidos + videosAssistidos + testesAprovados;
        const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
        
        return `
            <tr>
                <td>
                    <strong>${escapeHtml(m.nome)}</strong><br>
                    <small>${m.email}</small>
                </td>
                <td>${m.perfil}</td>
                <td>${progresso?.pontos_totais || 0}</td>
                <td class="membro-progresso">
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${percentual}%"></div>
                    </div>
                    <small>${totalConcluidos}/${totalItens} (${percentual}%)</small>
                </td>
                <td>
                    <button class="btn-ver-perfil" onclick="verPerfilMembro('${m.email}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.verPerfilMembro = function(email) {
    mostrarMensagem(`Visualizando perfil de ${email}`, 'info');
    // Implementar visualização detalhada
}

async function carregarRelatorios() {
    try {
        const progressoRef = doc(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        const snapshot = await getDocs(progressoSub);
        
        let totalPontos = 0;
        let totalUsuarios = 0;
        let mediaProgresso = 0;
        
        const usuarios = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            totalPontos += data.pontos_totais || 0;
            totalUsuarios++;
            usuarios.push(data);
        });
        
        const mediaPontos = totalUsuarios > 0 ? Math.round(totalPontos / totalUsuarios) : 0;
        
        document.getElementById('relatorioResumo').innerHTML = `
            <p><strong>Total de Usuários:</strong> ${totalUsuarios}</p>
            <p><strong>Total de Pontos Acumulados:</strong> ${totalPontos}</p>
            <p><strong>Média de Pontos por Usuário:</strong> ${mediaPontos}</p>
            <p><strong>Total de Treinamentos:</strong> ${allTreinamentos.length}</p>
            <p><strong>Total de Vídeos:</strong> ${allVideos.length}</p>
            <p><strong>Total de Testes:</strong> ${allTestes.length}</p>
        `;
        
        document.getElementById('relatorioAtividades').innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-chart-line"></i>
                <span>Relatório detalhado em desenvolvimento</span>
            </div>
        `;
        
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
    }
}

// CRUD Treinamentos
window.editarTreinamento = async function(id) {
    const treinamento = allTreinamentos.find(t => t.id === id);
    if (!treinamento) return;
    
    document.getElementById('treinamentoModalTitle').textContent = 'Editar Treinamento';
    document.getElementById('treinamentoId').value = treinamento.id;
    document.getElementById('treinamentoTitulo').value = treinamento.titulo;
    document.getElementById('treinamentoDescricao').value = treinamento.descricao || '';
    document.getElementById('treinamentoConteudo').value = treinamento.conteudo || '';
    document.getElementById('treinamentoPontos').value = treinamento.pontos || 10;
    document.getElementById('treinamentoCategoria').value = treinamento.categoria || 'iniciante';
    document.getElementById('treinamentoOrdem').value = treinamento.ordem || 0;
    
    document.getElementById('treinamentoModal').style.display = 'flex';
}

async function salvarTreinamento(e) {
    e.preventDefault();
    
    const id = document.getElementById('treinamentoId').value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        conteudo: document.getElementById('treinamentoConteudo').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10,
        categoria: document.getElementById('treinamentoCategoria').value,
        ordem: parseInt(document.getElementById('treinamentoOrdem').value) || 0,
        data_atualizacao: serverTimestamp()
    };
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const treinamentosSub = collection(aprimoramentoRef, 'treinamentos');
        
        if (id) {
            await updateDoc(doc(treinamentosSub, id), dados);
            mostrarMensagem('Treinamento atualizado com sucesso!', 'success');
        } else {
            dados.data_criacao = serverTimestamp();
            await addDoc(treinamentosSub, dados);
            mostrarMensagem('Treinamento criado com sucesso!', 'success');
        }
        
        fecharModal('treinamentoModal');
        document.getElementById('treinamentoForm').reset();
        document.getElementById('treinamentoId').value = '';
        
        await carregarTreinamentos();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar treinamento:', error);
        mostrarMensagem('Erro ao salvar treinamento', 'error');
    }
}

window.excluirTreinamento = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const treinamentosSub = collection(aprimoramentoRef, 'treinamentos');
        await deleteDoc(doc(treinamentosSub, id));
        
        mostrarMensagem('Treinamento excluído com sucesso!', 'success');
        await carregarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao excluir treinamento:', error);
        mostrarMensagem('Erro ao excluir treinamento', 'error');
    }
}

// CRUD Testes
window.editarTeste = async function(id) {
    const teste = allTestes.find(t => t.id === id);
    if (!teste) return;
    
    document.getElementById('testeModalTitle').textContent = 'Editar Teste';
    document.getElementById('testeId').value = teste.id;
    document.getElementById('testeTitulo').value = teste.titulo;
    document.getElementById('testeDescricao').value = teste.descricao || '';
    document.getElementById('testePontosMax').value = teste.pontos_max || 100;
    document.getElementById('testePontosMin').value = teste.pontos_min || 70;
    
    // Carregar questões
    const container = document.getElementById('questoesContainer');
    container.innerHTML = '';
    
    teste.questoes.forEach((questao, idx) => {
        adicionarQuestaoForm(questao, idx);
    });
    
    document.getElementById('testeModal').style.display = 'flex';
}

function adicionarQuestaoForm(questaoData = null, idx = null) {
    const container = document.getElementById('questoesContainer');
    const template = document.querySelector('.questao-item.template');
    const newQuestao = template.cloneNode(true);
    newQuestao.classList.remove('template');
    newQuestao.style.display = 'block';
    
    const questaoNumero = container.children.length + 1;
    newQuestao.querySelector('.questao-numero').textContent = `Questão ${questaoNumero}`;
    
    if (questaoData) {
        newQuestao.querySelector('.questao-texto').value = questaoData.texto;
        const alternativasContainer = newQuestao.querySelector('.alternativas-container');
        alternativasContainer.innerHTML = '';
        
        questaoData.alternativas.forEach((alt, altIdx) => {
            const altDiv = document.createElement('div');
            altDiv.className = 'alternativa-item';
            altDiv.innerHTML = `
                <input type="radio" name="alternativa_correta_temp" class="alternativa-correta" value="${altIdx}" ${questaoData.correta === altIdx ? 'checked' : ''}>
                <input type="text" class="alternativa-texto" placeholder="Alternativa ${String.fromCharCode(65 + altIdx)}" value="${escapeHtml(alt)}">
                <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
            `;
            alternativasContainer.appendChild(altDiv);
        });
    }
    
    container.appendChild(newQuestao);
}

document.getElementById('btnAddQuestao').addEventListener('click', () => adicionarQuestaoForm());

async function salvarTeste(e) {
    e.preventDefault();
    
    const id = document.getElementById('testeId').value;
    const questoes = [];
    
    document.querySelectorAll('#questoesContainer .questao-item').forEach((questaoDiv, idx) => {
        const texto = questaoDiv.querySelector('.questao-texto').value;
        const alternativas = [];
        let correta = -1;
        
        questaoDiv.querySelectorAll('.alternativa-item').forEach((altDiv, altIdx) => {
            const textoAlt = altDiv.querySelector('.alternativa-texto').value;
            if (textoAlt.trim()) {
                alternativas.push(textoAlt);
                if (altDiv.querySelector('.alternativa-correta').checked) {
                    correta = altIdx;
                }
            }
        });
        
        if (texto.trim() && alternativas.length >= 2) {
            questoes.push({ texto, alternativas, correta });
        }
    });
    
    const dados = {
        titulo: document.getElementById('testeTitulo').value,
        descricao: document.getElementById('testeDescricao').value,
        pontos_max: parseInt(document.getElementById('testePontosMax').value) || 100,
        pontos_min: parseInt(document.getElementById('testePontosMin').value) || 70,
        questoes: questoes,
        data_atualizacao: serverTimestamp()
    };
    
    if (questoes.length === 0) {
        mostrarMensagem('Adicione pelo menos uma questão com alternativas!', 'error');
        return;
    }
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const testesSub = collection(aprimoramentoRef, 'testes');
        
        if (id) {
            await updateDoc(doc(testesSub, id), dados);
            mostrarMensagem('Teste atualizado com sucesso!', 'success');
        } else {
            dados.data_criacao = serverTimestamp();
            await addDoc(testesSub, dados);
            mostrarMensagem('Teste criado com sucesso!', 'success');
        }
        
        fecharModal('testeModal');
        document.getElementById('testeForm').reset();
        document.getElementById('testeId').value = '';
        document.getElementById('questoesContainer').innerHTML = '';
        
        await carregarTestes();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar teste:', error);
        mostrarMensagem('Erro ao salvar teste', 'error');
    }
}

window.excluirTeste = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este teste?')) return;
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const testesSub = collection(aprimoramentoRef, 'testes');
        await deleteDoc(doc(testesSub, id));
        
        mostrarMensagem('Teste excluído com sucesso!', 'success');
        await carregarTestes();
        
    } catch (error) {
        console.error('Erro ao excluir teste:', error);
        mostrarMensagem('Erro ao excluir teste', 'error');
    }
}

// CRUD Vídeos
window.editarVideo = async function(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;
    
    document.getElementById('videoModalTitle').textContent = 'Editar Vídeo';
    document.getElementById('videoId').value = video.id;
    document.getElementById('videoTitulo').value = video.titulo;
    document.getElementById('videoDescricao').value = video.descricao || '';
    document.getElementById('videoUrl').value = video.url || '';
    document.getElementById('videoDuracao').value = video.duracao || 0;
    document.getElementById('videoPontos').value = video.pontos || 5;
    document.getElementById('videoCategoria').value = video.categoria || 'iniciante';
    
    document.getElementById('videoModal').style.display = 'flex';
}

async function salvarVideo(e) {
    e.preventDefault();
    
    const id = document.getElementById('videoId').value;
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        duracao: parseInt(document.getElementById('videoDuracao').value) || 0,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5,
        categoria: document.getElementById('videoCategoria').value,
        data_atualizacao: serverTimestamp()
    };
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const videosSub = collection(aprimoramentoRef, 'videos');
        
        if (id) {
            await updateDoc(doc(videosSub, id), dados);
            mostrarMensagem('Vídeo atualizado com sucesso!', 'success');
        } else {
            dados.data_criacao = serverTimestamp();
            await addDoc(videosSub, dados);
            mostrarMensagem('Vídeo criado com sucesso!', 'success');
        }
        
        fecharModal('videoModal');
        document.getElementById('videoForm').reset();
        document.getElementById('videoId').value = '';
        
        await carregarVideos();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar vídeo:', error);
        mostrarMensagem('Erro ao salvar vídeo', 'error');
    }
}

window.excluirVideo = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    try {
        const aprimoramentoRef = collection(window.db, `aprimoramento_${lojaId.replace(/-/g, '_')}`);
        const videosSub = collection(aprimoramentoRef, 'videos');
        await deleteDoc(doc(videosSub, id));
        
        mostrarMensagem('Vídeo excluído com sucesso!', 'success');
        await carregarVideos();
        
    } catch (error) {
        console.error('Erro ao excluir vídeo:', error);
        mostrarMensagem('Erro ao excluir vídeo', 'error');
    }
}

// Funções auxiliares
function verificarPreRequisitos(item) {
    // Implementar lógica de pré-requisitos se necessário
    return true;
}

function getCategoriaNome(categoria) {
    const categorias = {
        'iniciante': 'Iniciante',
        'intermediario': 'Intermediário',
        'avancado': 'Avançado'
    };
    return categorias[categoria] || 'Iniciante';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function fecharModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function mostrarMensagem(mensagem, tipo = 'info') {
    const alertDiv = document.getElementById('messageAlert') || criarMessageAlert();
    const icon = alertDiv.querySelector('.message-icon');
    const text = alertDiv.querySelector('.message-text');
    
    alertDiv.className = `message-alert ${tipo}`;
    icon.className = `message-icon fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`;
    text.textContent = mensagem;
    alertDiv.style.display = 'flex';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function criarMessageAlert() {
    const div = document.createElement('div');
    div.id = 'messageAlert';
    div.className = 'message-alert';
    div.innerHTML = `
        <div class="message-content">
            <i class="message-icon"></i>
            <span class="message-text"></span>
        </div>
        <button class="message-close" onclick="this.parentElement.style.display='none'">×</button>
    `;
    document.body.appendChild(div);
    return div;
}

// Exportar funções para window
window.fecharModal = fecharModal;
window.mostrarMensagem = mostrarMensagem;