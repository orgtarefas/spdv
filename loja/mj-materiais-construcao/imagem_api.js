// ============================================
// imagem_api.js - Sistema de upload de imagens para ImgBB (SEM ALBUM)
// Versão com busca dinâmica da chave no Firebase
// ============================================

export const imagemServices = {
    
    // Configurações
    config: {
        maxSize: 5 * 1024 * 1024, // 5MB (recomendado)
        formatosPermitidos: ['image/jpeg', 'image/png', 'image/webp'],
        expiracao: 0 // nunca expira
    },
    
    // ========== MÉTODO PRINCIPAL ==========
    
    async uploadImagem(file, nome = 'produto', lojaServices = null) {
        try {
            console.log('📤 Iniciando upload para ImgBB...');
            
            // 1. Obter lojaId
            let lojaId = '';
            let imgbbApiKey = null;
            
            // Tentar obter lojaId de várias fontes
            if (lojaServices && lojaServices.lojaId) {
                lojaId = lojaServices.lojaId;
            } else if (window.lojaServices && window.lojaServices.lojaId) {
                lojaId = window.lojaServices.lojaId;
            } else {
                // Tentar extrair da URL
                const pathParts = window.location.pathname.split('/');
                const lojaIndex = pathParts.indexOf('loja');
                if (lojaIndex !== -1 && lojaIndex + 1 < pathParts.length) {
                    lojaId = pathParts[lojaIndex + 1];
                }
            }
            
            if (!lojaId) {
                throw new Error('Loja não identificada para upload de imagem');
            }
            
            console.log(`🏪 Loja identificada: ${lojaId}`);
            
            // 2. 🔥 BUSCAR CHAVE DO FIREBASE (PRIORIDADE MÁXIMA)
            try {
                // Primeiro, tentar usar a função buscarChaveImgBB do lojaServices
                if (window.lojaServices && typeof window.lojaServices.buscarChaveImgBB === 'function') {
                    console.log('🔍 Buscando chave ImgBB no Firebase...');
                    imgbbApiKey = await window.lojaServices.buscarChaveImgBB();
                    
                    if (imgbbApiKey) {
                        console.log(`✅ Chave obtida do Firebase: ${imgbbApiKey.substring(0, 8)}...`);
                    }
                }
                
                // Se não conseguiu, tentar usar a função direta do window
                if (!imgbbApiKey && window.buscarChaveImgBB && typeof window.buscarChaveImgBB === 'function') {
                    console.log('🔍 Buscando chave ImgBB via função global...');
                    imgbbApiKey = await window.buscarChaveImgBB(lojaId);
                    
                    if (imgbbApiKey) {
                        console.log(`✅ Chave obtida via função global: ${imgbbApiKey.substring(0, 8)}...`);
                    }
                }
            } catch (error) {
                console.warn('⚠️ Erro ao buscar chave do Firebase:', error);
            }
            
            // 3. Fallback: tentar usar imgbbKey do lojaServices
            if (!imgbbApiKey) {
                console.log('🔄 Usando fallback: chave do lojaServices...');
                
                if (lojaServices && lojaServices.imgbbKey) {
                    imgbbApiKey = lojaServices.imgbbKey;
                    console.log(`🏪 Usando chave do parâmetro lojaServices: ${imgbbApiKey.substring(0, 8)}...`);
                } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                    imgbbApiKey = window.lojaServices.imgbbKey;
                    console.log(`🏪 Usando chave global do lojaServices: ${imgbbApiKey.substring(0, 8)}...`);
                }
            }
            
            // 4. Verificar se temos chave
            if (!imgbbApiKey) {
                console.warn('⚠️ Nenhuma chave ImgBB encontrada. Usando fallback Base64 local...');
                
                // 🔥 FALLBACK: Salvar como Base64 local
                const fallbackResult = await this.salvarBase64Local(file);
                if (fallbackResult.success) {
                    return {
                        success: true,
                        local: true,
                        url: fallbackResult.url,
                        display_url: fallbackResult.url,
                        thumb: fallbackResult.thumb,
                        medium: fallbackResult.url,
                        loja_id: lojaId,
                        mensagem: 'Imagem salva localmente (Base64) - Chave ImgBB não configurada'
                    };
                } else {
                    throw new Error('Chave do ImgBB não disponível e fallback falhou');
                }
            }
            
            console.log(`🔑 Usando chave ImgBB: ${imgbbApiKey.substring(0, 8)}...`);
            
            // 5. Validar arquivo
            const validacao = this.validarImagem(file);
            if (!validacao.valido) {
                throw new Error(validacao.erro);
            }
            
            // 6. Converter para Base64
            const base64Data = await this.fileToBase64(file);
            const base64SemPrefixo = base64Data.split(',')[1];
            
            if (!base64SemPrefixo) {
                throw new Error('Erro ao converter imagem para Base64');
            }
            
            console.log(`📊 Tamanho Base64: ${Math.round(base64SemPrefixo.length / 1024)}KB`);
            
            // 7. Criar FormData SEM ALBUM
            const formData = new FormData();
            formData.append('key', imgbbApiKey);
            formData.append('image', base64SemPrefixo);
            
            if (nome) {
                formData.append('name', `${nome}_${Date.now()}_${lojaId}`);
            }
            
            console.log('🚀 Enviando para ImgBB (sem álbum)...');
            
            // 8. Fazer upload
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Resposta ImgBB:', data.success ? 'Sucesso' : 'Erro');
            
            if (!data.success) {
                throw new Error(data.error?.message || 'Erro desconhecido do ImgBB');
            }
            
            // 9. Retornar URLs
            return {
                success: true,
                id: data.data.id,
                url: data.data.url,
                display_url: data.data.display_url || data.data.url,
                thumb: data.data.thumb?.url || data.data.url,
                medium: data.data.medium?.url || data.data.url,
                delete_url: data.data.delete_url,
                tamanho: data.data.size,
                width: data.data.width,
                height: data.data.height,
                extensao: data.data.image?.extension || file.name.split('.').pop(),
                timestamp: data.data.time || Date.now(),
                loja_id: lojaId,
                using_key: imgbbApiKey.substring(0, 8) + '...',
                fonte: 'imgbb'
            };
            
        } catch (error) {
            console.error('❌ Erro no upload para ImgBB:', error);
            
            // 🔥 TENTAR FALLBACK BASE64 EM CASO DE ERRO
            try {
                console.log('🔄 Tentando fallback Base64 após erro...');
                const fallbackResult = await this.salvarBase64Local(file);
                
                if (fallbackResult.success) {
                    return {
                        success: true,
                        local: true,
                        url: fallbackResult.url,
                        display_url: fallbackResult.url,
                        thumb: fallbackResult.thumb,
                        medium: fallbackResult.url,
                        loja_id: lojaId || 'desconhecida',
                        mensagem: 'Imagem salva localmente (Base64) - Erro no upload ImgBB',
                        erro_original: error.message
                    };
                }
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
            }
            
            return {
                success: false,
                error: error.message,
                code: error.code || 'UPLOAD_ERROR'
            };
        }
    },
    
    // Upload múltiplo
    async uploadMultiplasImagens(files, lojaServices = null, prefixo = 'produto', maxSimultaneo = 3) {
        try {
            const resultados = [];
            const erros = [];
            
            for (let i = 0; i < files.length; i += maxSimultaneo) {
                const lote = files.slice(i, i + maxSimultaneo);
                const promises = lote.map((file, index) => 
                    this.uploadImagem(file, `${prefixo}_${i + index}`, lojaServices)
                );
                
                const resultadosLote = await Promise.allSettled(promises);
                
                resultadosLote.forEach((resultado, idx) => {
                    if (resultado.status === 'fulfilled' && resultado.value.success) {
                        resultados.push(resultado.value);
                    } else {
                        erros.push({
                            file: lote[idx].name,
                            error: resultado.reason?.message || resultado.value?.error || 'Erro desconhecido'
                        });
                    }
                });
                
                if (i + maxSimultaneo < files.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            return {
                success: resultados.length > 0,
                imagens: resultados,
                total: resultados.length,
                erros: erros,
                mensagem: erros.length > 0 ? 
                    `${resultados.length} uploads bem-sucedidos, ${erros.length} falhas` :
                    `Todas as ${resultados.length} imagens foram enviadas com sucesso`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Testar conexão da loja
    async testarConexao(lojaServices = null) {
        try {
            let imgbbApiKey = null;
            let lojaId = '';
            
            // 🔥 BUSCAR CHAVE DO FIREBASE PARA TESTE
            if (window.lojaServices && typeof window.lojaServices.buscarChaveImgBB === 'function') {
                console.log('🔍 Buscando chave do Firebase para teste...');
                imgbbApiKey = await window.lojaServices.buscarChaveImgBB();
                lojaId = window.lojaServices.lojaId;
            }
            
            // Fallback para métodos antigos
            if (!imgbbApiKey) {
                if (lojaServices && lojaServices.imgbbKey) {
                    imgbbApiKey = lojaServices.imgbbKey;
                    lojaId = lojaServices.lojaId;
                } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                    imgbbApiKey = window.lojaServices.imgbbKey;
                    lojaId = window.lojaServices.lojaId;
                }
            }
            
            if (!imgbbApiKey) {
                return {
                    success: false,
                    error: 'Loja não configurada ou sem chave ImgBB'
                };
            }
            
            console.log(`🔍 Testando ImgBB para loja: ${lojaId}`);
            
            // Imagem de teste mínima (1x1 pixel transparente em Base64)
            const imagemTeste = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            
            const formData = new FormData();
            formData.append('key', imgbbApiKey);
            formData.append('image', imagemTeste);
            formData.append('name', 'test_conexao_' + lojaId);
            
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            return {
                success: data.success === true,
                message: data.success ? '✅ API ImgBB está funcionando!' : data.error?.message,
                data: data,
                loja_id: lojaId,
                loja_key: imgbbApiKey.substring(0, 8) + '...',
                fonte: 'firebase'
            };
            
        } catch (error) {
            console.error('❌ Erro ao testar conexão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Verificar configuração da loja
    async verificarConfig(lojaServices = null) {
        try {
            const services = lojaServices || window.lojaServices;
            
            if (!services) {
                return {
                    temChave: false,
                    lojaId: null,
                    mensagem: 'Serviço da loja não disponível'
                };
            }
            
            let temChave = false;
            let chave = null;
            
            // 🔥 TENTAR BUSCAR DO FIREBASE PRIMEIRO
            if (typeof services.buscarChaveImgBB === 'function') {
                try {
                    chave = await services.buscarChaveImgBB();
                    temChave = !!chave;
                } catch (e) {
                    console.warn('⚠️ Erro ao buscar chave do Firebase:', e);
                }
            }
            
            // Fallback para imgbbKey
            if (!temChave) {
                chave = services.imgbbKey || null;
                temChave = !!chave;
            }
            
            return {
                temChave: temChave,
                lojaId: services.lojaId,
                chave: chave ? chave.substring(0, 8) + '...' : null,
                mensagem: temChave ? 'Configurada' : 'Não configurada',
                fonte: temChave ? (services.imgbbKey ? 'local' : 'firebase') : 'nenhuma'
            };
            
        } catch (error) {
            console.error('❌ Erro ao verificar configuração:', error);
            return {
                temChave: false,
                lojaId: null,
                error: error.message
            };
        }
    },
    
    // ========== MÉTODOS AUXILIARES ==========
    
    // Validar imagem antes do upload
    validarImagem(file) {
        if (!file) {
            return { valido: false, erro: 'Arquivo não fornecido' };
        }
        
        if (!this.config.formatosPermitidos.includes(file.type.toLowerCase())) {
            return { 
                valido: false, 
                erro: `Formato ${file.type} não suportado. Use: ${this.config.formatosPermitidos.join(', ')}` 
            };
        }
        
        if (file.size > this.config.maxSize) {
            const maxMB = this.config.maxSize / (1024 * 1024);
            const fileMB = (file.size / (1024 * 1024)).toFixed(1);
            return { 
                valido: false, 
                erro: `Imagem muito grande (${fileMB}MB). Máximo: ${maxMB}MB` 
            };
        }
        
        return { valido: true };
    },
    
    // Converter arquivo para Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve(reader.result);
            };
            
            reader.onerror = (error) => {
                reject(new Error(`Erro na leitura do arquivo: ${error.message}`));
            };
            
            reader.onabort = () => {
                reject(new Error('Leitura do arquivo abortada'));
            };
            
            reader.readAsDataURL(file);
        });
    },
    
    // Gerar URL otimizada
    gerarURLOtimizada(urlOriginal, width = null, height = null, qualidade = null) {
        if (!urlOriginal) return urlOriginal;
        
        try {
            const url = new URL(urlOriginal);
            
            if (width) url.searchParams.set('width', width);
            if (height) url.searchParams.set('height', height);
            if (qualidade) url.searchParams.set('quality', qualidade);
            
            return url.toString();
        } catch (e) {
            return urlOriginal;
        }
    },
    
    // Gerar thumbnail
    gerarThumbnailURL(urlOriginal) {
        return this.gerarURLOtimizada(urlOriginal, 150, 150, 80);
    },
    
    // Gerar URL para exibição
    gerarDisplayURL(urlOriginal) {
        return this.gerarURLOtimizada(urlOriginal, 500, null, 85);
    },
    
    // Deletar imagem
    async deletarImagem(deleteUrl) {
        try {
            if (!deleteUrl) {
                return { 
                    success: false, 
                    error: 'URL de deleção não disponível para esta imagem' 
                };
            }
            
            console.log('🗑️ Tentando deletar imagem:', deleteUrl);
            const response = await fetch(deleteUrl, { 
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json().catch(() => ({}));
            
            return { 
                success: response.ok,
                data: data
            };
            
        } catch (error) {
            console.error('❌ Erro ao deletar imagem:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    },
    
    // Fallback: Base64 local (MELHORADO)
    async salvarBase64Local(file, maxSize = 500 * 1024) { // Aumentado para 500KB
        try {
            console.log('💾 Salvando imagem como Base64 local...');
            
            // Se for muito grande, tentar compactar
            let fileToProcess = file;
            if (file.size > maxSize) {
                console.log(`📦 Imagem muito grande (${(file.size/1024).toFixed(0)}KB). Tentando compactar...`);
                fileToProcess = await this.compactarImagem(file, 0.7, 800);
            }
            
            const base64 = await this.fileToBase64(fileToProcess);
            const tamanhoKB = Math.round(base64.length / 1024);
            
            console.log(`✅ Imagem salva localmente: ${tamanhoKB}KB`);
            
            return {
                success: true,
                url: base64,
                thumb: base64,
                medium: base64,
                local: true,
                tamanho: fileToProcess.size,
                tamanho_base64: tamanhoKB,
                formato: fileToProcess.type
            };
            
        } catch (error) {
            console.error('❌ Erro no fallback Base64:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Compactar imagem (MELHORADO)
    async compactarImagem(file, qualidade = 0.8, maxWidth = 1200) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    
                    // Redimensionar se necessário
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            console.warn('⚠️ Falha ao compactar, usando original');
                            resolve(file);
                            return;
                        }
                        
                        const novoFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        const reducao = Math.round((1 - (novoFile.size / file.size)) * 100);
                        console.log(`📉 Compactado: ${(file.size/1024).toFixed(0)}KB → ${(novoFile.size/1024).toFixed(0)}KB (${reducao}% redução)`);
                        resolve(novoFile);
                        
                    }, 'image/jpeg', qualidade);
                };
                
                img.onerror = () => {
                    console.warn('⚠️ Erro ao carregar imagem para compactação');
                    resolve(file);
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                console.warn('⚠️ Erro ao ler arquivo para compactação');
                resolve(file);
            };
            
            reader.readAsDataURL(file);
        });
    },
    
    // ========== MÉTODOS DE INTEGRAÇÃO COM FIREBASE ==========
    
    // Salvar dados da imagem no produto
    async salvarImagemNoProduto(produtoId, imagemData, lojaServices, tipo = 'principal') {
        try {
            if (!lojaServices) {
                lojaServices = window.lojaServices;
            }
            
            if (!lojaServices || !lojaServices.atualizarProduto) {
                throw new Error('Serviço da loja não disponível');
            }
            
            const dadosImagem = {
                url: imagemData.url,
                thumb: imagemData.thumb || imagemData.url,
                medium: imagemData.medium || imagemData.url,
                provider: imagemData.local ? 'local' : 'imgbb',
                provider_id: imagemData.id || `local_${Date.now()}`,
                delete_url: imagemData.delete_url,
                width: imagemData.width,
                height: imagemData.height,
                size: imagemData.tamanho,
                uploaded_at: new Date().toISOString(),
                loja_id: imagemData.loja_id || lojaServices.lojaId,
                tipo: tipo,
                local: imagemData.local || false
            };
            
            const campo = tipo === 'principal' ? 'imagens' : `imagens_${tipo}`;
            
            const resultado = await lojaServices.atualizarProduto(produtoId, {
                [campo]: dadosImagem,
                data_atualizacao: new Date()
            });
            
            return {
                success: resultado.success,
                produtoId: produtoId,
                imagem: dadosImagem
            };
            
        } catch (error) {
            console.error('❌ Erro ao salvar imagem no produto:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Upload e salvar em um passo só
    async uploadESalvarImagemProduto(produtoId, file, lojaServices, tipo = 'principal') {
        try {
            if (!lojaServices) {
                lojaServices = window.lojaServices;
            }
            
            const uploadResult = await this.uploadImagem(
                file, 
                `produto_${produtoId}_${tipo}_${lojaServices.lojaId}`, 
                lojaServices
            );
            
            if (!uploadResult.success) {
                // Fallback já foi tentado dentro do uploadImagem
                return uploadResult;
            }
            
            if (!uploadResult.local) {
                const saveResult = await this.salvarImagemNoProduto(
                    produtoId, 
                    uploadResult, 
                    lojaServices,
                    tipo
                );
                
                return {
                    ...saveResult,
                    upload_data: uploadResult
                };
            }
            
            return {
                success: true,
                produtoId: produtoId,
                upload_data: uploadResult,
                message: uploadResult.mensagem || 'Imagem salva localmente'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Para uso global
window.imagemServices = imagemServices;

console.log("✅ Serviço de imagens carregado (COM BUSCA NO FIREBASE)");
