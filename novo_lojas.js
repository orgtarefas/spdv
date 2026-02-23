// novo_lojas.js - Dados públicos das lojas (contato, redes sociais, etc)
const LOJAS_CONFIG = {
    // Loja 0: Template de Demonstração
    'template-exibicao': {
        nome: 'Template de Exibição',
        contato: {
            telefone: '',
            whatsapp: '(71)98510-1828',
            instagram: '@lojasite',   
            email: 'lojasite@gmail.com',       
            endereco: {
                rua: 'Geraldo Brasil',
                numero: '53',
                complemento: 'B',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41347-278'
            },    
        }
    },
    
    // Loja 1: MJ Materiais de Construção
    'mj-materiais-construcao': {
        nome: 'MJ Materiais de Construção',
        contato: {
            telefone: '',
            whatsapp: '(71)99205-1778',
            instagram: '@mjmateriaisdecontrucao',   
            email: 'mjmateriaisdeconstrucaocaj7@gmail.com',       
            endereco: {
                rua: 'Juscelino Kubitscheck',
                numero: '83',
                complemento: '',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41330-500'
            },    
        }
    },
    
    // Loja 2: Açaí Ponto 11
    'acai-ponto-11': {
        nome: 'Açaí Ponto 11',
        contato: {
            telefone: '',
            whatsapp: '(71)99205-1778',
            instagram: '@acaiponto11',   
            email: 'acaiponto11@gmail.com',       
            endereco: {
                rua: 'Juscelino Kubitscheck',
                numero: '82',
                complemento: '',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41330-500'
            },    
        }
    },

    // Loja 3: Teste Operacional
    'teste_operacional': {
        nome: 'Teste Operacional',
        contato: {
            telefone: '',
            whatsapp: '(71)98510-1828',
            instagram: '@lojasite',   
            email: 'lojasite@gmail.com',       
            endereco: {
                rua: 'Geraldo Brasil',
                numero: '53',
                complemento: 'B',
                bairro: 'Cajazeiras 11',
                cidade: 'Salvador',
                uf: 'BA',
                cep: '41347-278'
            },    
        }
    }
};

// Função para buscar configuração da loja (apenas dados públicos)
function getLojaConfig(lojaId) {
    if (LOJAS_CONFIG[lojaId]) {
        return LOJAS_CONFIG[lojaId];
    }
    
    // Retorna configuração padrão se a loja não for encontrada
    return {
        nome: lojaId.replace(/-/g, ' ').replace(/_/g, ' '),
        contato: {
            telefone: '',
            whatsapp: '',
            instagram: '',
            email: '',
            endereco: {
                rua: '',
                numero: '',
                complemento: '',
                bairro: '',
                cidade: '',
                uf: '',
                cep: ''
            }
        }
    };
}

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOJAS_CONFIG, getLojaConfig };
}