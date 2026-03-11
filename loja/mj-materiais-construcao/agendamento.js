// agendamento.js - Sistema Completo de Gestão de Agendamentos
console.log("📅 Inicializando sistema de agendamentos...");

// ============================================
// IMPORTAÇÕES
// ============================================
import { 
    db, 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ============================================
const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E📅%3C/text%3E%3C/svg%3E";

let lojaIdAtual = null;
let dadosUsuario = null;
let usuarioLogado = false;
let agendamentosAtivos = [];
let agendamentosFuturos = [];
let agendamentosHistorico = [];
let unsubscribeAgendamentos = null;
let unsubscribeFuturos = null;
let intervaloPausa = null;

// Variáveis para gerenciar agendamentos
let diasExcepcionais = [];
let todosAgendamentos = [];
let paginaAtual = 1;
const itensPorPagina = 10;
let servicosConfig = {};

// Configurações da loja
let configLoja = {
    horarioFuncionamento: {},
    maxClientesDia: 30,
    maxSimultaneos: 3,
    validacaoAutomatica: true,
    notificacoesAtivas: true,
    mensagemNotificacao: "Olá {cliente}, sua senha {senha} está como PRÓXIMO A ATENDER. Por favor, dirija-se ao estabelecimento."
};

// ============================================
// OBTER LOJA ID DA URL
// ============================================
function obterLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`📍 Loja ID: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (window.lojaServices && window.lojaServices.lojaId) {
        lojaIdAtual = window.lojaServices.lojaId;
        console.log(`📍 Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.error('❌ Não foi possível identificar a loja');
    return null;
}

// ============================================
// VERIFICAR PERMISSÃO DE ACESSO NO BANCO
// ============================================
async function verificarPermissaoAcesso() {
    console.log("🔒 Verificando permissão de acesso no banco de dados...");
    
    try {
        // Verificar se está logado no Firebase Auth
        if (!window.auth || !window.auth.currentUser) {
            console.log("❌ Usuário não está logado no Firebase Auth");
            return false;
        }
        
        const user = window.auth.currentUser;
        const email = user.email;
        
        if (!lojaIdAtual || !email) {
            console.log("❌ Loja ou email não identificado");
            return false;
        }
        
        console.log(`🔍 Verificando permissão para ${email} na loja ${lojaIdAtual}`);
        
        // 🔥 VERIFICAR SE É ADMIN GLOBAL (coleção admin)
        const adminDoc = await window.loginDb
            .collection('usuarios')
            .doc('admin')
            .get();
        
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            if (adminData[email]) {
                console.log("✅ Usuário é ADMIN global - acesso permitido");
                
                // Salvar dados do usuário
                dadosUsuario = {
                    email: email,
                    nome: adminData[email].nome || 'Admin',
                    tipo: 'admin',
                    perfil: 'admin',
                    uid: user.uid
                };
                usuarioLogado = true;
                
                return true;
            }
        }
        
        // 🔥 VERIFICAR SE É FUNCIONÁRIO DA LOJA
        const funcDoc = await window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('funcionarios')
            .doc(email)
            .get();
        
        if (funcDoc.exists) {
            const funcData = funcDoc.data();
            
            if (funcData.ativo === false) {
                console.log("❌ Funcionário inativo");
                return false;
            }
            
            console.log(`✅ Funcionário ${funcData.perfil} - acesso permitido`);
            
            // Salvar dados do usuário
            dadosUsuario = {
                email: email,
                nome: funcData.nome,
                tipo: 'funcionario',
                perfil: funcData.perfil,
                uid: user.uid
            };
            usuarioLogado = true;
            
            return true;
        }
        
        // 🔥 VERIFICAR SE É CLIENTE (NEGAR ACESSO)
        const clienteDoc = await window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes')
            .doc(email)
            .get();
        
        if (clienteDoc.exists) {
            console.log("❌ Cliente não tem permissão para acessar");
            return false;
        }
        
        console.log("❌ Usuário não encontrado em nenhuma categoria");
        return false;
        
    } catch (error) {
        console.error("❌ Erro ao verificar permissão:", error);
        return false;
    }
}

// ============================================
// REDIRECIONAR PARA PÁGINA DE CLIENTES
// ============================================
function redirecionarParaClientes() {
    console.log("🔄 Redirecionando para página de clientes...");
    window.location.href = 'index.html';
}

