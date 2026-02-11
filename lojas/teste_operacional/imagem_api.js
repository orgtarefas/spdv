// imagem_api.js - Sistema de upload de imagens para ImgBB (SEM ALBUM)

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
            
            // 1. Obter chave da loja
            let imgbbApiKey = null;
            let lojaId = '';
            
            if (lojaServices && lojaServices.imgbbKey) {
                imgbbApiKey = lojaServices.imgbbKey;
                lojaId = lojaServices.lojaId;
                console.log(`🏪 Usando chave da loja: ${lojaId}`);
            } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                imgbbApiKey = window.lojaServices.imgbbKey;
                lojaId = window.lojaServices.lojaId;
                console.log(`🏪 Usando chave global da loja: ${lojaId}`);
            } else {
                throw new Error('Chave do ImgBB não disponível. Loja não configurada.');
            }
            
            if (!imgbbApiKey) {
                throw new Error('Esta loja não tem chave do ImgBB configurada.');
            }
            
            console.log(`🔑 Chave ImgBB: ${imgbbApiKey.substring(0, 8)}...`);
            
            // 2. Validar arquivo
            const validacao = this.validarImagem(file);
            if (!validacao.valido) {
                throw new Error(validacao.erro);
            }
            
            // 3. Converter para Base64
            const base64Data = await this.fileToBase64(file);
            const base64SemPrefixo = base64Data.split(',')[1];
            
            if (!base64SemPrefixo) {
                throw new Error('Erro ao converter imagem para Base64');
            }
            
            console.log(`📊 Tamanho Base64: ${Math.round(base64SemPrefixo.length / 1024)}KB`);
            
            // 4. Criar FormData SEM ALBUM
            const formData = new FormData();
            formData.append('key', imgbbApiKey);
            formData.append('image', base64SemPrefixo);
            
            if (nome) {
                formData.append('name', `${nome}_${Date.now()}_${lojaId}`);
            }
            
            console.log('🚀 Enviando para ImgBB (sem álbum)...');
            
            // 5. Fazer upload
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
            
            // 6. Retornar URLs
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
                using_key: imgbbApiKey.substring(0, 8) + '...'
            };
            
        } catch (error) {
            console.error('❌ Erro no upload para ImgBB:', error);
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
            
            if (lojaServices && lojaServices.imgbbKey) {
                imgbbApiKey = lojaServices.imgbbKey;
                lojaId = lojaServices.lojaId;
            } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                imgbbApiKey = window.lojaServices.imgbbKey;
                lojaId = window.lojaServices.lojaId;
            } else {
                return {
                    success: false,
                    error: 'Loja não configurada ou sem chave ImgBB'
                };
            }
            
            if (!imgbbApiKey) {
                return {
                    success: false,
                    error: 'Esta loja não tem chave do ImgBB configurada.'
                };
            }
            
            console.log(`🔍 Testando ImgBB para loja: ${lojaId}`);
            
            // Imagem de teste mínima
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
                message: data.success ? 'API ImgBB está funcionando!' : data.error?.message,
                data: data,
                loja_id: lojaId,
                loja_key: imgbbApiKey.substring(0, 8) + '...'
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
    verificarConfig(lojaServices = null) {
        try {
            const services = lojaServices || window.lojaServices;
            
            if (!services) {
                return {
                    temChave: false,
                    lojaId: null
                };
            }
            
            return {
                temChave: !!services.imgbbKey,
                lojaId: services.lojaId,
                chave: services.imgbbKey ? services.imgbbKey : null
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
        if (!this.config.formatosPermitidos.includes(file.type.toLowerCase())) {
            return { 
                valido: false, 
                erro: `Formato ${file.type} não suportado. Use: ${this.config.formatosPermitidos.join(', ')}` 
            };
        }
        
        if (file.size > this.config.maxSize) {
            const maxMB = this.config.maxSize / (1024 * 1024);
            return { 
                valido: false, 
                erro: `Imagem muito grande (${(file.size/(1024*1024)).toFixed(1)}MB). Máximo: ${maxMB}MB` 
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
        
        const url = new URL(urlOriginal);
        
        if (width) url.searchParams.set('width', width);
        if (height) url.searchParams.set('height', height);
        if (qualidade) url.searchParams.set('quality', qualidade);
        
        return url.toString();
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
    
    // Fallback: Base64 local
    async salvarBase64Local(file, maxSize = 100 * 1024) {
        try {
            if (file.size > maxSize) {
                return {
                    success: false,
                    error: `Imagem muito grande para fallback. Máximo: ${maxSize/1024}KB`
                };
            }
            
            const base64 = await this.fileToBase64(file);
            
            return {
                success: true,
                url: base64,
                thumb: base64,
                local: true,
                tamanho: file.size,
                formato: file.type
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Compactar imagem
    async compactarImagem(file, qualidade = 0.8, maxWidth = 1920) {
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
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        
                        const novoFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        console.log(`📉 Compactado: ${file.size} → ${novoFile.size} bytes (${Math.round((1 - (novoFile.size/file.size)) * 100)}% redução)`);
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
                provider: 'imgbb',
                provider_id: imagemData.id,
                delete_url: imagemData.delete_url,
                width: imagemData.width,
                height: imagemData.height,
                size: imagemData.tamanho,
                uploaded_at: new Date().toISOString(),
                loja_id: imagemData.loja_id,
                tipo: tipo
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
                const fallbackResult = await this.salvarBase64Local(file);
                if (fallbackResult.success) {
                    uploadResult.success = true;
                    uploadResult.url = fallbackResult.url;
                    uploadResult.thumb = fallbackResult.thumb;
                    uploadResult.local = true;
                } else {
                    return uploadResult;
                }
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
                message: 'Imagem salva localmente'
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

console.log("✅ Serviço de imagens carregado (SEM ALBUM)");
