// ============================================
// programas_aprimoramento.js - CORRIGIDO
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
let db = null;
let loginDb = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Programas de Aprimoramento...');
    
    // Aguardar Firebase e serviços carregarem
    await aguardarServicos();
    
    await carregarDadosUsuario();
    await verificarHabilitacao();
    
    configurarEventListeners();
    
    // Aguardar db do Firebase estar disponível
    if (window.db) {
        db = window.db;
    } else if (window.firebaseDb) {
        db = window.firebaseDb;
    }
    
    if (window.loginDb) {
        loginDb = window.loginDb;
    }
    
    if (db) {
        await carregarDados();
        await carregarProgresso();
        await iniciarChat();
    } else {
        console.error('❌ Banco de dados não disponível');
        mostrarMensagem('Erro ao carregar dados. Tente novamente mais tarde.', 'error');
    }
});

// Aguardar serviços carregarem
async function aguardarServicos() {
    let tentativas = 0;
    const maxTentativas = 30;
    
    while (tentativas < maxTentativas) {
        // Verificar se temos os dados do usuário via window.dadosUsuario
        if (window.dadosUsuario || window.getUsuarioInfo) {
            console.log('✅ Dados do usuário disponíveis');
            break;
        }
        
        // Verificar se temos o banco de dados
        if (window.db || window.firebaseDb) {
            console.log('✅ Firebase db disponível');
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        tentativas++;
    }
    
    // Tentar obter dados do usuário de diferentes fontes
    if (!window.dadosUsuario && window.getUsuarioInfo) {
        const usuarioInfo = window.getUsuarioInfo();
        if (usuarioInfo) {
            window.dadosUsuario = usuarioInfo;
        }
    }
    
    console.log('⏳ Serviços carregados após', tentativas, 'tentativas');
}

// Carregar dados do usuário
async function carregarDadosUsuario() {
    try {
        // Tentar obter de window.dadosUsuario (definido pelo sistema de login)
        if (window.dadosUsuario) {
            usuarioAtual = {
                email: window.dadosUsuario.email,
                nome: window.dadosUsuario.nome || window.dadosUsuario.email?.split('@')[0],
                perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || window.dadosUsuario.tipo,
                tipo: window.dadosUsuario.tipo || 'cliente'
            };
            console.log('✅ Usuário carregado de window.dadosUsuario:', usuarioAtual);
        }
        
        // Tentar obter de sessionStorage
        if (!usuarioAtual?.email) {
            const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
            if (sessao) {
                const dados = JSON.parse(sessao);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel,
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário carregado de sessionStorage:', usuarioAtual);
            }
        }
        
        // Tentar obter de localStorage
        if (!usuarioAtual?.email) {
            const backup = localStorage.getItem('pdv_sessao_backup');
            if (backup) {
                const dados = JSON.parse(backup);
                usuarioAtual = {
                    email: dados.email,
                    nome: dados.nome || dados.email?.split('@')[0],
                    perfil: dados.perfil || dados.nivel,
                    tipo: dados.tipo || 'cliente'
                };
                console.log('✅ Usuário carregado de localStorage:', usuarioAtual);
            }
        }
        
        // Extrair loja da URL
        const pathParts = window.location.pathname.split('/');
        const lojaIndex = pathParts.indexOf('loja');
        if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
            lojaId = pathParts[lojaIndex + 1];
        } else if (window.lojaIdAtual) {
            lojaId = window.lojaIdAtual;
        } else if (window.lojaServices?.lojaId) {
            lojaId = window.lojaServices.lojaId;
        }
        
        // Atualizar display do nome do usuário
        const userNameDisplay = document.getElementById('userNameDisplay');
        if (userNameDisplay && usuarioAtual) {
            userNameDisplay.textContent = usuarioAtual.nome || usuarioAtual.email?.split('@')[0] || 'Usuário';
        }
        
        // Verificar se é gestor
        if (usuarioAtual) {
            const perfil = usuarioAtual.perfil || '';
            isGestor = perfil === 'admin' || perfil === 'gerente' || perfil === 'supervisor';
            
            if (isGestor) {
                const btnGestao = document.getElementById('btnGestao');
                const btnAdicionarTreinamento = document.getElementById('btnAdicionarTreinamento');
                const btnAdicionarTeste = document.getElementById('btnAdicionarTeste');
                const btnAdicionarVideo = document.getElementById('btnAdicionarVideo');
                
                if (btnGestao) btnGestao.style.display = 'flex';
                if (btnAdicionarTreinamento) btnAdicionarTreinamento.style.display = 'flex';
                if (btnAdicionarTeste) btnAdicionarTeste.style.display = 'flex';
                if (btnAdicionarVideo) btnAdicionarVideo.style.display = 'flex';
            }
        }
        
        console.log(`📍 Loja: ${lojaId}, Usuário: ${usuarioAtual?.email}, Gestor: ${isGestor}`);
        
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Verificar se o programa está habilitado para a loja
async function verificarHabilitacao() {
    try {
        // Tentar obter loginDb de diferentes fontes
        const dbLogin = window.loginDb || (window.firebaseLoginDb ? window.firebaseLoginDb : null);
        
        if (!dbLogin || !lojaId) {
            console.warn('loginDb ou lojaId não disponível ainda');
            // Se não estiver disponível, tentar novamente em 1 segundo
            setTimeout(() => verificarHabilitacao(), 1000);
            return;
        }
        
        const lojaDoc = await dbLogin.collection('lojas').doc(lojaId).get();
        
        if (lojaDoc.exists) {
            const habilitado = lojaDoc.data().habilitar_programas_aprimoramento === true;
            console.log(`📚 Programas de Aprimoramento habilitado: ${habilitado}`);
            
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
        // Tentar novamente em 2 segundos
        setTimeout(() => verificarHabilitacao(), 2000);
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Botão voltar
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Botão gestão
    const btnGestao = document.getElementById('btnGestao');
    if (btnGestao) {
        btnGestao.addEventListener('click', () => {
            abrirGestao();
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            mudarTab(tabId);
        });
    });
    
    // Buscas
    const searchTreinamento = document.getElementById('searchTreinamento');
    if (searchTreinamento) {
        searchTreinamento.addEventListener('input', (e) => {
            filtrarTreinamentos(e.target.value);
        });
    }
    
    const searchTeste = document.getElementById('searchTeste');
    if (searchTeste) {
        searchTeste.addEventListener('input', (e) => {
            filtrarTestes(e.target.value);
        });
    }
    
    const searchVideo = document.getElementById('searchVideo');
    if (searchVideo) {
        searchVideo.addEventListener('input', (e) => {
            filtrarVideos(e.target.value);
        });
    }
    
    // Chat
    const btnEnviarChat = document.getElementById('btnEnviarChat');
    if (btnEnviarChat) {
        btnEnviarChat.addEventListener('click', enviarMensagemChat);
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagemChat();
            }
        });
    }
    
    // Formulários
    const treinamentoForm = document.getElementById('treinamentoForm');
    if (treinamentoForm) {
        treinamentoForm.addEventListener('submit', salvarTreinamento);
    }
    
    const testeForm = document.getElementById('testeForm');
    if (testeForm) {
        testeForm.addEventListener('submit', salvarTeste);
    }
    
    const videoForm = document.getElementById('videoForm');
    if (videoForm) {
        videoForm.addEventListener('submit', salvarVideo);
    }
    
    const btnAddQuestao = document.getElementById('btnAddQuestao');
    if (btnAddQuestao) {
        btnAddQuestao.addEventListener('click', () => adicionarQuestaoForm());
    }
    
    // Botão confirmar conclusão
    const btnConfirmarConcluir = document.getElementById('btnConfirmarConcluir');
    if (btnConfirmarConcluir) {
        btnConfirmarConcluir.addEventListener('click', confirmarConclusao);
    }
    
    // Botão enviar respostas do teste
    const btnEnviarRespostas = document.getElementById('btnEnviarRespostas');
    if (btnEnviarRespostas) {
        btnEnviarRespostas.addEventListener('click', enviarRespostasTeste);
    }
    
    // Botão marcar assistido
    const btnMarcarAssistido = document.getElementById('btnMarcarAssistido');
    if (btnMarcarAssistido) {
        btnMarcarAssistido.addEventListener('click', marcarVideoAssistido);
    }
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
    
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    // Atualizar badge do chat
    if (tabId === 'chat') {
        const chatBadge = document.getElementById('chatBadge');
        if (chatBadge) {
            chatBadge.style.display = 'none';
        }
    }
}

