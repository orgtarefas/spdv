// index.js - Tela de Exposição de Produtos e Agendamentos* para Clientes
console.log("🛒 Sistema PDV - Loja para Clientes (Nova Autenticação)");

// VERIFICAR SE AS FUNÇÕES DE LOGIN ESTÃO DISPONÍVEIS
if (typeof window.fazerLogin !== 'function') {
    console.error('❌ CRÍTICO: funções de login não disponíveis!');
    console.log('Verifique se login_firebase.js foi carregado antes deste script');
}

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
    onSnapshot,
    serverTimestamp,
    lojaServices,
    obterURLImagem,
    formatarMoeda,
    gerarImagemPlaceholderBase64
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES GLOBAIS
// ============================================
const IMAGEM_PADRAO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMGYxZjIiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI4MCIgcj0iNDAiIGZpbGw9IiNlNzRjM2MiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PHBhdGggZD0iTTUwIDE1MEw4MCAxMDBMMTEwIDEzMEwxNDAgODBMMTcwIDEzMEwyMDAgMTUwSDUwWiIgZmlsbD0iI2U3NGMzYyIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSIxMDAiIHk9IjE3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TRU0gRk9UTzwvdGV4dD48L3N2Zz4=";

const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E🏪%3C/text%3E%3C/svg%3E";

let produtos = [];
let categorias = [];
let carrinho = [];
let usuarioLogado = false;
let dadosUsuario = null;
let swiperInstance = null;
let lojaIdAtual = null;

// ============================================
// VARIÁVEL GLOBAL PARA AGENDAMENTO
// ============================================
let agendamentoHabilitado = false;
let agendamentosAtivos = [];
let agendamentosFuturos = [];
let unsubscribeAgendamentos = null;
let dadosAgendamentoHoje = null;
let servicosConfig = {}; // Mapa de id do serviço -> configuração
let modoAutomatico = true; // true = automático, false = manual
let carrosselAutomaticoInterval = null;
let carrosselAutomaticoAtivo = true; // Começa ativo


// ============================================
// VERIFICAR LOJA ID E CONFIG
// ============================================
if (!lojaIdAtual) {
    lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
    console.log(`📍 Loja ID no clientes.js: ${lojaIdAtual}`);
}

// Aguardar getLojaConfig estar disponível
if (typeof window.getLojaConfig !== 'function') {
    console.log('⏳ Aguardando getLojaConfig...');
    // Criar um intervalo para verificar
    const checkInterval = setInterval(() => {
        if (typeof window.getLojaConfig === 'function') {
            console.log('✅ getLojaConfig disponível');
            clearInterval(checkInterval);
            // Se precisar, pode chamar alguma função aqui
        }
    }, 100);
}

// ============================================
// FUNÇÃO PARA EXTRAIR LOJA ID DA URL
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
// VERIFICAR SE AGENDAMENTO ESTÁ HABILITADO (DO FIRESTORE)
// ============================================
async function verificarAgendamentoHabilitado() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return false;
    
    try {
        // Buscar no Firestore do projeto de login (coleção 'lojas')
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaId)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                const habilitado = dados.habilitar_agendamento === true;
                console.log(`📅 Agendamento habilitado no Firestore: ${habilitado ? 'SIM' : 'NÃO'}`);
                return habilitado;
            } else {
                console.log(`⚠️ Documento da loja não encontrado no Firestore: ${lojaId}`);
                return false;
            }
        } else {
            console.log('📅 loginDb não disponível, agendamento desabilitado');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar agendamento:', error);
        return false;
    }
}

// ============================================
// MOSTRAR/ESCONDER CONTAINER DE AGENDAMENTO
// ============================================
function toggleAgendamentoContainer(mostrar) {
    const container = document.getElementById('agendamentoContainer');
    if (container) {
        container.style.display = mostrar ? 'block' : 'none';
        console.log(`📅 Container de agendamento ${mostrar ? 'exibido' : 'ocultado'}`);
    }
}

// ============================================
// INICIAR CARROSSEL AUTOMÁTICO
// ============================================
function iniciarCarrosselAutomatico(intervalo = 5000) {
    pararCarrosselAutomatico();
    
    if (!carrosselAutomaticoAtivo) return;
    
    console.log(`🎠 Iniciando carrossel automático (intervalo: ${intervalo}ms)...`);
    
    carrosselAutomaticoInterval = setInterval(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (maxScroll <= 0) return;
            
            const cardWidth = 192;
            const currentScroll = scrollEl.scrollLeft;
            
            let nextScroll = currentScroll + cardWidth;
            
            if (nextScroll > maxScroll) {
                nextScroll = 0;
            }
            
            scrollEl.scrollTo({
                left: nextScroll,
                behavior: 'smooth'
            });
        });
    }, intervalo);
}


// ============================================
// PARAR CARROSSEL AUTOMÁTICO
// ============================================
function pararCarrosselAutomatico() {
    if (carrosselAutomaticoInterval) {
        clearInterval(carrosselAutomaticoInterval);
        carrosselAutomaticoInterval = null;
        console.log('⏸️ Carrossel automático parado');
    }
}

// ============================================
// ALTERNAR CARROSSEL AUTOMÁTICO (CORRIGIDO)
// ============================================
function alternarCarrosselAutomatico() {
    carrosselAutomaticoAtivo = !carrosselAutomaticoAtivo;
    
    const btn = document.getElementById('btnCarrosselOutros');
    
    if (carrosselAutomaticoAtivo) {
        iniciarCarrosselSenhasAutomatico();
        mostrarMensagem('🎠 Rolagem automática ativada (5 segundos por card)', 'success', 2000);
        
        if (btn) {
            btn.classList.add('ativo');
            btn.innerHTML = '<i class="fas fa-pause"></i>'; // PAUSE quando está ATIVO (rodando)
            btn.title = 'Rolagem automática (ligada)';
        }
    } else {
        pararCarrosselAutomatico();
        mostrarMensagem('⏸️ Rolagem automática desativada', 'info', 2000);
        
        if (btn) {
            btn.classList.remove('ativo');
            btn.innerHTML = '<i class="fas fa-play"></i>'; // PLAY quando está INATIVO (parado)
            btn.title = 'Rolagem automática (desligada)';
        }
    }
}

// ============================================
// 🔥 CARROSSEL AUTOMÁTICO MAIS LENTO E SUAVE
// ============================================
function iniciarCarrosselAutomaticoSuave() {
    pararCarrosselAutomatico();
    
    if (!carrosselAutomaticoAtivo) return;
    
    console.log('🎠 Iniciando carrossel automático SUAVE (mais lento)...');
    
    // Opção 1: Scroll suave com movimento por card a cada 5 segundos
    carrosselAutomaticoInterval = setInterval(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (maxScroll <= 0) return;
            
            const cardWidth = 192; // 180px + 12px gap
            const currentScroll = scrollEl.scrollLeft;
            
            // Calcular próximo card
            let nextScroll = currentScroll + cardWidth;
            
            // Se passou do fim, volta para o início
            if (nextScroll > maxScroll) {
                nextScroll = 0;
            }
            
            // Usar behavior 'smooth' para animação suave
            scrollEl.scrollTo({
                left: nextScroll,
                behavior: 'smooth'
            });
        });
    }, 5000); // 🔥 AUMENTADO PARA 5 SEGUNDOS (mais lento)
    
    // Opção 2: Alternativa - rolagem contínua muito lenta (descomente se preferir)
    /*
    let lastScrollTime = Date.now();
    
    carrosselAutomaticoInterval = setInterval(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (maxScroll <= 0) return;
            
            // Mover 0.5px a cada frame (30fps = 15px/segundo)
            const currentScroll = scrollEl.scrollLeft;
            const velocidade = 15; // pixels por segundo
            const delta = velocidade * (1/30); // ~0.5px por frame
            
            let nextScroll = currentScroll + delta;
            
            if (nextScroll > maxScroll) {
                nextScroll = 0;
            }
            
            scrollEl.scrollLeft = nextScroll;
        });
    }, 33); // ~30fps
    */
}

// ============================================
// PAUSAR QUANDO USUÁRIO INTERAGE
// ============================================
function configurarPausaAoInteragir() {
    document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
        // Pausar quando usuário começar a scrollar
        scrollEl.addEventListener('wheel', () => {
            pararCarrosselAutomatico();
        });
        
        scrollEl.addEventListener('touchstart', () => {
            pararCarrosselAutomatico();
        });
        
        scrollEl.addEventListener('mousedown', () => {
            pararCarrosselAutomatico();
        });
    });
    
    // Também pausar quando clicar nas setas
    document.querySelectorAll('.servico-arrow').forEach(arrow => {
        arrow.addEventListener('click', () => {
            pararCarrosselAutomatico();
        });
    });
}

// ============================================
// BOTÃO PARA CONTROLAR CARROSSEL (opcional)
// ============================================
function adicionarBotaoControleCarrossel() {
    // Verificar se já existe
    if (document.getElementById('btnControleCarrossel')) return;
    
    const header = document.querySelector('.agendamento-header');
    if (!header) return;
    
    const btn = document.createElement('button');
    btn.id = 'btnControleCarrossel';
    btn.className = 'btn-controle-carrossel';
    btn.innerHTML = '<i class="fas fa-play"></i> Navegar Entre Senhas';
    btn.title = 'Ativar/desativar rolagem automática';
    
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        alternarCarrosselAutomatico();
        
        // Atualizar ícone
        if (carrosselAutomaticoAtivo) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Navegar Entre Senhas';
            btn.classList.add('ativo');
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Navegar Entre Senhas';
            btn.classList.remove('ativo');
        }
    });
    
    header.appendChild(btn);
}


// ============================================
// FUNÇÃO PARA ALTERNAR MODO (será chamada quando clicar no status)
// ============================================
function alternarModoOperacao() {
    modoAutomatico = !modoAutomatico;
    
    const statusElement = document.getElementById('agendamentoStatus');
    const indicator = statusElement?.querySelector('.status-indicator');
    const text = statusElement?.querySelector('span:last-child');
    
    if (statusElement) {
        if (modoAutomatico) {
            indicator?.classList.remove('manual');
            indicator?.classList.add('online');
            text.textContent = 'Modo Automático';
            statusElement.title = 'Clique para alternar para modo manual';
        } else {
            indicator?.classList.remove('online');
            indicator?.classList.add('manual');
            text.textContent = 'Modo Manual';
            statusElement.title = 'Clique para alternar para modo automático';
        }
    }
    
    console.log(`🔄 Modo de operação alterado para: ${modoAutomatico ? 'AUTOMÁTICO' : 'MANUAL'}`);
}

// ============================================
// PROCESSAR NOVA SENHA (chamada quando uma senha é criada)
// ============================================
async function processarNovaSenha(servicoId, novaSenha) {
    try {
        console.log(`🆕 Processando nova senha para serviço: ${servicoId}`);
        
        // Buscar agendamentos deste serviço que estão ativos hoje
        const agendamentosServico = agendamentosAtivos.filter(a => a.servico_id === servicoId);
        
        // Verificar status atuais
        const temEmAtendimento = agendamentosServico.some(a => a.status === 'Em atendimento');
        const temProximoAtender = agendamentosServico.some(a => a.status === 'Próximo a atender');
        
        let statusFinal = 'Na fila'; // Padrão
        
        // Lógica automática
        if (modoAutomatico) {
            if (!temEmAtendimento) {
                // Se não tem ninguém em atendimento, vai direto para Em atendimento
                statusFinal = 'Em atendimento';
                console.log(`  ➡️ Sem Em atendimento, nova senha vai para EM ATENDIMENTO`);
            } else if (!temProximoAtender) {
                // Se tem Em atendimento mas não tem Próximo, vai para Próximo a atender
                statusFinal = 'Próximo a atender';
                console.log(`  ➡️ Com Em atendimento mas sem Próximo, nova senha vai para PRÓXIMO A ATENDER`);
            } else {
                // Se já tem ambos, vai para Na fila
                statusFinal = 'Na fila';
                console.log(`  ➡️ Fila cheia, nova senha vai para NA FILA`);
            }
        } else {
            // Modo manual: sempre vai para Na fila
            statusFinal = 'Na fila';
            console.log(`  ➡️ Modo manual, nova senha vai para NA FILA`);
        }
        
        // Atualizar o status da nova senha no Firestore
        await atualizarStatusAgendamento(novaSenha, statusFinal);
        
        return statusFinal;
        
    } catch (error) {
        console.error('❌ Erro ao processar nova senha:', error);
        return 'Na fila'; // Fallback seguro
    }
}

