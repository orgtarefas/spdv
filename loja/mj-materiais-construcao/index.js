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
let intervaloAtualizacaoAgendamento = null;

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
// ATUALIZAR STATUS NO FIREBASE - NOVA ESTRUTURA COM MÊS/ANO
// ============================================
async function atualizarStatusAgendamento(agendamento, novoStatus) {
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
        
        // agendamentos / [lojaId] / [mes_ano] / [data_id] / [servicoId] / [agendamentoId]
        const agendamentoRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataId,
            servicoId,
            agendamentoId
        );
        
        console.log(`🔍 Verificando documento em: agendamentos/${lojaIdAtual}/${mesAno}/${dataId}/${servicoId}/${agendamentoId}`);
        
        // Verificar se o documento existe
        const docSnap = await getDoc(agendamentoRef);
        
        if (!docSnap.exists()) {
            console.log(`⚠️ Agendamento ${agendamentoId} não encontrado no Firestore - ignorando atualização`);
            return false;
        }
        
        // Dados atuais do agendamento (para log)
        const dadosAtuais = docSnap.data();
        console.log(`📋 Status atual: ${dadosAtuais.status_agendamento} -> Novo: ${novoStatus}`);
        
        // Criar objeto de atualização
        const updateData = {
            status_agendamento: novoStatus,
            ultima_atualizacao: serverTimestamp()
        };
        
        // Se for conclusão, adicionar data de conclusão
        if (novoStatus === 'Concluido') {
            updateData.data_conclusao = serverTimestamp();
        }
        
        // Se for cancelamento, adicionar motivo (opcional)
        if (novoStatus === 'Cancelado') {
            updateData.data_cancelamento = serverTimestamp();
        }
        
        // Atualizar apenas os campos necessários
        await updateDoc(agendamentoRef, updateData);
        
        console.log(`✅ Status atualizado para ${novoStatus}`);
        
        // Opcional: Registrar no histórico do agendamento
        try {
            const historicoRef = collection(agendamentoRef, 'historico');
            await addDoc(historicoRef, {
                status: novoStatus,
                data: serverTimestamp(),
                alterado_por: dadosUsuario?.email || 'sistema',
                observacao: `Status alterado de ${dadosAtuais.status_agendamento} para ${novoStatus}`
            });
            console.log(`📝 Histórico registrado`);
        } catch (historicoError) {
            console.warn('⚠️ Erro ao registrar histórico:', historicoError);
            // Não falha a operação principal se o histórico falhar
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        return false;
    }
}

