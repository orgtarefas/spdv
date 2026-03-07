// agendamento.js - Sistema de Agendamentos (COMPLETO)

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
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from './novo_firebase_config.js';

// ============================================
// CONSTANTES E VARIÁVEIS GLOBAIS
// ============================================
const LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%230056b3'/%3E%3Ctext x='30' y='40' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3E📅%3C/text%3E%3C/svg%3E";

let lojaIdAtual = null;
let agendamentosAtivos = [];
let agendamentosHistorico = [];
let unsubscribeAgendamentos = null;
let usuarioLogado = false;
let dadosUsuario = null;

// ============================================
// EXTRAIR LOJA ID DA URL
// ============================================
function extrairLojaIdDaURL() {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/spdv\/loja\/([^\/]+)\//);
    if (match && match[1]) {
        lojaIdAtual = match[1];
        console.log(`✅ Loja ID extraída da URL: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    if (window.lojaServices && window.lojaServices.lojaId) {
        lojaIdAtual = window.lojaServices.lojaId;
        console.log(`✅ Loja ID do lojaServices: ${lojaIdAtual}`);
        return lojaIdAtual;
    }
    
    console.warn('⚠️ Não foi possível extrair loja ID da URL');
    return null;
}

// ============================================
// CONFIGURAR FAVICON
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
// CARREGAR LOGO DA LOJA
// ============================================
function carregarLogoLoja() {
    const logoImg = document.getElementById('lojaLogo');
    if (!logoImg) return;
    
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) {
        logoImg.src = LOGO_PLACEHOLDER;
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
        logoImg.src = LOGO_PLACEHOLDER;
    };
    
    testImg.src = logoPath;
}

// ============================================
// CARREGAR DADOS DA LOJA
// ============================================
async function carregarDadosLoja() {
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    
    if (!lojaId) return;
    
    if (typeof window.getLojaConfig === 'function') {
        try {
            const config = window.getLojaConfig(lojaId);
            
            if (config) {
                const nomeLoja = config.nome || lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                const lojaNomeHeader = document.getElementById('lojaNomeHeader');
                if (lojaNomeHeader) lojaNomeHeader.textContent = nomeLoja;
                
                document.title = `${nomeLoja} - Agendamentos`;
                
                if (config.contato) {
                    renderizarContatos(config);
                }
                
                if (config.contato?.endereco) {
                    renderizarEndereco(config);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar dados da loja:', error);
        }
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
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = LOGO_PLACEHOLDER;
    
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
    const lojaId = lojaIdAtual || (window.lojaServices ? window.lojaServices.lojaId : null);
    const basePath = `../../imagens/${lojaId}/`;
    const placeholder = LOGO_PLACEHOLDER;
    
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
// INICIAR ESCUTA DE AGENDAMENTOS
// ============================================
function iniciarEscutaAgendamentos() {
    if (!lojaIdAtual || !window.loginDb) {
        console.error('❌ Não foi possível iniciar escuta: lojaId ou loginDb não disponível');
        return;
    }
    
    console.log('📅 Iniciando escuta em tempo real dos agendamentos...');
    
    try {
        // Referência para a coleção de agendamentos no Firestore
        const agendamentosRef = window.loginDb
            .collection('agendamentos')
            .doc(lojaIdAtual)
            .collection('ativos')
            .orderBy('senha', 'asc');
        
        // Escutar mudanças em tempo real
        unsubscribeAgendamentos = agendamentosRef.onSnapshot((snapshot) => {
            const agendamentos = [];
            snapshot.forEach(doc => {
                agendamentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📅 ${agendamentos.length} agendamentos ativos`);
            agendamentosAtivos = agendamentos;
            renderizarPainelCompleto();
            
        }, (error) => {
            console.error('❌ Erro na escuta de agendamentos:', error);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar escuta:', error);
    }
}

