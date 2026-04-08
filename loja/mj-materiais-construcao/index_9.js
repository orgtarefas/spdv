// index_9.js - Funções Auxiliares e Exportações

// ============================================
// IMPORTAÇÕES DO FIREBASE
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
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    limit
} from './novo_firebase_config.js';

// ============================================
// REGISTRAR MÓDULO NO SPDV
// ============================================
if (window.SPDV && window.registrarModulo) {
    window.registrarModulo('auxiliares', {
        carregarServicosComPrimeiroHorario: 'Carrega serviços com primeiro horário disponível',
        encontrarPrimeiroHorarioDisponivel: 'Encontra primeiro horário disponível',
        carregarHorariosCliente: 'Carrega horários disponíveis para cliente',
        carregarServicosCliente: 'Carrega serviços para cliente',
        carregarClientesParaSelect: 'Carrega clientes para select (funcionários)',
        carregarPrimeiroHorarioDisponivel: 'Carrega primeiro horário ao selecionar serviço',
        diagnosticarLogin: 'Diagnóstico de login'
    });
}

// ============================================
// FUNÇÕES AUXILIARES DE AGENDAMENTO
// ============================================

async function carregarServicosComPrimeiroHorario() {
    const servicoSelect = document.getElementById('senhaRapidaServico');
    if (!servicoSelect) return;
    
    try {
        const servicosRef = collection(
            db, 
            'configuracoes', 
            'servico_agendamento',
            lojaIdAtual
        );
        
        const snapshot = await getDocs(servicosRef);
        const servicos = [];
        
        snapshot.forEach(doc => {
            servicos.push({ id: doc.id, ...doc.data() });
        });
        
        if (servicos.length === 0) {
            servicoSelect.innerHTML = '<option value="">Nenhum serviço disponível</option>';
            servicoSelect.disabled = true;
            return;
        }
        
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataHoje = `${ano}-${mes}-${dia}`;
        
        servicoSelect.innerHTML = '<option value="">Selecione um serviço...</option>';
        
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

async function encontrarPrimeiroHorarioDisponivel(servico, data) {
    try {
        // Horário da loja (padrão)
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
                const diasMap = {0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'};
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
                        return null;
                    }
                }
            }
        }
        
        const dataObj = new Date(data + 'T12:00:00');
        const diaSemana = dataObj.getDay();
        const diasMap = {0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'};
        const diaId = diasMap[diaSemana];
        
        const diasAtivos = servico.diasAtivos || [];
        if (!diasAtivos.includes(diaId)) return null;
        
        const configDia = servico.configuracoesPorDia?.[diaId];
        if (!configDia || !configDia.ativo) return null;
        
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
        
        let minutosInicio = Math.max(minutosInicioServico, minutosLojaAbertura);
        let minutosFim = Math.min(minutosFimServico, minutosLojaFechamento);
        
        if (minutosInicio >= minutosFim) return null;
        
        const horarios = [];
        let minutosAtual = minutosInicio;
        
        while (minutosAtual + duracao <= minutosFim) {
            const hora = Math.floor(minutosAtual / 60);
            const minuto = minutosAtual % 60;
            const horarioStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
            horarios.push(horarioStr);
            minutosAtual += duracao + intervaloEntre;
        }
        
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
        
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minAtual = agora.getMinutes();
        
        horariosFiltrados = horariosFiltrados.filter(horario => {
            const [h, m] = horario.split(':').map(Number);
            return (h > horaAtual) || (h === horaAtual && m > minAtual);
        });
        
        if (horariosFiltrados.length === 0) return null;
        
        const [ano, mes, dia] = data.split('-');
        const mesAno = `${mes}_${ano}`;
        const dataFormatada = `${dia}_${mes}_${ano}`;
        
        const diaDocRef = doc(db, 'agendamentos', lojaIdAtual, mesAno, dataFormatada);
        const docSnap = await getDoc(diaDocRef);
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            const agendamentosServico = dados[servico.id] || {};
            
            for (const horario of horariosFiltrados) {
                const [h, m] = horario.split(':').map(Number);
                const dataHoraAgendada = new Date(`${data}T${horario}:00-03:00`);
                let horarioOcupado = false;
                
                for (const [agendamentoId, agendamento] of Object.entries(agendamentosServico)) {
                    if (agendamento.data_hora_agendada) {
                        const dataHoraExistente = agendamento.data_hora_agendada?.toDate?.() || new Date(agendamento.data_hora_agendada);
                        if (dataHoraExistente.getTime() === dataHoraAgendada.getTime()) {
                            horarioOcupado = true;
                            break;
                        }
                    }
                }
                
                if (!horarioOcupado) return horario;
            }
            return null;
        } else {
            return horariosFiltrados[0];
        }
        
    } catch (error) {
        console.error('❌ Erro ao encontrar primeiro horário:', error);
        return null;
    }
}

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
    
    horarioSelect.innerHTML = '<option value="">Verificando horários...</option>';
    horarioSelect.disabled = true;
    
    try {
        let lojaAbertura = "00:00";
        let lojaFechamento = "23:59";
        
        if (window.loginDb) {
            const lojaDoc = await window.loginDb.collection('lojas').doc(lojaIdAtual).get();
            if (lojaDoc.exists) {
                const dados = lojaDoc.data();
                const dataObj = new Date(dataSelecionada + 'T12:00:00');
                const diaSemana = dataObj.getDay();
                const diasMap = {0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'};
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
                        horarioSelect.innerHTML = `<option value="">🔒 Loja fechada neste dia</option>`;
                        horarioSelect.disabled = true;
                        return;
                    }
                }
            }
        }
        
        const selectedOption = servicoSelect.selectedOptions[0];
        const configServico = JSON.parse(selectedOption.dataset.config || '{}');
        const dataObj = new Date(dataSelecionada + 'T12:00:00');
        const diaSemana = dataObj.getDay();
        const diasMap = {0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado'};
        const diaId = diasMap[diaSemana];
        
        const diasAtivos = configServico.diasAtivos || [];
        if (!diasAtivos.includes(diaId)) {
            horarioSelect.innerHTML = `<option value="">🔒 Serviço não disponível neste dia</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
        const configDia = configServico.configuracoesPorDia?.[diaId];
        if (!configDia || !configDia.ativo) {
            horarioSelect.innerHTML = `<option value="">🔒 Sem atendimento neste dia</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
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
        
        let minutosInicio = Math.max(minutosInicioServico, minutosLojaAbertura);
        let minutosFim = Math.min(minutosFimServico, minutosLojaFechamento);
        
        if (minutosInicio >= minutosFim) {
            horarioSelect.innerHTML = `<option value="">⏰ Fora do horário de funcionamento</option>`;
            horarioSelect.disabled = true;
            return;
        }
        
        const horarios = [];
        let minutosAtual = minutosInicio;
        
        while (minutosAtual + duracao <= minutosFim) {
            const hora = Math.floor(minutosAtual / 60);
            const minuto = minutosAtual % 60;
            const horarioStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
            horarios.push(horarioStr);
            minutosAtual += duracao + intervaloEntre;
        }
        
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
        
        const hoje = new Date().toISOString().split('T')[0];
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minAtual = agora.getMinutes();
        
        if (dataSelecionada === hoje) {
            horariosFiltrados = horariosFiltrados.filter(horario => {
                const [h, m] = horario.split(':').map(Number);
                return (h > horaAtual) || (h === horaAtual && m > minAtual);
            });
        }
        
        if (horariosFiltrados.length === 0) {
            horarioSelect.innerHTML = '<option value="">⏰ Nenhum horário disponível</option>';
            horarioSelect.disabled = true;
            return;
        }
        
        horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
        horariosFiltrados.forEach(h => {
            horarioSelect.innerHTML += `<option value="${h}">${h}</option>`;
        });
        horarioSelect.disabled = false;
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
        horarioSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        horarioSelect.disabled = true;
    }
}