// ============================================
// CARREGAR AGENDAMENTOS ATIVOS - NOVA ESTRUTURA COM MÊS/ANO
// ============================================
function iniciarEscutaAgendamentos() {
    if (!agendamentoHabilitado || !lojaIdAtual) return;
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos...');
    
    try {
        // Mês e ano atual
        const hoje = new Date();
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        console.log(`📅 Escutando mês: ${mesAnoAtual}`);
        
        // Referência para a coleção do mês atual
        const mesRef = collection(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual
        );
        
        // Escutar todas as datas do mês atual
        const unsubscribe = onSnapshot(mesRef, (snapshot) => {
            console.log(`📨 Atualização em ${mesAnoAtual}: ${snapshot.size} datas com agendamentos`);
            
            // Reconstruir a lista completa
            reconstruirListaAgendamentos();
            
        }, (error) => {
            console.error('❌ Erro na escuta:', error);
        });
        
        // Guardar unsubscribe para limpar depois
        window.unsubscribeAgendamentos = unsubscribe;
        
        // Carregar a lista inicial
        reconstruirListaAgendamentos();
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// FUNÇÃO PARA RECONSTRUIR A LISTA DE AGENDAMENTOS - CORRIGIDA
// ============================================
async function reconstruirListaAgendamentos() {
    try {
        const agendamentosAtivosTemp = [];
        const agendamentosFuturosTemp = [];
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        
        const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        const mesAnoAtual = `${mesAtual}_${anoAtual}`;
        
        console.log(`🔍 Buscando agendamentos do mês: ${mesAnoAtual}`);
        
        const mesRef = collection(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAnoAtual
        );
        
        const datasSnapshot = await getDocs(mesRef);
        
        console.log(`📊 Encontradas ${datasSnapshot.size} datas com agendamentos`);
        
        const statusFila = [
            'Em atendimento',
            'Próximo a atender',
            'Na fila',
            'Verificado',
            'Pendente'
        ];
        
        for (const dataDoc of datasSnapshot.docs) {
            const dataId = dataDoc.id;
            
            const servicosConfigRef = collection(db, 'configuracoes', 'servico_agendamento', lojaIdAtual);
            const servicosConfigSnap = await getDocs(servicosConfigRef);
            
            for (const servicoConfigDoc of servicosConfigSnap.docs) {
                const servicoId = servicoConfigDoc.id;
                const servicoNome = servicoConfigDoc.data().nome || servicoId;
                
                const agendamentosRef = collection(
                    db,
                    'agendamentos',
                    lojaIdAtual,
                    mesAnoAtual,
                    dataId,
                    servicoId
                );
                
                const agendamentosSnapshot = await getDocs(agendamentosRef);
                
                agendamentosSnapshot.forEach(agendamentoDoc => {
                    const agendamento = agendamentoDoc.data();
                    const agendamentoId = agendamentoDoc.id;
                    
                    if (agendamento && agendamento.data_hora_agendada) {
                        const dataHoraAgendada = agendamento.data_hora_agendada?.toDate?.() || 
                                                new Date(agendamento.data_hora_agendada);
                        
                        if (dataHoraAgendada >= hoje && dataHoraAgendada < amanha) {
                            if (statusFila.includes(agendamento.status_agendamento)) {
                                
                                const numero = agendamentoId.split('_')[1] || '1';
                                
                                agendamentosAtivosTemp.push({
                                    id: `${dataId}_${servicoId}_${agendamentoId}`,
                                    data_id: dataId,
                                    mes_ano: mesAnoAtual,
                                    servico_id: servicoId,
                                    servico_nome: servicoNome,
                                    agendamento_id: agendamentoId,
                                    cliente_email: agendamento.cliente_email,
                                    cliente_nome: agendamento.cliente_nome || 'Cliente',
                                    cliente_telefone: agendamento.cliente_telefone || '',
                                    status: agendamento.status_agendamento,
                                    data_hora: dataHoraAgendada,
                                    horario: dataHoraAgendada.toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    }),
                                    senha: gerarSenha(parseInt(numero), agendamento.status_agendamento),
                                    timestamp: dataHoraAgendada.getTime()
                                });
                            }
                        } else {
                            agendamentosFuturosTemp.push({
                                id: `${dataId}_${servicoId}_${agendamentoId}`,
                                data_id: dataId,
                                mes_ano: mesAnoAtual,
                                servico_id: servicoId,
                                servico_nome: servicoNome,
                                agendamento_id: agendamentoId,
                                cliente_email: agendamento.cliente_email,
                                cliente_nome: agendamento.cliente_nome || 'Cliente',
                                status: agendamento.status_agendamento,
                                data: dataHoraAgendada.toISOString().split('T')[0],
                                data_obj: dataHoraAgendada,
                                horario: dataHoraAgendada.toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                }),
                                validado: agendamento.status_agendamento === 'Verificado'
                            });
                        }
                    }
                });
            }
        }
        
        agendamentosAtivosTemp.sort((a, b) => a.timestamp - b.timestamp);
        
        agendamentosAtivos = agendamentosAtivosTemp;
        agendamentosFuturos = agendamentosFuturosTemp;
        
        console.log('📋 ===== RESUMO DOS AGENDAMENTOS DE HOJE =====');
        console.log(`📋 Total: ${agendamentosAtivos.length} agendamentos`);
        
        renderizarPainelAgendamento();
        
        setTimeout(() => {
            gerenciarFilaAtendimento();
            inicializarCarrosselAgendamento();
        }, 100);
        
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
// GERAR SENHA BASEADA NO STATUS
// ============================================
function gerarSenha(numero, status) {
    const prefixos = {
        'Em atendimento': 'A',
        'Próximo a atender': 'P',
        'Na fila': 'F',
        'Verificado': 'V',
        'Pendente': 'S',
        'Cancelado': 'C',
        'Concluido': 'X'
    };
    
    const prefixo = prefixos[status] || 'S';
    return `${prefixo}${numero.toString().padStart(2, '0')}`;
}