// Carregar dados do Firebase
async function carregarDados() {
    if (!db || !lojaId) {
        console.warn('db ou lojaId não disponível para carregar dados');
        return;
    }
    
    await Promise.all([
        carregarTreinamentos(),
        carregarTestes(),
        carregarVideos()
    ]);
}

async function carregarTreinamentos() {
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
        const treinamentosSub = collection(aprimoramentoRef, 'treinamentos');
        const snapshot = await getDocs(treinamentosSub);
        
        allTreinamentos = [];
        snapshot.forEach(doc => {
            allTreinamentos.push({ id: doc.id, ...doc.data() });
        });
        
        allTreinamentos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        
        renderizarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
        const grid = document.getElementById('treinamentosGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Erro ao carregar treinamentos</span>
                </div>
            `;
        }
    }
}

async function carregarTestes() {
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
    if (!grid) return;
    
    let treinamentos = [...allTreinamentos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        treinamentos = treinamentos.filter(t => 
            (t.titulo && t.titulo.toLowerCase().includes(termo)) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (treinamentos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <span>Nenhum treinamento encontrado</span>
                ${isGestor ? '<small>Clique em "Novo Treinamento" para começar</small>' : ''}
            </div>
        `;
        return;
    }
    
    grid.innerHTML = treinamentos.map(t => {
        const isCompleted = userProgress?.treinamentos_concluidos?.includes(t.id);
        
        return `
            <div class="treinamento-card">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo || 'Sem título')}</h4>
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
    if (!grid) return;
    
    let testes = [...allTestes];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        testes = testes.filter(t => 
            (t.titulo && t.titulo.toLowerCase().includes(termo)) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (testes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
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
                    <h4>${escapeHtml(t.titulo || 'Sem título')}</h4>
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
    if (!grid) return;
    
    let videos = [...allVideos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        videos = videos.filter(v => 
            (v.titulo && v.titulo.toLowerCase().includes(termo)) ||
            (v.descricao && v.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (videos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
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
                    <h4>${escapeHtml(v.titulo || 'Sem título')}</h4>
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
    if (!usuarioAtual?.email || !db || !lojaId) {
        console.warn('Dados insuficientes para carregar progresso');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso');
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
    if (!usuarioAtual?.email || !db || !lojaId) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        await setDoc(doc(progressoSub, usuarioAtual.email), userProgress, { merge: true });
        
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

function atualizarJornada() {
    // Atualizar stats
    const totalPontosEl = document.getElementById('totalPontos');
    if (totalPontosEl) totalPontosEl.textContent = userProgress?.pontos_totais || 0;
    
    const totalTreinamentos = allTreinamentos.length;
    const treinamentosConcluidos = userProgress?.treinamentos_concluidos?.length || 0;
    const totalVideos = allVideos.length;
    const videosAssistidos = userProgress?.videos_assistidos?.length || 0;
    const totalTestes = allTestes.length;
    const testesAprovados = userProgress?.testes_resultados?.filter(tr => tr.aprovado)?.length || 0;
    
    const totalItens = totalTreinamentos + totalVideos + totalTestes;
    const totalConcluidos = treinamentosConcluidos + videosAssistidos + testesAprovados;
    const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    
    const totalConcluidosEl = document.getElementById('totalConcluidos');
    if (totalConcluidosEl) totalConcluidosEl.textContent = `${totalConcluidos}/${totalItens}`;
    
    const progressoPercentualEl = document.getElementById('progressoPercentual');
    if (progressoPercentualEl) progressoPercentualEl.textContent = `${percentual}%`;
    
    const progressoFillEl = document.getElementById('progressoFill');
    if (progressoFillEl) progressoFillEl.style.width = `${percentual}%`;
    
    // Definir nível
    let nivel = 'Iniciante';
    if (percentual >= 80) nivel = 'Expert';
    else if (percentual >= 60) nivel = 'Avançado';
    else if (percentual >= 30) nivel = 'Intermediário';
    
    const nivelAtualEl = document.getElementById('nivelAtual');
    if (nivelAtualEl) nivelAtualEl.textContent = nivel;
    
    // Renderizar timeline
    renderizarTimeline();
    
    // Renderizar conquistas
    renderizarConquistas();
}

function renderizarTimeline() {
    const timelineList = document.getElementById('timelineList');
    if (!timelineList) return;
    
    const todosItens = [
        ...allTreinamentos.map(t => ({ ...t, tipo: 'treinamento', pontos: t.pontos || 10 })),
        ...allVideos.map(v => ({ ...v, tipo: 'video', pontos: v.pontos || 5 })),
        ...allTestes.map(t => ({ ...t, tipo: 'teste', pontos: t.pontos_max || 100 }))
    ];
    
    todosItens.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    if (todosItens.length === 0) {
        timelineList.innerHTML = `
            <div class="empty-state">
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
                    <h4>${escapeHtml(item.titulo || 'Sem título')}</h4>
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
    if (!conquistasGrid) return;
    
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
    const concluirMensagem = document.getElementById('concluirMensagem');
    const concluirPontos = document.getElementById('concluirPontos');
    
    if (concluirMensagem) concluirMensagem.textContent = `Tem certeza que deseja marcar este ${tipo} como concluído?`;
    if (concluirPontos) concluirPontos.textContent = pontos;
    
    const concluirModal = document.getElementById('concluirModal');
    if (concluirModal) concluirModal.style.display = 'flex';
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
    
    const testeRealizarTitulo = document.getElementById('testeRealizarTitulo');
    if (testeRealizarTitulo) testeRealizarTitulo.textContent = teste.titulo;
    
    const container = document.getElementById('testeQuestoesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (teste.questoes && teste.questoes.length > 0) {
        teste.questoes.forEach((questao, idx) => {
            const questaoDiv = document.createElement('div');
            questaoDiv.className = 'questao-item';
            questaoDiv.innerHTML = `
                <div class="questao-header">
                    <span class="questao-numero">Questão ${idx + 1}</span>
                </div>
                <p style="margin-bottom: 12px; font-weight: 500;">${escapeHtml(questao.texto || 'Sem texto')}</p>
                <div class="alternativas-container">
                    ${(questao.alternativas || []).map((alt, altIdx) => `
                        <label class="alternativa-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input type="radio" name="questao_${idx}" value="${altIdx}">
                            <span>${escapeHtml(alt)}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            container.appendChild(questaoDiv);
        });
    } else {
        container.innerHTML = '<p>Este teste não possui questões configuradas.</p>';
    }
    
    const realizarTesteModal = document.getElementById('realizarTesteModal');
    if (realizarTesteModal) realizarTesteModal.style.display = 'flex';
}

async function enviarRespostasTeste() {
    if (!currentTesteToSubmit) return;
    
    let acertos = 0;
    const questoes = currentTesteToSubmit.questoes || [];
    
    for (let i = 0; i < questoes.length; i++) {
        const selected = document.querySelector(`input[name="questao_${i}"]:checked`);
        if (selected && parseInt(selected.value) === questoes[i].correta) {
            acertos++;
        }
    }
    
    const percentual = questoes.length > 0 ? (acertos / questoes.length) * 100 : 0;
    const pontuacao = Math.round((percentual / 100) * (currentTesteToSubmit.pontos_max || 100));
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
    
    const videoVerTitulo = document.getElementById('videoVerTitulo');
    const videoVerDescricao = document.getElementById('videoVerDescricao');
    
    if (videoVerTitulo) videoVerTitulo.textContent = video.titulo || 'Sem título';
    if (videoVerDescricao) videoVerDescricao.textContent = video.descricao || '';
    
    const videoUrl = video.url || '';
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
    
    const videoIframe = document.getElementById('videoIframe');
    if (videoIframe) videoIframe.src = embedUrl;
    
    const verVideoModal = document.getElementById('verVideoModal');
    if (verVideoModal) verVideoModal.style.display = 'flex';
    
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
    
    const videoIframe = document.getElementById('videoIframe');
    if (videoIframe) videoIframe.src = '';
    
    window.currentVideoWatching = null;
}

// Chat
async function iniciarChat() {
    if (!db || !lojaId) {
        console.warn('db ou lojaId não disponível para chat');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const chatRef = collection(db, colecaoNome, 'chat');
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
        }, (error) => {
            console.error('Erro no snapshot do chat:', error);
        });
        
    } catch (error) {
        console.error('Erro ao iniciar chat:', error);
    }
}

