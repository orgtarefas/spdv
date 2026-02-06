// No arquivo firebase_config.js, adicione/modifique esta função:

// Dentro da classe PdvManager, adicione este método:
async carregarDadosLoja() {
    try {
        if (!this.lojaId) {
            console.warn('⚠️ Loja ID não definido');
            return null;
        }
        
        console.log(`🔍 Buscando dados da loja: ${this.lojaId}`);
        
        // 1. Primeiro, buscar configuração do lojas.js
        this.configLoja = getLojaConfig(this.lojaId);
        console.log('📋 Configuração do arquivo:', this.configLoja);
        
        // 2. Tentar buscar dados completos do Firebase
        const lojaRef = doc(db, "lojas", this.lojaId);
        const lojaDoc = await getDoc(lojaRef);
        
        if (lojaDoc.exists()) {
            const dadosFirebase = lojaDoc.data();
            console.log('🔥 Dados do Firebase:', dadosFirebase);
            
            // Mesclar dados: Firebase tem prioridade, arquivo tem fallback
            this.configLoja = {
                // Dados do arquivo (bancos)
                banco_estoque: this.configLoja.banco_estoque,
                banco_vendas: this.configLoja.banco_vendas,
                // Dados do Firebase (sobrescrevem se existirem)
                nome: dadosFirebase.nome || this.lojaId,
                local: dadosFirebase.local || dadosFirebase.endereco || '',
                telefone: dadosFirebase.telefone || dadosFirebase.contato?.telefone || '',
                email: dadosFirebase.email || dadosFirebase.contato?.email || '',
                cnpj: dadosFirebase.cnpj || dadosFirebase.documento || '',
                tipo: dadosFirebase.tipo || 'padrao',
                meta_mensal: dadosFirebase.meta_mensal || 10000,
                // Outros dados do Firebase
                ...dadosFirebase
            };
            
        } else {
            console.log(`ℹ️ Loja ${this.lojaId} não encontrada no Firebase, usando dados locais`);
            
            // Se não tem no Firebase, usar dados básicos
            this.configLoja = {
                ...this.configLoja,
                nome: this.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                local: '',
                telefone: '',
                email: '',
                cnpj: '',
                tipo: 'padrao',
                meta_mensal: 10000
            };
        }
        
        console.log(`✅ Configuração final da loja:`, this.configLoja);
        return this.configLoja;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da loja:', error);
        
        // Fallback básico
        this.configLoja = {
            nome: this.lojaId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            banco_estoque: `estoque_${this.lojaId.replace(/-/g, '_')}`,
            banco_vendas: `vendas_${this.lojaId.replace(/-/g, '_')}`,
            local: '',
            telefone: '',
            tipo: 'padrao',
            meta_mensal: 10000
        };
        
        return this.configLoja;
    }
}

// Depois modifique o método carregarSessao para chamar carregarDadosLoja:
carregarSessao() {
    try {
        // 1. Tentar da sessão
        const sessao = sessionStorage.getItem('pdv_sessao_temporaria');
        if (sessao) {
            const dados = JSON.parse(sessao);
            this.lojaId = dados.banco_login;
            this.usuario = dados;
            console.log(`✅ Sessão carregada: ${this.lojaId}`);
            
            // Carregar dados da loja
            this.carregarDadosLoja().then(config => {
                console.log(`🏪 Loja configurada: ${config?.nome}`);
            }).catch(error => {
                console.error('Erro ao carregar dados da loja:', error);
            });
            
            return;
        }
        
        // 2. Tentar do backup
        const backup = localStorage.getItem('pdv_sessao_backup');
        if (backup) {
            const dados = JSON.parse(backup);
            this.lojaId = dados.banco_login;
            this.usuario = dados;
            console.log(`⚠️ Sessão carregada do backup: ${this.lojaId}`);
            
            // Carregar dados da loja
            this.carregarDadosLoja().then(config => {
                console.log(`🏪 Loja configurada (backup): ${config?.nome}`);
            }).catch(error => {
                console.error('Erro ao carregar dados da loja:', error);
            });
            
            return;
        }
        
        // 3. Tentar da URL (fallback para desenvolvimento)
        const pathParts = window.location.pathname.split('/');
        const lojaIndex = pathParts.indexOf('lojas');
        if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
            this.lojaId = pathParts[lojaIndex + 1];
            console.log(`📍 Loja detectada da URL: ${this.lojaId}`);
            
            // Dados de usuário fake para desenvolvimento
            this.usuario = {
                login: 'dev_user',
                nome: 'Usuário Desenvolvimento',
                perfil: 'admin'
            };
            
            // Carregar dados da loja
            this.carregarDadosLoja();
            return;
        }
        
        // 4. Redirecionar se não encontrou
        console.error('❌ Sessão não encontrada');
        this.redirecionarLogin();
        
    } catch (error) {
        console.error('❌ Erro ao carregar sessão:', error);
        this.redirecionarLogin();
    }
}