// ============================================
// VERIFICAÇÃO BLOQUEANTE - EXECUTA IMEDIATAMENTE
// ============================================
(async function() {
    console.log("🔒 Verificação bloqueante de acesso ao agendamento...");
    
    // MOSTRAR LOADING IMEDIATAMENTE
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'flex';
        const h3 = loading.querySelector('h3');
        if (h3) h3.textContent = 'Verificando permissões...';
    }
    
    try {
        // Obter loja ID
        lojaIdAtual = obterLojaIdDaURL();
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // AGUARDAR FIREBASE AUTH INICIALIZAR (até 5 segundos)
        let tentativas = 0;
        const maxTentativas = 10;
        
        while (tentativas < maxTentativas) {
            if (window.auth && window.auth.currentUser) {
                console.log('✅ Firebase Auth inicializado:', window.auth.currentUser.email);
                break;
            }
            console.log(`⏳ Aguardando Firebase Auth... tentativa ${tentativas + 1}/${maxTentativas}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            tentativas++;
        }
        
        // Verificar se conseguiu obter o usuário
        if (!window.auth || !window.auth.currentUser) {
            console.log('❌ Firebase Auth não inicializado após timeout');
            mostrarMensagem('Faça login para acessar esta página', 'warning');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            return;
        }
        
        // Verificar permissão no banco
        const acessoPermitido = await verificarPermissaoAcesso();
        
        if (!acessoPermitido) {
            console.log("🚫 Acesso negado - Redirecionando...");
            mostrarMensagem('Acesso restrito a funcionários', 'error', 3000);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // ✅ ACESSO PERMITIDO
        console.log("✅ Acesso permitido, carregando sistema...");
        console.log("👤 Usuário:", dadosUsuario);
        
        // Atualizar nome na interface
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            let tipoDisplay = '';
            if (dadosUsuario.tipo === 'admin') {
                tipoDisplay = ' (Admin)';
            } else if (dadosUsuario.tipo === 'funcionario') {
                const perfilFormatado = dadosUsuario.perfil.charAt(0).toUpperCase() + dadosUsuario.perfil.slice(1);
                tipoDisplay = ` (${perfilFormatado})`;
            }
            userNameElement.textContent = (dadosUsuario.nome || 'Usuário') + tipoDisplay;
        }
        
        // Configurar favicon e logo
        configurarFavicon();
        carregarLogoLoja();
        
        // Carregar configurações
        await carregarConfiguracoesLoja();
        await carregarHorariosFuncionamento();
        
        // Configurar eventos
        configurarEventos();
        
        // Iniciar escuta de agendamentos
        iniciarEscutaAgendamentos();
        
        // Esconder loading
        if (loading) {
            loading.style.display = 'none';
        }
        
        console.log("✅ Sistema de agendamentos pronto!");
        
    } catch (error) {
        console.error("❌ Erro na verificação:", error);
        mostrarMensagem('Erro ao carregar sistema', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
})();

// ============================================
// CARREGAR DIAS EXCEPCIONAIS DO FIREBASE
// ============================================
async function carregarDiasExcepcionais() {
    try {
        const excecoesRef = doc(
            db,
            'configuracoes',
            lojaIdAtual,
            'servico_agendamento',
            'excecoes'
        );
        
        const excecoesDoc = await getDoc(excecoesRef);
        
        if (excecoesDoc.exists()) {
            diasExcepcionais = excecoesDoc.data().dias || [];
        } else {
            diasExcepcionais = [];
        }
        
        renderizarListaExcecoes();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dias excepcionais:', error);
        diasExcepcionais = [];
    }
}

// ============================================
// RENDERIZAR LISTA DE EXCEÇÕES
// ============================================
function renderizarListaExcecoes() {
    const lista = document.getElementById('excepcionaisLista');
    if (!lista) return;
    
    if (diasExcepcionais.length === 0) {
        lista.innerHTML = `
            <div class="empty-state-pequeno">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhum dia excepcional configurado</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por data
    diasExcepcionais.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let html = '';
    diasExcepcionais.forEach((exc, index) => {
        const dataObj = new Date(exc.data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        
        let motivoTexto = '';
        switch(exc.motivo) {
            case 'feriado': motivoTexto = 'Feriado'; break;
            case 'abertura_especial': motivoTexto = 'Abertura Especial'; break;
            case 'evento': motivoTexto = 'Evento'; break;
            default: motivoTexto = 'Outro';
        }
        
        html += `
            <div class="excecao-item-pequeno" data-index="${index}">
                <div class="excecao-info-pequeno">
                    <span class="excecao-data-pequena">${dataFormatada}</span>
                    <span class="excecao-motivo-pequeno">${motivoTexto}</span>
                </div>
                <div class="excecao-acoes-pequeno">
                    <button class="btn-editar-excecao-pequeno" onclick="editarExcecao(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-excluir-excecao-pequeno" onclick="excluirExcecao(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    lista.innerHTML = html;
}

// ============================================
// ABRIR FORMULÁRIO DE EXCEÇÃO
// ============================================
function abrirFormExcecao(editando = false) {
    const form = document.getElementById('excepcionalForm');
    const lista = document.getElementById('excepcionaisLista');
    
    if (form) {
        form.style.display = 'block';
    }
    
    if (lista) {
        lista.style.maxHeight = '100px';
    }
    
    if (!editando) {
        // Limpar formulário para nova exceção
        document.getElementById('excepcionalData').value = '';
        document.getElementById('excepcionalMotivo').value = 'feriado';
        document.getElementById('excepcionalDescricao').value = '';
        document.getElementById('excepcionalAtivo').checked = true;
        document.getElementById('excepcionalInicio').value = '08:00';
        document.getElementById('excepcionalFim').value = '18:00';
        document.getElementById('excepcionalDuracao').value = '30';
        document.getElementById('excepcionalIntervalo').value = '0';
        document.getElementById('excepcionalIntervaloInicio').value = '12:00';
        document.getElementById('excepcionalIntervaloFim').value = '13:00';
        document.getElementById('excepcionalId').value = '';
    }
}

// ============================================
// FECHAR FORMULÁRIO DE EXCEÇÃO
// ============================================
function fecharFormExcecao() {
    const form = document.getElementById('excepcionalForm');
    const lista = document.getElementById('excepcionaisLista');
    
    if (form) {
        form.style.display = 'none';
    }
    
    if (lista) {
        lista.style.maxHeight = '150px';
    }
}

// ============================================
// SALVAR EXCEÇÃO
// ============================================
async function salvarExcecao() {
    try {
        const data = document.getElementById('excepcionalData').value;
        const motivo = document.getElementById('excepcionalMotivo').value;
        const descricao = document.getElementById('excepcionalDescricao').value;
        const ativo = document.getElementById('excepcionalAtivo').checked;
        const inicio = document.getElementById('excepcionalInicio').value;
        const fim = document.getElementById('excepcionalFim').value;
        const duracao = parseInt(document.getElementById('excepcionalDuracao').value);
        const intervalo = parseInt(document.getElementById('excepcionalIntervalo').value);
        const intervaloInicio = document.getElementById('excepcionalIntervaloInicio').value;
        const intervaloFim = document.getElementById('excepcionalIntervaloFim').value;
        const excecaoId = document.getElementById('excepcionalId').value;
        
        if (!data) {
            mostrarMensagem('Selecione uma data', 'warning');
            return;
        }
        
        const novaExcecao = {
            data,
            motivo,
            descricao,
            ativo,
            inicio,
            fim,
            duracao,
            intervalo,
            intervaloInicio,
            intervaloFim
        };
        
        if (excecaoId) {
            // Editar existente
            diasExcepcionais[parseInt(excecaoId)] = novaExcecao;
        } else {
            // Adicionar novo
            diasExcepcionais.push(novaExcecao);
        }
        
        // Salvar no Firebase
        const excecoesRef = doc(
            db,
            'configuracoes',
            lojaIdAtual,
            'servico_agendamento',
            'excecoes'
        );
        
        await setDoc(excecoesRef, { dias: diasExcepcionais }, { merge: true });
        
        renderizarListaExcecoes();
        fecharFormExcecao();
        mostrarMensagem('Dia excepcional salvo com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar exceção:', error);
        mostrarMensagem('Erro ao salvar', 'error');
    }
}

// ============================================
// EDITAR EXCEÇÃO
// ============================================
window.editarExcecao = function(index) {
    const excecao = diasExcepcionais[index];
    if (!excecao) return;
    
    document.getElementById('excepcionalData').value = excecao.data;
    document.getElementById('excepcionalMotivo').value = excecao.motivo || 'feriado';
    document.getElementById('excepcionalDescricao').value = excecao.descricao || '';
    document.getElementById('excepcionalAtivo').checked = excecao.ativo !== false;
    document.getElementById('excepcionalInicio').value = excecao.inicio || '08:00';
    document.getElementById('excepcionalFim').value = excecao.fim || '18:00';
    document.getElementById('excepcionalDuracao').value = excecao.duracao || 30;
    document.getElementById('excepcionalIntervalo').value = excecao.intervalo || 0;
    document.getElementById('excepcionalIntervaloInicio').value = excecao.intervaloInicio || '12:00';
    document.getElementById('excepcionalIntervaloFim').value = excecao.intervaloFim || '13:00';
    document.getElementById('excepcionalId').value = index;
    
    abrirFormExcecao(true);
};

// ============================================
// EXCLUIR EXCEÇÃO
// ============================================
window.excluirExcecao = async function(index) {
    if (!confirm('Remover este dia excepcional?')) return;
    
    diasExcepcionais.splice(index, 1);
    
    // Salvar no Firebase
    try {
        const excecoesRef = doc(
            db,
            'configuracoes',
            lojaIdAtual,
            'servico_agendamento',
            'excecoes'
        );
        
        await setDoc(excecoesRef, { dias: diasExcepcionais }, { merge: true });
        
        renderizarListaExcecoes();
        mostrarMensagem('Dia excepcional removido', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        mostrarMensagem('Erro ao excluir', 'error');
    }
};

// ============================================
// CONFIGURAR EVENTOS DOS DIAS EXCEPCIONAIS
// ============================================
function configurarEventosExcecoes() {
    document.getElementById('btnAdicionarExcecao')?.addEventListener('click', () => {
        abrirFormExcecao(false);
    });
    
    document.getElementById('btnCancelarExcecao')?.addEventListener('click', fecharFormExcecao);
    
    document.getElementById('btnSalvarExcecao')?.addEventListener('click', salvarExcecao);
}

// ============================================
// CONFIGURAR FAVICON
// ============================================
function configurarFavicon() {
    if (lojaIdAtual) {
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = `../../imagens/${lojaIdAtual}/icone.ico`;
            console.log(`✅ Favicon configurado para loja: ${lojaIdAtual}`);
        }
    }
}

// ============================================
// CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    if (!lojaIdAtual) {
        logoImg.src = LOGO_PLACEHOLDER;
        return;
    }
    
    const logoPath = `../../imagens/${lojaIdAtual}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
    };
    
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada, usando placeholder`);
        logoImg.src = LOGO_PLACEHOLDER;
    };
    
    testImg.src = logoPath;
}

// ============================================
// CARREGAR CONFIGURAÇÕES DA LOJA (CORRIGIDO)
// ============================================
async function carregarConfiguracoesLoja() {
    if (!lojaIdAtual || !window.loginDb) return;
    
    try {
        // Buscar DIRETAMENTE do documento da loja na coleção 'lojas'
        const lojaDoc = await window.loginDb
            .collection('lojas')  // ← Coleção correta!
            .doc(lojaIdAtual)      // ← Documento da loja
            .get();
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            
            // Atualizar configLoja com os dados da loja
            configLoja = {
                ...configLoja,
                habilitar_agendamento: dados.habilitar_agendamento || false,
                maxClientesDia: dados.max_clientes_dia || 30,
                maxSimultaneos: dados.max_simultaneos || 3,
                // Outras configurações...
            };
            
            console.log('✅ Configurações da loja carregadas:', configLoja);
        } else {
            console.log('⚠️ Documento da loja não encontrado');
        }
        
        return configLoja;
    } catch (error) {
        console.error('❌ Erro ao carregar configurações da loja:', error);
        return configLoja;
    }
}



// ============================================
// CARREGAR HORÁRIOS DE FUNCIONAMENTO (CORRIGIDO)
// ============================================
async function carregarHorariosFuncionamento() {
    if (!lojaIdAtual || !window.loginDb) return;
    
    try {
        // Buscar DIRETAMENTE do documento da loja
        const lojaDoc = await window.loginDb
            .collection('lojas')  // ← Coleção correta!
            .doc(lojaIdAtual)      // ← Documento da loja
            .get();
        
        const diasSemana = [
            { id: 'segunda', nome: 'Segunda-feira' },
            { id: 'terca', nome: 'Terça-feira' },
            { id: 'quarta', nome: 'Quarta-feira' },
            { id: 'quinta', nome: 'Quinta-feira' },
            { id: 'sexta', nome: 'Sexta-feira' },
            { id: 'sabado', nome: 'Sábado' },
            { id: 'domingo', nome: 'Domingo' }
        ];
        
        let html = '';
        
        if (lojaDoc.exists) {
            const dados = lojaDoc.data();
            const funcionamento = dados.funcionamento || {};
            
            diasSemana.forEach(dia => {
                const horarioStr = funcionamento[dia.id] || '';
                
                // Extrair horários do formato "08:00h às 18:00h"
                let abertura = '08:00';
                let fechamento = '18:00';
                let intervaloInicio = '12:00';
                let intervaloFim = '13:00';
                let aberto = true;
                
                if (horarioStr && horarioStr.trim() !== '') {
                    const match = horarioStr.match(/(\d{2}:\d{2})h às (\d{2}:\d{2})h/);
                    if (match) {
                        abertura = match[1];
                        fechamento = match[2];
                    }
                } else {
                    aberto = false;
                }
                
                html += `
                    <div class="horario-card" data-dia="${dia.id}">
                        <div class="dia-header">
                            <span class="dia-nome">${dia.nome}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" class="toggle-dia" ${aberto ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="horario-inputs" ${!aberto ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                            <div class="input-group">
                                <label>Abertura</label>
                                <input type="time" class="abertura" value="${abertura}">
                            </div>
                            <div class="input-group">
                                <label>Fechamento</label>
                                <input type="time" class="fechamento" value="${fechamento}">
                            </div>
                            
                            <div class="input-group intervalo">
                                <label>Intervalo</label>
                                <div class="intervalo-inputs">
                                    <input type="time" class="intervalo-inicio" value="${intervaloInicio}">
                                    <span>às</span>
                                    <input type="time" class="intervalo-fim" value="${intervaloFim}">
                                </div>
                            </div>
                            
                            <div class="input-group">
                                <label>Máx. Clientes</label>
                                <input type="number" class="max-clientes" value="30" min="0" max="100">
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Carregar exceções (se houver)
            const excecoes = dados.excecoes || [];
            renderizarExcecoes(excecoes);
            
        } else {
            // Valores padrão
            diasSemana.forEach(dia => {
                const aberto = dia.id !== 'domingo';
                html += `
                    <div class="horario-card" data-dia="${dia.id}">
                        <div class="dia-header">
                            <span class="dia-nome">${dia.nome}</span>
                            <label class="toggle-switch">
                                <input type="checkbox" class="toggle-dia" ${aberto ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="horario-inputs" ${!aberto ? 'style="opacity:0.5; pointer-events:none;"' : ''}>
                            <div class="input-group">
                                <label>Abertura</label>
                                <input type="time" class="abertura" value="08:00">
                            </div>
                            <div class="input-group">
                                <label>Fechamento</label>
                                <input type="time" class="fechamento" value="18:00">
                            </div>
                            
                            <div class="input-group intervalo">
                                <label>Intervalo</label>
                                <div class="intervalo-inputs">
                                    <input type="time" class="intervalo-inicio" value="12:00">
                                    <span>às</span>
                                    <input type="time" class="intervalo-fim" value="13:00">
                                </div>
                            </div>
                            
                            <div class="input-group">
                                <label>Máx. Clientes</label>
                                <input type="number" class="max-clientes" value="30" min="0" max="100">
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        const horariosSemana = document.getElementById('horariosSemana');
        if (horariosSemana) {
            horariosSemana.innerHTML = html;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
    }
}

// ============================================
// SALVAR CONFIGURAÇÕES DE FUNCIONAMENTO (CORRIGIDO)
// ============================================
async function salvarConfigFuncionamento() {
    try {
        mostrarLoading('Salvando configurações...');
        
        // Coletar horários do formulário
        const funcionamento = {};
        document.querySelectorAll('.horario-card').forEach(card => {
            const dia = card.dataset.dia;
            const aberto = card.querySelector('.toggle-dia')?.checked || false;
            
            if (aberto) {
                const abertura = card.querySelector('.abertura')?.value || '08:00';
                const fechamento = card.querySelector('.fechamento')?.value || '18:00';
                funcionamento[dia] = `${abertura}h às ${fechamento}h`;
            } else {
                funcionamento[dia] = "";
            }
        });
        
        // Salvar limites
        const maxClientesDia = document.getElementById('maxClientesDia')?.value || 30;
        const maxSimultaneos = document.getElementById('maxSimultaneos')?.value || 3;
        
        // Atualizar no documento da loja
        const lojaRef = window.loginDb
            .collection('lojas')
            .doc(lojaIdAtual);
        
        await setDoc(lojaRef, {
            funcionamento: funcionamento,
            max_clientes_dia: parseInt(maxClientesDia),
            max_simultaneos: parseInt(maxSimultaneos),
            atualizado_em: serverTimestamp()
        }, { merge: true });
        
        // Atualizar configuração local
        configLoja.maxClientesDia = parseInt(maxClientesDia);
        configLoja.maxSimultaneos = parseInt(maxSimultaneos);
        configLoja.horarioFuncionamento = funcionamento;
        
        mostrarMensagem('Configurações salvas com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        mostrarMensagem('Erro ao salvar configurações: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// FUNÇÕES DE CONFIGURAÇÃO DOS DIAS E ESPELHAMENTO
// ============================================

/**
 * Obtém o nome do dia por extenso
 */
function obterNomeDia(diaId) {
    const dias = {
        'segunda': 'Segunda-feira',
        'terca': 'Terça-feira',
        'quarta': 'Quarta-feira',
        'quinta': 'Quinta-feira',
        'sexta': 'Sexta-feira',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };
    return dias[diaId] || diaId;
}

/**
 * Coleta a configuração atual de um dia específico
 */
function coletarConfiguracaoDia(dia) {
    const configEl = document.getElementById(`config-${dia}`);
    if (!configEl) return null;
    
    const ativo = configEl.querySelector('.dia-ativo')?.checked || false;
    const inicio = configEl.querySelector('.horario-inicio')?.value || '';
    const fim = configEl.querySelector('.horario-fim')?.value || '';
    const duracao = configEl.querySelector('.duracao')?.value || '';
    const intervaloEntre = configEl.querySelector('.intervalo-entre')?.value || '0';
    const intervaloInicio = configEl.querySelector('.intervalo-inicio')?.value || '';
    const intervaloFim = configEl.querySelector('.intervalo-fim')?.value || '';
    
    return {
        ativo,
        inicio,
        fim,
        duracao: duracao ? parseInt(duracao) : 0,
        intervaloEntre: parseInt(intervaloEntre),
        intervaloInicio,
        intervaloFim
    };
}

/**
 * Aplica uma configuração a um dia específico
 */
function aplicarConfiguracaoDia(dia, config) {
    const configEl = document.getElementById(`config-${dia}`);
    if (!configEl) return;
    
    const ativoCheckbox = configEl.querySelector('.dia-ativo');
    const inicioInput = configEl.querySelector('.horario-inicio');
    const fimInput = configEl.querySelector('.horario-fim');
    const duracaoInput = configEl.querySelector('.duracao');
    const intervaloEntreInput = configEl.querySelector('.intervalo-entre');
    const intervaloInicioInput = configEl.querySelector('.intervalo-inicio');
    const intervaloFimInput = configEl.querySelector('.intervalo-fim');
    const configContent = configEl.querySelector('.config-content');
    
    if (ativoCheckbox) ativoCheckbox.checked = config.ativo;
    if (inicioInput) inicioInput.value = config.inicio || '';
    if (fimInput) fimInput.value = config.fim || '';
    if (duracaoInput) duracaoInput.value = config.duracao || '';
    if (intervaloEntreInput) intervaloEntreInput.value = config.intervaloEntre || 0;
    if (intervaloInicioInput) intervaloInicioInput.value = config.intervaloInicio || '';
    if (intervaloFimInput) intervaloFimInput.value = config.intervaloFim || '';
    
    // Atualizar estado visual (ativo/inativo)
    if (configContent) {
        const inputs = configContent.querySelectorAll('input');
        if (config.ativo) {
            configContent.style.opacity = '1';
            configContent.style.pointerEvents = 'auto';
            inputs.forEach(input => input.disabled = false);
        } else {
            configContent.style.opacity = '0.5';
            configContent.style.pointerEvents = 'none';
            inputs.forEach(input => input.disabled = true);
        }
    }
}

/**
 * Limpa a configuração de um dia específico
 */
function limparConfiguracaoDia(dia) {
    const configEl = document.getElementById(`config-${dia}`);
    if (!configEl) return;
    
    const inicioInput = configEl.querySelector('.horario-inicio');
    const fimInput = configEl.querySelector('.horario-fim');
    const duracaoInput = configEl.querySelector('.duracao');
    const intervaloEntreInput = configEl.querySelector('.intervalo-entre');
    const intervaloInicioInput = configEl.querySelector('.intervalo-inicio');
    const intervaloFimInput = configEl.querySelector('.intervalo-fim');
    
    if (inicioInput) inicioInput.value = '';
    if (fimInput) fimInput.value = '';
    if (duracaoInput) duracaoInput.value = '';
    if (intervaloEntreInput) intervaloEntreInput.value = '0';
    if (intervaloInicioInput) intervaloInicioInput.value = '';
    if (intervaloFimInput) intervaloFimInput.value = '';
    
    // Não altera o checkbox de ativo
}

/**
 * Verifica se um dia está configurado (campos obrigatórios preenchidos)
 */
function diaEstaConfigurado(dia) {
    const configEl = document.getElementById(`config-${dia}`);
    if (!configEl) return false;
    
    const ativo = configEl.querySelector('.dia-ativo')?.checked || false;
    if (!ativo) return true; // Dias inativos são considerados configurados
    
    const inicio = configEl.querySelector('.horario-inicio')?.value;
    const fim = configEl.querySelector('.horario-fim')?.value;
    const duracao = configEl.querySelector('.duracao')?.value;
    
    return inicio && fim && duracao && parseInt(duracao) > 0;
}

/**
 * Valida se todos os dias ativos estão configurados
 */
function validarTodosDiasConfigurados() {
    const diasFaltando = [];
    
    document.querySelectorAll('.dia-ativo:checked').forEach(checkbox => {
        const dia = checkbox.dataset.dia;
        if (!diaEstaConfigurado(dia)) {
            diasFaltando.push(obterNomeDia(dia));
        }
    });
    
    return {
        todosConfigurados: diasFaltando.length === 0,
        diasFaltando
    };
}

// ============================================
// CONFIGURAR ABAS DE DIAS (CORRIGIDO)
// ============================================
function configurarAbasDias() {
    console.log('🔧 Configurando abas de dias...');
    
    const tabs = document.querySelectorAll('.dia-tab');
    const configs = document.querySelectorAll('.dia-config');
    
    if (tabs.length === 0) {
        console.warn('⚠️ Abas de dias não encontradas');
        return;
    }
    
    // Remover listeners antigos
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });
    
    // Re-selecionar as novas tabs
    const newTabs = document.querySelectorAll('.dia-tab');
    
    newTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            const dia = this.dataset.dia;
            console.log(`📅 Aba clicada: ${dia}`);
            
            // Remover classe active de todas as tabs
            newTabs.forEach(t => t.classList.remove('active'));
            
            // Adicionar classe active na tab clicada
            this.classList.add('active');
            
            // Esconder todas as configurações
            configs.forEach(config => {
                config.classList.remove('active');
            });
            
            // Mostrar a configuração do dia selecionado
            const configEl = document.getElementById(`config-${dia}`);
            if (configEl) {
                configEl.classList.add('active');
                console.log(`✅ Mostrando configuração para ${dia}`);
            } else {
                console.error(`❌ Configuração para ${dia} não encontrada`);
            }
            
            // ATUALIZAR VISIBILIDADE DO CHECKBOX DE ESPELHAMENTO
            atualizarVisibilidadeCheckboxEspelhamento();
        });
    });
    
    // Configurar checkboxes de ativar/desativar dia
    document.querySelectorAll('.dia-ativo').forEach(checkbox => {
        const newCheckbox = checkbox.cloneNode(true);
        checkbox.parentNode.replaceChild(newCheckbox, checkbox);
        
        newCheckbox.addEventListener('change', function() {
            const dia = this.dataset.dia;
            const configEl = document.getElementById(`config-${dia}`);
            
            if (configEl) {
                const configContent = configEl.querySelector('.config-content');
                const inputs = configContent.querySelectorAll('input');
                
                if (this.checked) {
                    configContent.style.opacity = '1';
                    configContent.style.pointerEvents = 'auto';
                    inputs.forEach(input => input.disabled = false);
                    console.log(`✅ Dia ${dia} ativado`);
                } else {
                    configContent.style.opacity = '0.5';
                    configContent.style.pointerEvents = 'none';
                    inputs.forEach(input => input.disabled = true);
                    console.log(`❌ Dia ${dia} desativado`);
                }
            }
        });
    });
    
    console.log('✅ Abas de dias configuradas');
}

// ============================================
// VALIDAR AGENDAMENTO FUTURO - ADAPTADO
// ============================================
window.validarAgendamentoFuturo = async function(agendamento) {
    try {
        await atualizarStatusAgendamentoAdmin(agendamento, 'Verificado');
        mostrarMensagem('Agendamento validado com sucesso!', 'success');
    } catch (error) {
        console.error('❌ Erro ao validar:', error);
        mostrarMensagem('Erro ao validar agendamento', 'error');
    }
};

// ============================================
// CANCELAR AGENDAMENTO FUTURO - ADAPTADO
// ============================================
window.cancelarAgendamentoFuturo = async function(agendamento) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    
    try {
        await atualizarStatusAgendamentoAdmin(agendamento, 'Cancelado');
        mostrarMensagem('Agendamento cancelado!', 'success');
    } catch (error) {
        console.error('❌ Erro ao cancelar:', error);
        mostrarMensagem('Erro ao cancelar agendamento', 'error');
    }
};

// ============================================
// CONFIGURAR ESPELHAMENTO (FORA DO BOTÃO, VISÍVEL APENAS NA SEGUNDA)
// ============================================
function configurarEspelhamentoAutomatico() {
    console.log('🔧 Configurando espelhamento para aparecer na segunda-feira...');
    
    // ============================================
    // REMOVER CHECKBOX FIXO DO HTML
    // ============================================
    const checkboxFixo = document.getElementById('espelharConfiguracao');
    if (checkboxFixo) {
        const containerFixo = checkboxFixo.closest('.form-group');
        if (containerFixo) {
            containerFixo.remove();
            console.log('✅ Checkbox fixo do HTML removido');
        }
    }
    
    // ============================================
    // CRIAR CONTAINER PARA O CHECKBOX (FORA DAS ABAS)
    // ============================================
    function criarContainerEspelhamento() {
        // Verificar se já existe
        if (document.getElementById('containerEspelhamento')) {
            return document.getElementById('containerEspelhamento');
        }
        
        // Encontrar o local ideal para inserir (após as abas, antes das configurações)
        const containerAbas = document.querySelector('.dias-config-tabs');
        const containerConfigs = document.querySelector('.dias-config-container');
        
        if (!containerAbas || !containerConfigs) {
            console.warn('⚠️ Containers não encontrados');
            return null;
        }
        
        // Criar container do checkbox
        const container = document.createElement('div');
        container.id = 'containerEspelhamento';
        container.className = 'form-group espelhamento-container';
        container.style.margin = '15px 0';
        container.style.padding = '10px 15px';
        container.style.background = '#f8f9fa';
        container.style.borderRadius = '8px';
        container.style.border = '1px solid #e9ecef';
        container.style.display = 'none'; // Inicia oculto
        
        container.innerHTML = `
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="espelharConfiguracao">
                <span><i class="fas fa-copy" style="color: #ff6b00;"></i> Espelhar configuração para todos os dias</span>
            </label>
            <small style="display: block; color: #64748b; font-size: 0.8rem; margin-top: 5px; margin-left: 26px;">
                Quando marcado, a configuração da segunda-feira será aplicada a todos os dias da semana
            </small>
        `;
        
        // Inserir entre as abas e as configurações
        containerAbas.parentNode.insertBefore(container, containerConfigs);
        
        console.log('✅ Container de espelhamento criado');
        return container;
    }
    
    // ============================================
    // CONTROLAR VISIBILIDADE POR ABA
    // ============================================
    function atualizarVisibilidadeCheckboxEspelhamento() {
        const container = document.getElementById('containerEspelhamento');
        if (!container) return;
        
        const abaAtiva = document.querySelector('.dia-tab.active');
        const isSegundaAtiva = abaAtiva && abaAtiva.dataset.dia === 'segunda';
        
        // Mostrar container apenas na segunda-feira
        container.style.display = isSegundaAtiva ? 'block' : 'none';
        
        console.log(`👁️ Container espelhamento ${isSegundaAtiva ? 'visível' : 'oculto'} (aba: ${abaAtiva?.dataset.dia})`);
    }
    
    // ============================================
    // FUNÇÕES DE ESPELHAMENTO
    // ============================================
    
    function coletarConfiguracaoSegunda() {
        const configEl = document.getElementById('config-segunda');
        if (!configEl) return null;
        
        return {
            ativo: configEl.querySelector('.dia-ativo')?.checked || false,
            inicio: configEl.querySelector('.horario-inicio')?.value || '',
            fim: configEl.querySelector('.horario-fim')?.value || '',
            duracao: configEl.querySelector('.duracao')?.value || '',
            intervaloEntre: configEl.querySelector('.intervalo-entre')?.value || '0',
            intervaloInicio: configEl.querySelector('.intervalo-inicio')?.value || '',
            intervaloFim: configEl.querySelector('.intervalo-fim')?.value || ''
        };
    }
    
    function aplicarConfiguracaoDia(dia, config) {
        const configEl = document.getElementById(`config-${dia}`);
        if (!configEl) return;
        
        const ativoCheckbox = configEl.querySelector('.dia-ativo');
        const inicioInput = configEl.querySelector('.horario-inicio');
        const fimInput = configEl.querySelector('.horario-fim');
        const duracaoInput = configEl.querySelector('.duracao');
        const intervaloEntreInput = configEl.querySelector('.intervalo-entre');
        const intervaloInicioInput = configEl.querySelector('.intervalo-inicio');
        const intervaloFimInput = configEl.querySelector('.intervalo-fim');
        const configContent = configEl.querySelector('.config-content');
        
        if (ativoCheckbox) ativoCheckbox.checked = config.ativo;
        if (inicioInput) inicioInput.value = config.inicio || '';
        if (fimInput) fimInput.value = config.fim || '';
        if (duracaoInput) duracaoInput.value = config.duracao || '';
        if (intervaloEntreInput) intervaloEntreInput.value = config.intervaloEntre || 0;
        if (intervaloInicioInput) intervaloInicioInput.value = config.intervaloInicio || '';
        if (intervaloFimInput) intervaloFimInput.value = config.intervaloFim || '';
        
        // Atualizar estado visual
        if (configContent) {
            const inputs = configContent.querySelectorAll('input');
            if (config.ativo) {
                configContent.style.opacity = '1';
                configContent.style.pointerEvents = 'auto';
                inputs.forEach(input => input.disabled = false);
            } else {
                configContent.style.opacity = '0.5';
                configContent.style.pointerEvents = 'none';
                inputs.forEach(input => input.disabled = true);
            }
        }
    }
    
    function espelharParaTodos() {
        const configSegunda = coletarConfiguracaoSegunda();
        if (!configSegunda) {
            mostrarMensagem('Erro ao coletar configuração da segunda-feira', 'error');
            return;
        }
        
        console.log('🔄 Espelhando configuração da segunda para todos os dias:', configSegunda);
        
        const dias = ['terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
        dias.forEach(dia => aplicarConfiguracaoDia(dia, configSegunda));
        
        mostrarMensagem('✅ Configuração espelhada para todos os dias!', 'success', 2000);
    }
    
    // ============================================
    // CONFIGURAR EVENTOS
    // ============================================
    
    // Criar container (uma única vez)
    const container = criarContainerEspelhamento();
    if (!container) return;
    
    // Pegar referência do checkbox
    const chkEspelhar = document.getElementById('espelharConfiguracao');
    if (!chkEspelhar) return;
    
    // Estado inicial
    chkEspelhar.checked = false;
    
    // Evento do checkbox
    chkEspelhar.addEventListener('change', function(e) {
        e.stopPropagation();
        
        if (this.checked) {
            espelharParaTodos();
            mostrarMensagem('🔁 Configuração espelhada para todos os dias!', 'success', 3000);
        }
    });
    
    // Observar mudanças nas abas (além do evento de click)
    function observarMudancasAbas() {
        atualizarVisibilidadeCheckboxEspelhamento();
        
        // Criar um MutationObserver para detectar mudanças na classe 'active'
        const abas = document.querySelectorAll('.dia-tab');
        abas.forEach(aba => {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        setTimeout(atualizarVisibilidadeCheckboxEspelhamento, 10);
                    }
                });
            });
            
            observer.observe(aba, { attributes: true });
        });
    }
    
    // Inicializar
    setTimeout(() => {
        observarMudancasAbas();
        atualizarVisibilidadeCheckboxEspelhamento();
    }, 200);
    
    console.log('✅ Espelhamento configurado - aparece fora do botão, apenas na segunda');
}

// ============================================
// DENTRO DO ABRIR MODAL, GARANTIR A ORDEM CORRETA
// ============================================
function abrirModalAgendamentoFuncionarios() {
    console.log('Abrir modal de agendamento para funcionários');
    
    const modal = document.getElementById('salvarCriarAgendamentoModal');
    if (!modal) {
        console.error('❌ Modal salvarCriarAgendamentoModal não encontrado');
        mostrarMensagem('Erro ao abrir modal', 'error');
        return;
    }
    
    // Limpar formulário
    const form = document.getElementById('criarAgendamentoForm');
    if (form) form.reset();
    
    // 🔥 CONFIGURAR EVENTOS NA ORDEM CORRETA
    configurarEventosDias();
    configurarPermitirForaDia();
    
    // Primeiro configurar as abas
    configurarAbasDias();
    
    // Depois configurar o espelhamento
    configurarEspelhamentoAutomatico();
    
    // Por fim carregar dados
    carregarDiasExcepcionais();
    configurarEventosExcecoes();
    
    modal.classList.add('active');
}

// ============================================
// VALIDAÇÃO ANTES DE SALVAR
// ============================================
function configurarValidacaoAntesSalvar() {
    const chkEspelhar = document.getElementById('espelharConfiguracao');
    const btnSalvar = document.getElementById('btnSalvarCriarAgendamento');
    
    if (!btnSalvar || !chkEspelhar) return;
    
    // Remover listeners antigos
    const newBtn = btnSalvar.cloneNode(true);
    btnSalvar.parentNode.replaceChild(newBtn, btnSalvar);
    
    // Adicionar novo listener
    document.getElementById('btnSalvarCriarAgendamento').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Se o espelhamento NÃO estiver marcado, validar todos os dias
        if (!chkEspelhar.checked) {
            const validacao = validarTodosDiasConfigurados();
            
            if (!validacao.todosConfigurados) {
                const diasFaltandoStr = validacao.diasFaltando.join(', ');
                mostrarMensagem(`⚠️ Configure os seguintes dias manualmente: ${diasFaltandoStr}`, 'warning', 5000);
                return;
            }
        }
        
        // Se passou na validação, chamar a função de salvar
        salvarCriarAgendamento();
    });
}

// ============================================
// INICIAR ESCUTA DE AGENDAMENTOS (ADMIN)
// ============================================
function iniciarEscutaAgendamentos() {
    if (!lojaIdAtual) {
        console.error('❌ Não foi possível iniciar escuta');
        return;
    }
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos (admin)...');
    
    try {
        // Mês e ano atual para filtrar agendamentos
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        // Referência para a coleção do mês atual
        const mesRef = collection(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual
        );
        
        // Escutar todas as DATAS do mês atual (cada data é um documento)
        unsubscribeAgendamentos = onSnapshot(mesRef, (snapshot) => {
            console.log(`📨 Atualização em ${mesAnoAtual}: ${snapshot.size} datas com agendamentos`);
            
            // Reconstruir lista de agendamentos
            reconstruirListaAgendamentosAdmin();
            
        }, (error) => {
            console.error('❌ Erro na escuta de agendamentos:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// CARREGAR CONFIGURAÇÕES DOS SERVIÇOS
// ============================================
async function carregarConfiguracoesServicos() {
    try {
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual
        );
        
        const snapshot = await getDocs(servicosRef);
        
        // 🔥 CORRIGIDO: usar a variável global, não redeclarar
        servicosConfig = {};
        snapshot.forEach(doc => {
            servicosConfig[doc.id] = doc.data();
        });
        
        console.log('📋 Configurações dos serviços carregadas:', servicosConfig);
        
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        servicosConfig = {};
    }
}

// ============================================
// GERAR SENHA BASEADA NO SERVIÇO (não no status)
// ============================================
function gerarSenha(numero, servicoId) {
    // Buscar a abreviação do serviço na configuração
    let prefixo = 'S';
    
    if (servicosConfig[servicoId] && servicosConfig[servicoId].abreviacao) {
        prefixo = servicosConfig[servicoId].abreviacao;
    } else {
        // Fallback: pegar primeiras 3 letras do serviço em maiúsculo
        const nomePartes = servicoId.split('_');
        if (nomePartes.length > 0) {
            prefixo = nomePartes[0].substring(0, 3).toUpperCase();
        }
    }
    
    // Número com 2 dígitos (01, 02, etc)
    const numeroFormatado = numero.toString().padStart(2, '0');
    
    return `${prefixo}${numeroFormatado}`;
}

// ============================================
// RECONSTRUIR LISTA DE AGENDAMENTOS (ADMIN) - COM NUMERAÇÃO POR SERVIÇO
// ============================================
async function reconstruirListaAgendamentosAdmin() {
    try {
        const agendamentosHojeTemp = [];
        const agendamentosFuturosTemp = [];
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        
        // Mês e ano atual
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        console.log(`🔍 Buscando agendamentos do mês: ${mesAnoAtual}`);
        
        // Referência para a coleção do mês atual (lista de documentos de datas)
        const mesRef = collection(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual
        );
        
        // Buscar todas as datas do mês
        const datasSnapshot = await getDocs(mesRef);
        
        console.log(`📊 Encontradas ${datasSnapshot.size} datas com agendamentos`);
        
        // Para cada data, processar os MAPS de serviços
        for (const dataDoc of datasSnapshot.docs) {
            const dataId = dataDoc.id; // Formato: "09_03_2026"
            const dadosData = dataDoc.data();
            
            // [dia, mes, ano] já estão no dataId
            const [dia, mes, ano] = dataId.split('_').map(Number);
            
            // Criar objeto Date para a data do agendamento
            const dataAgendadaObj = new Date(ano, mes - 1, dia);
            dataAgendadaObj.setHours(0, 0, 0, 0);
            
            console.log(`📅 Processando data: ${dataId}`);
            
            // 🔥 PARA CADA SERVIÇO, ORDENAR AGENDAMENTOS POR HORÁRIO
            for (const [servicoId, agendamentosMap] of Object.entries(dadosData)) {
                console.log(`  🔧 Serviço: ${servicoId}`);
                
                // Converter o mapa em array e ordenar por data/hora
                const agendamentosArray = Object.entries(agendamentosMap || {})
                    .sort((a, b) => {
                        const dataA = a[1].data_hora_agendada?.toDate?.() || new Date(a[1].data hora_agendada);
                        const dataB = b[1].data_hora_agendada?.toDate?.() || new Date(b[1].data_hora_agendada);
                        return dataA - dataB;
                    });
                
                // 🔥 Processar agendamentos ordenados, atribuindo números de senha baseados na posição
                agendamentosArray.forEach(([agendamentoId, dados], index) => {
                    
                    if (dados && dados.data_hora_agendada) {
                        const dataHoraAgendada = dados.data_hora_agendada?.toDate?.() || 
                                                new Date(dados.data_hora_agendada);
                        
                        // 🔥 O número da senha é a posição no array + 1
                        const numero = index + 1;
                        
                        // Separar agendamentos de hoje e futuros
                        if (dataHoraAgendada >= hoje && dataHoraAgendada < amanha) {
                            // Agendamento de hoje
                            agendamentosHojeTemp.push({
                                id: `${dataId}_${servicoId}_${agendamentoId}`,
                                data_id: dataId,
                                mes_ano: mesAnoAtual,
                                servico_id: servicoId,
                                servico_nome: servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' '),
                                agendamento_id: agendamentoId,
                                cliente_email: dados.cliente_email,
                                cliente_nome: dados.cliente_nome || 'Cliente',
                                status: dados.status_agendamento || 'Pendente',
                                data_hora: dataHoraAgendada,
                                horario: dataHoraAgendada.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                }),
                                // 🔥 Usar a nova função gerarSenha com o número correto
                                senha: gerarSenha(numero, servicoId),
                                timestamp: dataHoraAgendada.getTime()
                            });
                            
                        } else if (dataHoraAgendada >= amanha) {
                            // Agendamentos futuros
                            agendamentosFuturosTemp.push({
                                id: `${dataId}_${servicoId}_${agendamentoId}`,
                                data_id: dataId,
                                mes_ano: mesAnoAtual,
                                servico_id: servicoId,
                                servico_nome: servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' '),
                                agendamento_id: agendamentoId,
                                cliente_email: dados.cliente_email,
                                cliente_nome: dados.cliente_nome || 'Cliente',
                                status: dados.status_agendamento || 'Pendente',
                                data: dataHoraAgendada.toISOString().split('T')[0],
                                data_obj: dataHoraAgendada,
                                horario: dataHoraAgendada.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                }),
                                validado: dados.status_agendamento === 'Verificado'
                            });
                        }
                    }
                });
            }
        }
        
        // 🔥 Ordenar agendamentos de hoje por horário (todos os serviços juntos)
        agendamentosHojeTemp.sort((a, b) => a.timestamp - b.timestamp);
        
        // Ordenar agendamentos futuros por data/horário
        agendamentosFuturosTemp.sort((a, b) => {
            if (a.data < b.data) return -1;
            if (a.data > b.data) return 1;
            if (a.horario < b.horario) return -1;
            if (a.horario > b.horario) return 1;
            return 0;
        });
        
        // Atribuir às variáveis globais
        agendamentosAtivos = agendamentosHojeTemp;
        agendamentosFuturos = agendamentosFuturosTemp;
        
        console.log('📋 Agendamentos de hoje:', agendamentosHojeTemp.length);
        console.log('📅 Agendamentos futuros:', agendamentosFuturosTemp.length);
        
        // Renderizar painéis
        renderizarPainelFila();
        renderizarAgendamentosFuturos();
        
    } catch (error) {
        console.error('❌ Erro ao reconstruir lista:', error);
    }
}

// ============================================
// PROMOVER PARA PRÓXIMO A ATENDER - ADAPTADO
// ============================================
async function promoverParaProximo(agendamentoId) {
    try {
        const agendamento = agendamentosAtivos.find(a => a.id === agendamentoId);
        if (!agendamento) return;
        
        await atualizarStatusAgendamentoAdmin(agendamento, 'Próximo a atender');
        
    } catch (error) {
        console.error('❌ Erro ao promover:', error);
    }
}

// ============================================
// ATUALIZAR STATUS NO FIREBASE (ADMIN)
// ============================================
async function atualizarStatusAgendamentoAdmin(agendamento, novoStatus) {
    try {
        console.log(`📝 Atualizando agendamento ${agendamento.agendamento_id} para ${novoStatus}`);
        
        // Extrair os componentes do objeto agendamento
        const dataId = agendamento.data_id;           // Ex: "09_03_2026"
        const mesAno = agendamento.mes_ano;           // Ex: "03_2026"
        const servicoId = agendamento.servico_id;     // Ex: "corte_cabelo"
        const agendamentoId = agendamento.agendamento_id; // Ex: "agendamento_5"
        
        // Validar se todos os componentes existem
        if (!dataId || !mesAno || !servicoId || !agendamentoId) {
            console.error('❌ Componentes do agendamento incompletos:', { dataId, mesAno, servicoId, agendamentoId });
            return false;
        }
        
        // Referência para o documento da data
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataId
        );
        
        console.log(`🔍 Verificando documento em: agendamentos/${lojaIdAtual}/${mesAno}/${dataId}`);
        
        // Verificar se o documento existe
        const docSnap = await getDoc(diaDocRef);
        
        if (!docSnap.exists()) {
            console.error('❌ Documento da data não encontrado');
            mostrarMensagem('Agendamento não encontrado', 'error');
            return false;
        }
        
        const dadosAtuais = docSnap.data();
        
        // Verificar se o serviço e agendamento existem
        if (!dadosAtuais[servicoId] || !dadosAtuais[servicoId][agendamentoId]) {
            console.error('❌ Agendamento não encontrado no mapa');
            mostrarMensagem('Agendamento não encontrado', 'error');
            return false;
        }
        
        // 🔥 CORREÇÃO: Usar paths específicos em vez de substituir o objeto inteiro
        
        // Criar caminhos
        const statusPath = `${servicoId}.${agendamentoId}.status_agendamento`;
        
        // Objeto de atualização
        const updateData = {
            [statusPath]: novoStatus
        };
        
        // Buscar histórico atual
        const historicoAtual = dadosAtuais[servicoId][agendamentoId].historico_status || [];
        
        // Criar novo histórico com entrada adicionada
        const novoHistorico = [
            ...historicoAtual,
            {
                status: novoStatus,
                data: new Date().toISOString(), // Usar ISO string
                alterado_por: dadosUsuario?.email || 'admin'
                // Removido timestamp: serverTimestamp()
            }
        ];
        
        // Adicionar histórico ao update
        const historicoPath = `${servicoId}.${agendamentoId}.historico_status`;
        updateData[historicoPath] = novoHistorico;
        
        // Atualizar no Firestore
        await updateDoc(diaDocRef, updateData);
        
        console.log(`✅ Status atualizado para ${novoStatus}`);
        mostrarMensagem(`Status atualizado para ${novoStatus}`, 'success');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        mostrarMensagem('Erro ao atualizar status: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// RENDERIZAR PAINEL DE FILA (CORRIGIDO)
// ============================================
function renderizarPainelFila() {
    // Filtrar por status
    const emAtendimento = agendamentosAtivos.filter(a => a.status === 'Em atendimento');
    const proximos = agendamentosAtivos.filter(a => a.status === 'Próximo a atender');
    const outros = agendamentosAtivos.filter(a => 
        a.status === 'Verificado' || a.status === 'Na fila'
    );
    
    // Atualizar badges
    document.getElementById('emAtendimentoBadge').textContent = emAtendimento.length;
    document.getElementById('proximosBadge').textContent = proximos.length;
    document.getElementById('outrosBadge').textContent = outros.length;
    document.getElementById('filaTotalBadge').textContent = proximos.length + outros.length;
    
    // Renderizar EM ATENDIMENTO
    const emAtendimentoLista = document.getElementById('emAtendimentoLista');
    if (emAtendimento.length > 0) {
        let html = '';
        emAtendimento.forEach(item => {
            html += `
                <div class="card-atendimento" data-id="${item.id}" data-email="${item.cliente_email}" data-key="${item.agendamento_key}">
                    <div class="card-checkbox">
                        <input type="checkbox" class="checkbox-atendimento" data-id="${item.id}">
                    </div>
                    <div class="info">
                        <h4>${item.cliente_nome}</h4>
                        <div>
                            <span class="senha">${item.senha || '---'}</span>
                            <span class="servico">${item.servico_nome || item.servico_id || 'Serviço'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        emAtendimentoLista.innerHTML = html;
        configurarCheckboxesAtendimento();
    } else {
        emAtendimentoLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-clock"></i>
                <p>Nenhum atendimento no momento</p>
            </div>
        `;
    }
    
    // Renderizar PRÓXIMOS A ATENDER
    const proximosLista = document.getElementById('proximosLista');
    if (proximos.length > 0) {
        let html = '';
        proximos.forEach((item, index) => {
            html += `
                <div class="card-aguardando ${index === 0 ? 'proximo' : ''}" 
                     data-id="${item.id}" 
                     data-email="${item.cliente_email}" 
                     data-key="${item.agendamento_key}">
                    <span class="senha-numero">${item.senha || '---'}</span>
                    <div class="info">
                        <span class="cliente">${item.cliente_nome}</span>
                        <span class="servico">
                            <i class="fas fa-cut"></i> ${item.servico}
                        </span>
                    </div>
                    <div class="acoes">
                        <button class="btn-acao-card" onclick="chamarProximo('${item.id}')" title="Chamar">
                            <i class="fas fa-bell"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        proximosLista.innerHTML = html;
    } else {
        proximosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-smile"></i>
                <p>Fila vazia</p>
            </div>
        `;
    }
    
    // Renderizar OUTROS NA FILA
    const outrosLista = document.getElementById('outrosLista');
    if (outros.length > 0) {
        let html = '';
        outros.forEach(item => {
            html += `
                <div class="card-aguardando pendente" 
                     data-id="${item.id}" 
                     data-email="${item.cliente_email}" 
                     data-key="${item.agendamento_key}">
                    <span class="senha-numero">${item.senha || '---'}</span>
                    <div class="info">
                        <span class="cliente">${item.cliente_nome}</span>
                        <span class="servico">
                            <i class="fas fa-cut"></i> ${item.servico}
                        </span>
                    </div>
                    <div class="acoes">
                        <button class="btn-acao-card" onclick="promoverParaProximo('${item.id}')" title="Promover para próximo">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        outrosLista.innerHTML = html;
    } else {
        outrosLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-smile"></i>
                <p>Fila vazia</p>
            </div>
        `;
    }
}

// ============================================
// RENDERIZAR AGENDAMENTOS FUTUROS (NOVA ESTRUTURA)
// ============================================
function renderizarAgendamentosFuturos() {
    const grid = document.getElementById('futurosGrid');
    document.getElementById('futurosBadge').textContent = agendamentosFuturos.length;
    
    if (agendamentosFuturos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>Nenhum agendamento futuro</p>
            </div>
        `;
        return;
    }
    
    // Agrupar por data
    const porData = {};
    agendamentosFuturos.forEach(ag => {
        if (!porData[ag.data]) {
            porData[ag.data] = [];
        }
        porData[ag.data].push(ag);
    });
    
    let html = '';
    for (const [data, agendamentos] of Object.entries(porData)) {
        const dataObj = new Date(data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        html += `
            <div class="data-group">
                <div class="data-header">
                    <h4>${dataFormatada}</h4>
                    <span class="limite-dia">
                        ${agendamentos.length} agendamentos
                    </span>
                </div>
                <div class="agendamentos-data">
        `;
        
        agendamentos.forEach(ag => {
            const statusClass = ag.validado ? 'validado' : 'pendente';
            const statusText = ag.validado ? 'Verificado' : ag.status;
            
            html += `
                <div class="futuro-card ${statusClass}" 
                     data-email="${ag.cliente_email}" 
                     data-agendamento='${JSON.stringify(ag).replace(/'/g, "&apos;")}'>
                    <div class="futuro-horario">${ag.horario}</div>
                    <div class="futuro-info">
                        <strong>${ag.cliente_nome}</strong>
                        <span>${ag.servico}</span>
                    </div>
                    <div class="futuro-status">
                        <span class="badge-${statusClass}">${statusText}</span>
                    </div>
                    <div class="futuro-acoes">
                        ${!ag.validado ? `
                            <button class="btn-validar" onclick="validarAgendamentoFuturo(${JSON.stringify(ag).replace(/'/g, "&apos;")})">
                                <i class="fas fa-check"></i> Validar
                            </button>
                        ` : ''}
                        <button class="btn-cancelar" onclick="cancelarAgendamentoFuturo(${JSON.stringify(ag).replace(/'/g, "&apos;")})">
                            <i class="fas fa-ban"></i> Cancelar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

// ============================================
// ENVIAR NOTIFICAÇÃO WHATSAPP (CORRIGIDO)
// ============================================
async function enviarNotificacaoProximo(agendamento) {
    if (!agendamento.cliente_whatsapp) return;
    
    try {
        const mensagem = configLoja.mensagemNotificacao
            .replace('{cliente}', agendamento.cliente_nome)
            .replace('{senha}', agendamento.senha)
            .replace('{servico}', agendamento.servico)
            .replace('{loja}', document.getElementById('lojaNomeHeader')?.textContent || 'Estabelecimento');
        
        // Aqui você integraria com API de WhatsApp
        console.log('📱 Enviando WhatsApp para:', agendamento.cliente_whatsapp);
        console.log('📝 Mensagem:', mensagem);
        
        // Registrar notificação enviada (se necessário)
        // const notificacaoRef = doc(collection(db, 'notificacoes')); // Se quiser salvar
        
        console.log('✅ Notificação registrada');
        
    } catch (error) {
        console.error('❌ Erro ao enviar notificação:', error);
    }
}

// ============================================
// CONTADOR DE PAUSA
// ============================================
function iniciarContadorPausa(minutos) {
    if (intervaloPausa) clearInterval(intervaloPausa);
    
    const fim = new Date(Date.now() + minutos * 60000);
    
    intervaloPausa = setInterval(() => {
        const agora = new Date();
        const diff = fim - agora;
        
        if (diff <= 0) {
            clearInterval(intervaloPausa);
            intervaloPausa = null;
            return;
        }
        
        const minutosRest = Math.floor(diff / 60000);
        const segundosRest = Math.floor((diff % 60000) / 1000);
        
        document.getElementById('tempoPausaRestante').textContent = 
            `${minutosRest}:${segundosRest.toString().padStart(2, '0')}`;
    }, 1000);
}


// ============================================
// CONFIGURAR CHECKBOXES DE ATENDIMENTO (CORRIGIDO)
// ============================================
function configurarCheckboxesAtendimento() {
    const checkboxes = document.querySelectorAll('.checkbox-atendimento');
    const btnConcluir = document.getElementById('btnConcluirSelecionados');
    const btnSelecionarTodos = document.getElementById('btnSelecionarTodosAtendimento');
    
    if (!checkboxes.length || !btnConcluir) return;
    
    // Atualizar estado do botão conforme checkboxes
    function atualizarBotaoConcluir() {
        const selecionados = document.querySelectorAll('.checkbox-atendimento:checked');
        btnConcluir.disabled = selecionados.length === 0;
        
        if (selecionados.length > 0) {
            btnConcluir.innerHTML = `<i class="fas fa-check-circle"></i> Concluir ${selecionados.length} selecionado(s)`;
        } else {
            btnConcluir.innerHTML = `<i class="fas fa-check-circle"></i> Concluir Selecionados`;
        }
    }
    
    // Evento de cada checkbox
    checkboxes.forEach(cb => {
        cb.addEventListener('change', atualizarBotaoConcluir);
    });
    
    // Botão selecionar todos
    if (btnSelecionarTodos) {
        btnSelecionarTodos.addEventListener('click', () => {
            const todosSelecionados = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !todosSelecionados);
            atualizarBotaoConcluir();
            
            btnSelecionarTodos.innerHTML = todosSelecionados ? 
                '<i class="fas fa-check-double"></i> Selecionar Todos' : 
                '<i class="fas fa-times"></i> Desmarcar Todos';
        });
    }
    
    // ✅ CORREÇÃO AQUI: Botão concluir selecionados
    btnConcluir.addEventListener('click', async () => {
        const selecionados = Array.from(document.querySelectorAll('.checkbox-atendimento:checked'))
            .map(cb => cb.dataset.id);
        
        if (selecionados.length === 0) return;
        
        if (confirm(`Concluir ${selecionados.length} atendimento(s)?`)) {
            // Para cada agendamento concluído, atualizar status para 'Concluido'
            for (const id of selecionados) {
                const agendamento = agendamentosAtivos.find(a => a.id === id);
                if (agendamento) {
                    // ✅ CORRETO: Passar o objeto completo
                    await atualizarStatusAgendamento(agendamento, 'Concluido');
                }
            }
            mostrarMensagem(`${selecionados.length} atendimento(s) concluído(s)!`, 'success');
        }
    });
}

// ============================================
// CHAMAR PRÓXIMO (ATUALIZAR STATUS) - ADAPTADO
// ============================================
async function chamarProximo(agendamentoId) {
    try {
        // Encontrar o agendamento na lista
        const agendamento = agendamentosAtivos.find(a => a.id === agendamentoId);
        if (!agendamento) {
            mostrarMensagem('Agendamento não encontrado', 'error');
            return;
        }
        
        // Verificar se pode ser chamado
        if (agendamento.status !== 'Na fila' && agendamento.status !== 'Próximo a atender') {
            mostrarMensagem('Este agendamento não pode ser chamado agora', 'warning');
            return;
        }
        
        await atualizarStatusAgendamentoAdmin(agendamento, 'Em atendimento');
        
    } catch (error) {
        console.error('❌ Erro ao chamar próximo:', error);
        mostrarMensagem('Erro ao chamar cliente', 'error');
    }
}

// ============================================
// SALVAR CONFIGURAÇÃO DO AGENDAMENTO - COM ABREVIAÇÃO
// ============================================
async function salvarCriarAgendamento() {
    try {
        const nomeServico = document.getElementById('servicoNome').value;
        const abreviacao = document.getElementById('servicoAbreviacao').value.toUpperCase().trim();
        const descricao = document.getElementById('servicoDescricao').value;
        const permitirForaDia = document.getElementById('permitirForaDia').checked;
        const validacao = document.querySelector('input[name="validacao"]:checked')?.value || 'automatico_dia';
        
        if (!nomeServico) {
            mostrarMensagem('Nome do serviço é obrigatório', 'warning');
            return;
        }
        
        if (!abreviacao) {
            mostrarMensagem('Abreviação da senha é obrigatória', 'warning');
            return;
        }
        
        if (abreviacao.length > 10) {
            mostrarMensagem('Abreviação deve ter no máximo 10 caracteres', 'warning');
            return;
        }
        
        // Validar se contém apenas letras e números
        if (!/^[A-Z0-9]+$/.test(abreviacao)) {
            mostrarMensagem('Abreviação deve conter apenas letras e números', 'warning');
            return;
        }
        
        // Coletar DIAS ATIVOS e suas configurações
        const diasAtivos = [];
        const configuracoesPorDia = {};
        
        document.querySelectorAll('.dia-ativo:checked').forEach(cb => {
            const dia = cb.dataset.dia;
            if (dia) {
                diasAtivos.push(dia);
                
                const configEl = document.getElementById(`config-${dia}`);
                if (configEl) {
                    configuracoesPorDia[dia] = {
                        ativo: true,
                        inicio: configEl.querySelector('.horario-inicio')?.value || '08:00',
                        fim: configEl.querySelector('.horario-fim')?.value || '18:00',
                        duracao: parseInt(configEl.querySelector('.duracao')?.value) || 30,
                        intervaloEntre: parseInt(configEl.querySelector('.intervalo-entre')?.value) || 0,
                        intervaloInicio: configEl.querySelector('.intervalo-inicio')?.value || '12:00',
                        intervaloFim: configEl.querySelector('.intervalo-fim')?.value || '13:00'
                    };
                }
            }
        });
        
        if (diasAtivos.length === 0) {
            mostrarMensagem('Selecione pelo menos um dia de funcionamento', 'warning');
            return;
        }
        
        mostrarLoading('Salvando configuração...');
        
        // Gerar ID único baseado no nome
        const servicoId = nomeServico
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        
        // 🔥 ESTRUTURA: configuracoes / servico_agendamento / [lojaId] / [servicoId]
        const configRef = doc(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual,
            servicoId
        );
        
        const configData = {
            id: servicoId,
            nome: nomeServico,
            abreviacao: abreviacao, // 🔥 NOVO: salvar abreviação
            descricao: descricao,
            permitirForaDia: permitirForaDia,
            validacao: validacao,
            diasAtivos: diasAtivos,
            configuracoesPorDia: configuracoesPorDia,
            atualizado_por: dadosUsuario?.email || 'sistema',
            atualizado_em: serverTimestamp(),
            data_atualizacao: new Date().toISOString(),
            loja_id: lojaIdAtual
        };
        
        await setDoc(configRef, configData, { merge: true });
        
        mostrarMensagem('Configuração salva com sucesso!', 'success');
        fecharModal('salvarCriarAgendamentoModal');
        
    } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        mostrarMensagem('Erro ao salvar: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
}

// ============================================
// ABRIR MODAL GERENCIAR AGENDAMENTOS
// ============================================
function abrirModalGerenciarAgendamentos() {
    console.log('Abrir modal gerenciar agendamentos');
    
    const modal = document.getElementById('gerenciarAgendamentosModal');
    if (!modal) {
        console.error('❌ Modal gerenciarAgendamentosModal não encontrado');
        mostrarMensagem('Erro ao abrir gerenciador', 'error');
        return;
    }
    
    // Restaurar título original
    const titulo = modal.querySelector('.modal-header h3');
    if (titulo) {
        titulo.innerHTML = '<i class="fas fa-users"></i> Gerenciar Agendamentos Clientes';
    }
    
    // Restaurar tabela para agendamentos
    restaurarTabelaParaAgendamentos();
    
    modal.classList.add('active');
}

// ============================================
// RENDERIZAR LISTA GERENCIAR
// ============================================
function renderizarListaGerenciar() {
    const lista = document.getElementById('gerenciarLista');
    const busca = document.getElementById('buscaGerenciar')?.value.toLowerCase() || '';
    const filtroStatus = document.getElementById('filtroStatusGerenciar')?.value || 'todos';
    
    let filtrados = todosAgendamentos.filter(item => {
        if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;
        if (busca) {
            const cliente = (item.cliente_nome || '').toLowerCase();
            const servico = (item.servico || '').toLowerCase();
            const data = (item.data || '').toLowerCase();
            return cliente.includes(busca) || servico.includes(busca) || data.includes(busca);
        }
        return true;
    });
    
    const totalPaginas = Math.ceil(filtrados.length / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const paginados = filtrados.slice(inicio, inicio + itensPorPagina);
    
    if (paginados.length === 0) {
        lista.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum agendamento encontrado</td></tr>';
        document.getElementById('paginaInfo').textContent = 'Página 1 de 1';
        document.getElementById('paginaAnterior').disabled = true;
        document.getElementById('proximaPagina').disabled = true;
        return;
    }
    
    let html = '';
    paginados.forEach(item => {
        let statusClass = '';
        let statusText = item.status || 'agendado';
        
        switch(statusText) {
            case 'agendado':
                statusClass = 'agendado';
                break;
            case 'validado':
                statusClass = 'validado';
                break;
            case 'concluido':
                statusClass = 'concluido';
                break;
            case 'cancelado':
                statusClass = 'cancelado';
                break;
            case 'chamando':
                statusClass = 'chamando';
                statusText = 'Em Atendimento';
                break;
            default:
                statusClass = 'agendado';
        }
        
        html += `
            <tr data-id="${item.id}" data-origem="${item.origem}">
                <td>${item.cliente_nome || '---'}</td>
                <td>${item.servico || '---'}</td>
                <td>${item.data || '---'}</td>
                <td>${item.horario || '---'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="acoes-gerenciar">
                        <button class="btn-gerenciar btn-editar-gerenciar" onclick="editarAgendamentoGerenciar('${item.id}', '${item.origem}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    lista.innerHTML = html;
    
    document.getElementById('paginaInfo').textContent = `Página ${paginaAtual} de ${totalPaginas || 1}`;
    document.getElementById('paginaAnterior').disabled = paginaAtual <= 1;
    document.getElementById('proximaPagina').disabled = paginaAtual >= totalPaginas;
}

// ============================================
// FILTRAR GERENCIAR
// ============================================
function filtrarGerenciar() {
    paginaAtual = 1;
    renderizarListaGerenciar();
}

// ============================================
// PAGINAÇÃO
// ============================================
function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarListaGerenciar();
    }
}

function proximaPagina() {
    const totalPaginas = Math.ceil(todosAgendamentos.length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarListaGerenciar();
    }
}

// ============================================
// EDITAR AGENDAMENTO (GERENCIAR)
// ============================================
window.editarAgendamentoGerenciar = function(id, origem) {
    console.log('Editar agendamento:', id, origem);
    mostrarMensagem('Função de edição em desenvolvimento', 'info');
};


// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================
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
    if (loading) {
        loading.style.display = 'none';
    }
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
    if (modal) {
        modal.classList.add('active');
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

// ============================================
// RENDERIZAR EXCEÇÕES
// ============================================
function renderizarExcecoes(excecoes) {
    console.log('Renderizar exceções:', excecoes);
    
    const container = document.getElementById('excecoesLista');
    if (!container) return;
    
    if (!excecoes || excecoes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>Nenhuma exceção cadastrada</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por data
    excecoes.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let html = '';
    excecoes.forEach(exc => {
        const dataObj = new Date(exc.data + 'T12:00:00');
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        
        let tipoTexto = '';
        let tipoClasse = '';
        
        switch(exc.tipo) {
            case 'feriado':
                tipoTexto = '🔴 Feriado';
                tipoClasse = 'feriado';
                break;
            case 'horario_especial':
                tipoTexto = '🟡 Horário Especial';
                tipoClasse = 'horario_especial';
                break;
            case 'capacidade_extra':
                tipoTexto = '🟢 Capacidade Extra';
                tipoClasse = 'capacidade_extra';
                break;
            case 'capacidade_reduzida':
                tipoTexto = '🟠 Capacidade Reduzida';
                tipoClasse = 'capacidade_reduzida';
                break;
        }
        
        html += `
            <div class="excecao-item" data-data="${exc.data}">
                <div class="excecao-info">
                    <span class="excecao-data">${dataFormatada}</span>
                    <span class="excecao-tipo ${tipoClasse}">${tipoTexto}</span>
                    <span class="excecao-desc">${exc.observacao || ''}</span>
                </div>
                <div class="excecao-acoes">
                    <button class="btn-editar-excecao" onclick="editarExcecao('${exc.data}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-excluir-excecao" onclick="excluirExcecao('${exc.data}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// CONFIGURAR COMPORTAMENTO DO CHECKBOX "PERMITIR FORA DO DIA"
// ============================================
function configurarPermitirForaDia() {
    const permitirForaDia = document.getElementById('permitirForaDia');
    const opcaoAutomaticoTodos = document.querySelector('input[name="validacao"][value="automatico_todos"]')?.closest('.radio-label');
    const alertaValidacao = document.getElementById('alertaValidacao');
    
    if (!permitirForaDia) return;
    
    function atualizarVisibilidade() {
        if (permitirForaDia.checked) {
            // Se permitir fora do dia, mostra a opção
            if (opcaoAutomaticoTodos) {
                opcaoAutomaticoTodos.style.display = 'flex';
            }
            if (alertaValidacao) {
                alertaValidacao.style.display = 'none';
            }
        } else {
            // Se NÃO permitir fora do dia, esconde a opção
            if (opcaoAutomaticoTodos) {
                opcaoAutomaticoTodos.style.display = 'none';
                
                // Se a opção escondida estava selecionada, muda para "automatico_dia"
                const radioSelecionado = document.querySelector('input[name="validacao"]:checked');
                if (radioSelecionado && radioSelecionado.value === 'automatico_todos') {
                    document.querySelector('input[name="validacao"][value="automatico_dia"]').checked = true;
                }
            }
            
            // Mostrar alerta informativo
            if (alertaValidacao) {
                alertaValidacao.style.display = 'flex';
            }
        }
    }
    
    // Executar ao carregar
    atualizarVisibilidade();
    
    // Executar quando mudar o checkbox
    permitirForaDia.addEventListener('change', atualizarVisibilidade);
}

// ============================================
// ABRIR MODAL GERENCIAR SERVIÇOS
// ============================================
function abrirModalGerenciarServicos() {
    console.log('Abrir modal gerenciar serviços');
    
    // Você pode reutilizar o mesmo modal ou criar um novo
    // Por enquanto, vamos usar o mesmo modal de gerenciar agendamentos
    // mas carregando serviços em vez de agendamentos
    
    const modal = document.getElementById('gerenciarAgendamentosModal');
    if (!modal) {
        console.error('❌ Modal não encontrado');
        mostrarMensagem('Erro ao abrir gerenciador', 'error');
        return;
    }
    
    // Mudar o título do modal
    const titulo = modal.querySelector('.modal-header h3');
    if (titulo) {
        titulo.innerHTML = '<i class="fas fa-cut"></i> Gerenciar Serviços de Agendamento';
    }
    
    // Modificar a tabela para mostrar serviços
    modificarTabelaParaServicos();
    
    // Carregar lista de serviços
    carregarListaServicos();
    
    modal.classList.add('active');
}

// ============================================
// MODIFICAR TABELA PARA SERVIÇOS
// ============================================
function modificarTabelaParaServicos() {
    const thead = document.querySelector('.tabela-gerenciar thead tr');
    const tbody = document.getElementById('gerenciarLista');
    
    if (thead) {
        thead.innerHTML = `
            <th>Nome do Serviço</th>
            <th>Descrição</th>
            <th>Horário</th>
            <th>Dias</th>
            <th>Validação</th>
            <th>Ações</th>
        `;
    }
    
    // Esconder busca e filtros que não são relevantes
    const buscaDiv = document.querySelector('.busca-gerenciar');
    const filtrosDiv = document.querySelector('.filtros-gerenciar');
    
    if (buscaDiv) {
        buscaDiv.style.display = 'none';
    }
    
    if (filtrosDiv) {
        filtrosDiv.style.display = 'none';
    }
}

// ============================================
// RESTAURAR TABELA PARA AGENDAMENTOS
// ============================================
function restaurarTabelaParaAgendamentos() {
    const thead = document.querySelector('.tabela-gerenciar thead tr');
    
    if (thead) {
        thead.innerHTML = `
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Data</th>
            <th>Horário</th>
            <th>Status</th>
            <th>Ações</th>
        `;
    }
    
    // Restaurar busca e filtros
    const buscaDiv = document.querySelector('.busca-gerenciar');
    const filtrosDiv = document.querySelector('.filtros-gerenciar');
    
    if (buscaDiv) {
        buscaDiv.style.display = 'block';
    }
    
    if (filtrosDiv) {
        filtrosDiv.style.display = 'block';
    }
}

// ============================================
// CARREGAR LISTA DE SERVIÇOS
// ============================================
async function carregarListaServicos() {
    const lista = document.getElementById('gerenciarLista');
    if (!lista) return;
    
    lista.innerHTML = '<tr><td colspan="6" class="empty-row">Carregando serviços...</td></tr>';
    
    try {
        // Buscar configurações de serviços do Firebase
        const configRef = doc(
            db, 
            'configuracoes', 
            lojaIdAtual, 
            'servico_agendamento', 
            'config'
        );
        
        const configDoc = await getDoc(configRef);
        
        if (!configDoc.exists()) {
            lista.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum serviço cadastrado</td></tr>';
            return;
        }
        
        const dados = configDoc.data();
        
        // Formatar dias para exibição
        const diasMap = {
            'segunda': 'Seg', 'terca': 'Ter', 'quarta': 'Qua',
            'quinta': 'Qui', 'sexta': 'Sex', 'sabado': 'Sáb', 'domingo': 'Dom'
        };
        
        const diasFormatados = (dados.dias || []).map(d => diasMap[d] || d).join(', ');
        
        // Mapear opção de validação
        const validacaoMap = {
            'automatico_dia': 'Auto (dia)',
            'automatico_todos': 'Auto (todos)',
            'manual': 'Manual'
        };
        
        lista.innerHTML = `
            <tr>
                <td><strong>${dados.nome || '---'}</strong></td>
                <td>${dados.descricao || '---'}</td>
                <td>${dados.horarioInicio || '--:--'} às ${dados.horarioFim || '--:--'}</td>
                <td>${diasFormatados || '---'}</td>
                <td>${validacaoMap[dados.validacao] || dados.validacao || '---'}</td>
                <td>
                    <div class="acoes-gerenciar">
                        <button class="btn-gerenciar btn-editar-gerenciar" onclick="editarServico()">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-gerenciar btn-excluir-gerenciar" onclick="excluirServico()">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        lista.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar serviços</td></tr>';
    }
}

// ============================================
// FUNÇÕES PARA EDITAR/EXCLUIR SERVIÇO
// ============================================
window.editarServico = function() {
    console.log('Editar serviço');
    // Implementar edição depois
    mostrarMensagem('Edição de serviço em desenvolvimento', 'info');
};

window.excluirServico = function() {
    console.log('Excluir serviço');
    if (confirm('Excluir este serviço?')) {
        // Implementar exclusão depois
        mostrarMensagem('Exclusão de serviço em desenvolvimento', 'info');
    }
};

// ============================================
// CONFIGURAR EVENTOS (CORRIGIDO)
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // ✅ Criar Agendamento (configuração)
    document.getElementById('btnCriarAgendamento')?.addEventListener('click', () => {
        abrirModalAgendamentoFuncionarios();
    });
    
    // ✅ Gerenciar Agendamentos de Clientes (antigo)
    document.getElementById('btnGerenciarAgendamentosClientes')?.addEventListener('click', () => {
        abrirModalGerenciarAgendamentos();
    });
    
    // ✅ Gerenciar Serviços de Agendamento (NOVO)
    document.getElementById('btnGerenciarServicos')?.addEventListener('click', () => {
        abrirModalGerenciarServicos();
    });
    
    // Botão pausar
    document.getElementById('btnPausarAtendimento')?.addEventListener('click', () => {
        mostrarMensagem('Funcionalidade de pausa em desenvolvimento', 'info');
    });
    
    // Confirmar pausa - REMOVIDO (não existe mais)
    /*
    document.getElementById('btnConfirmarPausa')?.addEventListener('click', () => {
        const modo = document.querySelector('input[name="modoPausa"]:checked')?.value;
        const tempo = parseInt(document.getElementById('tempoPausa').value);
        if (modo) {
            pausarAtendimento(modo, tempo);
        }
    });
    */
    
    // Botão validar todos - REMOVIDO (não existe mais)
    // document.getElementById('btnValidarTodos')?.addEventListener('click', validarTodosFuturos);
    
    // Botão histórico clientes
    document.getElementById('btnHistoricoClientes')?.addEventListener('click', () => {
        abrirModal('clienteHistoricoModal');
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
    
    // Salvar configurações de funcionamento (aba horários)
    document.getElementById('btnSalvarFuncionamento')?.addEventListener('click', salvarConfigFuncionamento);
    
    // Adicionar exceção
    document.getElementById('btnAddExcecao')?.addEventListener('click', () => {
        abrirModal('excecaoModal');
    });
    
    // Salvar exceção
    document.getElementById('btnSalvarExcecao')?.addEventListener('click', salvarExcecao);
    
    // Botões do modal novo agendamento
    document.getElementById('btnSalvarCriarAgendamento')?.addEventListener('click', salvarCriarAgendamento);
    
    // Botões do modal gerenciar
    document.getElementById('buscaGerenciar')?.addEventListener('input', filtrarGerenciar);
    document.getElementById('filtroStatusGerenciar')?.addEventListener('change', filtrarGerenciar);
    document.getElementById('paginaAnterior')?.addEventListener('click', paginaAnterior);
    document.getElementById('proximaPagina')?.addEventListener('click', proximaPagina);
}

// ============================================
// CONFIGURAR EVENTOS DOS DIAS (SELECIONAR/LIMPAR TODOS)
// ============================================
function configurarEventosDias() {
    const btnSelecionarTodos = document.getElementById('selecionarTodosDias');
    const btnLimparTodos = document.getElementById('limparTodosDias');
    
    if (btnSelecionarTodos) {
        btnSelecionarTodos.addEventListener('click', () => {
            document.querySelectorAll('.dia-semana').forEach(cb => {
                cb.checked = true;
            });
            console.log('✅ Todos os dias selecionados');
        });
    }
    
    if (btnLimparTodos) {
        btnLimparTodos.addEventListener('click', () => {
            document.querySelectorAll('.dia-semana').forEach(cb => {
                cb.checked = false;
            });
            console.log('✅ Todos os dias desmarcados');
        });
    }
}

// ============================================
// FUNÇÃO DE TESTE de console PARA VERIFICAR ESTRUTURA MAPS
// ============================================
window.teste_estrutura_maps = async function() {
    try {
        console.log('🔍 TESTANDO ESTRUTURA MAPS');
        console.log('==========================================');
        
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        console.log(`📅 Data atual: ${dataFormatada}`);
        
        // Buscar documento do dia
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        const docSnap = await getDoc(diaDocRef);
        
        if (!docSnap.exists()) {
            console.log('❌ Nenhum agendamento para hoje');
            return;
        }
        
        const dados = docSnap.data();
        console.log('📄 Dados do documento (estrutura MAPS):', dados);
        
        let total = 0;
        
        // Iterar sobre serviços
        for (const [servico, agendamentos] of Object.entries(dados)) {
            console.log(`\n🔧 SERVIÇO: ${servico}`);
            
            for (const [id, ag] of Object.entries(agendamentos)) {
                total++;
                const data = ag.data_hora_agendada?.toDate?.();
                console.log(`   📌 ${id}:`);
                console.log(`      👤 Cliente: ${ag.cliente_nome}`);
                console.log(`      ⏰ Horário: ${data?.toLocaleTimeString('pt-BR')}`);
                console.log(`      📝 Status: ${ag.status_agendamento}`);
            }
        }
        
        console.log(`\n✅ TOTAL: ${total} agendamentos`);
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

// ============================================
// EVENTOS DE LOGIN (do Firebase Auth)
// ============================================
window.addEventListener('usuarioLogado', async (event) => {
    const { usuario } = event.detail;
    
    console.log('✅ EVENTO: usuário logado no agendamento');
    console.log('📧 Email:', usuario.email);
    
    // Já estamos na página, apenas atualizar se necessário
    if (!dadosUsuario) {
        // Recarregar a página para aplicar as permissões
        window.location.reload();
    }
});

window.addEventListener('usuarioDeslogado', () => {
    console.log('👤 EVENTO: usuário deslogado');
    
    // Redirecionar para index
    window.location.href = 'index.html';
});

// ============================================
// LIMPAR AO SAIR
// ============================================
window.addEventListener('beforeunload', () => {
    if (unsubscribeAgendamentos) unsubscribeAgendamentos();
    if (unsubscribeFuturos) unsubscribeFuturos();
    if (intervaloPausa) clearInterval(intervaloPausa);
});