function renderizarMensagensChat(mensagens) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
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
        const initials = msg.nome ? msg.nome.substring(0, 2).toUpperCase() : (msg.email ? msg.email.substring(0, 2).toUpperCase() : '??');
        const time = msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        return `
            <div class="chat-message ${isCurrentUser ? 'current-user' : ''}">
                <div class="chat-message-avatar">
                    ${escapeHtml(initials)}
                </div>
                <div class="chat-message-content">
                    <div class="chat-message-name">${escapeHtml(msg.nome || msg.email || 'Anônimo')}</div>
                    <div class="chat-message-text">${escapeHtml(msg.mensagem || '')}</div>
                    <div class="chat-message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function enviarMensagemChat() {
    const input = document.getElementById('chatInput');
    const mensagem = input?.value.trim();
    
    if (!mensagem || !db || !lojaId || !usuarioAtual?.email) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const chatRef = collection(db, colecaoNome, 'chat');
        await addDoc(chatRef, {
            email: usuarioAtual.email,
            nome: usuarioAtual.nome || usuarioAtual.email.split('@')[0],
            mensagem: mensagem,
            timestamp: serverTimestamp(),
            loja_id: lojaId
        });
        
        if (input) input.value = '';
        
        // Atualizar badge
        const currentTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (currentTab !== 'chat') {
            const chatBadge = document.getElementById('chatBadge');
            if (chatBadge) chatBadge.style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        mostrarMensagem('Erro ao enviar mensagem', 'error');
    }
}

// Gestão
async function abrirGestao() {
    await carregarMembros();
    const gestaoModal = document.getElementById('gestaoModal');
    if (gestaoModal) gestaoModal.style.display = 'flex';
    
    // Configurar tabs da gestão
    document.querySelectorAll('.gestao-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.gestaoTab;
            document.querySelectorAll('.gestao-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.gestao-pane').forEach(p => p.classList.remove('active'));
            const targetPane = document.getElementById(`gestao-${tabId}`);
            if (targetPane) targetPane.classList.add('active');
            
            if (tabId === 'relatorios') {
                carregarRelatorios();
            }
        });
    });
}

async function carregarMembros() {
    if (!loginDb || !lojaId) {
        console.warn('loginDb ou lojaId não disponível');
        return;
    }
    
    try {
        const usuariosRef = collection(loginDb, 'usuarios');
        const lojaDoc = doc(usuariosRef, lojaId);
        
        let membros = [];
        
        try {
            const funcionariosSnapshot = await getDocs(collection(lojaDoc, 'funcionarios'));
            funcionariosSnapshot.forEach(doc => {
                const data = doc.data();
                membros.push({
                    email: doc.id,
                    nome: data.nome || doc.id.split('@')[0],
                    perfil: data.perfil || 'funcionario',
                    tipo: 'funcionario'
                });
            });
        } catch (e) {
            console.warn('Erro ao carregar funcionários:', e);
        }
        
        try {
            const clientesSnapshot = await getDocs(collection(lojaDoc, 'clientes'));
            clientesSnapshot.forEach(doc => {
                const data = doc.data();
                membros.push({
                    email: doc.id,
                    nome: data.nome || doc.id.split('@')[0],
                    perfil: 'cliente',
                    tipo: 'cliente'
                });
            });
        } catch (e) {
            console.warn('Erro ao carregar clientes:', e);
        }
        
        // Carregar progresso de cada membro
        if (db && lojaId) {
            const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
            const progressoRef = doc(db, colecaoNome, 'progresso');
            const progressoSub = collection(progressoRef, 'usuarios');
            
            const membrosComProgresso = await Promise.all(membros.map(async (membro) => {
                try {
                    const progressoDoc = await getDoc(doc(progressoSub, membro.email));
                    const progresso = progressoDoc.exists() ? progressoDoc.data() : { pontos_totais: 0 };
                    return { ...membro, progresso };
                } catch (e) {
                    return { ...membro, progresso: { pontos_totais: 0 } };
                }
            }));
            
            renderizarMembrosTabela(membrosComProgresso);
            
            // Popular select de relatórios
            const select = document.getElementById('relatorioMembroSelect');
            if (select) {
                select.innerHTML = '<option value="todos">Todos os Membros</option>' + 
                    membrosComProgresso.map(m => `<option value="${m.email}">${m.nome} (${m.perfil})</option>`).join('');
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
    }
}

function renderizarMembrosTabela(membros) {
    const tbody = document.getElementById('membrosTableBody');
    if (!tbody) return;
    
    const totalTreinamentos = allTreinamentos.length;
    const totalVideos = allVideos.length;
    const totalTestes = allTestes.length;
    const totalItens = totalTreinamentos + totalVideos + totalTestes;
    
    if (membros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Nenhum membro encontrado</td></tr>';
        return;
    }
    
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
                    <small>${escapeHtml(m.email)}</small>
                </td>
                <td>${escapeHtml(m.perfil)}</td>
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
    if (!db || !lojaId) return;
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const progressoRef = doc(db, colecaoNome, 'progresso');
        const progressoSub = collection(progressoRef, 'usuarios');
        const snapshot = await getDocs(progressoSub);
        
        let totalPontos = 0;
        let totalUsuarios = 0;
        
        const usuarios = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            totalPontos += data.pontos_totais || 0;
            totalUsuarios++;
            usuarios.push(data);
        });
        
        const mediaPontos = totalUsuarios > 0 ? Math.round(totalPontos / totalUsuarios) : 0;
        
        const relatorioResumo = document.getElementById('relatorioResumo');
        if (relatorioResumo) {
            relatorioResumo.innerHTML = `
                <p><strong>Total de Usuários:</strong> ${totalUsuarios}</p>
                <p><strong>Total de Pontos Acumulados:</strong> ${totalPontos}</p>
                <p><strong>Média de Pontos por Usuário:</strong> ${mediaPontos}</p>
                <p><strong>Total de Treinamentos:</strong> ${allTreinamentos.length}</p>
                <p><strong>Total de Vídeos:</strong> ${allVideos.length}</p>
                <p><strong>Total de Testes:</strong> ${allTestes.length}</p>
            `;
        }
        
        const relatorioAtividades = document.getElementById('relatorioAtividades');
        if (relatorioAtividades) {
            relatorioAtividades.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-chart-line"></i>
                    <span>Relatório detalhado em desenvolvimento</span>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
    }
}

// CRUD Treinamentos
window.editarTreinamento = async function(id) {
    const treinamento = allTreinamentos.find(t => t.id === id);
    if (!treinamento) return;
    
    const treinamentoModalTitle = document.getElementById('treinamentoModalTitle');
    const treinamentoId = document.getElementById('treinamentoId');
    const treinamentoTitulo = document.getElementById('treinamentoTitulo');
    const treinamentoDescricao = document.getElementById('treinamentoDescricao');
    const treinamentoConteudo = document.getElementById('treinamentoConteudo');
    const treinamentoPontos = document.getElementById('treinamentoPontos');
    const treinamentoCategoria = document.getElementById('treinamentoCategoria');
    const treinamentoOrdem = document.getElementById('treinamentoOrdem');
    
    if (treinamentoModalTitle) treinamentoModalTitle.textContent = 'Editar Treinamento';
    if (treinamentoId) treinamentoId.value = treinamento.id;
    if (treinamentoTitulo) treinamentoTitulo.value = treinamento.titulo || '';
    if (treinamentoDescricao) treinamentoDescricao.value = treinamento.descricao || '';
    if (treinamentoConteudo) treinamentoConteudo.value = treinamento.conteudo || '';
    if (treinamentoPontos) treinamentoPontos.value = treinamento.pontos || 10;
    if (treinamentoCategoria) treinamentoCategoria.value = treinamento.categoria || 'iniciante';
    if (treinamentoOrdem) treinamentoOrdem.value = treinamento.ordem || 0;
    
    const treinamentoModal = document.getElementById('treinamentoModal');
    if (treinamentoModal) treinamentoModal.style.display = 'flex';
}

async function salvarTreinamento(e) {
    e.preventDefault();
    
    const id = document.getElementById('treinamentoId')?.value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo')?.value || '',
        descricao: document.getElementById('treinamentoDescricao')?.value || '',
        conteudo: document.getElementById('treinamentoConteudo')?.value || '',
        pontos: parseInt(document.getElementById('treinamentoPontos')?.value) || 10,
        categoria: document.getElementById('treinamentoCategoria')?.value || 'iniciante',
        ordem: parseInt(document.getElementById('treinamentoOrdem')?.value) || 0,
        data_atualizacao: serverTimestamp()
    };
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
        const treinamentoForm = document.getElementById('treinamentoForm');
        if (treinamentoForm) treinamentoForm.reset();
        const treinamentoId = document.getElementById('treinamentoId');
        if (treinamentoId) treinamentoId.value = '';
        
        await carregarTreinamentos();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar treinamento:', error);
        mostrarMensagem('Erro ao salvar treinamento', 'error');
    }
}

window.excluirTreinamento = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
    
    const testeModalTitle = document.getElementById('testeModalTitle');
    const testeId = document.getElementById('testeId');
    const testeTitulo = document.getElementById('testeTitulo');
    const testeDescricao = document.getElementById('testeDescricao');
    const testePontosMax = document.getElementById('testePontosMax');
    const testePontosMin = document.getElementById('testePontosMin');
    
    if (testeModalTitle) testeModalTitle.textContent = 'Editar Teste';
    if (testeId) testeId.value = teste.id;
    if (testeTitulo) testeTitulo.value = teste.titulo || '';
    if (testeDescricao) testeDescricao.value = teste.descricao || '';
    if (testePontosMax) testePontosMax.value = teste.pontos_max || 100;
    if (testePontosMin) testePontosMin.value = teste.pontos_min || 70;
    
    // Carregar questões
    const container = document.getElementById('questoesContainer');
    if (container) {
        container.innerHTML = '';
        
        if (teste.questoes && teste.questoes.length > 0) {
            teste.questoes.forEach((questao, idx) => {
                adicionarQuestaoForm(questao, idx);
            });
        }
    }
    
    const testeModal = document.getElementById('testeModal');
    if (testeModal) testeModal.style.display = 'flex';
}

function adicionarQuestaoForm(questaoData = null, idx = null) {
    const container = document.getElementById('questoesContainer');
    if (!container) return;
    
    const template = document.querySelector('.questao-item.template');
    if (!template) return;
    
    const newQuestao = template.cloneNode(true);
    newQuestao.classList.remove('template');
    newQuestao.style.display = 'block';
    
    const questaoNumero = container.children.length + 1;
    const questaoNumeroSpan = newQuestao.querySelector('.questao-numero');
    if (questaoNumeroSpan) questaoNumeroSpan.textContent = `Questão ${questaoNumero}`;
    
    if (questaoData) {
        const questaoTexto = newQuestao.querySelector('.questao-texto');
        if (questaoTexto) questaoTexto.value = questaoData.texto || '';
        
        const alternativasContainer = newQuestao.querySelector('.alternativas-container');
        if (alternativasContainer) {
            alternativasContainer.innerHTML = '';
            
            if (questaoData.alternativas && questaoData.alternativas.length > 0) {
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
        }
    }
    
    container.appendChild(newQuestao);
}

async function salvarTeste(e) {
    e.preventDefault();
    
    const id = document.getElementById('testeId')?.value;
    const questoes = [];
    
    document.querySelectorAll('#questoesContainer .questao-item').forEach((questaoDiv, idx) => {
        const texto = questaoDiv.querySelector('.questao-texto')?.value || '';
        const alternativas = [];
        let correta = -1;
        
        questaoDiv.querySelectorAll('.alternativa-item').forEach((altDiv, altIdx) => {
            const textoAlt = altDiv.querySelector('.alternativa-texto')?.value || '';
            if (textoAlt.trim()) {
                alternativas.push(textoAlt);
                const corretaRadio = altDiv.querySelector('.alternativa-correta');
                if (corretaRadio && corretaRadio.checked) {
                    correta = altIdx;
                }
            }
        });
        
        if (texto.trim() && alternativas.length >= 2) {
            questoes.push({ texto, alternativas, correta });
        }
    });
    
    const dados = {
        titulo: document.getElementById('testeTitulo')?.value || '',
        descricao: document.getElementById('testeDescricao')?.value || '',
        pontos_max: parseInt(document.getElementById('testePontosMax')?.value) || 100,
        pontos_min: parseInt(document.getElementById('testePontosMin')?.value) || 70,
        questoes: questoes,
        data_atualizacao: serverTimestamp()
    };
    
    if (questoes.length === 0) {
        mostrarMensagem('Adicione pelo menos uma questão com alternativas!', 'error');
        return;
    }
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
        const testeForm = document.getElementById('testeForm');
        if (testeForm) testeForm.reset();
        const testeId = document.getElementById('testeId');
        if (testeId) testeId.value = '';
        const questoesContainer = document.getElementById('questoesContainer');
        if (questoesContainer) questoesContainer.innerHTML = '';
        
        await carregarTestes();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar teste:', error);
        mostrarMensagem('Erro ao salvar teste', 'error');
    }
}

window.excluirTeste = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este teste?')) return;
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
    
    const videoModalTitle = document.getElementById('videoModalTitle');
    const videoId = document.getElementById('videoId');
    const videoTitulo = document.getElementById('videoTitulo');
    const videoDescricao = document.getElementById('videoDescricao');
    const videoUrl = document.getElementById('videoUrl');
    const videoDuracao = document.getElementById('videoDuracao');
    const videoPontos = document.getElementById('videoPontos');
    const videoCategoria = document.getElementById('videoCategoria');
    
    if (videoModalTitle) videoModalTitle.textContent = 'Editar Vídeo';
    if (videoId) videoId.value = video.id;
    if (videoTitulo) videoTitulo.value = video.titulo || '';
    if (videoDescricao) videoDescricao.value = video.descricao || '';
    if (videoUrl) videoUrl.value = video.url || '';
    if (videoDuracao) videoDuracao.value = video.duracao || 0;
    if (videoPontos) videoPontos.value = video.pontos || 5;
    if (videoCategoria) videoCategoria.value = video.categoria || 'iniciante';
    
    const videoModal = document.getElementById('videoModal');
    if (videoModal) videoModal.style.display = 'flex';
}

async function salvarVideo(e) {
    e.preventDefault();
    
    const id = document.getElementById('videoId')?.value;
    const dados = {
        titulo: document.getElementById('videoTitulo')?.value || '',
        descricao: document.getElementById('videoDescricao')?.value || '',
        url: document.getElementById('videoUrl')?.value || '',
        duracao: parseInt(document.getElementById('videoDuracao')?.value) || 0,
        pontos: parseInt(document.getElementById('videoPontos')?.value) || 5,
        categoria: document.getElementById('videoCategoria')?.value || 'iniciante',
        data_atualizacao: serverTimestamp()
    };
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
        const videoForm = document.getElementById('videoForm');
        if (videoForm) videoForm.reset();
        const videoId = document.getElementById('videoId');
        if (videoId) videoId.value = '';
        
        await carregarVideos();
        await carregarProgresso();
        
    } catch (error) {
        console.error('Erro ao salvar vídeo:', error);
        mostrarMensagem('Erro ao salvar vídeo', 'error');
    }
}

window.excluirVideo = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    if (!db || !lojaId) {
        mostrarMensagem('Erro: Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaId.replace(/-/g, '_')}`;
        const aprimoramentoRef = collection(db, colecaoNome);
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
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function mostrarMensagem(mensagem, tipo = 'info') {
    // Criar elemento de mensagem temporário
    const toast = document.createElement('div');
    toast.className = `message-toast ${tipo}`;
    toast.innerHTML = `
        <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${mensagem}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#4CAF50' : tipo === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Exportar funções para window
window.fecharModal = fecharModal;
window.mostrarMensagem = mostrarMensagem;
window.adicionarQuestaoForm = adicionarQuestaoForm;
window.salvarTreinamento = salvarTreinamento;
window.salvarTeste = salvarTeste;
window.salvarVideo = salvarVideo;

console.log("✅ programas_aprimoramento.js carregado com sucesso!");