// ============================================
// RENDERIZAR PAINEL COMPLETO DE AGENDAMENTO
// ============================================
function renderizarPainelCompleto() {
    // Encontrar quem está sendo chamado agora
    const chamandoAgora = agendamentosAtivos.find(a => a.status === 'chamando');
    
    // Filtrar os que estão aguardando (próximos)
    const proximos = agendamentosAtivos
        .filter(a => a.status === 'aguardando')
        .sort((a, b) => (a.senha || '').localeCompare(b.senha || ''));
    
    // Últimos 10 chamados (histórico)
    const ultimos = agendamentosAtivos
        .filter(a => a.status === 'concluido')
        .slice(0, 10);
    
    // Atualizar total na fila
    const totalNaFila = document.getElementById('totalNaFila');
    if (totalNaFila) {
        totalNaFila.textContent = proximos.length;
    }
    
    // Renderizar "Chamando Agora" (destaque)
    const chamandoSenha = document.getElementById('chamandoSenha');
    const chamandoCliente = document.getElementById('chamandoCliente');
    
    if (chamandoSenha && chamandoCliente) {
        if (chamandoAgora) {
            chamandoSenha.textContent = chamandoAgora.senha || '---';
            chamandoCliente.textContent = chamandoAgora.cliente_nome || 'Cliente';
        } else {
            chamandoSenha.textContent = '---';
            chamandoCliente.textContent = 'Aguardando...';
        }
    }
    
    // Renderizar "Fila de Agendamentos"
    const filaLista = document.getElementById('filaLista');
    if (filaLista) {
        if (proximos.length > 0) {
            let html = '';
            proximos.forEach((item, index) => {
                html += `
                    <div class="fila-item">
                        <span class="fila-senha">${item.senha || '---'}</span>
                        <div class="fila-info">
                            <span class="fila-nome">${item.cliente_nome || 'Cliente'}</span>
                            <span class="fila-servico">
                                <i class="fas fa-cut"></i> ${item.servico || 'Serviço'}
                            </span>
                            <span class="fila-horario">
                                <i class="far fa-clock"></i> ${item.horario || 'Aguardando'}
                            </span>
                            <span class="fila-status aguardando">${index === 0 ? 'PRÓXIMO' : `#${index + 1}`}</span>
                        </div>
                    </div>
                `;
            });
            filaLista.innerHTML = html;
        } else {
            filaLista.innerHTML = `
                <div class="empty-fila">
                    <i class="fas fa-check-circle"></i>
                    <p>Fila vazia no momento</p>
                </div>
            `;
        }
    }
    
    // Renderizar "Histórico de Chamados"
    const historicoLista = document.getElementById('historicoLista');
    if (historicoLista) {
        if (ultimos.length > 0) {
            let html = '';
            ultimos.forEach(item => {
                html += `
                    <div class="fila-item ultimo">
                        <span class="fila-senha">${item.senha || '---'}</span>
                        <div class="fila-info">
                            <span class="fila-nome">${item.cliente_nome || 'Cliente'}</span>
                            <span class="fila-servico">
                                <i class="fas fa-cut"></i> ${item.servico || 'Serviço'}
                            </span>
                            <span class="fila-horario">
                                <i class="far fa-check-circle"></i> ${item.horario_conclusao || 'Concluído'}
                            </span>
                        </div>
                    </div>
                `;
            });
            historicoLista.innerHTML = html;
        } else {
            historicoLista.innerHTML = `
                <div class="empty-historico">
                    <i class="fas fa-history"></i>
                    <p>Nenhum chamado no histórico</p>
                </div>
            `;
        }
    }
}

// ============================================
// EVENTOS DE LOGIN/LOGOUT
// ============================================
window.addEventListener('usuarioLogado', (event) => {
    const { usuario } = event.detail;
    
    usuarioLogado = true;
    dadosUsuario = usuario;
    
    console.log('✅ Usuário logado no agendamento:', usuario.email);
});

window.addEventListener('usuarioDeslogado', () => {
    usuarioLogado = false;
    dadosUsuario = null;
    console.log('👤 Usuário deslogado do agendamento');
});

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
    // Botão voltar
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
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
// PARAR ESCUTA
// ============================================
function pararEscuta() {
    if (unsubscribeAgendamentos) {
        unsubscribeAgendamentos();
        unsubscribeAgendamentos = null;
        console.log('📅 Escuta de agendamentos parada');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
(async function() {
    console.log("📄 Inicializando página de agendamentos...");
    
    mostrarLoading('Carregando agendamentos...');
    
    try {
        // Extrair loja ID
        lojaIdAtual = extrairLojaIdDaURL();
        
        if (!lojaIdAtual) {
            console.error('❌ Loja não identificada');
            mostrarMensagem('Erro ao identificar a loja', 'error');
            esconderLoading();
            return;
        }
        
        // Configurar favicon e logo
        configurarFavicon();
        carregarLogoLoja();
        
        // Carregar dados da loja
        await carregarDadosLoja();
        
        // Configurar eventos
        configurarEventos();
        
        // Iniciar escuta de agendamentos
        iniciarEscutaAgendamentos();
        
        esconderLoading();
        console.log("✅ Página de agendamentos pronta!");
        
    } catch (error) {
        console.error("❌ Erro na inicialização:", error);
        mostrarMensagem('Erro ao carregar agendamentos', 'error');
        esconderLoading();
    }
})();

// Limpar ao sair
window.addEventListener('beforeunload', () => {
    pararEscuta();
});