// ============================================
// GERENCIAR FILA DE ATENDIMENTO - IGNORA ERROS DE DOCUMENTO INEXISTENTE
// ============================================
async function gerenciarFilaAtendimento() {
    try {
        console.log('🔄 Gerenciando fila de atendimento...');
        
        if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            console.log('📭 Fila vazia');
            return;
        }
        
        // Ordenar todos por data/hora
        const todosOrdenados = [...agendamentosAtivos].sort((a, b) => a.data_hora - b.data_hora);
        
        // Identificar status atuais
        const emAtendimento = todosOrdenados.find(a => a.status === 'Em atendimento');
        const proximoAtender = todosOrdenados.find(a => a.status === 'Próximo a atender');
        
        // Filtrar quem está na fila
        const fila = todosOrdenados.filter(a => 
            a.status !== 'Em atendimento' && 
            (a.status === 'Na fila' || a.status === 'Verificado' || a.status === 'Próximo a atender')
        );
        
        console.log('📊 Status atual:', {
            emAtendimento: emAtendimento?.cliente_nome || 'ninguém',
            proximoAtender: proximoAtender?.cliente_nome || 'ninguém',
            naFila: fila.length
        });
        
        // REGRA 1: SE NÃO TEM NINGUÉM EM ATENDIMENTO
        if (!emAtendimento) {
            console.log('📞 Ninguém em atendimento - preciso chamar alguém');
            
            if (proximoAtender) {
                console.log(`➡️ Chamando ${proximoAtender.cliente_nome} para atendimento`);
                
                // Usar o objeto completo
                const resultado = await atualizarStatusAgendamento(proximoAtender, 'Em atendimento');
                
                if (resultado) {
                    agendamentosAtivos = agendamentosAtivos.map(a => 
                        a.id === proximoAtender.id ? { ...a, status: 'Em atendimento' } : a
                    );
                    renderizarPainelAgendamento();
                }
                return;
            }
            
            if (fila.length > 0) {
                const primeiroDaFila = fila[0];
                console.log(`➡️ Primeiro da fila ${primeiroDaFila.cliente_nome} vai para atendimento`);
                
                const resultado = await atualizarStatusAgendamento(primeiroDaFila, 'Em atendimento');
                
                if (resultado) {
                    agendamentosAtivos = agendamentosAtivos.map(a => 
                        a.id === primeiroDaFila.id ? { ...a, status: 'Em atendimento' } : a
                    );
                    renderizarPainelAgendamento();
                }
                return;
            }
        }
        
        // REGRA 2: SE TEM ALGUÉM EM ATENDIMENTO
        if (emAtendimento) {
            console.log(`👤 Em atendimento: ${emAtendimento.cliente_nome}`);
            
            if (!proximoAtender && fila.length > 0) {
                const filaSemAtendimento = fila.filter(a => a.id !== emAtendimento.id);
                
                if (filaSemAtendimento.length > 0) {
                    const primeiroDaFila = filaSemAtendimento[0];
                    console.log(`⬆️ ${primeiroDaFila.cliente_nome} agora é o próximo a atender`);
                    
                    const resultado = await atualizarStatusAgendamento(primeiroDaFila, 'Próximo a atender');
                    
                    if (resultado) {
                        agendamentosAtivos = agendamentosAtivos.map(a => 
                            a.id === primeiroDaFila.id ? { ...a, status: 'Próximo a atender' } : a
                        );
                        renderizarPainelAgendamento();
                    }
                    return;
                }
            }
        }
        
        console.log('✅ Fila está organizada corretamente');
        
    } catch (error) {
        console.error('❌ Erro ao gerenciar fila:', error);
    }
}

