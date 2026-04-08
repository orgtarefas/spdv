// ============================================
// programas_aprimoramento.js
// Programas de Aprimoramento - Versão Corrigida
// ============================================

console.log("📚 Inicializando Programas de Aprimoramento...");

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let lojaIdAtual = null;
let dadosUsuario = null;
let isGestor = false;
let allTreinamentos = [];
let allVideos = [];
let allTestes = [];
let userProgresso = null;
let db = null;
let loginDb = null;
let currentTeste = null;
let currentRespostas = {};

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Programas de Aprimoramento...');
    
    mostrarLoading('Carregando...');
    
    try {
        // Aguardar um pouco para o Firebase carregar
        await delay(1000);
        
        // 1. Identificar loja
        lojaIdAtual = obterLojaId();
        console.log(`📍 Loja: ${lojaIdAtual}`);
        
        // 2. Obter referências do Firebase
        if (window.db) {
            db = window.db;
            console.log('✅ db disponível via window.db');
        } else if (window.lojaServices && window.lojaServices.db) {
            db = window.lojaServices.db;
            console.log('✅ db disponível via lojaServices');
        }
        
        if (window.loginDb) {
            loginDb = window.loginDb;
            console.log('✅ loginDb disponível');
        }
        
        // 3. Capturar usuário logado
        await capturarUsuarioLogado();
        
        if (!dadosUsuario || !dadosUsuario.email) {
            console.error('❌ Usuário não logado');
            mostrarMensagem('Faça login para acessar', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        console.log(`👤 Usuário: ${dadosUsuario.email} (${dadosUsuario.perfil})`);
        
        // 4. Verificar se é gestor
        isGestor = ['admin', 'gerente', 'supervisor'].includes(dadosUsuario.perfil);
        console.log(`🔑 Gestor: ${isGestor ? 'SIM' : 'NÃO'}`);
        
        // 5. Verificar se programa está habilitado
        const habilitado = await verificarProgramaHabilitado();
        if (!habilitado) {
            mostrarMensagem('Programa de Aprimoramento não está habilitado para esta loja.', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // 6. Carregar dados (apenas se db disponível)
        if (db && lojaIdAtual) {
            await carregarTreinamentos();
            await carregarVideos();
            await carregarTestes();
            await carregarProgressoUsuario();
        } else {
            console.warn('⚠️ db não disponível, usando dados mock');
            mostrarMensagem('Banco de dados não disponível. Algumas funções podem não funcionar.', 'warning');
        }
        
        // 7. Configurar interface
        atualizarInterface();
        configurarEventos();
        
        // 8. Mostrar botões de gestão
        if (isGestor) {
            const btnTreinamento = document.getElementById('btnAdicionarTreinamento');
            const btnVideo = document.getElementById('btnAdicionarVideo');
            const btnTeste = document.getElementById('btnAdicionarTeste');
            if (btnTreinamento) btnTreinamento.style.display = 'flex';
            if (btnVideo) btnVideo.style.display = 'flex';
            if (btnTeste) btnTeste.style.display = 'flex';
        }
        
        esconderLoading();
        console.log('✅ Programas de Aprimoramento inicializado!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        esconderLoading();
        mostrarMensagem('Erro ao carregar: ' + error.message, 'error');
    }
});

// ============================================
// DELAY
// ============================================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// OBTER LOJA ID
// ============================================
function obterLojaId() {
    if (window.lojaIdAtual) return window.lojaIdAtual;
    if (window.lojaServices?.lojaId) return window.lojaServices.lojaId;
    
    const pathParts = window.location.pathname.split('/');
    const lojaIndex = pathParts.indexOf('loja');
    if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
        return pathParts[lojaIndex + 1];
    }
    return null;
}

// ============================================
// CAPTURAR USUÁRIO LOGADO
// ============================================
async function capturarUsuarioLogado() {
    // Tentar window.dadosUsuario
    if (window.dadosUsuario && window.dadosUsuario.email) {
        dadosUsuario = {
            email: window.dadosUsuario.email,
            nome: window.dadosUsuario.nome || window.dadosUsuario.email.split('@')[0],
            perfil: window.dadosUsuario.perfil || window.dadosUsuario.nivel || 'cliente'
        };
        console.log('✅ Usuário via window.dadosUsuario');
        return;
    }
    
    // Tentar sessionStorage
    const info = sessionStorage.getItem('usuarioInfo');
    if (info) {
        try {
            const dados = JSON.parse(info);
            dadosUsuario = {
                email: dados.email,
                nome: dados.nome || dados.email.split('@')[0],
                perfil: dados.perfil || 'cliente'
            };
            console.log('✅ Usuário via sessionStorage');
            return;
        } catch(e) {}
    }
    
    // Tentar Firebase Auth
    if (window.auth && window.auth.currentUser) {
        const user = window.auth.currentUser;
        dadosUsuario = {
            email: user.email,
            nome: user.displayName || user.email.split('@')[0],
            perfil: 'cliente'
        };
        console.log('✅ Usuário via Firebase Auth');
        return;
    }
    
    console.error('❌ Não foi possível capturar usuário');
}

// ============================================
// VERIFICAR SE PROGRAMA ESTÁ HABILITADO
// ============================================
async function verificarProgramaHabilitado() {
    if (!loginDb) {
        console.warn('⚠️ loginDb não disponível');
        return true;
    }
    
    try {
        const lojaDoc = await loginDb.collection('lojas').doc(lojaIdAtual).get();
        if (lojaDoc.exists) {
            const habilitado = lojaDoc.data().habilitar_programas_aprimoramento === true;
            console.log(`📚 Programa habilitado: ${habilitado}`);
            return habilitado;
        }
    } catch (error) {
        console.error('Erro ao verificar:', error);
    }
    
    return true;
}

// ============================================
// CARREGAR TREINAMENTOS
// ============================================
async function carregarTreinamentos() {
    if (!db || !lojaIdAtual) {
        console.warn('⚠️ db não disponível para carregar treinamentos');
        allTreinamentos = [];
        renderizarTreinamentos();
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        console.log(`📁 Buscando treinamentos em: ${colecaoNome}/treinamentos/itens`);
        
        const treinamentosRef = db.collection(colecaoNome).doc('treinamentos').collection('itens');
        const snapshot = await treinamentosRef.get();
        
        allTreinamentos = [];
        snapshot.forEach(doc => {
            allTreinamentos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📚 ${allTreinamentos.length} treinamentos carregados`);
        renderizarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao carregar treinamentos:', error);
        allTreinamentos = [];
        renderizarTreinamentos();
    }
}

// ============================================
// CARREGAR VÍDEOS
// ============================================
async function carregarVideos() {
    if (!db || !lojaIdAtual) {
        console.warn('⚠️ db não disponível para carregar vídeos');
        allVideos = [];
        renderizarVideos();
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        console.log(`📁 Buscando vídeos em: ${colecaoNome}/videos/itens`);
        
        const videosRef = db.collection(colecaoNome).doc('videos').collection('itens');
        const snapshot = await videosRef.get();
        
        allVideos = [];
        snapshot.forEach(doc => {
            allVideos.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`🎬 ${allVideos.length} vídeos carregados`);
        renderizarVideos();
        
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
        allVideos = [];
        renderizarVideos();
    }
}

// ============================================
// CARREGAR TESTES
// ============================================
async function carregarTestes() {
    if (!db || !lojaIdAtual) {
        console.warn('⚠️ db não disponível para carregar testes');
        allTestes = [];
        renderizarTestes();
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        console.log(`📁 Buscando testes em: ${colecaoNome}/testes/itens`);
        
        const testesRef = db.collection(colecaoNome).doc('testes').collection('itens');
        const snapshot = await testesRef.get();
        
        allTestes = [];
        snapshot.forEach(doc => {
            allTestes.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`📝 ${allTestes.length} testes carregados`);
        renderizarTestes();
        
    } catch (error) {
        console.error('Erro ao carregar testes:', error);
        allTestes = [];
        renderizarTestes();
    }
}

// ============================================
// CARREGAR PROGRESSO DO USUÁRIO
// ============================================
async function carregarProgressoUsuario() {
    if (!db || !lojaIdAtual || !dadosUsuario?.email) {
        console.warn('⚠️ Dados insuficientes para carregar progresso');
        userProgresso = { pontos_totais: 0, treinamentos_concluidos: [], videos_assistidos: [], testes_realizados: [] };
        atualizarStatsProgresso();
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = db.collection(colecaoNome).doc('progresso').collection('usuarios').doc(dadosUsuario.email);
        const docSnap = await progressoRef.get();
        
        if (docSnap.exists) {
            userProgresso = docSnap.data();
            console.log('✅ Progresso carregado:', userProgresso);
        } else {
            userProgresso = {
                email: dadosUsuario.email,
                nome: dadosUsuario.nome,
                perfil: dadosUsuario.perfil,
                pontos_totais: 0,
                treinamentos_concluidos: [],
                videos_assistidos: [],
                testes_realizados: [],
                data_inicio: new Date().toISOString()
            };
            await progressoRef.set(userProgresso);
            console.log('✅ Progresso inicial criado');
        }
        
        atualizarStatsProgresso();
        
    } catch (error) {
        console.error('Erro ao carregar progresso:', error);
        userProgresso = { pontos_totais: 0, treinamentos_concluidos: [], videos_assistidos: [], testes_realizados: [] };
        atualizarStatsProgresso();
    }
}

// ============================================
// RENDERIZAR TREINAMENTOS
// ============================================
function renderizarTreinamentos(filtro = '') {
    const container = document.getElementById('treinamentosGrid');
    if (!container) return;
    
    let treinamentos = [...allTreinamentos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        treinamentos = treinamentos.filter(t => 
            (t.titulo && t.titulo.toLowerCase().includes(termo)) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (treinamentos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p>Nenhum treinamento disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalTreinamento()">+ Criar Primeiro Treinamento</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = treinamentos.map(t => {
        const isConcluido = userProgresso?.treinamentos_concluidos?.includes(t.id);
        
        return `
            <div class="card-item">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="badge ${t.categoria || 'iniciante'}">${getCategoriaNome(t.categoria)}</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(t.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${t.pontos || 10} pontos
                    </div>
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarTreinamento('${t.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirTreinamento('${t.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isConcluido ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Concluído</button>` :
                            `<button class="btn-marcar" onclick="marcarTreinamentoConcluido('${t.id}', ${t.pontos || 10})">
                                <i class="fas fa-check-circle"></i> Marcar como Lido
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDERIZAR VÍDEOS
// ============================================
function renderizarVideos(filtro = '') {
    const container = document.getElementById('videosGrid');
    if (!container) return;
    
    let videos = [...allVideos];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        videos = videos.filter(v => 
            (v.titulo && v.titulo.toLowerCase().includes(termo)) ||
            (v.descricao && v.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <p>Nenhum vídeo disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalVideo()">+ Adicionar Vídeo</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = videos.map(v => {
        const isAssistido = userProgresso?.videos_assistidos?.includes(v.id);
        
        return `
            <div class="card-item">
                <div class="card-header">
                    <h4>${escapeHtml(v.titulo)}</h4>
                    <span class="badge ${v.categoria || 'iniciante'}">${getCategoriaNome(v.categoria)}</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(v.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${v.pontos || 5} pontos
                    </div>
                    ${v.duracao ? `<div class="card-duracao"><i class="fas fa-clock"></i> ${v.duracao} min</div>` : ''}
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarVideo('${v.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirVideo('${v.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isAssistido ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Assistido</button>` :
                            `<button class="btn-marcar" onclick="assistirVideo('${v.id}')">
                                <i class="fas fa-play"></i> Assistir
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDERIZAR TESTES
// ============================================
function renderizarTestes(filtro = '') {
    const container = document.getElementById('testesGrid');
    if (!container) return;
    
    let testes = [...allTestes];
    
    if (filtro) {
        const termo = filtro.toLowerCase();
        testes = testes.filter(t => 
            (t.titulo && t.titulo.toLowerCase().includes(termo)) ||
            (t.descricao && t.descricao.toLowerCase().includes(termo))
        );
    }
    
    if (testes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Nenhum teste disponível</p>
                ${isGestor ? '<button class="btn-adicionar-mini" onclick="abrirModalTeste()">+ Criar Teste</button>' : ''}
            </div>
        `;
        return;
    }
    
    container.innerHTML = testes.map(t => {
        const testeRealizado = userProgresso?.testes_realizados?.find(tr => tr.teste_id === t.id);
        const isAprovado = testeRealizado?.aprovado === true;
        const nota = testeRealizado?.pontuacao || 0;
        
        return `
            <div class="card-item">
                <div class="card-header">
                    <h4>${escapeHtml(t.titulo)}</h4>
                    <span class="badge">${t.questoes?.length || 0} questões</span>
                </div>
                <div class="card-body">
                    <p>${escapeHtml(t.descricao || 'Sem descrição')}</p>
                    <div class="card-pontos">
                        <i class="fas fa-star"></i> ${t.pontos_max || 100} pts máx
                    </div>
                    <div class="card-nota-minima">
                        <i class="fas fa-flag-checkered"></i> Mínimo: ${t.pontos_min || 70}%
                    </div>
                </div>
                <div class="card-footer">
                    ${isGestor ? `
                        <button class="btn-editar" onclick="editarTeste('${t.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-excluir" onclick="excluirTeste('${t.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    ` : `
                        ${isAprovado ? 
                            `<button class="btn-concluido" disabled><i class="fas fa-check"></i> Aprovado (${nota} pts)</button>` :
                            `<button class="btn-marcar" onclick="iniciarTeste('${t.id}')">
                                <i class="fas fa-play"></i> Iniciar Teste
                            </button>`
                        }
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// ATUALIZAR STATS
// ============================================
function atualizarStatsProgresso() {
    const totalPontos = userProgresso?.pontos_totais || 0;
    const totalTreinamentos = allTreinamentos.length;
    const treinamentosConcluidos = userProgresso?.treinamentos_concluidos?.length || 0;
    const percentual = totalTreinamentos > 0 ? Math.round((treinamentosConcluidos / totalTreinamentos) * 100) : 0;
    
    const totalPontosEl = document.getElementById('totalPontos');
    const totalConcluidosEl = document.getElementById('totalConcluidos');
    const progressoPercentualEl = document.getElementById('progressoPercentual');
    const progressoFillEl = document.getElementById('progressoFill');
    const nivelAtualEl = document.getElementById('nivelAtual');
    
    if (totalPontosEl) totalPontosEl.textContent = totalPontos;
    if (totalConcluidosEl) totalConcluidosEl.textContent = `${treinamentosConcluidos}/${totalTreinamentos}`;
    if (progressoPercentualEl) progressoPercentualEl.textContent = `${percentual}%`;
    if (progressoFillEl) progressoFillEl.style.width = `${percentual}%`;
    
    let nivel = 'Iniciante';
    if (percentual >= 80) nivel = 'Expert';
    else if (percentual >= 60) nivel = 'Avançado';
    else if (percentual >= 30) nivel = 'Intermediário';
    if (nivelAtualEl) nivelAtualEl.textContent = nivel;
}

// ============================================
// SALVAR PROGRESSO
// ============================================
async function salvarProgresso() {
    if (!db || !lojaIdAtual || !dadosUsuario?.email) {
        console.warn('⚠️ Não foi possível salvar progresso');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const progressoRef = db.collection(colecaoNome).doc('progresso').collection('usuarios').doc(dadosUsuario.email);
        await progressoRef.set(userProgresso);
        console.log('✅ Progresso salvo');
    } catch (error) {
        console.error('Erro ao salvar progresso:', error);
    }
}

// ============================================
// AÇÕES DO USUÁRIO
// ============================================
window.marcarTreinamentoConcluido = async function(id, pontos) {
    if (!userProgresso) return;
    
    if (userProgresso.treinamentos_concluidos.includes(id)) {
        mostrarMensagem('Este treinamento já foi concluído!', 'warning');
        return;
    }
    
    userProgresso.treinamentos_concluidos.push(id);
    userProgresso.pontos_totais += pontos;
    
    await salvarProgresso();
    renderizarTreinamentos();
    atualizarStatsProgresso();
    mostrarMensagem(`✅ Parabéns! Você ganhou ${pontos} pontos!`, 'success');
};

window.assistirVideo = function(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;
    
    const tituloEl = document.getElementById('videoVerTitulo');
    const descricaoEl = document.getElementById('videoVerDescricao');
    const iframe = document.getElementById('videoIframe');
    
    if (tituloEl) tituloEl.textContent = video.titulo;
    if (descricaoEl) descricaoEl.textContent = video.descricao || '';
    
    let videoUrl = video.url;
    let embedUrl = videoUrl;
    
    if (videoUrl.includes('youtube.com/watch?v=')) {
        embedUrl = videoUrl.replace('watch?v=', 'embed/');
    } else if (videoUrl.includes('youtu.be/')) {
        const idVideo = videoUrl.split('youtu.be/')[1].split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${idVideo}`;
    }
    
    if (iframe) iframe.src = embedUrl;
    
    document.getElementById('verVideoModal').style.display = 'flex';
    
    window.currentVideoId = id;
    window.currentVideoPontos = video.pontos || 5;
};

window.marcarVideoAssistido = async function() {
    if (!window.currentVideoId) return;
    
    if (userProgresso.videos_assistidos.includes(window.currentVideoId)) {
        mostrarMensagem('Este vídeo já foi assistido!', 'warning');
        return;
    }
    
    userProgresso.videos_assistidos.push(window.currentVideoId);
    userProgresso.pontos_totais += window.currentVideoPontos;
    
    await salvarProgresso();
    renderizarVideos();
    atualizarStatsProgresso();
    
    fecharModal('verVideoModal');
    const iframe = document.getElementById('videoIframe');
    if (iframe) iframe.src = '';
    window.currentVideoId = null;
    
    mostrarMensagem(`✅ Vídeo assistido! Você ganhou ${window.currentVideoPontos} pontos!`, 'success');
};

window.iniciarTeste = function(id) {
    const teste = allTestes.find(t => t.id === id);
    if (!teste) return;
    
    currentTeste = teste;
    currentRespostas = {};
    
    const tituloEl = document.getElementById('testeRealizarTitulo');
    const container = document.getElementById('testeQuestoesContainer');
    
    if (tituloEl) tituloEl.textContent = teste.titulo;
    
    if (container && teste.questoes) {
        container.innerHTML = teste.questoes.map((q, idx) => `
            <div class="questao-item">
                <div class="questao-header">
                    <span class="questao-numero">Questão ${idx + 1}</span>
                </div>
                <p class="questao-texto">${escapeHtml(q.texto)}</p>
                <div class="alternativas-container">
                    ${q.alternativas.map((alt, altIdx) => `
                        <label class="alternativa-item">
                            <input type="radio" name="questao_${idx}" value="${altIdx}" 
                                   onchange="marcarResposta(${idx}, ${altIdx})">
                            <span>${escapeHtml(alt)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('realizarTesteModal').style.display = 'flex';
};

window.marcarResposta = function(questaoIdx, respostaIdx) {
    currentRespostas[questaoIdx] = respostaIdx;
};

window.enviarRespostasTeste = async function() {
    if (!currentTeste) return;
    
    let acertos = 0;
    currentTeste.questoes.forEach((q, idx) => {
        if (currentRespostas[idx] === q.correta) acertos++;
    });
    
    const percentual = (acertos / currentTeste.questoes.length) * 100;
    const pontuacao = Math.round((percentual / 100) * (currentTeste.pontos_max || 100));
    const aprovado = percentual >= (currentTeste.pontos_min || 70);
    
    const testeRealizado = {
        teste_id: currentTeste.id,
        teste_titulo: currentTeste.titulo,
        data: new Date().toISOString(),
        acertos: acertos,
        total: currentTeste.questoes.length,
        percentual: percentual,
        pontuacao: pontuacao,
        aprovado: aprovado
    };
    
    const jaFez = userProgresso.testes_realizados?.find(tr => tr.teste_id === currentTeste.id);
    
    if (!jaFez) {
        if (!userProgresso.testes_realizados) userProgresso.testes_realizados = [];
        userProgresso.testes_realizados.push(testeRealizado);
        
        if (aprovado) {
            userProgresso.pontos_totais += pontuacao;
        }
        
        await salvarProgresso();
        renderizarTestes();
        atualizarStatsProgresso();
    }
    
    fecharModal('realizarTesteModal');
    currentTeste = null;
    currentRespostas = {};
    
    if (aprovado) {
        mostrarMensagem(`✅ Parabéns! Você acertou ${acertos}/${currentTeste.questoes.length} e ganhou ${pontuacao} pontos!`, 'success');
    } else {
        mostrarMensagem(`❌ Você acertou ${acertos}/${currentTeste.questoes.length}. Mínimo: ${currentTeste.pontos_min}%. Tente novamente!`, 'error');
    }
};

// ============================================
// CRUD TREINAMENTOS
// ============================================
window.abrirModalTreinamento = function(id = null) {
    if (id) {
        const treinamento = allTreinamentos.find(t => t.id === id);
        if (treinamento) {
            document.getElementById('treinamentoId').value = treinamento.id;
            document.getElementById('treinamentoTitulo').value = treinamento.titulo;
            document.getElementById('treinamentoDescricao').value = treinamento.descricao || '';
            document.getElementById('treinamentoConteudo').value = treinamento.conteudo || '';
            document.getElementById('treinamentoPontos').value = treinamento.pontos || 10;
            document.getElementById('treinamentoCategoria').value = treinamento.categoria || 'iniciante';
            document.getElementById('treinamentoModalTitle').textContent = 'Editar Treinamento';
        }
    } else {
        document.getElementById('treinamentoForm').reset();
        document.getElementById('treinamentoId').value = '';
        document.getElementById('treinamentoModalTitle').textContent = 'Novo Treinamento';
    }
    document.getElementById('treinamentoModal').style.display = 'flex';
};

window.salvarTreinamento = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('treinamentoId').value;
    const dados = {
        titulo: document.getElementById('treinamentoTitulo').value,
        descricao: document.getElementById('treinamentoDescricao').value,
        conteudo: document.getElementById('treinamentoConteudo').value,
        pontos: parseInt(document.getElementById('treinamentoPontos').value) || 10,
        categoria: document.getElementById('treinamentoCategoria').value,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = db.collection(colecaoNome).doc('treinamentos').collection('itens');
        
        if (id) {
            await treinamentosRef.doc(id).update(dados);
            mostrarMensagem('Treinamento atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await treinamentosRef.add(dados);
            mostrarMensagem('Treinamento criado!', 'success');
        }
        
        fecharModal('treinamentoModal');
        await carregarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar: ' + error.message, 'error');
    }
};

window.excluirTreinamento = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) return;
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const treinamentosRef = db.collection(colecaoNome).doc('treinamentos').collection('itens');
        await treinamentosRef.doc(id).delete();
        
        mostrarMensagem('Treinamento excluído!', 'success');
        await carregarTreinamentos();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// CRUD VÍDEOS
// ============================================
window.abrirModalVideo = function(id = null) {
    if (id) {
        const video = allVideos.find(v => v.id === id);
        if (video) {
            document.getElementById('videoId').value = video.id;
            document.getElementById('videoTitulo').value = video.titulo;
            document.getElementById('videoDescricao').value = video.descricao || '';
            document.getElementById('videoUrl').value = video.url || '';
            document.getElementById('videoDuracao').value = video.duracao || 0;
            document.getElementById('videoPontos').value = video.pontos || 5;
            document.getElementById('videoCategoria').value = video.categoria || 'iniciante';
            document.getElementById('videoModalTitle').textContent = 'Editar Vídeo';
        }
    } else {
        document.getElementById('videoForm').reset();
        document.getElementById('videoId').value = '';
        document.getElementById('videoModalTitle').textContent = 'Novo Vídeo';
    }
    document.getElementById('videoModal').style.display = 'flex';
};

window.salvarVideo = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('videoId').value;
    const dados = {
        titulo: document.getElementById('videoTitulo').value,
        descricao: document.getElementById('videoDescricao').value,
        url: document.getElementById('videoUrl').value,
        duracao: parseInt(document.getElementById('videoDuracao').value) || 0,
        pontos: parseInt(document.getElementById('videoPontos').value) || 5,
        categoria: document.getElementById('videoCategoria').value,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!dados.titulo) {
        mostrarMensagem('Título é obrigatório', 'warning');
        return;
    }
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = db.collection(colecaoNome).doc('videos').collection('itens');
        
        if (id) {
            await videosRef.doc(id).update(dados);
            mostrarMensagem('Vídeo atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await videosRef.add(dados);
            mostrarMensagem('Vídeo criado!', 'success');
        }
        
        fecharModal('videoModal');
        await carregarVideos();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar: ' + error.message, 'error');
    }
};

window.excluirVideo = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const videosRef = db.collection(colecaoNome).doc('videos').collection('itens');
        await videosRef.doc(id).delete();
        
        mostrarMensagem('Vídeo excluído!', 'success');
        await carregarVideos();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// CRUD TESTES
// ============================================
window.abrirModalTeste = function(id = null) {
    if (id) {
        const teste = allTestes.find(t => t.id === id);
        if (teste) {
            document.getElementById('testeId').value = teste.id;
            document.getElementById('testeTitulo').value = teste.titulo;
            document.getElementById('testeDescricao').value = teste.descricao || '';
            document.getElementById('testePontosMax').value = teste.pontos_max || 100;
            document.getElementById('testePontosMin').value = teste.pontos_min || 70;
            document.getElementById('testeModalTitle').textContent = 'Editar Teste';
            
            const container = document.getElementById('questoesContainer');
            container.innerHTML = '';
            if (teste.questoes) {
                teste.questoes.forEach((q, idx) => adicionarQuestaoForm(q, idx));
            }
        }
    } else {
        document.getElementById('testeForm').reset();
        document.getElementById('testeId').value = '';
        document.getElementById('testeModalTitle').textContent = 'Novo Teste';
        document.getElementById('questoesContainer').innerHTML = '';
        adicionarQuestaoForm();
        adicionarQuestaoForm();
    }
    document.getElementById('testeModal').style.display = 'flex';
};

function adicionarQuestaoForm(questaoData = null, idx = null) {
    const container = document.getElementById('questoesContainer');
    const questaoDiv = document.createElement('div');
    questaoDiv.className = 'questao-item';
    const questaoNumero = container.children.length + 1;
    
    let alternativasHtml = '';
    if (questaoData) {
        for (let i = 0; i < questaoData.alternativas.length; i++) {
            const letra = String.fromCharCode(65 + i);
            alternativasHtml += `
                <div class="alternativa-item">
                    <input type="radio" name="alternativa_correta" class="alternativa-correta" value="${i}" ${questaoData.correta === i ? 'checked' : ''}>
                    <input type="text" class="alternativa-texto" placeholder="Alternativa ${letra}" value="${escapeHtml(questaoData.alternativas[i])}">
                    <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
                </div>
            `;
        }
    } else {
        alternativasHtml = `
            <div class="alternativa-item">
                <input type="radio" name="alternativa_correta" class="alternativa-correta" value="0">
                <input type="text" class="alternativa-texto" placeholder="Alternativa A">
                <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
            </div>
            <div class="alternativa-item">
                <input type="radio" name="alternativa_correta" class="alternativa-correta" value="1">
                <input type="text" class="alternativa-texto" placeholder="Alternativa B">
                <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
            </div>
        `;
    }
    
    questaoDiv.innerHTML = `
        <div class="questao-header">
            <span class="questao-numero">Questão ${questaoNumero}</span>
            <button type="button" class="btn-remover-questao" onclick="this.closest('.questao-item').remove()">&times;</button>
        </div>
        <input type="text" class="questao-texto" placeholder="Enunciado da questão" value="${questaoData ? escapeHtml(questaoData.texto) : ''}">
        <div class="alternativas-container">
            ${alternativasHtml}
        </div>
        <button type="button" class="btn-add-alternativa" onclick="adicionarAlternativa(this)">+ Adicionar Alternativa</button>
    `;
    
    container.appendChild(questaoDiv);
}

function adicionarAlternativa(btn) {
    const alternativasContainer = btn.closest('.questao-item').querySelector('.alternativas-container');
    const numAlternativas = alternativasContainer.children.length;
    const letra = String.fromCharCode(65 + numAlternativas);
    
    const altDiv = document.createElement('div');
    altDiv.className = 'alternativa-item';
    altDiv.innerHTML = `
        <input type="radio" name="alternativa_correta" class="alternativa-correta" value="${numAlternativas}">
        <input type="text" class="alternativa-texto" placeholder="Alternativa ${letra}">
        <button type="button" class="btn-remover-alternativa" onclick="this.parentElement.remove()">&times;</button>
    `;
    alternativasContainer.appendChild(altDiv);
}

window.salvarTeste = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('testeId').value;
    const questoes = [];
    
    document.querySelectorAll('#questoesContainer .questao-item').forEach((questaoDiv) => {
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
        
        if (texto.trim() && alternativas.length >= 2 && correta !== -1) {
            questoes.push({ texto, alternativas, correta });
        }
    });
    
    if (questoes.length === 0) {
        mostrarMensagem('Adicione pelo menos uma questão válida!', 'warning');
        return;
    }
    
    const dados = {
        titulo: document.getElementById('testeTitulo').value,
        descricao: document.getElementById('testeDescricao').value,
        pontos_max: parseInt(document.getElementById('testePontosMax').value) || 100,
        pontos_min: parseInt(document.getElementById('testePontosMin').value) || 70,
        questoes: questoes,
        data_atualizacao: new Date().toISOString()
    };
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = db.collection(colecaoNome).doc('testes').collection('itens');
        
        if (id) {
            await testesRef.doc(id).update(dados);
            mostrarMensagem('Teste atualizado!', 'success');
        } else {
            dados.data_criacao = new Date().toISOString();
            await testesRef.add(dados);
            mostrarMensagem('Teste criado!', 'success');
        }
        
        fecharModal('testeModal');
        await carregarTestes();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        mostrarMensagem('Erro ao salvar: ' + error.message, 'error');
    }
};

window.excluirTeste = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este teste?')) return;
    
    if (!db || !lojaIdAtual) {
        mostrarMensagem('Banco de dados não disponível', 'error');
        return;
    }
    
    try {
        const colecaoNome = `aprimoramento_${lojaIdAtual.replace(/-/g, '_')}`;
        const testesRef = db.collection(colecaoNome).doc('testes').collection('itens');
        await testesRef.doc(id).delete();
        
        mostrarMensagem('Teste excluído!', 'success');
        await carregarTestes();
        
    } catch (error) {
        console.error('Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// ATUALIZAR INTERFACE
// ============================================
function atualizarInterface() {
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && dadosUsuario) {
        userNameDisplay.textContent = dadosUsuario.nome || dadosUsuario.email.split('@')[0];
    }
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetPane = document.getElementById(`tab-${tab}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });
    
    // Buscas
    const searchTreinamento = document.getElementById('searchTreinamento');
    if (searchTreinamento) {
        searchTreinamento.addEventListener('input', (e) => {
            renderizarTreinamentos(e.target.value);
        });
    }
    
    const searchVideo = document.getElementById('searchVideo');
    if (searchVideo) {
        searchVideo.addEventListener('input', (e) => {
            renderizarVideos(e.target.value);
        });
    }
    
    const searchTeste = document.getElementById('searchTeste');
    if (searchTeste) {
        searchTeste.addEventListener('input', (e) => {
            renderizarTestes(e.target.value);
        });
    }
    
    // Botões de adicionar
    const btnAdicionarTreinamento = document.getElementById('btnAdicionarTreinamento');
    const btnAdicionarVideo = document.getElementById('btnAdicionarVideo');
    const btnAdicionarTeste = document.getElementById('btnAdicionarTeste');
    
    if (btnAdicionarTreinamento) btnAdicionarTreinamento.addEventListener('click', () => abrirModalTreinamento());
    if (btnAdicionarVideo) btnAdicionarVideo.addEventListener('click', () => abrirModalVideo());
    if (btnAdicionarTeste) btnAdicionarTeste.addEventListener('click', () => abrirModalTeste());
    
    // Formulários
    const treinamentoForm = document.getElementById('treinamentoForm');
    const videoForm = document.getElementById('videoForm');
    const testeForm = document.getElementById('testeForm');
    const btnAddQuestao = document.getElementById('btnAddQuestao');
    const btnEnviarRespostas = document.getElementById('btnEnviarRespostas');
    const btnMarcarAssistido = document.getElementById('btnMarcarAssistido');
    
    if (treinamentoForm) treinamentoForm.addEventListener('submit', salvarTreinamento);
    if (videoForm) videoForm.addEventListener('submit', salvarVideo);
    if (testeForm) testeForm.addEventListener('submit', salvarTeste);
    if (btnAddQuestao) btnAddQuestao.addEventListener('click', () => adicionarQuestaoForm());
    if (btnEnviarRespostas) btnEnviarRespostas.addEventListener('click', enviarRespostasTeste);
    if (btnMarcarAssistido) btnMarcarAssistido.addEventListener('click', marcarVideoAssistido);
}

// ============================================
// UTILITÁRIOS
// ============================================
function getCategoriaNome(categoria) {
    const categorias = {
        'iniciante': 'Iniciante',
        'intermediario': 'Intermediário',
        'avancado': 'Avançado'
    };
    return categorias[categoria] || 'Iniciante';
}

function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'flex';
        const msg = loading.querySelector('#loadingMessage');
        if (msg) msg.textContent = mensagem;
    }
}

function esconderLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.style.display = 'none';
}

function mostrarMensagem(texto, tipo = 'info') {
    console.log(`[${tipo}] ${texto}`);
    
    const alert = document.getElementById('messageAlert');
    if (alert) {
        alert.className = `message-alert ${tipo}`;
        const textEl = alert.querySelector('.message-text');
        if (textEl) textEl.textContent = texto;
        alert.style.display = 'flex';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Adicionar estilos se não existirem
if (!document.querySelector('#aprimoramentoStyles')) {
    const style = document.createElement('style');
    style.id = 'aprimoramentoStyles';
    style.textContent = `
        .stats-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card i {
            font-size: 28px;
            color: #667eea;
        }
        .stat-info {
            display: flex;
            flex-direction: column;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
        }
        .progresso-geral {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .progress-bar {
            background: #e0e0e0;
            border-radius: 10px;
            height: 10px;
            overflow: hidden;
        }
        .progress-fill {
            background: #667eea;
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        .aprimoramento-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .tab-btn {
            background: white;
            border: none;
            padding: 12px 24px;
            border-radius: 40px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
            color: #666;
        }
        .tab-btn.active {
            background: #667eea;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .tab-pane {
            display: none;
        }
        .tab-pane.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .treinamentos-header, .videos-header, .testes-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .search-box {
            display: flex;
            align-items: center;
            background: #f5f5f5;
            border-radius: 8px;
            padding: 8px 12px;
            flex: 1;
            max-width: 300px;
        }
        .search-box i {
            color: #999;
            margin-right: 8px;
        }
        .search-box input {
            border: none;
            background: none;
            outline: none;
            width: 100%;
        }
        .btn-adicionar {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-adicionar-mini {
            margin-top: 15px;
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
        }
        .card-item {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .card-header h4 {
            margin: 0;
            color: #333;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
        }
        .badge.iniciante { background: #e8f5e9; color: #2e7d32; }
        .badge.intermediario { background: #fff3e0; color: #ef6c00; }
        .badge.avancado { background: #fce4ec; color: #c62828; }
        .card-body p {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
        }
        .card-pontos, .card-duracao, .card-nota-minima {
            font-size: 12px;
            color: #888;
            margin-top: 8px;
        }
        .card-footer {
            margin-top: 12px;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }
        .btn-editar, .btn-excluir, .btn-marcar, .btn-concluido {
            padding: 6px 12px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-editar { background: #2196F3; color: white; }
        .btn-excluir { background: #f44336; color: white; }
        .btn-marcar { background: #4CAF50; color: white; }
        .btn-concluido { background: #9e9e9e; color: white; cursor: default; }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        .empty-state i {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .modal-aprimoramento {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-lg {
            max-width: 800px;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body {
            padding: 20px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
        }
        .form-group input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
        }
        .btn-cancelar {
            background: #f5f5f5;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .btn-salvar {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .btn-add-questao {
            background: #2196F3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 16px;
        }
        .questao-item {
            background: #f9f9f9;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
        }
        .questao-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
        }
        .btn-remover-questao {
            background: none;
            border: none;
            color: #f44336;
            cursor: pointer;
            font-size: 18px;
        }
        .alternativas-container {
            margin: 12px 0;
        }
        .alternativa-item {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .alternativa-texto {
            flex: 1;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .btn-remover-alternativa {
            background: none;
            border: none;
            color: #f44336;
            cursor: pointer;
        }
        .btn-add-alternativa {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-enviar-respostas {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .btn-marcar-assistido {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
        }
        .video-player {
            margin-bottom: 16px;
        }
        .loading-spinner {
            text-align: center;
            padding: 40px;
        }
        .loading-spinner i {
            font-size: 32px;
            color: #667eea;
        }
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }
        .loading-content {
            background: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
        }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .message-alert {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 12px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 2000;
        }
        .message-alert.success { background: #4CAF50; color: white; }
        .message-alert.error { background: #f44336; color: white; }
        .message-alert.warning { background: #ff9800; color: white; }
        .message-alert.info { background: #2196F3; color: white; }
        .message-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
}

// Exportar funções globais
window.fecharModal = fecharModal;
window.mostrarMensagem = mostrarMensagem;
window.adicionarAlternativa = adicionarAlternativa;

console.log("✅ programas_aprimoramento.js carregado com sucesso!");