// ============================================
// VERIFICAR E AVANÇAR FILA AUTOMATICAMENTE (chamado quando um status muda)
// ============================================
async function verificarEAvancarFila() {
    if (!modoAutomatico) {
        console.log('⏸️ Modo manual - não avançando automaticamente');
        return;
    }
    
    console.log('🔄 Verificando fila para avanço automático...');
    
    try {
        // Agrupar por serviço
        const agendamentosPorServico = {};
        
        agendamentosAtivos.forEach(ag => {
            if (!agendamentosPorServico[ag.servico_id]) {
                agendamentosPorServico[ag.servico_id] = [];
            }
            agendamentosPorServico[ag.servico_id].push(ag);
        });
        
        // Processar cada serviço
        for (const [servicoId, agendamentos] of Object.entries(agendamentosPorServico)) {
            console.log(`\n🔧 Verificando serviço: ${servicoId}`);
            
            // Ordenar por timestamp (mais antigo primeiro)
            const ordenados = agendamentos.sort((a, b) => a.timestamp - b.timestamp);
            
            // Identificar status atuais
            const emAtendimento = ordenados.find(a => a.status === 'Em atendimento');
            const proximoAtender = ordenados.find(a => a.status === 'Próximo a atender');
            const fila = ordenados.filter(a => 
                a.status !== 'Em atendimento' && 
                a.status !== 'Próximo a atender' &&
                ['Na fila', 'Verificado'].includes(a.status)
            );
            
            console.log(`  📊 Status: EmAtendimento=${!!emAtendimento}, Proximo=${!!proximoAtender}, Fila=${fila.length}`);
            
            // REGRA 1: Se não tem Em atendimento mas tem Próximo a atender
            if (!emAtendimento && proximoAtender) {
                console.log(`  ➡️ Avançando ${proximoAtender.cliente_nome} para Em atendimento`);
                await atualizarStatusAgendamento(proximoAtender, 'Em atendimento');
                continue;
            }
            
            // REGRA 2: Se não tem Em atendimento nem Próximo, mas tem fila
            if (!emAtendimento && !proximoAtender && fila.length > 0) {
                const primeiroDaFila = fila[0];
                console.log(`  ➡️ Avançando ${primeiroDaFila.cliente_nome} para Em atendimento (diretamente da fila)`);
                await atualizarStatusAgendamento(primeiroDaFila, 'Em atendimento');
                continue;
            }
            
            // REGRA 3: Se tem Em atendimento mas não tem Próximo, e tem fila
            if (emAtendimento && !proximoAtender && fila.length > 0) {
                const primeiroDaFila = fila[0];
                console.log(`  ➡️ Avançando ${primeiroDaFila.cliente_nome} para Próximo a atender`);
                await atualizarStatusAgendamento(primeiroDaFila, 'Próximo a atender');
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao avançar fila:', error);
    }
}

// ============================================
// ATUALIZAR STATUS AGENDAMENTO - VERSÃO SUPER SIMPLES
// ============================================
async function atualizarStatusAgendamento(agendamento, novoStatus) {
    try {
        console.log(`📝 Atualizando agendamento ${agendamento.agendamento_id} para ${novoStatus}`);
        
        // Extrair componentes
        const servicoId = agendamento.servico_id;
        const agendamentoId = agendamento.agendamento_id;
        
        // Mês e ano atual
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        // Referência para o documento do dia
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        await updateDoc(diaDocRef, {
            [`${servicoId}.${agendamentoId}.status_agendamento`]: novoStatus
        });
        
        console.log(`✅ Status atualizado para ${novoStatus}`);
        
        // O onSnapshot vai detectar a mudança automaticamente
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
    }
}

// ============================================
// CARREGAR AGENDAMENTOS ATIVOS - VERSÃO CORRIGIDA
// ============================================
function iniciarEscutaAgendamentos() {
    if (!agendamentoHabilitado || !lojaIdAtual) return;
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos (estrutura MAPS)...');
    
    try {
        // Mês e ano atual
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        // Referência para o DOCUMENTO do dia atual
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        console.log(`📅 Escutando documento: ${dataFormatada}`);
        
        // Referência para o documento do dia
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        // Escutar mudanças no documento do dia
        unsubscribeAgendamentos = onSnapshot(diaDocRef, (docSnap) => {
            console.log(`📨 Atualização no documento ${dataFormatada}`);
            
            if (docSnap.exists()) {
                dadosAgendamentoHoje = docSnap.data();
                reconstruirListaAgendamentos(docSnap.data());
                
                // 🔥 FIX: Aguardar reconstrução e depois avançar fila
                setTimeout(() => {
                    verificarEAvancarFila();
                }, 500);
                
            } else {
                console.log('📭 Nenhum agendamento para hoje');
                dadosAgendamentoHoje = null;
                agendamentosAtivos = [];
                renderizarPainelAgendamento();
            }
            
        }, (error) => {
            console.error('❌ Erro na escuta:', error);
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
// RECONSTRUIR LISTA DE AGENDAMENTOS - VERSÃO CORRIGIDA
// ============================================
function reconstruirListaAgendamentos(dadosDoDia) {
    try {
        console.log('📊 Processando dados do dia:', dadosDoDia);
        
        // Limpar arrays anteriores
        agendamentosAtivos = [];
        agendamentosFuturos = [];
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Se não há dados, lista vazia
        if (!dadosDoDia) {
            renderizarPainelAgendamento();
            return;
        }
        
        // Iterar sobre cada SERVIÇO (é um MAP)
        Object.entries(dadosDoDia).forEach(([servicoId, agendamentosMap]) => {
            console.log(`  🔧 Serviço: ${servicoId}`);
            
            // Converter o mapa em array e ordenar por data_hora_agendada (do mais antigo para o mais novo)
            const agendamentosArray = Object.entries(agendamentosMap || {})
                .map(([agendamentoId, dados]) => {
                    const dataHoraAgendada = dados.data_hora_agendada?.toDate?.() || 
                                            new Date(dados.data_hora_agendada);
                    return {
                        agendamentoId,
                        dados,
                        dataHoraAgendada,
                        timestamp: dataHoraAgendada.getTime()
                    };
                })
                .sort((a, b) => a.timestamp - b.timestamp); // ORDEM CRESCENTE (mais antigo primeiro)
            
            console.log(`    📝 Total agendamentos para ${servicoId}: ${agendamentosArray.length}`);
            
            // Processar cada agendamento na ordem correta
            agendamentosArray.forEach(({agendamentoId, dados, dataHoraAgendada, timestamp}, index) => {
                console.log(`    📝 ${agendamentoId}:`, dados);
                
                if (dados && dados.data_hora_agendada) {
                    // Verificar se é hoje
                    const dataAgendadaDate = new Date(dataHoraAgendada);
                    dataAgendadaDate.setHours(0, 0, 0, 0);
                    
                    // O número da senha deve ser baseado na posição ORIGINAL no array
                    const numero = index + 1;
                    
                    if (dataAgendadaDate.getTime() === hoje.getTime()) {
                        // Agendamento de HOJE
                        
                        // 🔥 STATUS QUE APARECEM NA FILA: Em atendimento, Próximo a atender, Na fila, Verificado
                        const statusFila = [
                            'Em atendimento',
                            'Próximo a atender',
                            'Na fila',
                            'Verificado'
                        ];
                        
                        if (statusFila.includes(dados.status_agendamento)) {
                            agendamentosAtivos.push({
                                id: `${servicoId}_${agendamentoId}`,
                                servico_id: servicoId,
                                servico_nome: servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' '),
                                agendamento_id: agendamentoId,
                                cliente_email: dados.cliente_email,
                                cliente_nome: dados.cliente_nome,
                                status: dados.status_agendamento,
                                data_hora: dataHoraAgendada,
                                horario: dataHoraAgendada.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                }),
                                senha: gerarSenha(numero, servicoId, servicosConfig),
                                timestamp: timestamp,
                                numero_original: numero
                            });
                        } else {
                            console.log(`    ⏳ Agendamento ${agendamentoId} com status "${dados.status_agendamento}" não entra na fila`);
                        }
                    } else {
                        // Agendamento futuro (outro dia)
                        agendamentosFuturos.push({
                            id: `${servicoId}_${agendamentoId}`,
                            servico_id: servicoId,
                            servico_nome: servicosConfig[servicoId]?.nome || servicoId.replace(/_/g, ' '),
                            agendamento_id: agendamentoId,
                            cliente_email: dados.cliente_email,
                            cliente_nome: dados.cliente_nome,
                            status: dados.status_agendamento,
                            data: dataHoraAgendada.toISOString().split('T')[0],
                            horario: dataHoraAgendada.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            }),
                            validado: dados.status_agendamento === 'Verificado'
                        });
                    }
                }
            });
        });
        
        console.log(`✅ Total agendamentos hoje: ${agendamentosAtivos.length}`);
        console.log('📋 Status na fila:', agendamentosAtivos.map(a => `${a.senha}: ${a.status}`));
        
        renderizarPainelAgendamento();
        
    } catch (error) {
        console.error('❌ Erro ao reconstruir lista:', error);
    }
}

// ============================================
// CHAMAR PRÓXIMO (ATUALIZAR STATUS)
// ============================================
async function chamarProximo(agendamentoId) {
    try {
        // Encontrar o agendamento na lista
        const agendamento = agendamentosAtivos.find(a => a.id === agendamentoId);
        if (!agendamento) {
            console.log('❌ Agendamento não encontrado na lista');
            return;
        }
        
        // Verificar se pode ser chamado
        if (agendamento.status !== 'Na fila' && agendamento.status !== 'Próximo a atender') {
            mostrarMensagem('Este agendamento não pode ser chamado agora', 'warning');
            return;
        }
        
        // Usar o objeto completo do agendamento
        const resultado = await atualizarStatusAgendamento(agendamento, 'Em atendimento');
        
        if (resultado) {
            // Atualizar localmente
            agendamentosAtivos = agendamentosAtivos.map(a => 
                a.id === agendamentoId ? { ...a, status: 'Em atendimento' } : a
            );
            
            renderizarPainelAgendamento();
            mostrarMensagem(`🔔 Chamando ${agendamento.cliente_nome}`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Erro ao chamar próximo:', error);
        mostrarMensagem('Erro ao chamar cliente', 'error');
    }
}

// ============================================
// GERAR SENHA BASEADA NO SERVIÇO
// ============================================
function gerarSenha(numero, servicoId, servicosConfig = {}) {
    // Buscar a abreviação do serviço na configuração
    // Se não encontrar, usa as primeiras 3-4 letras do serviço como fallback
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
// GERENCIAR FILA DE ATENDIMENTO - INDEPENDENTE POR SERVIÇO
// ============================================
async function gerenciarFilaAtendimento() {
    try {
        console.log('🔄 Gerenciando fila de atendimento (independente por serviço)...');
        
        if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            console.log('📭 Fila vazia');
            return;
        }
        
        // Agrupar agendamentos por serviço
        const agendamentosPorServico = {};
        
        agendamentosAtivos.forEach(ag => {
            if (!agendamentosPorServico[ag.servico_id]) {
                agendamentosPorServico[ag.servico_id] = [];
            }
            agendamentosPorServico[ag.servico_id].push(ag);
        });
        
        console.log('📊 Agendamentos por serviço:', Object.keys(agendamentosPorServico).length);
        
        // Processar cada serviço independentemente
        for (const [servicoId, agendamentos] of Object.entries(agendamentosPorServico)) {
            console.log(`\n🔧 Processando serviço: ${servicoId} (${agendamentos.length} agendamentos)`);
            
            // Ordenar por data/hora
            const ordenados = agendamentos.sort((a, b) => a.timestamp - b.timestamp);
            
            // Identificar status atuais para este serviço
            const emAtendimento = ordenados.find(a => a.status === 'Em atendimento');
            const proximoAtender = ordenados.find(a => a.status === 'Próximo a atender');
            
            // Filtrar quem está na fila (exclui Em atendimento)
            const fila = ordenados.filter(a => 
                a.status !== 'Em atendimento' && 
                ['Na fila', 'Verificado', 'Pendente'].includes(a.status)
            );
            
            console.log(`  📊 Status atual do serviço ${servicoId}:`, {
                emAtendimento: emAtendimento?.cliente_nome || 'ninguém',
                proximoAtender: proximoAtender?.cliente_nome || 'ninguém',
                naFila: fila.length
            });
            
            // REGRA 1: SE NÃO TEM NINGUÉM EM ATENDIMENTO NESTE SERVIÇO
            if (!emAtendimento) {
                console.log(`  📞 Ninguém em atendimento no serviço ${servicoId} - preciso chamar alguém`);
                
                if (proximoAtender) {
                    console.log(`  ➡️ Chamando ${proximoAtender.cliente_nome} para atendimento no serviço ${servicoId}`);
                    
                    const resultado = await atualizarStatusAgendamento(proximoAtender, 'Em atendimento');
                    
                    if (resultado) {
                        // Não precisamos atualizar localmente, o onSnapshot vai atualizar
                        console.log(`  ✅ ${proximoAtender.cliente_nome} agora está em atendimento`);
                    }
                    continue; // Passa para o próximo serviço
                }
                
                if (fila.length > 0) {
                    const primeiroDaFila = fila[0];
                    console.log(`  ➡️ Primeiro da fila ${primeiroDaFila.cliente_nome} vai para atendimento no serviço ${servicoId}`);
                    
                    const resultado = await atualizarStatusAgendamento(primeiroDaFila, 'Em atendimento');
                    
                    if (resultado) {
                        console.log(`  ✅ ${primeiroDaFila.cliente_nome} agora está em atendimento`);
                    }
                    continue; // Passa para o próximo serviço
                }
            }
            
            // REGRA 2: SE TEM ALGUÉM EM ATENDIMENTO NESTE SERVIÇO
            if (emAtendimento) {
                console.log(`  👤 Em atendimento no serviço ${servicoId}: ${emAtendimento.cliente_nome}`);
                
                // Se não tem próximo definido e tem fila, promover o primeiro da fila
                if (!proximoAtender && fila.length > 0) {
                    // Filtrar para não incluir quem já está em atendimento
                    const filaSemAtendimento = fila.filter(a => a.id !== emAtendimento.id);
                    
                    if (filaSemAtendimento.length > 0) {
                        const primeiroDaFila = filaSemAtendimento[0];
                        console.log(`  ⬆️ ${primeiroDaFila.cliente_nome} agora é o próximo a atender no serviço ${servicoId}`);
                        
                        const resultado = await atualizarStatusAgendamento(primeiroDaFila, 'Próximo a atender');
                        
                        if (resultado) {
                            console.log(`  ✅ ${primeiroDaFila.cliente_nome} promovido a próximo`);
                        }
                    }
                }
            }
        }
        
        console.log('✅ Fila organizada corretamente (todos os serviços processados)');
        
    } catch (error) {
        console.error('❌ Erro ao gerenciar fila:', error);
    }
}

// ============================================
// RENDERIZAR PAINEL AGENDAMENTO - VERSÃO CORRIGIDA
// ============================================
function renderizarPainelAgendamento() {
    if (!agendamentoHabilitado) return;
    
    console.log('📅 Renderizando painel de agendamento...');
    console.log('Agendamentos ativos (HOJE):', agendamentosAtivos);
    
    // ============================================
    // ORGANIZAR POR STATUS
    // ============================================
    const emAtendimento = agendamentosAtivos.filter(a => a.status === 'Em atendimento');
    const proximosAtender = agendamentosAtivos.filter(a => a.status === 'Próximo a atender');
    const outrosNaFila = agendamentosAtivos.filter(a => 
        a.status !== 'Em atendimento' && 
        a.status !== 'Próximo a atender' &&
        ['Na fila', 'Verificado'].includes(a.status)
    );
    
    // ============================================
    // ATUALIZAR BADGES
    // ============================================
    const totalOutrosBadge = document.getElementById('totalOutrosBadge');
    if (totalOutrosBadge) totalOutrosBadge.textContent = outrosNaFila.length;
    
    const totalFilaBadge = document.getElementById('totalFilaBadge');
    if (totalFilaBadge) totalFilaBadge.textContent = proximosAtender.length;
    
    const totalFilaTexto = document.getElementById('totalFilaTexto');
    if (totalFilaTexto) totalFilaTexto.textContent = proximosAtender.length + outrosNaFila.length;
    
    // Tempo médio
    calcularTempoMedioEsperaReal().then(tempoEstimado => {
        const tempoMedioEspera = document.getElementById('tempoMedioEspera');
        if (tempoMedioEspera) tempoMedioEspera.textContent = tempoEstimado;
    });
    
    // ============================================
    // COLUNA 1: EM ATENDIMENTO (DIREITA)
    // ============================================
    const chamandoEl = document.getElementById('chamandoAgoraCard');
    if (chamandoEl) {
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
    // COLUNA 2: PRÓXIMOS A ATENDER (MEIO)
    // ============================================
    const proximosEl = document.getElementById('proximosFilaCard');
    if (proximosEl) {
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
    // COLUNA 3: OUTROS NA FILA (ESQUERDA) 
    // PRIMEIRO DA FILA (MAIS ANTIGO) À DIREITA
    // ============================================
    const proximosTrack = document.getElementById('proximasSenhasTrack');
    if (proximosTrack) {
        if (outrosNaFila.length > 0) {
            // Agrupar por serviço
            const agendamentosPorServico = {};
            
            outrosNaFila.forEach(item => {
                if (!agendamentosPorServico[item.servico_id]) {
                    agendamentosPorServico[item.servico_id] = {
                        nome: item.servico_nome,
                        itens: []
                    };
                }
                agendamentosPorServico[item.servico_id].itens.push(item);
            });
    
            // Converter para array de serviços e ordenar
            const servicosArray = Object.entries(agendamentosPorServico).map(([id, dados]) => ({
                id,
                nome: dados.nome,
                itens: dados.itens.sort((a, b) => a.timestamp - b.timestamp) // mais antigo primeiro
            })).sort((a, b) => a.nome.localeCompare(b.nome));
    
            // Paginação: 2 serviços por página
            const servicosPorPagina = 2;
            const totalPaginas = Math.ceil(servicosArray.length / servicosPorPagina);
            
            let html = `
                <div class="servicos-paginados">
                    <div class="servicos-pages" id="servicosPages">
            `;
    
            for (let pagina = 0; pagina < totalPaginas; pagina++) {
                const inicio = pagina * servicosPorPagina;
                const fim = inicio + servicosPorPagina;
                const servicosPagina = servicosArray.slice(inicio, fim);
    
                html += `<div class="servicos-page ${pagina === 0 ? 'active' : ''}" data-page="${pagina}">`;
    
                servicosPagina.forEach(servico => {
                    const servicoIdSafe = servico.id.replace(/[^a-zA-Z0-9]/g, '_');
                    const itensOrdenados = servico.itens; // do mais antigo (index 0) para o mais novo (último)
                    
                    html += `
                        <div class="fila-servico">
                            <div class="fila-servico-header">
                                <i class="fas fa-star"></i>
                                <h4 title="${servico.nome}">${servico.nome}</h4>
                                <span class="servico-count">${itensOrdenados.length}</span>
                            </div>
                            
                            <div class="servico-carousel-container">
                                <button class="servico-arrow prev" onclick="scrollServico('${servicoIdSafe}', -200)" ${itensOrdenados.length <= 2 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                
                                <div class="servico-scroll" id="servico-${servicoIdSafe}-scroll">
                                    <div class="servico-track cards-alinhados-direita">
                    `;
    
                    // Manter ordem natural (mais antigo primeiro)
                    itensOrdenados.forEach((item, idx) => {
                        const posicaoReal = idx + 1; // 1° na fila, 2°, etc.
                        html += `
                            <div class="servico-card" data-posicao="${posicaoReal}">
                                <div class="senha-numero">${item.senha}</div>
                                <div class="senha-cliente">${item.cliente_nome}</div>
                                <span class="senha-posicao">${posicaoReal}° na fila</span>
                            </div>
                        `;
                    });
    
                    html += `
                                    </div>
                                </div>
                                
                                <button class="servico-arrow next" onclick="scrollServico('${servicoIdSafe}', 200)" ${itensOrdenados.length <= 2 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            
                            <div class="servico-page-dots" id="servico-${servicoIdSafe}-dots">
                    `;
    
                    const totalPages = Math.ceil(itensOrdenados.length / 2);
                    for (let i = 0; i < totalPages; i++) {
                        html += `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToServicoPage('${servicoIdSafe}', ${i})"></span>`;
                    }
    
                    html += `
                            </div>
                        </div>
                    `;
                });
    
                html += `</div>`; // fecha .servicos-page
            }
    
            html += `
                    </div>
                    
                    ${totalPaginas > 1 ? `
                    <div class="servicos-paginacao">
                        <button class="pagina-arrow prev" id="paginaPrev" ${totalPaginas <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="pagina-indicador" id="paginaAtual">1/${totalPaginas}</span>
                        <button class="pagina-arrow next" id="paginaNext" ${totalPaginas <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
    
            proximosTrack.innerHTML = html;
    
            // Controle de páginas de serviços
            if (totalPaginas > 1) {
                let paginaCorrente = 0;
                const pages = document.querySelectorAll('.servicos-page');
                const prevBtn = document.getElementById('paginaPrev');
                const nextBtn = document.getElementById('paginaNext');
                const indicador = document.getElementById('paginaAtual');
    
                function mostrarPagina(index) {
                    pages.forEach((page, i) => {
                        page.classList.toggle('active', i === index);
                    });
                    paginaCorrente = index;
                    if (indicador) indicador.textContent = `${index + 1}/${totalPaginas}`;
                    if (prevBtn) prevBtn.disabled = index === 0;
                    if (nextBtn) nextBtn.disabled = index === totalPaginas - 1;
                }
    
                prevBtn?.addEventListener('click', () => {
                    if (paginaCorrente > 0) mostrarPagina(paginaCorrente - 1);
                });
    
                nextBtn?.addEventListener('click', () => {
                    if (paginaCorrente < totalPaginas - 1) mostrarPagina(paginaCorrente + 1);
                });
            }
    
            // Configurar scroll e dots para cada serviço
            setTimeout(() => {
                servicosArray.forEach(servico => {
                    const servicoIdSafe = servico.id.replace(/[^a-zA-Z0-9]/g, '_');
                    configurarScrollServico(servicoIdSafe);
                });
            }, 200);
    
        } else {
            // Placeholder quando não há agendamentos
            proximosTrack.innerHTML = `
                <div class="servicos-paginados">
                    <div class="servicos-pages">
                        <div class="servicos-page active">
                            <div class="fila-servico">
                                <div class="fila-servico-header">
                                    <i class="fas fa-star"></i>
                                    <h4>Aguardando...</h4>
                                    <span class="servico-count">0</span>
                                </div>
                                <div class="servico-carousel-container">
                                    <button class="servico-arrow prev" disabled>
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <div class="servico-scroll">
                                        <div class="servico-track cards-alinhados-direita">
                                            <div class="servico-card-placeholder">
                                                <div class="placeholder-icon">
                                                    <i class="fas fa-clock"></i>
                                                </div>
                                                <div class="placeholder-text">
                                                    Sem agendamentos
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button class="servico-arrow next" disabled>
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
            
    // ============================================
    // 🔥 CORREÇÃO 1: BOTÃO DE CARROSSEL POSICIONADO ANTES DA BADGE
    // ============================================
    setTimeout(() => {
        const colunaOutros = document.querySelector('.coluna-outros');
        if (colunaOutros) {
            const colunaHeader = colunaOutros.querySelector('.coluna-header');
            if (colunaHeader) {
                // Encontrar elementos existentes
                const icon = colunaHeader.querySelector('i:first-child');
                const title = colunaHeader.querySelector('h3');
                const badge = colunaHeader.querySelector('.coluna-badge');
                
                // Verificar se já existe botão
                let btnCarrossel = document.getElementById('btnCarrosselOutros');
                
                if (!btnCarrossel) {
                    // Criar botão
                    btnCarrossel = document.createElement('button');
                    btnCarrossel.id = 'btnCarrosselOutros';
                    btnCarrossel.className = 'btn-carrossel-outros ativo';
                    btnCarrossel.innerHTML = '<i class="fas fa-play"></i>';
                    btnCarrossel.title = 'Rolagem automática (ligada)';
                    
                    // Limpar o header e reconstruir na ordem correta
                    colunaHeader.innerHTML = '';
                    
                    // Reconstruir na ordem: ícone, título, BOTÃO, badge
                    if (icon) colunaHeader.appendChild(icon.cloneNode(true));
                    if (title) colunaHeader.appendChild(title.cloneNode(true));
                    colunaHeader.appendChild(btnCarrossel);
                    if (badge) colunaHeader.appendChild(badge.cloneNode(true));
                    
                    // Re-adicionar evento de clique
                    let ativo = true;
                    
                    btnCarrossel.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        ativo = !ativo;
                        carrosselAutomaticoAtivo = ativo;
                        
                        if (ativo) {
                            btnCarrossel.classList.add('ativo');
                            btnCarrossel.innerHTML = '<i class="fas fa-play"></i>';
                            btnCarrossel.title = 'Rolagem automática (ligada)';
                            iniciarCarrosselAutomaticoSuave(); // Usar a versão mais suave
                        } else {
                            btnCarrossel.classList.remove('ativo');
                            btnCarrossel.innerHTML = '<i class="fas fa-pause"></i>';
                            btnCarrossel.title = 'Rolagem automática (desligada)';
                            pararCarrosselAutomatico();
                        }
                    });
                } else {
                    // Se já existe, garantir que está na posição correta
                    // Mover o botão para antes da badge
                    if (badge && btnCarrossel.nextSibling !== badge) {
                        colunaHeader.insertBefore(btnCarrossel, badge);
                    }
                }
            }
        }
    }, 100);
    
    // Atualizar dots e configurar scroll após renderizar
    setTimeout(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const servicoId = scrollEl.id.replace('servico-', '').replace('-scroll', '');
            configurarScrollServico(servicoId);
            
            scrollEl.addEventListener('scroll', function() {
                atualizarDotsServico(servicoId);
            });
        });
        
        // 🔥 CONFIGURAR PAUSA E INICIAR CARROSSEL
        configurarPausaAoInteragir();
        
        // 🔥 INICIAR CARROSSEL AUTOMÁTICO SE ESTIVER ATIVO
        if (carrosselAutomaticoAtivo) {
            iniciarCarrosselSenhasAutomatico();
        }
        
    }, 200);
}

// ============================================
// INICIAR CARROSSEL AUTOMÁTICO DAS SENHAS
// ============================================
function iniciarCarrosselSenhasAutomatico() {
    // Verificar se o carrossel está ativo
    if (!carrosselAutomaticoAtivo) return;
    
    console.log('🎠 Iniciando carrossel automático das senhas...');
    
    // Parar qualquer intervalo anterior
    if (carrosselAutomaticoInterval) {
        clearInterval(carrosselAutomaticoInterval);
    }
    
    // Iniciar novo intervalo
    carrosselAutomaticoInterval = setInterval(() => {
        document.querySelectorAll('.servico-scroll').forEach(scrollEl => {
            const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
            if (maxScroll <= 0) return;
            
            const cardWidth = 192; // 180px + 12px gap
            const currentScroll = scrollEl.scrollLeft;
            
            // Calcular próximo card
            let nextScroll = currentScroll + cardWidth;
            
            // Se passou do fim, volta para o início
            if (nextScroll > maxScroll) {
                nextScroll = 0;
            }
            
            // Usar behavior 'smooth' para animação suave
            scrollEl.scrollTo({
                left: nextScroll,
                behavior: 'smooth'
            });
        });
    }, 5000); // 5 segundos por card
}

// ============================================
// VERIFICAR E INICIAR CARROSSEL APÓS RENDERIZAÇÃO
// ============================================
function verificarEIniciarCarrossel() {
    // Verificar se existem elementos .servico-scroll
    const temScroll = document.querySelectorAll('.servico-scroll').length > 0;
    
    if (temScroll && carrosselAutomaticoAtivo) {
        console.log('🎠 Elementos encontrados, iniciando carrossel...');
        iniciarCarrosselSenhasAutomatico();
    } else {
        console.log('⏳ Aguardando elementos do carrossel...');
        // Tentar novamente após 1 segundo
        setTimeout(verificarEIniciarCarrossel, 1000);
    }
}

// ============================================
// FINALIZAR ATENDIMENTO (chamar quando o atendimento terminar)
// ============================================
async function finalizarAtendimento(agendamento) {
    try {
        const agora = new Date();
        
        // Extrair componentes
        const servicoId = agendamento.servico_id;
        const agendamentoId = agendamento.agendamento_id;
        
        // Mês e ano
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        const diaAtual = String(hoje.getDate()).padStart(2, '0');
        const dataFormatada = `${diaAtual}_${mesAtual}_${anoAtual}`;
        
        // Referência para o documento do dia
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual,
            dataFormatada
        );
        
        // Calcular tempo de atendimento (se tiver registro de início)
        let tempoAtendimento = null;
        if (agendamento.inicio_atendimento) {
            const inicio = new Date(agendamento.inicio_atendimento);
            tempoAtendimento = Math.round((agendamento.fim_atendimento - inicio) / (1000 * 60));
        }
        
        await updateDoc(diaDocRef, {
            [`${servicoId}.${agendamentoId}.status_agendamento`]: 'Finalizado',
            [`${servicoId}.${agendamentoId}.fim_atendimento`]: agora,
            [`${servicoId}.${agendamentoId}.tempo_atendimento`]: tempoAtendimento
        });
        
        console.log(`✅ Atendimento finalizado, tempo: ${tempoAtendimento} min`);
        
    } catch (error) {
        console.error('❌ Erro ao finalizar atendimento:', error);
    }
}

// ============================================
// ATUALIZAR DOTS DO SERVIÇO
// ============================================
function atualizarDotsServico(servicoId) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (!scrollEl) return;
    
    const scrollLeft = scrollEl.scrollLeft;
    const cardWidth = 192; // 180px card + 12px gap
    const pageIndex = Math.round(scrollLeft / cardWidth);
    
    const dots = document.querySelectorAll(`#servico-${servicoId}-dots .dot`);
    dots.forEach((dot, idx) => {
        if (idx === pageIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// ============================================
// CALCULAR TEMPO MÉDIO DE ESPERA (BASEADO EM ATENDIMENTOS REAIS)
// ============================================
async function calcularTempoMedioEsperaReal() {
    try {
        // Se não há ninguém na fila, retorna 0
        const totalNaFila = agendamentosAtivos.filter(a => 
            ['Na fila', 'Verificado', 'Próximo a atender'].includes(a.status)
        ).length;
        
        if (totalNaFila === 0) {
            return 0;
        }
        
        // Buscar últimos atendimentos finalizados para calcular média
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        // Buscar últimos 3 meses de agendamentos para ter uma amostra maior
        const meses = [];
        for (let i = 0; i < 3; i++) {
            const data = new Date(anoAtual, hoje.getMonth() - i, 1);
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            meses.push(`${mes}_${ano}`);
        }
        
        let temposAtendimento = [];
        let totalAtendimentos = 0;
        let tempoTotal = 0;
        
        // Buscar agendamentos finalizados dos últimos meses
        for (const mesAno of meses) {
            // Referência para a coleção de dias do mês
            const diasRef = collection(db, 'agendamentos', lojaIdAtual, mesAno);
            const diasSnapshot = await getDocs(diasRef);
            
            diasSnapshot.forEach(diaDoc => {
                const diaData = diaDoc.data();
                
                // Percorrer serviços e agendamentos
                Object.values(diaData).forEach(servicoMap => {
                    Object.values(servicoMap).forEach(agendamento => {
                        // Verificar se o agendamento foi finalizado (status que indicam conclusão)
                        if (agendamento.status === 'Finalizado' || 
                            agendamento.status === 'Atendido' ||
                            agendamento.status === 'Concluído') {
                            
                            // Se tiver registro de tempo de atendimento
                            if (agendamento.tempo_atendimento) {
                                temposAtendimento.push(agendamento.tempo_atendimento);
                                tempoTotal += agendamento.tempo_atendimento;
                                totalAtendimentos++;
                            } 
                            // Se tiver horário de início e fim, calcular
                            else if (agendamento.inicio_atendimento && agendamento.fim_atendimento) {
                                const inicio = agendamento.inicio_atendimento?.toDate?.() || new Date(agendamento.inicio_atendimento);
                                const fim = agendamento.fim_atendimento?.toDate?.() || new Date(agendamento.fim_atendimento);
                                
                                if (inicio && fim && fim > inicio) {
                                    const tempoMinutos = Math.round((fim - inicio) / (1000 * 60));
                                    temposAtendimento.push(tempoMinutos);
                                    tempoTotal += tempoMinutos;
                                    totalAtendimentos++;
                                }
                            }
                        }
                    });
                });
            });
        }
        
        // Se não temos dados históricos, usar média padrão de 15 minutos
        if (totalAtendimentos === 0) {
            console.log('📊 Sem dados históricos, usando média padrão de 15 min');
            return totalNaFila * 15;
        }
        
        // Calcular média dos últimos atendimentos
        const mediaMinutos = Math.round(tempoTotal / totalAtendimentos);
        
        // Calcular tempo estimado baseado na posição na fila
        // Quem está na frente: Próximos a atender + Outros na fila
        const posicaoNaFila = agendamentosAtivos.filter(a => 
            a.status === 'Próximo a atender' || 
            (a.status !== 'Em atendimento' && ['Na fila', 'Verificado'].includes(a.status))
        ).length;
        
        // Se tem alguém em atendimento, adicionar 1
        const temAlguemAtendendo = agendamentosAtivos.some(a => a.status === 'Em atendimento');
        const pessoasNaFrente = posicaoNaFila + (temAlguemAtendendo ? 1 : 0);
        
        const tempoEstimado = pessoasNaFrente * mediaMinutos;
        
        console.log(`📊 Média real de atendimento: ${mediaMinutos} min (baseado em ${totalAtendimentos} atendimentos)`);
        console.log(`⏱️ Tempo estimado: ${pessoasNaFrente} pessoas × ${mediaMinutos} min = ${tempoEstimado} min`);
        
        return tempoEstimado;
        
    } catch (error) {
        console.error('❌ Erro ao calcular tempo médio real:', error);
        // Fallback: cálculo simples baseado em 15 minutos
        const totalNaFila = agendamentosAtivos.filter(a => 
            ['Na fila', 'Verificado', 'Próximo a atender'].includes(a.status)
        ).length;
        return totalNaFila * 15;
    }
}



// ============================================
// FUNÇÃO PARA ATUALIZAR DOTS DO SCROLL
// ============================================
function atualizarDotsScroll(totalItens) {
    const dotsContainer = document.getElementById('scrollDots');
    if (!dotsContainer) return;
    
    // Para a coluna 3, os dots representam as fileiras de serviços
    const numDots = Math.min(totalItens, 5);
    
    let dotsHtml = '';
    for (let i = 0; i < numDots; i++) {
        dotsHtml += `<span class="dot ${i === 0 ? 'active' : ''}"></span>`;
    }
    
    dotsContainer.innerHTML = dotsHtml;
}

// ============================================
// PARAR ESCUTA DE AGENDAMENTOS
// ============================================
function pararEscutaAgendamentos() {
    if (unsubscribeAgendamentos) {
        unsubscribeAgendamentos();
        unsubscribeAgendamentos = null;
        console.log('📅 Escuta de agendamentos parada');
    }
    
    if (intervaloAtualizacaoAgendamento) {
        clearInterval(intervaloAtualizacaoAgendamento);
        intervaloAtualizacaoAgendamento = null;
    }
}

// ============================================
// INICIALIZAR CARROSSEL DE AGENDAMENTO
// ============================================
let agendamentoSwiper = null;

function inicializarCarrosselAgendamento() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    if (agendamentoSwiper) {
        agendamentoSwiper.destroy(true, true);
    }
    
    agendamentoSwiper = new Swiper('.agendamento-swiper', {
        slidesPerView: 1,
        spaceBetween: 15,
        loop: false,
        autoplay: false,
        pagination: {
            el: '.agendamento-pagination',
            clickable: true,
        },
        navigation: {
            prevEl: '#agendamentoPrev',
            nextEl: '#agendamentoNext',
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
        },
    });
    
    console.log('✅ Carrossel de agendamento inicializado');
}

// ============================================
// ABRIR MODAL NOVA SENHA HOJE - VERSÃO CORRIGIDA
// ============================================
async function abrirModalNovaSenhaHoje() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para gerar uma senha', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('📅 Abrindo modal Nova Senha Hoje');
    
    const modal = document.getElementById('novaSenhaHojeModal');
    if (!modal) {
        console.error('❌ Modal novaSenhaHojeModal não encontrado');
        return;
    }
    
    // Verificar se é funcionário/admin
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    const tipo = dadosUsuario.tipo;
    const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                          perfil === 'admin' || perfil === 'gerente' || 
                          perfil === 'supervisor' || perfil === 'vendedor');
    
    console.log('👤 Perfil do usuário:', perfil, 'isFuncionario:', isFuncionario);
    
    // 🔥 USAR A MESMA FUNÇÃO EXISTENTE - Verificar se já existe campo de seleção de cliente
    let clienteField = document.getElementById('clienteSelectField');
    
    if (isFuncionario) {
        // Se não existir, criar campo de seleção de cliente (usando a mesma estrutura)
        if (!clienteField) {
            const form = document.querySelector('#novaSenhaHojeModal .senha-rapida-form');
            if (form) {
                clienteField = document.createElement('div');
                clienteField.className = 'form-group';
                clienteField.id = 'clienteSelectField';
                clienteField.innerHTML = `
                    <label><i class="fas fa-user"></i> Cliente</label>
                    <select id="clienteSelect" class="form-select">
                        <option value="">Selecionar cliente...</option>
                    </select>
                    <small><i class="fas fa-info-circle"></i> Funcionário pode gerar senha para clientes</small>
                `;
                
                // Inserir antes do campo de serviço
                const servicoGroup = document.getElementById('senhaRapidaServico')?.closest('.form-group');
                if (servicoGroup) {
                    form.insertBefore(clienteField, servicoGroup);
                }
            }
        }
        
        // 🔥 USAR A FUNÇÃO EXISTENTE para carregar clientes
        await carregarClientesParaSelect();
        
    } else {
        // Se for cliente, remover campo se existir
        if (clienteField) {
            clienteField.remove();
        }
    }
    
    // Limpar formulário
    const servicoSelect = document.getElementById('senhaRapidaServico');
    const dataInput = document.getElementById('senhaRapidaData');
    const horarioInput = document.getElementById('senhaRapidaHorario');
    
    if (servicoSelect) {
        servicoSelect.innerHTML = '<option value="">Carregando serviços...</option>';
        servicoSelect.disabled = true;
    }
    
    if (dataInput) {
        // Setar data atual e desabilitar
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.value = `${ano}-${mes}-${dia}`;
        dataInput.disabled = true;
    }
    
    if (horarioInput) {
        horarioInput.value = 'Selecione um serviço primeiro';
        horarioInput.disabled = true;
    }
    
    // Carregar serviços com horários mais cedo disponíveis
    await carregarServicosComPrimeiroHorario();
    
    modal.classList.add('active');
}

// ============================================
// CARREGAR SERVIÇOS COM PRIMEIRO HORÁRIO DISPONÍVEL
// ============================================
async function carregarServicosComPrimeiroHorario() {
    const servicoSelect = document.getElementById('senhaRapidaServico');
    if (!servicoSelect) return;
    
    try {
        // Carregar todos os serviços ativos
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual
        );
        
        const snapshot = await getDocs(servicosRef);
        const servicos = [];
        
        snapshot.forEach(doc => {
            servicos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (servicos.length === 0) {
            servicoSelect.innerHTML = '<option value="">Nenhum serviço disponível</option>';
            servicoSelect.disabled = true;
            return;
        }
        
        // Data de hoje
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataHoje = `${ano}-${mes}-${dia}`;
        
        servicoSelect.innerHTML = '<option value="">Selecione um serviço...</option>';
        
        // Para cada serviço, encontrar o primeiro horário disponível
        for (const servico of servicos) {
            const primeiroHorario = await encontrarPrimeiroHorarioDisponivel(servico, dataHoje);
            
            if (primeiroHorario) {
                const option = document.createElement('option');
                option.value = servico.id;
                option.textContent = `${servico.nome} - ${primeiroHorario}`;
                option.dataset.primeiroHorario = primeiroHorario;
                option.dataset.config = JSON.stringify(servico);
                servicoSelect.appendChild(option);
            } else {
                // Serviço sem horários disponíveis hoje
                const option = document.createElement('option');
                option.value = servico.id;
                option.textContent = `${servico.nome} - ⚠️ LOTADO HOJE`;
                option.dataset.primeiroHorario = '';
                option.dataset.config = JSON.stringify(servico);
                option.disabled = true;
                servicoSelect.appendChild(option);
            }
        }
        
        servicoSelect.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        servicoSelect.innerHTML = '<option value="">Erro ao carregar serviços</option>';
        servicoSelect.disabled = true;
    }
}

// ============================================
// ENCONTRAR PRIMEIRO HORÁRIO DISPONÍVEL DO DIA
// ============================================
async function encontrarPrimeiroHorarioDisponivel(servico, data) {
    try {
        // ============================================
        // 1. CARREGAR HORÁRIO DE FUNCIONAMENTO DA LOJA
        // ============================================
        let lojaAbertura = "00:00";
        let lojaFechamento = "23:59";
        
        if (window.loginDb) {
            const lojaDoc = await window.loginDb
                .collection('lojas')
                .doc(lojaIdAtual)
                .get();
            
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                
                const dataObj = new Date(data + 'T12:00:00');
                const diaSemana = dataObj.getDay();
                
                const diasMap = {
                    0: 'domingo',
                    1: 'segunda',
                    2: 'terca',
                    3: 'quarta',
                    4: 'quinta',
                    5: 'sexta',
                    6: 'sabado'
                };
                
                const diaId = diasMap[diaSemana];
                
                if (dados.funcionamento && dados.funcionamento[diaId]) {
                    const horarioLoja = dados.funcionamento[diaId];
                    
                    if (horarioLoja && horarioLoja.trim() !== '') {
                        const match = horarioLoja.match(/(\d{2}:\d{2})h às (\d{2}:\d{2})h/);
                        if (match) {
                            lojaAbertura = match[1];
                            lojaFechamento = match[2];
                        }
                    } else {
                        // Loja fechada
                        return null;
                    }
                }
            }
        }
        
        // ============================================
        // 2. VERIFICAR CONFIGURAÇÃO DO SERVIÇO
        // ============================================
        const dataObj = new Date(data + 'T12:00:00');
        const diaSemana = dataObj.getDay();
        
        const diasMap = {
            0: 'domingo',
            1: 'segunda',
            2: 'terca',
            3: 'quarta',
            4: 'quinta',
            5: 'sexta',
            6: 'sabado'
        };
        
        const diaId = diasMap[diaSemana];
        
        // Verificar se o dia está nos dias ativos
        const diasAtivos = servico.diasAtivos || [];
        if (!diasAtivos.includes(diaId)) {
            return null;
        }
        
        // Pegar configuração específica do dia
        const configDia = servico.configuracoesPorDia?.[diaId];
        if (!configDia || !configDia.ativo) {
            return null;
        }
        
        // ============================================
        // 3. CONVERTER PARA MINUTOS
        // ============================================
        function timeToMinutes(time) {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        }
        
        const minutosLojaAbertura = timeToMinutes(lojaAbertura);
        const minutosLojaFechamento = timeToMinutes(lojaFechamento);
        
        const [hInicio, mInicio] = configDia.inicio.split(':').map(Number);
        const [hFim, mFim] = configDia.fim.split(':').map(Number);
        const duracao = configDia.duracao || 30;
        const intervaloEntre = configDia.intervaloEntre || 0;
        
        let minutosInicioServico = hInicio * 60 + mInicio;
        const minutosFimServico = hFim * 60 + mFim;
        
        // Interseção com horário da loja
        let minutosInicio = Math.max(minutosInicioServico, minutosLojaAbertura);
        let minutosFim = Math.min(minutosFimServico, minutosLojaFechamento);
        
        if (minutosInicio >= minutosFim) {
            return null;
        }
        
        // ============================================
        // 4. GERAR TODOS OS HORÁRIOS POSSÍVEIS
        // ============================================
        const horarios = [];
        let minutosAtual = minutosInicio;
        
        while (minutosAtual + duracao <= minutosFim) {
            const hora = Math.floor(minutosAtual / 60);
            const minuto = minutosAtual % 60;
            const horarioStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
            
            horarios.push(horarioStr);
            minutosAtual += duracao + intervaloEntre;
        }
        
        // Filtrar intervalo de almoço
        let horariosFiltrados = horarios;
        if (configDia.intervaloInicio && configDia.intervaloFim) {
            const [hIntInicio, mIntInicio] = configDia.intervaloInicio.split(':').map(Number);
            const [hIntFim, mIntFim] = configDia.intervaloFim.split(':').map(Number);
            
            const minutosIntInicio = hIntInicio * 60 + mIntInicio;
            const minutosIntFim = hIntFim * 60 + mIntFim;
            
            horariosFiltrados = horarios.filter(horario => {
                const [h, m] = horario.split(':').map(Number);
                const minutos = h * 60 + m;
                return minutos < minutosIntInicio || minutos >= minutosIntFim;
            });
        }
        
        // Filtrar horários que já passaram (apenas para hoje)
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minAtual = agora.getMinutes();
        
        horariosFiltrados = horariosFiltrados.filter(horario => {
            const [h, m] = horario.split(':').map(Number);
            return (h > horaAtual) || (h === horaAtual && m > minAtual);
        });
        
        // ============================================
        // 5. VERIFICAR AGENDAMENTOS JÁ EXISTENTES
        // ============================================
        if (horariosFiltrados.length === 0) {
            return null;
        }
        
        // Extrair componentes da data
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`;
        const dataFormatada = `${dia}_${mes}_${ano}`;
        
        // Referência para o documento do dia
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada
        );
        
        const docSnap = await getDoc(diaDocRef);
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            const agendamentosServico = dados[servico.id] || {};
            
            // Para cada horário, verificar se já tem agendamento
            for (const horario of horariosFiltrados) {
                const [h, m] = horario.split(':').map(Number);
                const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
                
                let horarioOcupado = false;
                
                // Verificar se algum agendamento já existe neste horário
                for (const [agendamentoId, agendamento] of Object.entries(agendamentosServico)) {
                    if (agendamento.data_hora_agendada) {
                        const dataHoraExistente = agendamento.data_hora_agendada?.toDate?.() || 
                                                  new Date(agendamento.data_hora_agendada);
                        
                        if (dataHoraExistente.getTime() === dataHoraAgendada.getTime()) {
                            horarioOcupado = true;
                            break;
                        }
                    }
                }
                
                if (!horarioOcupado) {
                    // Encontrou o primeiro horário disponível!
                    return horario;
                }
            }
            
            // Todos os horários estão ocupados
            return null;
        } else {
            // Nenhum agendamento para hoje - primeiro horário disponível
            return horariosFiltrados[0];
        }
        
    } catch (error) {
        console.error('❌ Erro ao encontrar primeiro horário:', error);
        return null;
    }
}

// ============================================
// CARREGAR PRIMEIRO HORÁRIO QUANDO SELECIONAR SERVIÇO
// ============================================
window.carregarPrimeiroHorarioDisponivel = async function(event) {
    const select = event.target;
    const servicoId = select.value;
    const horarioInput = document.getElementById('senhaRapidaHorario');
    
    if (!servicoId || !horarioInput) {
        if (horarioInput) horarioInput.value = 'Selecione um serviço';
        return;
    }
    
    const selectedOption = select.selectedOptions[0];
    const primeiroHorario = selectedOption.dataset.primeiroHorario;
    
    if (primeiroHorario) {
        horarioInput.value = primeiroHorario;
        horarioInput.disabled = false;
    } else {
        horarioInput.value = 'Sem horários disponíveis hoje';
        horarioInput.disabled = true;
    }
};

// ============================================
// CONFIRMAR NOVA SENHA HOJE - VERSÃO COMPLETA E CORRIGIDA
// ============================================
document.getElementById('btnConfirmarSenhaHoje')?.addEventListener('click', async function() {
    try {
        // ============================================
        // 1. VALIDAÇÕES
        // ============================================
        const servicoSelect = document.getElementById('senhaRapidaServico');
        const horarioInput = document.getElementById('senhaRapidaHorario');
        const dataInput = document.getElementById('senhaRapidaData');
        
        const servico = servicoSelect?.value;
        const servicoText = servicoSelect?.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const horario = horarioInput?.value;
        const data = dataInput?.value;
        
        if (!servico) {
            mostrarMensagem('Selecione um serviço', 'warning');
            return;
        }
        
        if (!horario || horario === 'Selecione um serviço primeiro' || horario === 'Sem horários disponíveis hoje') {
            mostrarMensagem('Horário não disponível', 'warning');
            return;
        }
        
        if (!usuarioLogado || !dadosUsuario) {
            mostrarMensagem('Faça login para gerar senha', 'warning');
            fecharModal('novaSenhaHojeModal');
            abrirModal('loginModal');
            return;
        }
        
        mostrarLoading('Gerando senha...');
        
        // ============================================
        // 2. VERIFICAR SE É FUNCIONÁRIO E SELECIONOU CLIENTE
        // ============================================
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const tipo = dadosUsuario.tipo;
        const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        let clienteEmail = dadosUsuario.email;
        let clienteNome = dadosUsuario.nome;
        let clienteTelefone = dadosUsuario.telefone || '';
        
        // Se for funcionário, verificar se selecionou outro cliente
        if (isFuncionario) {
            const clienteSelect = document.getElementById('clienteSelect');
            if (clienteSelect && clienteSelect.value) {
                const selectedOption = clienteSelect.selectedOptions[0];
                clienteEmail = clienteSelect.value;
                
                // Se não for o próprio funcionário, buscar dados completos
                if (clienteEmail !== dadosUsuario.email) {
                    try {
                        const clienteDoc = await window.loginDb
                            .collection('usuarios')
                            .doc(lojaIdAtual)
                            .collection('clientes')
                            .doc(clienteEmail)
                            .get();
                        
                        if (clienteDoc.exists) {
                            const clienteData = clienteDoc.data();
                            clienteNome = clienteData.nome || clienteEmail;
                            clienteTelefone = clienteData.telefone || '';
                        } else {
                            // Usar dados da option como fallback
                            clienteNome = selectedOption.dataset.nome || clienteEmail;
                            clienteTelefone = selectedOption.dataset.telefone || '';
                        }
                    } catch (e) {
                        console.warn('⚠️ Erro ao buscar dados do cliente:', e);
                        // Usar dados da option
                        clienteNome = selectedOption.dataset.nome || clienteEmail;
                        clienteTelefone = selectedOption.dataset.telefone || '';
                    }
                }
                
                console.log(`📋 Gerando senha para cliente: ${clienteNome} (${clienteEmail})`);
            }
        }
        
        // ============================================
        // 3. DADOS DO AGENDAMENTO
        // ============================================
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        const nomeServico = configServico.nome || servicoText;
        
        // Extrair data para criar os segmentos
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`;
        const dataFormatada = `${dia}_${mes}_${ano}`;
        
        // Criar data/hora agendada
        const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
        
        // ============================================
        // 4. SALVAR NO FIREBASE
        // ============================================
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada
        );
        
        // Buscar documento existente ou criar novo
        const docSnap = await getDoc(diaDocRef);
        
        let dadosAtuais = {};
        let proximoNumero = 1;
        
        if (docSnap.exists()) {
            dadosAtuais = docSnap.data();
            
            // Verificar quantos agendamentos já existem para este serviço
            if (dadosAtuais[servico]) {
                proximoNumero = Object.keys(dadosAtuais[servico]).length + 1;
            }
        }
        
        const agendamentoId = `agendamento_${proximoNumero}`;
        
        // 🔥 Inicialmente salvar como "Verificado" (padrão para senha rápida)
        const statusInicial = "Verificado";
        
        // Dados do agendamento
        const novoAgendamento = {
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            criado_por: isFuncionario ? dadosUsuario.email : clienteEmail,
            criado_por_nome: isFuncionario ? dadosUsuario.nome : clienteNome,
            criado_em: serverTimestamp(),
            data_hora_agendada: dataHoraAgendada,
            status_agendamento: statusInicial
        };
        
        // Criar estrutura aninhada para atualização
        const dadosParaSalvar = {
            ...dadosAtuais
        };
        
        if (!dadosParaSalvar[servico]) {
            dadosParaSalvar[servico] = {};
        }
        
        dadosParaSalvar[servico][agendamentoId] = novoAgendamento;
        
        // Salvar no Firestore
        await setDoc(diaDocRef, dadosParaSalvar, { merge: true });
        
        console.log(`✅ Senha rápida ${agendamentoId} gerada para ${horario}`);
        
        // ============================================
        // 5. PROCESSAR A NOVA SENHA NA FILA (🔥 NOVO)
        // ============================================
        const novaSenhaObj = {
            servico_id: servico,
            agendamento_id: agendamentoId,
            cliente_nome: clienteNome
        };
        
        // Processar a nova senha (vai determinar o status correto baseado na fila)
        const statusAtribuido = await processarNovaSenha(servico, novaSenhaObj);
        console.log(`🎯 Senha processada com status final: ${statusAtribuido}`);
        
        // ============================================
        // 6. MENSAGEM DE SUCESSO
        // ============================================
        if (isFuncionario && clienteEmail !== dadosUsuario.email) {
            mostrarMensagem(`✅ Senha gerada para ${clienteNome} (${nomeServico} às ${horario})!`, 'success');
        } else {
            mostrarMensagem(`✅ Senha gerada para ${nomeServico} às ${horario}!`, 'success');
        }
        
        fecharModal('novaSenhaHojeModal');
        
        // Limpar campo de cliente se existir
        const clienteSelect = document.getElementById('clienteSelect');
        if (clienteSelect) {
            clienteSelect.value = '';
        }
        
        // Mostrar informação sobre a posição na fila
        setTimeout(() => {
            mostrarMensagem('🔔 Acompanhe sua posição na fila acima', 'info', 4000);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao gerar senha rápida:', error);
        mostrarMensagem('Erro ao gerar senha: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
});

// ============================================
// ABRIR MODAL DE AGENDAMENTO PARA CLIENTES (CORRIGIDO)
// ============================================
function abrirModalAgendamento() {
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para fazer um agendamento', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    console.log('Abrir modal de agendamento para cliente');
    
    const modal = document.getElementById('agendamentoRapidoModal');
    if (!modal) {
        console.error('❌ Modal de agendamento não encontrado');
        mostrarMensagem('Erro ao abrir agendamento', 'error');
        return;
    }
    
    // Limpar formulário COMPLETAMENTE
    const form = document.querySelector('.agendamento-rapido-form');
    if (form) {
        const selects = form.querySelectorAll('select');
        selects.forEach(s => {
            s.value = '';
            s.disabled = false;
        });
        
        const inputs = form.querySelectorAll('input');
        inputs.forEach(i => {
            i.value = '';
            i.disabled = false;
        });
    }
    
    // 🔥 NOVO: Desabilitar data e horário até selecionar serviço
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    
    if (dataInput) {
        dataInput.value = '';
        dataInput.disabled = true;
        
        // Configurar data mínima (hoje) mas não selecionar
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataInput.min = `${ano}-${mes}-${dia}`;
    }
    
    if (horarioSelect) {
        horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
        horarioSelect.disabled = true;
    }
    
    // Se for funcionário/admin, mostrar campo de seleção de cliente
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    const tipo = dadosUsuario.tipo;
    
    const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                          perfil === 'admin' || perfil === 'gerente' || 
                          perfil === 'supervisor' || perfil === 'vendedor');
    
    // Verificar se já existe campo de cliente no modal
    let clienteField = document.getElementById('clienteSelectField');
    
    if (isFuncionario) {
        // Se não existir, criar campo de seleção de cliente
        if (!clienteField) {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.id = 'clienteSelectField';
            formGroup.innerHTML = `
                <label><i class="fas fa-user"></i> Cliente</label>
                <select id="clienteSelect" class="form-select">
                    <option value="">Selecionar cliente...</option>
                </select>
                <small>Funcionário pode agendar para clientes</small>
            `;
            
            // Inserir antes do serviço
            const servicoGroup = document.querySelector('#servicoSelect')?.closest('.form-group');
            if (servicoGroup) {
                servicoGroup.parentNode.insertBefore(formGroup, servicoGroup);
            }
        }
        
        // Carregar lista de clientes
        carregarClientesParaSelect();
    } else {
        // Se for cliente, remover campo se existir
        if (clienteField) {
            clienteField.remove();
        }
    }
    
    // Carregar serviços (mas não selecionar nenhum)
    carregarServicosCliente();
    
    modal.classList.add('active');
}

// ============================================
// CARREGAR CLIENTES PARA SELECT (funcionários)
// ============================================
async function carregarClientesParaSelect() {
    const select = document.getElementById('clienteSelect');
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Carregando clientes...</option>';
        
        const clientesRef = window.loginDb
            .collection('usuarios')
            .doc(lojaIdAtual)
            .collection('clientes');
        
        const snapshot = await clientesRef.get();
        
        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            select.innerHTML += `<option value="${doc.id}">${data.nome} (${data.email})</option>`;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

// ============================================
// CARREGAR SERVIÇOS PARA CLIENTE
// ============================================
async function carregarServicosCliente() {
    const select = document.getElementById('servicoSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando serviços...</option>';
    select.disabled = true;
    
    try {
        console.log('🔍 Buscando serviços em:', `configuracoes/servico_agendamento/${lojaIdAtual}`);
        
        // 🔥 ESTRUTURA: configuracoes / servico_agendamento / [lojaId]
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual
        );
        
        const snapshot = await getDocs(servicosRef);
        
        let servicosEncontrados = [];
        snapshot.forEach(doc => {
            servicosEncontrados.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('📋 Serviços encontrados:', servicosEncontrados);
        
        if (servicosEncontrados.length === 0) {
            select.innerHTML = '<option value="">📋 Nenhum serviço cadastrado</option>';
            select.disabled = true;
            return;
        }
        
        select.innerHTML = '<option value="">Selecione um serviço...</option>';
        
        servicosEncontrados.forEach(servico => {
            if (servico.nome) {
                select.innerHTML += `<option value="${servico.id}" data-config='${JSON.stringify(servico)}'>⏱️ ${servico.nome}</option>`;
            }
        });
        
        select.disabled = false;
        console.log(`✅ ${servicosEncontrados.length} serviços carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        select.innerHTML = '<option value="">❌ Erro ao carregar serviços</option>';
        select.disabled = true;
    }
}

// ============================================
// CARREGAR HORÁRIOS PARA CLIENTE (COMPLETO E AJUSTADO)
// ============================================
async function carregarHorariosCliente() {
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    const servicoSelect = document.getElementById('servicoSelect');
    
    if (!dataInput || !horarioSelect || !servicoSelect) return;
    
    const dataSelecionada = dataInput.value;
    const servicoId = servicoSelect.value;
    
    if (!dataSelecionada || !servicoId) {
        horarioSelect.innerHTML = '<option value="">Selecione data e serviço</option>';
        horarioSelect.disabled = true;
        return;
    }
    
    console.log(`🔍 Buscando horários para serviço: ${servicoId}, data: ${dataSelecionada}`);
    
    horarioSelect.innerHTML = '<option value="">Verificando horários...</option>';
    horarioSelect.disabled = true;
    
    try {
        // ============================================
        // 1. CARREGAR HORÁRIO DE FUNCIONAMENTO DA LOJA (banco lojasite-ba36f)
        // ============================================
        let lojaAbertura = "00:00";
        let lojaFechamento = "23:59";
        
        try {
            if (window.loginDb) {
                const lojaDoc = await window.loginDb
                    .collection('lojas')
                    .doc(lojaIdAtual)
                    .get();
                
                if (lojaDoc.exists) {
                    const dados = lojaDoc.data();
                    
                    // Identificar o dia da semana
                    const dataObj = new Date(dataSelecionada + 'T12:00:00');
                    const diaSemana = dataObj.getDay(); // 0 = domingo, 1 = segunda, etc.
                    
                    const diasMap = {
                        0: 'domingo',
                        1: 'segunda',
                        2: 'terca',
                        3: 'quarta',
                        4: 'quinta',
                        5: 'sexta',
                        6: 'sabado'
                    };
                    
                    const diaId = diasMap[diaSemana];
                    
                    // Pegar horário de funcionamento do dia
                    if (dados.funcionamento && dados.funcionamento[diaId]) {
                        const horarioLoja = dados.funcionamento[diaId];
                        
                        // Formato esperado: "08:00h às 18:00h"
                        if (horarioLoja && horarioLoja.trim() !== '') {
                            const match = horarioLoja.match(/(\d{2}:\d{2})h às (\d{2}:\d{2})h/);
                            if (match) {
                                lojaAbertura = match[1];
                                lojaFechamento = match[2];
                                console.log(`🏪 Loja abre: ${lojaAbertura}, fecha: ${lojaFechamento}`);
                            }
                        } else {
                            // Loja fechada neste dia
                            horarioSelect.innerHTML = `<option value="">🔒 Loja fechada neste dia</option>`;
                            horarioSelect.disabled = true;
                            return;
                        }
                    } else {
                        console.log('⚠️ Horário de funcionamento não encontrado para este dia');
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao carregar horário da loja:', e);
        }
        
        // ============================================
        // 2. CARREGAR CONFIGURAÇÃO DO SERVIÇO (banco spdv-3872a)
        // ============================================
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        
        console.log('📋 Configuração do serviço:', configServico);
        
        // Identificar o dia da semana
        const dataObj = new Date(dataSelecionada + 'T12:00:00');
        const diaSemana = dataObj.getDay(); // 0 = domingo, 1 = segunda, etc.
        
        const diasMap = {
            0: 'domingo',
            1: 'segunda',
            2: 'terca',
            3: 'quarta',
            4: 'quinta',
            5: 'sexta',
            6: 'sabado'
        };
        
        const diaId = diasMap[diaSemana];
        
        // Verificar se o dia está nos dias ativos do serviço
        const diasAtivos = configServico.diasAtivos || [];
        if (!diasAtivos.includes(diaId)) {
            horarioSelect.innerHTML = `<option value="">🔒 Serviço não disponível neste dia</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
        // Pegar configuração específica do dia
        const configDia = configServico.configuracoesPorDia?.[diaId];
        if (!configDia || !configDia.ativo) {
            horarioSelect.innerHTML = `<option value="">🔒 Sem atendimento neste dia</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
        // ============================================
        // 3. CONVERTER STRINGS PARA MINUTOS
        // ============================================
        function timeToMinutes(time) {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        }
        
        const minutosLojaAbertura = timeToMinutes(lojaAbertura);
        const minutosLojaFechamento = timeToMinutes(lojaFechamento);
        
        // ============================================
        // 4. GERAR HORÁRIOS BASEADO NA CONFIGURAÇÃO DO SERVIÇO
        // ============================================
        const [hInicio, mInicio] = configDia.inicio.split(':').map(Number);
        const [hFim, mFim] = configDia.fim.split(':').map(Number);
        const duracao = configDia.duracao || 30;
        const intervaloEntre = configDia.intervaloEntre || 0;
        
        let minutosInicioServico = hInicio * 60 + mInicio;
        const minutosFimServico = hFim * 60 + mFim;
        
        // ============================================
        // 5. APLICAR LIMITES DA LOJA (interseção)
        // ============================================
        // O horário de atendimento deve estar DENTRO do horário de funcionamento da loja
        let minutosInicio = Math.max(minutosInicioServico, minutosLojaAbertura);
        let minutosFim = Math.min(minutosFimServico, minutosLojaFechamento);
        
        console.log(`⏰ Interseção de horários:`, {
            servico: `${configDia.inicio} às ${configDia.fim}`,
            loja: `${lojaAbertura} às ${lojaFechamento}`,
            resultado: `${Math.floor(minutosInicio/60)}:${(minutosInicio%60).toString().padStart(2,'0')} às ${Math.floor(minutosFim/60)}:${(minutosFim%60).toString().padStart(2,'0')}`
        });
        
        if (minutosInicio >= minutosFim) {
            horarioSelect.innerHTML = `<option value="">⏰ Fora do horário de funcionamento</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
        // ============================================
        // 6. GERAR HORÁRIOS DISPONÍVEIS
        // ============================================
        const horarios = [];
        let minutosAtual = minutosInicio;
        
        while (minutosAtual + duracao <= minutosFim) {
            const hora = Math.floor(minutosAtual / 60);
            const minuto = minutosAtual % 60;
            const horarioStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
            
            horarios.push(horarioStr);
            minutosAtual += duracao + intervaloEntre;
        }
        
        // ============================================
        // 7. FILTRAR INTERVALO DE ALMOÇO DO SERVIÇO
        // ============================================
        let horariosFiltrados = horarios;
        if (configDia.intervaloInicio && configDia.intervaloFim) {
            const [hIntInicio, mIntInicio] = configDia.intervaloInicio.split(':').map(Number);
            const [hIntFim, mIntFim] = configDia.intervaloFim.split(':').map(Number);
            
            const minutosIntInicio = hIntInicio * 60 + mIntInicio;
            const minutosIntFim = hIntFim * 60 + mIntFim;
            
            horariosFiltrados = horarios.filter(horario => {
                const [h, m] = horario.split(':').map(Number);
                const minutos = h * 60 + m;
                return minutos < minutosIntInicio || minutos >= minutosIntFim;
            });
            
            console.log(`🍽️ Removendo intervalo de almoço: ${configDia.intervaloInicio} às ${configDia.intervaloFim}`);
        }
        
        // ============================================
        // 8. FILTRO: REMOVER HORÁRIOS QUE JÁ PASSARAM
        // ============================================
        const hoje = new Date().toISOString().split('T')[0];
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minAtual = agora.getMinutes();
        
        if (dataSelecionada === hoje) {
            horariosFiltrados = horariosFiltrados.filter(horario => {
                const [h, m] = horario.split(':').map(Number);
                return (h > horaAtual) || (h === horaAtual && m > minAtual);
            });
            
            console.log(`⏰ Hoje - removendo horários passados. Restam: ${horariosFiltrados.length}`);
        }
        
        // ============================================
        // 9. VERIFICAR SE HÁ HORÁRIOS DISPONÍVEIS
        // ============================================
        if (horariosFiltrados.length === 0) {
            horarioSelect.innerHTML = '<option value="">⏰ Nenhum horário disponível</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        // ============================================
        // 10. PREENCHER SELECT COM HORÁRIOS
        // ============================================
        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horariosFiltrados.forEach(h => {
            horarioSelect.innerHTML += `<option value="${h}">${h}</option>`;
        });
        horarioSelect.disabled = false;
        
        console.log(`✅ ${horariosFiltrados.length} horários gerados:`, horariosFiltrados);
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
        horarioSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        horarioSelect.disabled = true;
    }
}

// ============================================
// CONFIRMAR AGENDAMENTO
// ============================================
document.getElementById('btnConfirmarAgendamento')?.addEventListener('click', async function() {
    try {
        // ============================================
        // 1. VALIDAÇÕES BÁSICAS
        // ============================================
        const dataInput = document.getElementById('agendamentoData');
        const horarioSelect = document.getElementById('agendamentoHorario');
        const servicoSelect = document.getElementById('servicoSelect');
        
        const servico = servicoSelect?.value;
        const servicoText = servicoSelect?.selectedOptions[0]?.text.split(' - ')[0] || servico;
        const data = dataInput?.value;
        const horario = horarioSelect?.value;
        
        if (!servico) {
            mostrarMensagem('Selecione um serviço', 'warning');
            return;
        }
        
        if (!data) {
            mostrarMensagem('Selecione uma data', 'warning');
            return;
        }
        
        if (!horario) {
            mostrarMensagem('Selecione um horário', 'warning');
            return;
        }
        
        if (!usuarioLogado || !dadosUsuario) {
            mostrarMensagem('Faça login para agendar', 'warning');
            fecharModal('agendamentoRapidoModal');
            abrirModal('loginModal');
            return;
        }
        
        mostrarLoading('Confirmando agendamento...');
        
        // ============================================
        // 2. DETERMINAR CLIENTE
        // ============================================
        let clienteEmail = dadosUsuario.email;
        let clienteNome = dadosUsuario.nome;
        let clienteTelefone = dadosUsuario.telefone || '';
        
        // Se for funcionário, verificar se selecionou outro cliente
        const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
        const tipo = dadosUsuario.tipo;
        const isFuncionario = (tipo === 'admin' || tipo === 'funcionario' || 
                              perfil === 'admin' || perfil === 'gerente' || 
                              perfil === 'supervisor' || perfil === 'vendedor');
        
        if (isFuncionario) {
            const clienteSelect = document.getElementById('clienteSelect');
            if (clienteSelect && clienteSelect.value) {
                clienteEmail = clienteSelect.value;
                
                try {
                    const clienteDoc = await window.loginDb
                        .collection('usuarios')
                        .doc(lojaIdAtual)
                        .collection('clientes')
                        .doc(clienteEmail)
                        .get();
                    
                    if (clienteDoc.exists) {
                        const clienteData = clienteDoc.data();
                        clienteNome = clienteData.nome || clienteEmail;
                        clienteTelefone = clienteData.telefone || '';
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar dados do cliente:', e);
                }
            }
        }
        
        // ============================================
        // 3. VERIFICAR VALIDAÇÃO
        // ============================================
        let precisaValidar = true;
        try {
            const configRef = doc(
                db,
                'configuracoes',
                'servico_agendamento',
                lojaIdAtual,
                servico
            );
            
            const configDoc = await getDoc(configRef);
            if (configDoc.exists()) {
                const config = configDoc.data();
                if (config.validacao === 'automatico_todos') {
                    precisaValidar = false;
                } else if (config.validacao === 'automatico_dia') {
                    const hoje = new Date().toISOString().split('T')[0];
                    if (data === hoje) {
                        precisaValidar = false;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao verificar configuração:', e);
        }
        
        // ============================================
        // 4. PREPARAR DADOS DO AGENDAMENTO
        // ============================================
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        const nomeServico = configServico.nome || servicoText;
        
        // Sanitizar nome do serviço para usar como chave do MAP
        const servicoId = servico; // Já é o ID do serviço
        
        // Extrair data para criar os segmentos
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`; // Ex: "03_2026"
        const dataFormatada = `${dia}_${mes}_${ano}`; // Ex: "09_03_2026"
        
        // Criar data/hora agendada
        const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
        
        // ============================================
        // 5. SALVAR NO FIREBASE - ESTRUTURA MAPS
        // ============================================
        // agendamentos / [lojaId] / [mes_ano] / [dataFormatada]
        
        // Referência para o documento da data
        const diaDocRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada
        );
        
        // Buscar documento existente ou criar novo
        const docSnap = await getDoc(diaDocRef);
        
        let dadosAtuais = {};
        let proximoNumero = 1;
        
        if (docSnap.exists()) {
            dadosAtuais = docSnap.data();
            
            // Verificar quantos agendamentos já existem para este serviço
            if (dadosAtuais[servicoId]) {
                proximoNumero = Object.keys(dadosAtuais[servicoId]).length + 1;
            }
        }
        
        const agendamentoId = `agendamento_${proximoNumero}`;
        
        // Dados do agendamento
        const novoAgendamento = {
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone,
            criado_em: serverTimestamp(),
            data_hora_agendada: dataHoraAgendada,
            status_agendamento: precisaValidar ? "Pendente" : "Verificado"
        };
        
        // Criar estrutura aninhada para atualização
        const dadosParaSalvar = {
            ...dadosAtuais
        };
        
        if (!dadosParaSalvar[servicoId]) {
            dadosParaSalvar[servicoId] = {};
        }
        
        dadosParaSalvar[servicoId][agendamentoId] = novoAgendamento;
        
        // Salvar no Firestore
        await setDoc(diaDocRef, dadosParaSalvar, { merge: true });
        
        console.log(`✅ Agendamento ${agendamentoId} salvo em ${dataFormatada} para serviço ${servicoId}`);
        
        // ============================================
        // 6. MENSAGEM DE SUCESSO
        // ============================================
        if (precisaValidar) {
            mostrarMensagem(`✅ Agendamento solicitado para ${nomeServico}! Aguarde confirmação.`, 'success', 5000);
        } else {
            mostrarMensagem(`✅ Agendamento confirmado para ${nomeServico}!`, 'success');
        }
        
        fecharModal('agendamentoRapidoModal');
        
        // Se for cliente, mostrar mensagem sobre acompanhamento
        if (!isFuncionario) {
            setTimeout(() => {
                mostrarMensagem('🔔 Acompanhe sua posição na fila acima', 'info', 4000);
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Erro ao confirmar agendamento:', error);
        mostrarMensagem('Erro ao fazer agendamento: ' + error.message, 'error');
    } finally {
        esconderLoading();
    }
});

// ============================================
// CONFIGURAR FAVICON DA LOJA
// ============================================
function configurarFavicon() {
    const lojaId = extrairLojaIdDaURL();
    if (lojaId) {
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = `../../imagens/${lojaId}/icone.ico`;
            console.log(`✅ Favicon configurado para loja: ${lojaId}`);
        }
    }
}

// ============================================
// FUNÇÕES DE MODAL
// ============================================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log(`✅ Modal ${modalId} aberto`);
    } else {
        console.error(`❌ Modal ${modalId} não encontrado`);
    }
}

window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        console.log(`✅ Modal ${modalId} fechado`);
    }
};

// ============================================
// MENU DE PERFIL - CONTROLE DE PERMISSÕES
// ============================================

// Configurar menu de perfil
function configurarMenuPerfil() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (menuBtn && dropdown) {
        // Abrir/fechar menu ao clicar no botão
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Fechar menu ao clicar em um item
        dropdown.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('show');
            });
        });
    }
    
    // Configurar botões do menu
    document.getElementById('menuRelatorios')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Página de relatórios em desenvolvimento', 'info');
    });
    
    document.getElementById('menuGestaoLogins')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarMensagem('Gestão de logins em desenvolvimento', 'info');
    });
    
    document.getElementById('menuEstoque')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (dadosUsuario) {
            // Passar o perfil como parâmetro na URL
            window.location.href = `estoque.html?perfil=${dadosUsuario.nivel || dadosUsuario.tipo}`;
        }
    });
    
    // 🔥 NOVO: Gestão de Agendamento
    document.getElementById('menuGestaoAgendamento')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'agendamento.html?modo=gestao';
    });
    
    document.getElementById('menuLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        fazerLogoutCliente();
    });
}

// Atualizar menu baseado no perfil
function atualizarMenuPerfil() {
    if (!dadosUsuario) return;
    
    // 🔥 CORREÇÃO: usar perfil, nivel ou tipo
    const perfil = dadosUsuario.perfil || dadosUsuario.nivel || dadosUsuario.tipo;
    console.log('🔍 Atualizando menu para perfil:', perfil);
    console.log('📅 Agendamento habilitado?', agendamentoHabilitado);
    
    // Mapear quais itens devem aparecer para cada perfil
    const permissoes = {
        'admin': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'gerente': ['menuRelatorios', 'menuGestaoLogins', 'menuEstoque'],
        'supervisor': ['menuEstoque'],
        'vendedor': ['menuEstoque'],
        'cliente': [] // Cliente não vê nenhum
    };
    
    // Itens que devem aparecer para este perfil
    const itensPermitidos = permissoes[perfil] || [];
    
    console.log('📋 Itens permitidos:', itensPermitidos);
    
    // Mostrar/esconder itens padrão
    const menuItems = {
        menuRelatorios: document.getElementById('menuRelatorios'),
        menuGestaoLogins: document.getElementById('menuGestaoLogins'),
        menuEstoque: document.getElementById('menuEstoque'),
        // 🔥 NOVO: Gestão de Agendamento
        menuGestaoAgendamento: document.getElementById('menuGestaoAgendamento')
    };
    
    for (const [id, element] of Object.entries(menuItems)) {
        if (element) {
            // Gestão de Agendamento tem regra especial: só aparece se habilitado E perfil for funcionário/admin
            if (id === 'menuGestaoAgendamento') {
                if (agendamentoHabilitado && perfil !== 'cliente') {
                    element.style.display = 'flex';
                    console.log(`✅ Mostrando item: ${id} (agendamento habilitado)`);
                } else {
                    element.style.display = 'none';
                    console.log(`❌ Escondendo item: ${id} (agendamento: ${agendamentoHabilitado}, perfil: ${perfil})`);
                }
            } else {
                // Itens normais seguem as permissões
                if (itensPermitidos.includes(id)) {
                    element.style.display = 'flex';
                    console.log(`✅ Mostrando item: ${id}`);
                } else {
                    element.style.display = 'none';
                    console.log(`❌ Escondendo item: ${id}`);
                }
            }
        }
    }
    
    // Mostrar/esconder divisor (mostra se houver algum item visível além do logout)
    const divisor = document.querySelector('.menu-divider');
    if (divisor) {
        const itensVisiveis = Object.values(menuItems).filter(el => el && el.style.display === 'flex').length;
        divisor.style.display = itensVisiveis > 0 ? 'block' : 'none';
    }
    
    // Sempre mostrar o logout quando logado
    const menuLogout = document.getElementById('menuLogout');
    if (menuLogout) {
        menuLogout.style.display = 'flex';
    }
}

// ============================================
// EVENTOS DO LOGIN
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario, permissoes } = event.detail;
    
    usuarioLogado = true;
    dadosUsuario = usuario;
    
    console.log('✅ Usuário logado no clientes.js:', usuario);
    console.log('🔑 Perfil:', usuario.perfil || usuario.nivel || usuario.tipo);

    // 🔥 NOVO: Re-renderizar agendamento para mostrar "Minha Senha"
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    
    if (userName) {
        let tipoDisplay = '';
        
        // 🔥 CORREÇÃO AQUI: usar perfil, nivel ou tipo conforme disponível
        const perfilExibicao = usuario.perfil || usuario.nivel || usuario.tipo;
        
        if (usuario.tipo === 'admin') {
            tipoDisplay = ' (Admin)';
        } else if (usuario.tipo === 'funcionario') {
            // Capitalizar primeira letra do perfil
            const perfilFormatado = perfilExibicao.charAt(0).toUpperCase() + perfilExibicao.slice(1);
            tipoDisplay = ` (${perfilFormatado})`;
        } else if (usuario.tipo === 'cliente') {
            tipoDisplay = ' (Cliente)';
        }
        
        userName.textContent = usuario.nome + tipoDisplay;
    }
    
    // Esconder botões antigos
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'none';
    
    // Mostrar menu de perfil
    if (profileMenuBtn) profileMenuBtn.style.display = 'flex';
    
    // Atualizar menu baseado no perfil
    atualizarMenuPerfil();
    
    fecharModal('loginModal');
});

window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = false;
    dadosUsuario = null;
    
    console.log('👤 Usuário deslogado');

    // 🔥 NOVO: Re-renderizar agendamento para esconder "Minha Senha"
    if (agendamentoHabilitado) {
        renderizarPainelAgendamento();
        setTimeout(() => {
            inicializarCarrosselAgendamento();
        }, 100);
    }
    
    const userName = document.getElementById('userName');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const dropdown = document.getElementById('profileMenuDropdown');
    
    if (userName) userName.textContent = 'Visitante';
    if (btnLogout) btnLogout.style.display = 'none';
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    
    // Esconder menu de perfil
    if (profileMenuBtn) profileMenuBtn.style.display = 'none';
    if (dropdown) dropdown.classList.remove('show');
    
    // Esconder todos os itens do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.display = 'none';
    });
    document.querySelector('.menu-divider').style.display = 'none';
});

window.addEventListener('usuarioNaoAutorizado', (event) => {
    const erro = event.detail?.erro || 'Acesso negado';
    mostrarMensagem(erro, 'error');
    console.error('❌ Acesso negado:', erro);
});

// NOVA FUNÇÃO: Mostrar tempo restante no modal de verificação
async function atualizarTempoRestante() {
    const email = document.getElementById('verificacaoEmail').textContent;
    
    if (!email || email === 'email@exemplo.com') return;
    
    const resultado = await window.verificarTempoRestante(email);
    
    if (resultado.encontrado && !resultado.emailVerificado) {
        const tempoElement = document.getElementById('tempoRestante');
        const avisoElement = document.getElementById('avisoExpiracao');
        
        if (tempoElement) {
            if (resultado.expirado) {
                tempoElement.innerHTML = `<span style="color: #dc3545; font-weight: bold;">
                    ⚠️ EXPIRADO! Faça um novo cadastro.
                </span>`;
                if (avisoElement) avisoElement.style.display = 'block';
            } else {
                tempoElement.innerHTML = `⏳ Tempo restante: <strong>${resultado.minutosRestantes} minutos</strong>`;
            }
        }
    }
}

// ============================================
// FUNÇÕES DE LOGIN (usam window.fazerLogin do login_firebase.js)
// ============================================
async function fazerLoginCliente() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const lembrar = document.getElementById('loginLembrar').checked;
    
    if (!email || !senha) {
        mostrarMensagem('Preencha e-mail e senha', 'warning');
        return;
    }
    
    mostrarLoading('Validando login...');
    
    try {
        const resultado = await window.fazerLogin(email, senha);
        
        if (resultado && resultado.sucesso) {
            // LOGIN BEM SUCEDIDO
            if (lembrar) {
                localStorage.setItem('cliente_ultimo_email', email);
            } else {
                localStorage.removeItem('cliente_ultimo_email');
            }
            
            mostrarMensagem(`Bem-vindo(a) ${resultado.usuario.nome || email}!`, 'success');
            
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginSenha').value = '';
            
            fecharModal('loginModal');
            
        } else {
            // TRATAR OS DIFERENTES TIPOS DE ERRO
            
            // CASO 1: EMAIL NÃO VERIFICADO
            if (resultado.tipo === 'email_nao_verificado') {
                mostrarMensagem(resultado.erro, 'warning', 6000);
                document.getElementById('loginSenha').value = '';
                
            // CASO 2: EMAIL NÃO CADASTRADO
            } else if (resultado.tipo === 'email_nao_cadastrado') {
                // Mostrar mensagem com opção de cadastro
                if (confirm(resultado.erro + ' Clique OK para se cadastrar.')) {
                    fecharModal('loginModal');
                    abrirModal('cadastroModal');
                    document.getElementById('cadastroEmail').value = email;
                }
                document.getElementById('loginSenha').value = '';
                
            // CASO 3: SENHA INCORRETA
            } else if (resultado.tipo === 'senha_incorreta') {
                // Perguntar se quer redefinir senha
                if (confirm(resultado.erro + ' Clique OK para receber o link de redefinição.')) {
                    // Chamar função de recuperar senha
                    mostrarLoading('Enviando link de redefinição...');
                    try {
                        await auth.sendPasswordResetEmail(resultado.email);
                        mostrarMensagem(`Link de redefinição enviado para ${resultado.email}. Verifique sua caixa de entrada.`, 'success', 6000);
                    } catch (resetError) {
                        mostrarMensagem('Erro ao enviar link. Tente novamente.', 'error');
                    } finally {
                        esconderLoading();
                    }
                }
                document.getElementById('loginSenha').value = '';
                
            // OUTROS ERROS
            } else {
                mostrarMensagem(resultado.erro, 'error');
                document.getElementById('loginSenha').value = '';
            }
        }
        
    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem('Erro ao fazer login', 'error');
    } finally {
        esconderLoading();
    }
}

async function fazerCadastroCliente() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const telefone = document.getElementById('cadastroTelefone').value.trim();
    const cpf = document.getElementById('cadastroCpf').value.trim();
    const senha = document.getElementById('cadastroSenha').value.trim();
    const confirmarSenha = document.getElementById('cadastroConfirmarSenha').value.trim();
    const endereco = document.getElementById('cadastroEndereco').value.trim();
    const cidade = document.getElementById('cadastroCidade').value.trim();
    const cep = document.getElementById('cadastroCep').value.trim();
    const termos = document.getElementById('cadastroTermos').checked;
    
    if (!nome || !email || !telefone || !cpf || !senha || !confirmarSenha) {
        mostrarMensagem('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    if (!termos) {
        mostrarMensagem('Você precisa aceitar os termos de uso', 'warning');
        return;
    }
    
    if (senha !== confirmarSenha) {
        mostrarMensagem('As senhas não coincidem', 'warning');
        return;
    }
    
    if (senha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensagem('E-mail inválido', 'warning');
        return;
    }
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
        mostrarMensagem('CPF inválido', 'warning');
        return;
    }
    
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagem('Telefone inválido', 'warning');
        return;
    }
    
    mostrarLoading('Cadastrando...');
    
    try {
        const resultado = await window.cadastrarCliente(
            nome, email, senha, telefoneLimpo, cpfLimpo, endereco, cidade, cep
        );
        
        if (resultado.sucesso) {
            if (resultado.precisaVerificar) {
                // Mostrar modal de verificação
                document.getElementById('verificacaoEmail').textContent = resultado.email;
                abrirModal('verificacaoEmailModal');
                
                mostrarMensagem(resultado.mensagem, 'success', 6000);
            } else {
                mostrarMensagem('Cadastro realizado com sucesso! Faça o login.', 'success');
            }
            
            fecharModal('cadastroModal');
            
            // Limpar formulário
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroTelefone').value = '';
            document.getElementById('cadastroCpf').value = '';
            document.getElementById('cadastroSenha').value = '';
            document.getElementById('cadastroConfirmarSenha').value = '';
            document.getElementById('cadastroEndereco').value = '';
            document.getElementById('cadastroCidade').value = '';
            document.getElementById('cadastroCep').value = '';
            document.getElementById('cadastroTermos').checked = false;
            
        } else {
            mostrarMensagem(resultado.erro, 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        mostrarMensagem('Erro ao realizar cadastro', 'error');
    } finally {
        esconderLoading();
    }
}

async function fazerLogoutCliente() {
    if (confirm('Deseja realmente sair?')) {
        mostrarLoading('Saindo...');
        await window.fazerLogout();
        esconderLoading();
    }
}

// ============================================
// FUNÇÃO PARA CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) {
        logoImg.src = getPlaceholderIcon();
        return;
    }
    
    const logoPath = `../../imagens/${lojaId}/logo.png`;
    console.log(`🖼️ Tentando carregar logo de: ${logoPath}`);
    
    const testImg = new Image();
    testImg.onload = function() {
        console.log(`✅ Logo carregada com sucesso: ${logoPath}`);
        logoImg.src = logoPath;
    };
    
    testImg.onerror = function() {
        console.log(`ℹ️ Logo não encontrada, usando placeholder`);
        logoImg.src = getPlaceholderIcon();
    };
    
    testImg.src = logoPath;
}

function getPlaceholderIcon() {
    return LOGO_PLACEHOLDER;
}

// ============================================
// CARREGAR DADOS DA LOJA (COM RETRY)
// ============================================
async function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    // Aguardar getLojaConfig com retry
    let tentativas = 0;
    while (typeof window.getLojaConfig !== 'function' && tentativas < 30) {
        console.log(`⏳ Aguardando getLojaConfig... tentativa ${tentativas + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
    }
    
    if (typeof window.getLojaConfig !== 'function') {
        console.error('❌ getLojaConfig não disponível');
        return;
    }
    
    try {
        const config = window.getLojaConfig(lojaId);
        console.log(`📋 Configuração da loja ${lojaId}:`, config);
        
        if (config) {
            const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            const lojaNomeHeader = document.getElementById('lojaNomeHeader');
            if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
            
            document.title = `${nomeLoja} - Loja Online`;
            
            if (config.contato) {
                renderizarContatos(config);
            }
            
            if (config.contato?.endereco) {
                renderizarEndereco(config);
            }
        }
        
        renderizarChat();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
        renderizarChat();
    }
}

// ============================================
// RENDERIZAR CONTATOS
// ============================================
function renderizarContatos(dadosLoja) {
    const contactGrid = document.getElementById('contactGrid');
    if (!contactGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato) {
        contactGrid.innerHTML = '<p class="no-contacts">Nenhum contato disponível</p>';
        return;
    }
    
    const contato = dadosLoja.contato;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    let html = '';
    
    if (contato.whatsapp && contato.whatsapp.trim() !== '') {
        const numero = contato.whatsapp.replace(/\D/g, '');
        html += `
            <a href="https://wa.me/${numero}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}whatsapp.png" alt="WhatsApp" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">WhatsApp</div>
                        <div class="contact-value">${contato.whatsapp}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.email && contato.email.trim() !== '') {
        html += `
            <a href="mailto:${contato.email}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}email.png" alt="E-mail" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">E-mail</div>
                        <div class="contact-value">${contato.email}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (contato.instagram && contato.instagram.trim() !== '') {
        const usuario = contato.instagram.replace('@', '');
        html += `
            <a href="https://instagram.com/${usuario}" target="_blank" class="contact-link">
                <div class="contact-item">
                    <div class="contact-icon">
                        <img src="${basePath}instagram.png" alt="Instagram" 
                             onerror="this.src='${placeholder}'">
                    </div>
                    <div class="contact-content">
                        <div class="contact-label">Instagram</div>
                        <div class="contact-value">${contato.instagram}</div>
                    </div>
                </div>
            </a>
        `;
    }
    
    if (html === '') {
        html = '<p class="no-contacts">Nenhum contato disponível</p>';
    }
    
    contactGrid.innerHTML = html;
    console.log('📞 Contatos renderizados');
}

// ============================================
// RENDERIZAR ENDEREÇO
// ============================================
function renderizarEndereco(dadosLoja) {
    const addressGrid = document.getElementById('addressGrid');
    if (!addressGrid) return;
    
    if (!dadosLoja || !dadosLoja.contato?.endereco) {
        addressGrid.innerHTML = '<p class="no-address">Endereço não informado</p>';
        return;
    }
    
    const endereco = dadosLoja.contato.endereco;
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    const ruaNumeroBairro = [];
    if (endereco.rua) ruaNumeroBairro.push(endereco.rua);
    if (endereco.numero) ruaNumeroBairro.push(`nº ${endereco.numero}`);
    if (endereco.bairro) ruaNumeroBairro.push(endereco.bairro);
    const ruaNumeroBairroStr = ruaNumeroBairro.join(' ');
    
    const cidadeUfCep = [];
    if (endereco.cidade) cidadeUfCep.push(endereco.cidade);
    if (endereco.uf) cidadeUfCep.push(endereco.uf);
    if (endereco.cep) cidadeUfCep.push(`CEP: ${endereco.cep}`);
    const cidadeUfCepStr = cidadeUfCep.join(' - ');
    
    const enderecoCompleto = `${ruaNumeroBairroStr} ${cidadeUfCepStr}`.trim();
    const query = encodeURIComponent(enderecoCompleto);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    
    let html = `
        <a href="${mapsUrl}" target="_blank" class="address-item">
            <div class="address-icon">
                <img src="${basePath}endereco.png" alt="Endereço" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="address-content">
                <div class="address-label">Endereço</div>
                <div class="address-text">
                    <span class="rua-numero">${ruaNumeroBairroStr}</span>
                    <span class="cidade-uf-cep">${cidadeUfCepStr}</span>
                </div>
            </div>
        </a>
    `;
    
    addressGrid.innerHTML = html;
    console.log('📍 Endereço renderizado');
}

// ============================================
// RENDERIZAR CHAT
// ============================================
function renderizarChat() {
    const footerChat = document.querySelector('.footer-chat');
    if (!footerChat) return;
    
    const lojaId = lojaIdAtual || (lojaServices ? lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = getPlaceholderIcon();
    
    footerChat.innerHTML = `
        <div class="chat-container">
            <div class="chat-icon-large">
                <img src="${basePath}chat.png" alt="Chat" 
                     onerror="this.src='${placeholder}'">
            </div>
            <div class="chat-button" id="chatButton">
                Chat Online
            </div>
        </div>
    `;
    
    const chatButton = document.getElementById('chatButton');
    if (chatButton) {
        chatButton.addEventListener('click', () => {
            alert('Chat em desenvolvimento. Breve estaremos disponíveis 😉');
        });
    }
    
    console.log('💬 Chat configurado');
}

// ============================================
// FUNÇÕES DE PRODUTOS
// ============================================
async function carregarProdutos() {
    try {
        const resultado = await lojaServices.buscarProdutosParaVenda();
        
        if (resultado.success) {
            produtos = resultado.data;
            console.log(`✅ ${produtos.length} produtos carregados`);
        } else {
            produtos = [];
        }
    } catch (error) {
        console.error("❌ Erro ao carregar produtos:", error);
        produtos = [];
    }
}

// ============================================
// CARREGAR CATEGORIAS
// ============================================
async function carregarCategorias() {
    console.log('🔍 INICIANDO carregarCategorias()');
    
    try {
        if (!lojaServices || typeof lojaServices.buscarCategorias !== 'function') {
            console.error('❌ lojaServices.buscarCategorias não disponível');
            return;
        }
        
        const resultado = await lojaServices.buscarCategorias();
        
        const categoriesGrid = document.getElementById('categoriesGrid');
        if (!categoriesGrid) return;
        
        let categoriasList = resultado.success ? resultado.data : [];
        
        if (categoriasList.length === 0 && produtos.length > 0) {
            const categoriasSet = new Set();
            produtos.forEach(p => {
                if (p.categoria) categoriasSet.add(p.categoria);
            });
            categoriasList = Array.from(categoriasSet).sort();
        }
        
        if (categoriasList.length === 0) {
            categoriasList = ['Todos os Produtos'];
        }
        
        categorias = categoriasList;
        
        let slidesHtml = `
            <div class="swiper-slide">
                <div class="categoria-card" onclick="filtrarPorCategoria('todos')">
                    <div class="categoria-icon">
                        <i class="fas fa-th-large"></i>
                    </div>
                    <div class="categoria-info">
                        <h4>Todos</h4>
                        <p>${produtos.length} produtos</p>
                    </div>
                </div>
            </div>
        `;
        
        categoriasList.forEach(categoria => {
            if (categoria !== 'Todos os Produtos') {
                const count = produtos.filter(p => p.categoria === categoria).length;
                slidesHtml += `
                    <div class="swiper-slide">
                        <div class="categoria-card" onclick="filtrarPorCategoria('${categoria.replace(/'/g, "\\'")}')">
                            <div class="categoria-icon">
                                <i class="fas fa-tag"></i>
                            </div>
                            <div class="categoria-info">
                                <h4>${categoria}</h4>
                                <p>${count} produtos</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        categoriesGrid.innerHTML = slidesHtml;
        
        setTimeout(() => {
            inicializarCarrosselCategorias();
        }, 100);
        
    } catch (error) {
        console.error("❌ Erro ao carregar categorias:", error);
    }
}

function inicializarCarrosselCategorias() {
    if (typeof Swiper === 'undefined') {
        console.warn('⚠️ Swiper não está carregado');
        return;
    }
    
    const categoriesSwiper = new Swiper('.categories-swiper', {
        slidesPerView: 2,
        spaceBetween: 10,
        loop: true,
        navigation: {
            prevEl: '#categoriesPrev',
            nextEl: '#categoriesNext',
        },
        breakpoints: {
            480: { slidesPerView: 3, spaceBetween: 12 },
            640: { slidesPerView: 4, spaceBetween: 15 },
            768: { slidesPerView: 5, spaceBetween: 15 },
            1024: { slidesPerView: 6, spaceBetween: 18 },
            1280: { slidesPerView: 7, spaceBetween: 20 }
        }
    });
    
    console.log('✅ Carrossel de categorias inicializado');
}

async function carregarProdutosDestaque() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    if (produtos.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto disponível</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    produtos.slice(0, 20).forEach(produto => {
        const imagem = obterURLImagem(produto, 'thumb');
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        inicializarSwiper();
    }, 100);
}

function inicializarSwiper() {
    if (typeof Swiper === 'undefined') return;
    
    if (swiperInstance) {
        swiperInstance.destroy(true, true);
    }
    
    swiperInstance = new Swiper('.featured-swiper', {
        slidesPerView: 1,
        spaceBetween: 10,
        loop: produtos.length > 1,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        breakpoints: {
            480: { slidesPerView: 2, spaceBetween: 15 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
            1440: { slidesPerView: 5, spaceBetween: 25 }
        },
        navigation: {
            prevEl: '#carouselPrev',
            nextEl: '#carouselNext',
        },
    });
    
    console.log('✅ Swiper inicializado');
}

// ============================================
// FUNÇÕES DE INTERAÇÃO COM PRODUTOS
// ============================================
window.verProdutoDetalhe = function(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    const modalBody = document.getElementById('produtoModalBody');
    if (!modalBody) return;
    
    const imagem = obterURLImagem(produto, 'principal');
    const precoFormatado = formatarMoeda(produto.preco);
    const temEstoque = (produto.quantidade || 0) > 0;
    
    modalBody.innerHTML = `
        <div class="produto-detalhe">
            <div class="produto-imagem-grande">
                <img src="${imagem}" alt="${produto.nome}" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
            </div>
            <div class="produto-info-detalhe">
                <h2>${produto.nome}</h2>
                <p class="produto-codigo">Código: ${produto.codigo || '---'}</p>
                <p class="produto-categoria">Categoria: ${produto.categoria || 'Sem categoria'}</p>
                <p class="produto-preco">${precoFormatado}</p>
                <p class="produto-estoque ${temEstoque ? 'disponivel' : 'indisponivel'}">
                    ${temEstoque ? '✅ Em estoque' : '❌ Indisponível'}
                </p>
                ${produto.descricao ? `<p class="produto-descricao">${produto.descricao}</p>` : ''}
                <div class="produto-acoes-detalhe">
                    <button class="btn-add-cart-large" onclick="adicionarAoCarrinho('${produto.id}'); fecharModal('produtoModal');" ${!temEstoque ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `;
    
    abrirModal('produtoModal');
};

// ============================================
// ADICIONAR AO CARRINHO (CORRIGIDO)
// ============================================
window.adicionarAoCarrinho = async function(produtoId) {
    // Verificar se usuário está logado
    if (!usuarioLogado || !dadosUsuario) {
        mostrarMensagem('Faça login para adicionar produtos ao carrinho', 'warning');
        abrirModal('loginModal');
        return;
    }
    
    // Verificar se tem email
    if (!dadosUsuario.email) {
        console.error('❌ Usuário sem email:', dadosUsuario);
        mostrarMensagem('Erro: usuário sem email', 'error');
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
        mostrarMensagem('Produto não encontrado', 'error');
        return;
    }
    
    if ((produto.quantidade || 0) <= 0) {
        mostrarMensagem('Produto sem estoque', 'warning');
        return;
    }
    
    mostrarLoading('Adicionando ao carrinho...');
    
    try {
        // Preparar item para o carrinho
        const item = {
            id: produto.id,
            codigo: produto.codigo,
            codigo_barras: produto.codigo_barras,
            nome: produto.nome,
            preco_unitario: produto.preco,
            quantidade: 1,
            imagem: produto.imagens?.thumbnail || produto.imagens?.principal || IMAGEM_PADRAO_BASE64,
            unidade: produto.unidade_venda || produto.unidade || 'UN',
            desconto: 0,
            desconto_valor: 0
        };
        
        console.log('🛒 Adicionando item:', item);
        console.log('👤 Usuário email:', dadosUsuario.email);
        
        // Verificar se o método existe
        if (typeof lojaServices.adicionarItemAoCarrinho !== 'function') {
            console.error('❌ Método adicionarItemAoCarrinho não encontrado');
            throw new Error('Função de carrinho não disponível');
        }
        
        // Adicionar no Firebase
        const resultado = await lojaServices.adicionarItemAoCarrinho(dadosUsuario.email, item);
        
        console.log('📦 Resultado:', resultado);
        
        if (resultado && resultado.success) {
            // Calcular total de itens
            const totalItens = resultado.data ? 
                resultado.data.reduce((acc, item) => acc + item.quantidade, 0) : 1;
            
            // Atualizar badge do carrinho
            const badge = document.getElementById('cartBadge');
            if (badge) {
                badge.textContent = totalItens;
                badge.style.display = totalItens > 0 ? 'flex' : 'none';
            }
            
            mostrarMensagem(`${produto.nome} adicionado ao carrinho`, 'success');
        } else {
            mostrarMensagem(resultado?.error || 'Erro ao adicionar ao carrinho', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erro detalhado:', error);
        mostrarMensagem(`Erro: ${error.message}`, 'error');
    } finally {
        esconderLoading();
    }
};

window.filtrarPorCategoria = function(categoria) {
    console.log(`Filtrando por categoria: ${categoria}`);
    
    let produtosFiltrados;
    
    if (categoria === 'todos') {
        produtosFiltrados = produtos;
        exibirProdutosFiltrados(produtosFiltrados, 'Todos os Produtos');
    } else {
        produtosFiltrados = produtos.filter(p => p.categoria === categoria);
        exibirProdutosFiltrados(produtosFiltrados, `Categoria: ${categoria}`);
    }
};

// ============================================
// FUNÇÃO DE DIAGNÓSTICO
// ============================================
window.diagnosticarLogin = function() {
    console.log('🔍 DIAGNÓSTICO DE LOGIN:');
    console.log('usuarioLogado flag:', usuarioLogado);
    console.log('dadosUsuario:', dadosUsuario);
    console.log('dadosUsuario?.email:', dadosUsuario?.email);
    console.log('lojaServices disponível?', !!lojaServices);
    console.log('lojaServices.adicionarItemAoCarrinho?', typeof lojaServices?.adicionarItemAoCarrinho);
    console.log('lojaServices.carregarCarrinhoUsuario?', typeof lojaServices?.carregarCarrinhoUsuario);
};

function exibirProdutosFiltrados(produtosFiltrados, titulo) {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;
    
    const tituloElement = document.querySelector('.featured-products h2');
    if (tituloElement) {
        tituloElement.innerHTML = `<i class="fas fa-search"></i> ${titulo}`;
    }
    
    if (produtosFiltrados.length === 0) {
        featuredContainer.innerHTML = `
            <div class="swiper-wrapper">
                <div class="swiper-slide">
                    <div class="empty-products">
                        <i class="fas fa-box-open"></i>
                        <p>Nenhum produto encontrado</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    let slidesHtml = '';
    produtosFiltrados.forEach(produto => {
        const imagem = obterURLImagem(produto, 'thumb');
        const precoFormatado = formatarMoeda(produto.preco);
        const temEstoque = (produto.quantidade || 0) > 0;
        
        slidesHtml += `
            <div class="swiper-slide">
                <div class="product-card" onclick="verProdutoDetalhe('${produto.id}')">
                    <div class="product-image">
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy" onerror="this.src='${IMAGEM_PADRAO_BASE64}'">
                        ${!temEstoque ? '<span class="product-badge out">ESGOTADO</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${produto.nome}</h3>
                        <p class="product-category">${produto.categoria || 'Sem categoria'}</p>
                        <div class="product-price">
                            <span class="current-price">${precoFormatado}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-view" onclick="event.stopPropagation(); verProdutoDetalhe('${produto.id}')">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                            <button class="btn-add-cart" onclick="event.stopPropagation(); adicionarAoCarrinho('${produto.id}')" ${!temEstoque ? 'disabled' : ''}>
                                <i class="fas fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    featuredContainer.innerHTML = slidesHtml;
    
    setTimeout(() => {
        inicializarSwiper();
    }, 100);
}

function filtrarProdutosPorBusca(termo) {
    const termoLimpo = termo.toLowerCase().trim();
    
    if (!termoLimpo) {
        carregarProdutosDestaque();
        return;
    }
    
    const resultados = produtos.filter(produto => {
        const nome = (produto.nome || '').toLowerCase();
        const codigo = (produto.codigo || '').toLowerCase();
        const categoria = (produto.categoria || '').toLowerCase();
        const codigoBarras = (produto.codigo_barras || '').toLowerCase();
        
        return nome.includes(termoLimpo) || 
               codigo.includes(termoLimpo) || 
               categoria.includes(termoLimpo) ||
               codigoBarras.includes(termoLimpo);
    });
    
    exibirProdutosFiltrados(resultados, `Resultados para: "${termo}"`);
}

function buscarProdutoPorCodigo(codigo) {
    const produto = produtos.find(p => 
        p.codigo_barras === codigo || p.codigo === codigo
    );
    
    if (produto) {
        verProdutoDetalhe(produto.id);
    } else {
        mostrarMensagem(`Produto com código ${codigo} não encontrado`, 'warning');
    }
}

// ============================================
// CONFIGURAR EVENTOS DE INTERFACE
// ============================================
function configurarEventos() {
    console.log("⚙️ Configurando eventos...");
    
    // Botões principais
    document.getElementById('btnLogin')?.addEventListener('click', () => abrirModal('loginModal'));
    document.getElementById('btnLogout')?.addEventListener('click', fazerLogoutCliente);
    document.getElementById('btnGoToCart')?.addEventListener('click', () => {
        if (!usuarioLogado) {
            mostrarMensagem('Faça login para ir ao carrinho', 'warning');
            abrirModal('loginModal');
            return;
        }
        window.location.href = 'carrinho.html';
    });
    
    // Eventos de login
    document.getElementById('btnConfirmarLogin')?.addEventListener('click', fazerLoginCliente);
    document.getElementById('loginSenha')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fazerLoginCliente();
    });
    
    // Links entre modais
    document.getElementById('btnIrCadastro')?.addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal('loginModal');
        abrirModal('cadastroModal');
    });
    
    document.getElementById('btnConfirmarCadastro')?.addEventListener('click', fazerCadastroCliente);
    
    // Formatação de campos
    document.getElementById('cadastroTelefone')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15);
    });
    
    document.getElementById('cadastroCpf')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{3})(\d)/g, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .slice(0, 14);
    });
    
    document.getElementById('cadastroCep')?.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/g, '$1-$2')
            .slice(0, 9);
    });
    
    // Carregar último e-mail
    const ultimoEmail = localStorage.getItem('cliente_ultimo_email');
    if (ultimoEmail) {
        document.getElementById('loginEmail').value = ultimoEmail;
    }
    
    // Eventos de teclado globais
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            abrirModal('quickSearchModal');
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('quickSearchModal');
            if (modal && modal.classList.contains('active')) {
                fecharModal('quickSearchModal');
            }
        }
    });

    // Evento para quando usuário não verificou email
    window.addEventListener('usuarioNaoVerificado', (event) => {
        const { email } = event.detail;
        
        document.getElementById('verificacaoEmail').textContent = email;
        abrirModal('verificacaoEmailModal');
        
        // Atualizar tempo restante
        atualizarTempoRestante();
        
        // Atualizar a cada 30 segundos
        const interval = setInterval(() => {
            if (!document.getElementById('verificacaoEmailModal').classList.contains('active')) {
                clearInterval(interval);
                return;
            }
            atualizarTempoRestante();
        }, 30000);
    });

    
    // Reenviar email de verificação
    document.getElementById('btnReenviarVerificacao')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Reenviando e-mail...');
        
        try {
            const resultado = await window.reenviarEmailVerificacao(email);
            
            if (resultado.sucesso) {
                mostrarMensagem('E-mail reenviado! Você tem mais 30 minutos.', 'success');
                atualizarTempoRestante();
            } else {
                mostrarMensagem('Erro: ' + resultado.erro, 'error');
            }
        } catch (error) {
            mostrarMensagem('Erro ao reenviar', 'error');
        } finally {
            esconderLoading();
        }
    });
    
    // Verificar se já verificou o email
    document.getElementById('btnVerificarAgora')?.addEventListener('click', async () => {
        const email = document.getElementById('verificacaoEmail').textContent;
        
        mostrarLoading('Verificando...');
        
        try {
            // Tentar fazer login para verificar status
            // Nota: O usuário precisa fazer login novamente
            fecharModal('verificacaoEmailModal');
            abrirModal('loginModal');
            
            mostrarMensagem('Faça o login novamente após verificar seu e-mail', 'info');
        } catch (error) {
            mostrarMensagem('Erro ao verificar', 'error');
        } finally {
            esconderLoading();
        }
    });
 
    configurarMenuPerfil();
        
    // Verificar se os elementos existem antes de adicionar eventos
    const servicoSelect = document.getElementById('servicoSelect');
    const dataInput = document.getElementById('agendamentoData');
    const horarioSelect = document.getElementById('agendamentoHorario');
    const btnAbrirAgendamento = document.getElementById('btnAbrirAgendamento');
    const btnVerAgendamento = document.getElementById('btnVerAgendamento');
    const btnConfirmarAgendamento = document.getElementById('btnConfirmarAgendamento');
    
    // Evento: Quando mudar o serviço
    if (servicoSelect) {
        servicoSelect.addEventListener('change', function() {
            console.log('📅 Serviço selecionado:', this.value);
            
            if (this.value) {
                // Serviço selecionado - ativar data
                if (dataInput) {
                    dataInput.disabled = false;
                    
                    // Se não tiver data selecionada, colocar data atual como sugestão
                    if (!dataInput.value) {
                        const hoje = new Date();
                        const ano = hoje.getFullYear();
                        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                        const dia = String(hoje.getDate()).padStart(2, '0');
                        dataInput.value = `${ano}-${mes}-${dia}`;
                        
                        // Disparar evento change para carregar horários
                        setTimeout(() => {
                            if (dataInput) {
                                const event = new Event('change', { bubbles: true });
                                dataInput.dispatchEvent(event);
                            }
                        }, 100);
                    }
                }
                
                // Limpar e desabilitar horário até escolher data
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Selecione uma data</option>';
                    horarioSelect.disabled = true;
                }
            } else {
                // Nenhum serviço selecionado - desabilitar tudo
                if (dataInput) {
                    dataInput.value = '';
                    dataInput.disabled = true;
                }
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
                    horarioSelect.disabled = true;
                }
            }
        });
    }
    
    // Evento: Quando mudar a data
    if (dataInput) {
        dataInput.addEventListener('change', function() {
            console.log('📅 Data selecionada:', this.value);
            
            if (this.value && servicoSelect?.value) {
                // Tem serviço e data selecionados - carregar horários
                carregarHorariosCliente();
            } else if (!servicoSelect?.value) {
                // Não tem serviço selecionado
                if (horarioSelect) {
                    horarioSelect.innerHTML = '<option value="">Primeiro selecione um serviço</option>';
                    horarioSelect.disabled = true;
                }
            }
        });
    }
    
    // Evento: Botão "Fazer Agendamento"
    if (btnAbrirAgendamento) {
        btnAbrirAgendamento.addEventListener('click', () => {
            if (!usuarioLogado) {
                mostrarMensagem('Faça login para fazer um agendamento', 'warning');
                abrirModal('loginModal');
                return;
            }
            abrirModalAgendamento();
        });
    }
    
    // Evento: Botão "Ver Fila Completa"
    if (btnVerAgendamento) {
        btnVerAgendamento.addEventListener('click', () => {
            window.location.href = 'agendamento.html';
        });
    }

    // ============================================
    // 🔥 NOVO: Event listener para o botão Nova Senha Hoje
    // ============================================
    document.getElementById('btnNovaSenhaHoje')?.addEventListener('click', abrirModalNovaSenhaHoje);
    
    // ============================================
    // 🔥 NOVO: Event listener para o select de serviços no modal Nova Senha
    // ============================================
    const senhaRapidaServico = document.getElementById('senhaRapidaServico');
    if (senhaRapidaServico) {
        senhaRapidaServico.addEventListener('change', carregarPrimeiroHorarioDisponivel);
    }
    
    document.getElementById('agendamentoStatus')?.addEventListener('click', alternarModoOperacao);    
    console.log("✅ Eventos configurados");
}

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

// ============================================
// FUNÇÕES AUXILIARES PARA SCROLL DA COLUNA 3 - PARTE DE AGENDAMENTO
// ============================================
window.scrollServico = function(servicoId, amount) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (scrollEl) {
        scrollEl.scrollBy({ 
            left: amount, 
            behavior: 'smooth' 
        });
    }
};

// ============================================
// 🔥 NOVA FUNÇÃO: Configurar scroll e setas
// ============================================
function configurarScrollServico(servicoId) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (!scrollEl) return;
    
    const container = scrollEl.closest('.servico-carousel-container');
    if (!container) return;
    
    const prevBtn = container.querySelector('.prev');
    const nextBtn = container.querySelector('.next');
    
    if (!prevBtn || !nextBtn) return;
    
    // 🔥 GARANTIR QUE AS SETAS ESTÃO VISÍVEIS
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
    
    function atualizarSetas() {
        const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
        
        // Desabilitar seta esquerda se no início
        prevBtn.disabled = scrollEl.scrollLeft <= 5;
        
        // Desabilitar seta direita se no fim
        nextBtn.disabled = scrollEl.scrollLeft >= maxScroll - 5;
    }
    
    // Atualizar ao scrollar
    scrollEl.addEventListener('scroll', atualizarSetas);
    
    // Atualizar inicialmente
    setTimeout(atualizarSetas, 100);
    
    // 🔥 FORÇAR ATUALIZAÇÃO QUANDO A JANELA REDIMENSIONAR
    window.addEventListener('resize', atualizarSetas);
}

// Função para ir para uma página específica do serviço
window.goToServicoPage = function(servicoId, pageIndex) {
    const scrollEl = document.getElementById(`servico-${servicoId}-scroll`);
    if (scrollEl) {
        // Assumindo que cada card tem 180px + gap 12px = 192px por card
        // 2 cards por página = 384px
        const scrollAmount = pageIndex * 384;
        scrollEl.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        
        // Atualizar dots
        const dots = document.querySelectorAll(`#servico-${servicoId}-dots .dot`);
        dots.forEach((dot, idx) => {
            if (idx === pageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
};



// ============================================
// INICIALIZAÇÃO
// ============================================
(async function() {
    console.log("📄 Inicializando clientes.js imediatamente...");
    
    mostrarLoading('Carregando loja...');
    
    try {
        // Garantir que temos o lojaId
        if (!lojaIdAtual) {
            lojaIdAtual = window.lojaIdAtual || extrairLojaIdDaURL();
        }
        
        console.log(`📍 Loja ID: ${lojaIdAtual}`);
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            return;
        }
        
        // Configurar favicon
        configurarFavicon();
        
        // Carregar logo
        carregarLogoLoja();
        
        // Carregar dados da loja (com retry)
        await carregarDadosLoja();
        
        // 🔥 NOVO: Verificar se agendamento está habilitado
        agendamentoHabilitado = await verificarAgendamentoHabilitado();
        console.log(`📅 Agendamento habilitado para esta loja? ${agendamentoHabilitado ? 'SIM' : 'NÃO'}`);
        toggleAgendamentoContainer(agendamentoHabilitado);

        if (agendamentoHabilitado) {
            await carregarConfiguracoesServicos();
            iniciarEscutaAgendamentos();
            
            // 🔥 INICIAR VERIFICAÇÃO DO CARROSSEL
            setTimeout(() => {
                verificarEIniciarCarrossel();
            }, 1000);
        }
        
        // Configurar eventos
        configurarEventos();
        
        // Carregar produtos e categorias
        await carregarProdutos();
        await carregarCategorias();
        await carregarProdutosDestaque();
        
        esconderLoading();
        console.log("✅ Loja clientes pronta!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar loja', 'error');
        esconderLoading();
    }
})();

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.verProdutoDetalhe = verProdutoDetalhe;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.filtrarPorCategoria = filtrarPorCategoria;
window.fecharModal = fecharModal;

console.log("✅ index.js carregado com sucesso!");