async function carregarServicosCliente() {
    const select = document.getElementById('servicoSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Carregando serviços...</option>';
    select.disabled = true;
    
    try {
        const servicosRef = collection(db, 'configuracoes', 'servico_agendamento', lojaIdAtual);
        const snapshot = await getDocs(servicosRef);
        
        let servicosEncontrados = [];
        snapshot.forEach(doc => {
            servicosEncontrados.push({ id: doc.id, ...doc.data() });
        });
        
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
        
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        select.innerHTML = '<option value="">❌ Erro ao carregar serviços</option>';
        select.disabled = true;
    }
}

async function carregarClientesParaSelect() {
    const select = document.getElementById('clienteSelect');
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Carregando clientes...</option>';
        const clientesRef = window.loginDb.collection('usuarios').doc(lojaIdAtual).collection('clientes');
        const snapshot = await clientesRef.get();
        
        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        snapshot.forEach(doc => {
            const data = doc.data();
            select.innerHTML += `<option value="${doc.id}" data-nome="${data.nome}" data-telefone="${data.telefone || ''}">${data.nome} (${doc.id})</option>`;
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
    }
}

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

window.diagnosticarLogin = function() {
    console.log('🔍 DIAGNÓSTICO DE LOGIN:');
    console.log('usuarioLogado flag:', usuarioLogado);
    console.log('dadosUsuario:', dadosUsuario);
    console.log('dadosUsuario?.email:', dadosUsuario?.email);
    console.log('lojaServices disponível?', !!lojaServices);
    console.log('lojaServices.adicionarItemAoCarrinho?', typeof lojaServices?.adicionarItemAoCarrinho);
    console.log('lojaServices.carregarCarrinhoUsuario?', typeof lojaServices?.carregarCarrinhoUsuario);
};

// Exportar para window
window.carregarServicosComPrimeiroHorario = carregarServicosComPrimeiroHorario;
window.encontrarPrimeiroHorarioDisponivel = encontrarPrimeiroHorarioDisponivel;
window.carregarHorariosCliente = carregarHorariosCliente;
window.carregarServicosCliente = carregarServicosCliente;
window.carregarClientesParaSelect = carregarClientesParaSelect;