// ============================================
// RENDERIZAR PAINEL DE AGENDAMENTO - VERSÃO COMPLETA E CORRIGIDA
// ============================================
function renderizarPainelAgendamento() {
    if (!agendamentoHabilitado) return;
    
    console.log('📅 Renderizando painel de agendamento...');
    console.log('Agendamentos ativos:', agendamentosAtivos);
    
    // ============================================
    // ORGANIZAR POR STATUS (FLUXO AUTOMÁTICO)
    // ============================================
    
    // 1. EM ATENDIMENTO (prioridade máxima)
    let emAtendimento = agendamentosAtivos.find(a => a.status === 'Em atendimento');
    
    // 2. PRÓXIMO A ATENDER - SEMPRE PROCURAR, INDEPENDENTE DE TER ALGUÉM EM ATENDIMENTO
    let proximoAtender = agendamentosAtivos.find(a => a.status === 'Próximo a atender');
    
    // 3. SE NÃO TIVER PRÓXIMO DEFINIDO, PEGA O PRIMEIRO DA FILA COMO SUGESTÃO
    let primeiroDaFila = null;
    if (!proximoAtender) {
        const fila = agendamentosAtivos.filter(a => 
            a.status !== 'Em atendimento' && 
            a.status !== 'Próximo a atender' &&
            ['Na fila', 'Verificado', 'Pendente'].includes(a.status)
        ).sort((a, b) => a.data_hora - b.data_hora);
        
        if (fila.length > 0) {
            primeiroDaFila = fila[0];
            console.log(`🔄 Primeiro da fila: ${primeiroDaFila.cliente_nome}`);
        }
    }
    
    // 4. OUTROS NA FILA (exclui emAtendimento e proximoAtender/primeiroDaFila)
    const outrosNaFila = agendamentosAtivos.filter(a => {
        if (a.id === emAtendimento?.id) return false;
        if (a.id === proximoAtender?.id) return false;
        if (a.id === primeiroDaFila?.id) return false;
        return ['Na fila', 'Verificado', 'Pendente'].includes(a.status);
    }).sort((a, b) => a.data_hora - b.data_hora);
    
    console.log('📊 Organização:', {
        emAtendimento: emAtendimento?.cliente_nome || 'Nenhum',
        proximoAtender: proximoAtender?.cliente_nome || (primeiroDaFila?.cliente_nome || 'Nenhum'),
        outrosNaFila: outrosNaFila.map(a => a.cliente_nome)
    });
    
    // ============================================
    // ATUALIZAR BADGES E CONTADORES
    // ============================================
    
    // Total na fila (próximo + outros)
    const totalFila = (proximoAtender || primeiroDaFila ? 1 : 0) + outrosNaFila.length;
    
    const totalFilaBadge = document.getElementById('totalFilaBadge');
    if (totalFilaBadge) totalFilaBadge.textContent = totalFila;
    
    const totalFilaTexto = document.getElementById('totalFilaTexto');
    if (totalFilaTexto) totalFilaTexto.textContent = totalFila;
    
    // Calcular tempo médio de espera
    const tempoMedioEspera = calcularTempoMedioEspera();
    const tempoMedioElement = document.getElementById('tempoMedioEspera');
    if (tempoMedioElement) tempoMedioElement.textContent = tempoMedioEspera;
    
    // ============================================
    // COLUNA 1: EM ATENDIMENTO
    // ============================================
    const chamandoEl = document.getElementById('chamandoAgoraCard');
    if (chamandoEl) {
        if (emAtendimento) {
            chamandoEl.innerHTML = `
                <div class="card-chamando-destaque">
                    <div class="senha-grande">${emAtendimento.senha || '---'}</div>
                    <div class="cliente-nome">${emAtendimento.cliente_nome}</div>
                    <div class="servico-nome">
                        <i class="fas fa-clock"></i> ${emAtendimento.servico_nome || emAtendimento.servico_id || 'Serviço'}
                    </div>
                </div>
            `;
            
            // Atualizar última hora chamada
            const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
            if (ultimoChamadoHora) {
                const agora = new Date();
                ultimoChamadoHora.textContent = agora.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
        } else {
            chamandoEl.innerHTML = `
                <div class="empty-agendamento">
                    <i class="fas fa-check-circle"></i>
                    <p>Nenhum chamado no momento</p>
                </div>
            `;
            
            // Limpar última hora
            const ultimoChamadoHora = document.getElementById('ultimoChamadoHora');
            if (ultimoChamadoHora) ultimoChamadoHora.textContent = '--:--';
        }
    }
    
    // ============================================
    // COLUNA 2: PRÓXIMOS A ATENDER
    // ============================================
    const proximosEl = document.getElementById('proximosFilaCard');
    if (proximosEl) {
        // Quem deve aparecer na coluna "Próximos a atender"
        const quemMostrar = proximoAtender || primeiroDaFila;
        
        if (quemMostrar) {
            proximosEl.innerHTML = `
                <div class="item-fila-vertical urgente">
                    <span class="senha-numero">${quemMostrar.senha}</span>
                    <div class="senha-info">
                        <span class="senha-cliente">${quemMostrar.cliente_nome}</span>
                        <span class="senha-servico">
                            <i class="fas fa-clock"></i> ${quemMostrar.servico_nome || quemMostrar.servico_id || 'Serviço'}
                        </span>
                    </div>
                </div>
            `;
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
    // COLUNA 3: OUTROS NA FILA (CARROSSEL)
    // ============================================
    const proximosTrack = document.getElementById('proximasSenhasTrack');
    if (proximosTrack) {
        if (outrosNaFila.length > 0) {
            let html = '';
            outrosNaFila.forEach((item, index) => {
                const posicao = index + 1;
                
                html += `
                    <div class="proximo-card">
                        <div class="senha-numero">${item.senha}</div>
                        <div class="senha-cliente">${item.cliente_nome}</div>
                        <div class="senha-servico">
                            <i class="fas fa-clock"></i> ${item.servico_nome || item.servico_id || 'Serviço'}
                        </div>
                        <span class="senha-posicao">${posicao}° na fila</span>
                    </div>
                `;
            });
            proximosTrack.innerHTML = html;
            
            // Atualizar dots do carrossel
            atualizarDotsScroll(outrosNaFila.length);
        } else {
            // Placeholders quando não há dados
            let placeholders = '';
            for (let i = 0; i < 4; i++) {
                placeholders += `
                    <div class="proximo-card-placeholder">
                        <div class="senha-numero">--</div>
                        <div class="senha-info">
                            <span class="senha-cliente">Aguardando...</span>
                            <span class="senha-servico">---</span>
                        </div>
                    </div>
                `;
            }
            proximosTrack.innerHTML = placeholders;
            atualizarDotsScroll(0);
        }
    }
    
    // ============================================
    // MINHA SENHA (se usuário logado)
    // ============================================
    const minhaSenhaContainer = document.getElementById('minhaSenhaContainer');
    if (minhaSenhaContainer && usuarioLogado && dadosUsuario) {
        // Procurar agendamento do usuário logado
        const meuAgendamento = agendamentosAtivos.find(a => 
            a.cliente_email === dadosUsuario.email && 
            ['Em atendimento', 'Próximo a atender', 'Na fila', 'Verificado', 'Pendente'].includes(a.status)
        );
        
        if (meuAgendamento) {
            let statusTexto = '';
            let statusClass = '';
            
            switch(meuAgendamento.status) {
                case 'Em atendimento':
                    statusTexto = 'SUA VEZ!';
                    statusClass = 'chamando';
                    break;
                case 'Próximo a atender':
                    statusTexto = 'Você é o próximo!';
                    statusClass = 'proximo';
                    break;
                case 'Na fila':
                case 'Verificado':
                case 'Pendente':
                    statusTexto = 'Aguardando';
                    statusClass = '';
                    break;
                default:
                    statusTexto = meuAgendamento.status;
                    statusClass = '';
            }
            
            const senhaNumeroEl = document.getElementById('minhaSenhaNumero');
            if (senhaNumeroEl) senhaNumeroEl.textContent = meuAgendamento.senha || '---';
            
            const senhaStatusEl = document.getElementById('minhaSenhaStatus');
            if (senhaStatusEl) {
                senhaStatusEl.textContent = statusTexto;
                senhaStatusEl.className = `minha-senha-status ${statusClass}`;
            }
            
            minhaSenhaContainer.style.display = 'block';
        } else {
            minhaSenhaContainer.style.display = 'none';
        }
    } else if (minhaSenhaContainer) {
        minhaSenhaContainer.style.display = 'none';
    }
    
    // Inicializar scroll horizontal
    setTimeout(() => {
        inicializarScrollHorizontal();
    }, 100);
}

// ============================================
// CALCULAR TEMPO MÉDIO DE ESPERA (ESTIMATIVA)
// ============================================
function calcularTempoMedioEspera() {
    // Em uma implementação real, você usaria a duração dos serviços
    // Por enquanto, vamos usar um valor fixo ou baseado na quantidade
    
    const emAtendimento = agendamentosAtivos.some(a => a.status === 'Em atendimento');
    const proximoAtender = agendamentosAtivos.some(a => a.status === 'Próximo a atender');
    const naFila = agendamentosAtivos.filter(a => a.status === 'Na fila' || a.status === 'Verificado');
    
    if (!emAtendimento && !proximoAtender && naFila.length === 0) {
        return 0;
    }
    
    // Estimativa: 15 minutos por atendimento
    const tempoPorAtendimento = 15;
    
    // Quem está na frente
    let pessoasNaFrente = 0;
    
    if (emAtendimento) pessoasNaFrente += 1;
    if (proximoAtender) pessoasNaFrente += 1;
    pessoasNaFrente += naFila.length;
    
    return pessoasNaFrente * tempoPorAtendimento;
}

// ============================================
// FUNÇÃO PARA ATUALIZAR DOTS DO SCROLL
// ============================================
function atualizarDotsScroll(totalItens) {
    const dotsContainer = document.getElementById('scrollDots');
    if (!dotsContainer) return;
    
    // Calcular número de dots baseado na quantidade de itens
    const numDots = Math.min(totalItens, 5); // Máximo 5 dots
    
    let dotsHtml = '';
    for (let i = 0; i < numDots; i++) {
        dotsHtml += `<span class="dot ${i === 0 ? 'active' : ''}"></span>`;
    }
    
    dotsContainer.innerHTML = dotsHtml;
}

// ============================================
// FUNÇÃO ÚNICA E CORRIGIDA PARA INICIALIZAR SCROLL HORIZONTAL
// ============================================
function inicializarScrollHorizontal() {
    const track = document.getElementById('proximasSenhasTrack');
    const scrollContainer = document.getElementById('proximasSenhasScroll');
    const prevBtn = document.getElementById('proximasSenhasPrev');
    const nextBtn = document.getElementById('proximasSenhasNext');
    
    if (!track || !scrollContainer) return;
    
    const scrollAmount = 200; // Quantidade de pixels para scrollar
    
    // Clonar e substituir botões para remover listeners antigos
    if (prevBtn) {
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        
        newPrevBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });
    }
    
    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        
        newNextBtn.addEventListener('click', () => {
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }
    
    // Clonar e substituir o scrollContainer para remover listeners antigos
    const newScrollContainer = scrollContainer.cloneNode(true);
    scrollContainer.parentNode.replaceChild(newScrollContainer, scrollContainer);
    
    // Adicionar event listener de scroll
    newScrollContainer.addEventListener('scroll', () => {
        const scrollLeft = newScrollContainer.scrollLeft;
        const maxScroll = newScrollContainer.scrollWidth - newScrollContainer.clientWidth;
        
        // Atualizar dots baseado na posição
        const dots = document.querySelectorAll('.scroll-indicator-dots .dot');
        if (dots.length > 0 && maxScroll > 0) {
            const scrollPercent = scrollLeft / maxScroll;
            const activeDot = Math.floor(scrollPercent * dots.length);
            
            dots.forEach((dot, index) => {
                if (index === activeDot) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        // Habilitar/desabilitar botões
        const currentPrevBtn = document.getElementById('proximasSenhasPrev');
        const currentNextBtn = document.getElementById('proximasSenhasNext');
        
        if (currentPrevBtn) {
            currentPrevBtn.disabled = scrollLeft <= 0;
        }
        if (currentNextBtn) {
            currentNextBtn.disabled = scrollLeft >= maxScroll - 5;
        }
    });
    
    // Trigger scroll event para inicializar estado dos botões
    setTimeout(() => {
        newScrollContainer.dispatchEvent(new Event('scroll'));
    }, 100);
    
    console.log('✅ Scroll horizontal inicializado');
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
// CARREGAR SERVIÇOS PARA CLIENTE (ESTRUTURA INVERTIDA)
// ============================================
async function carregarServicosCliente() {
    const select = document.getElementById('servicoSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando serviços...</option>';
    select.disabled = true;
    
    try {
        console.log('🔍 Buscando serviços em:', `configuracoes/servico_agendamento/${lojaIdAtual}`);
        
        // 🔥 NOVA ESTRUTURA: configuracoes / servico_agendamento / [lojaId]
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',  // ← Documento fixo
            lojaIdAtual               // ← Subcoleção da loja
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
// CONFIRMAR AGENDAMENTO - NOVA ESTRUTURA COM MÊS/ANO
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
        
        // Sanitizar nome do serviço para usar como ID da coleção
        const servicoId = nomeServico
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        
        // Extrair data para criar os segmentos
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`; // Ex: "03_2026"
        const dataFormatada = `${dia}_${mes}_${ano}`; // Ex: "09_03_2026"
        
        // Dados do agendamento
        const agendamentoData = {
            criado_em: serverTimestamp(),
            data_hora_agendada: new Date(`${data}T${horario}:00-03:00`),
            status_agendamento: precisaValidar ? "Pendente" : "Verificado",
            cliente_email: clienteEmail,
            cliente_nome: clienteNome,
            cliente_telefone: clienteTelefone
        };
        
        console.log('📝 Salvando agendamento:', agendamentoData);
        console.log('🔧 Serviço ID:', servicoId);
        console.log('📅 Mês/Ano:', mesAno, 'Data:', dataFormatada);
        
        // ============================================
        // 5. SALVAR NO FIREBASE - NOVA ESTRUTURA
        // ============================================
        // agendamentos / [lojaId] / [mes_ano] / [data] / [servicoId] / [agendamento_X]
        
        // Referência para a coleção do serviço dentro da data específica
        const servicoRef = collection(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,           // ← Mês/Ano como coleção
            dataFormatada,    // ← Data como documento
            servicoId         // ← Serviço como coleção
        );
        
        // Contar quantos agendamentos já existem para ESTE serviço nesta data
        const snapshot = await getDocs(servicoRef);
        const nextNumber = snapshot.size + 1;
        const agendamentoId = `agendamento_${nextNumber}`;
        
        console.log(`📊 Já existem ${snapshot.size} agendamentos em ${servicoId} para ${dataFormatada}`);
        console.log(`🆓 Próximo ID: ${agendamentoId}`);
        
        // Salvar o agendamento
        const agendamentoRef = doc(
            db,
            'agendamentos',
            lojaIdAtual,
            mesAno,
            dataFormatada,
            servicoId,
            agendamentoId
        );
        
        await setDoc(agendamentoRef, agendamentoData);
        
        console.log(`✅ Agendamento ${agendamentoId} salvo em ${mesAno}/${dataFormatada}/${servicoId}`);
        
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

window.diagnosticarAgendamentos = async function() {
    try {
        console.log('🔍 DIAGNÓSTICO DE AGENDAMENTOS');
        
        // 1. Listar meses
        const mesesRef = collection(db, 'agendamentos', lojaIdAtual);
        const meses = await getDocs(mesesRef);
        console.log('📅 Meses:', meses.docs.map(d => d.id));
        
        // 2. Para cada mês, listar datas
        for (const mes of meses.docs) {
            const datasRef = collection(db, 'agendamentos', lojaIdAtual, mes.id);
            const datas = await getDocs(datasRef);
            console.log(`📆 ${mes.id}:`, datas.docs.map(d => d.id));
            
            // 3. Para cada data, listar serviços (coleções)
            for (const data of datas.docs) {
                // Não podemos listar coleções diretamente, então tentamos acessar serviços conhecidos
                // Ou usamos a lista de serviços cadastrados
                console.log(`🔧 Serviços em ${data.id}:`);
                
                // Buscar serviços das configurações
                const servicosConfigRef = collection(db, 'configuracoes', 'servico_agendamento', lojaIdAtual);
                const servicosConfig = await getDocs(servicosConfigRef);
                
                for (const servico of servicosConfig.docs) {
                    const agendamentosRef = collection(db, 'agendamentos', lojaIdAtual, mes.id, data.id, servico.id);
                    const agendamentos = await getDocs(agendamentosRef);
                    if (agendamentos.size > 0) {
                        console.log(`  - ${servico.id}: ${agendamentos.size} agendamentos`);
                        agendamentos.forEach(doc => {
                            console.log(`    * ${doc.id}:`, doc.data());
                        });
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
};

// ============================================
// INICIALIZAÇÃO (CORRIGIDA - EXECUTA IMEDIATAMENTE)
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
            iniciarEscutaAgendamentos();
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








