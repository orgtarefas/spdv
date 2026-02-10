// imagem_api.js - Serviço de upload usando ImgBB API com suporte a álbuns
// Importa a chave dinamicamente da loja atual

export const imagemServices = {
    
    // Configurações
    config: {
        maxSize: 32 * 1024 * 1024, // 32MB máximo do ImgBB
        formatosPermitidos: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        expiracao: 0 // 0 = nunca expira (padrão do ImgBB)
    },
    
    // ========== MÉTODOS PRINCIPAIS ==========
    
    // Upload de imagem usando chave da loja atual
    async uploadImagem(file, nome = 'produto', lojaServices = null) {
        try {
            console.log('📤 Iniciando upload para ImgBB...');
            
            // 1. Obter chave e album da loja atual
            let imgbbApiKey = null;
            let imgbbAlbumId = null;
            let lojaId = '';
            
            if (lojaServices && lojaServices.imgbbKey) {
                // Usar chave e album do lojaServices se fornecido
                imgbbApiKey = lojaServices.imgbbKey;
                imgbbAlbumId = lojaServices.imgbbAlbumId;
                lojaId = lojaServices.lojaId;
                console.log(`🏪 Usando chave da loja: ${lojaId}`);
                if (imgbbAlbumId) {
                    console.log(`📁 Album ID configurado: ${imgbbAlbumId}`);
                }
            } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                // Usar chave global (fallback)
                imgbbApiKey = window.lojaServices.imgbbKey;
                imgbbAlbumId = window.lojaServices.imgbbAlbumId;
                lojaId = window.lojaServices.lojaId;
                console.log(`🏪 Usando chave global da loja: ${lojaId}`);
                if (imgbbAlbumId) {
                    console.log(`📁 Album ID configurado: ${imgbbAlbumId}`);
                }
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
            
            // 4. Criar FormData com album se disponível
            const formData = new FormData();
            formData.append('key', imgbbApiKey);
            formData.append('image', base64SemPrefixo);
            
            if (nome) {
                formData.append('name', `${nome}_${Date.now()}`);
            }
            
            // ADICIONAR ÁLBUM SE CONFIGURADO
            if (imgbbAlbumId) {
                formData.append('album', imgbbAlbumId);
                console.log(`🎯 Enviando para album: ${imgbbAlbumId}`);
            } else {
                console.log('ℹ️ Sem album configurado - imagem será enviada para galeria padrão');
            }
            
            // 5. Fazer upload
            console.log('🚀 Enviando para ImgBB...');
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
            
            // 6. Verificar se foi para o álbum correto
            const albumRecebido = data.data?.album;
            
            // Log detalhado para debug
            console.log('📊 Dados recebidos do ImgBB:', {
                success: data.success,
                data_id: data.data?.id,
                album_recebido: albumRecebido,
                album_recebido_tipo: typeof albumRecebido
            });
            
            if (imgbbAlbumId) {
                console.log(`🎯 Album configurado: ${imgbbAlbumId}`);
                
                if (albumRecebido) {
                    // O ImgBB pode retornar o album como string ou objeto
                    const albumId = typeof albumRecebido === 'string' 
                        ? albumRecebido 
                        : albumRecebido.id || albumRecebido.title || null;
                    
                    if (albumId) {
                        console.log(`📁 Album recebido da API: ${albumId}`);
                        
                        // Verificar se o album recebido é o mesmo que configuramos
                        if (albumId === imgbbAlbumId) {
                            console.log('✅ Imagem enviada para o álbum correto!');
                        } else {
                            console.warn(`⚠️ Imagem enviada para álbum diferente! Configurado: ${imgbbAlbumId}, Recebido: ${albumId}`);
                            
                            // Tentar verificar se é um sub-álbum ou tem formato diferente
                            console.warn('Pode ser que o ID esteja em formato diferente');
                        }
                    } else {
                        console.warn('⚠️ Album recebido mas não conseguiu extrair o ID');
                    }
                } else {
                    console.warn('❌ Album configurado mas API não retornou album na resposta');
                    console.warn('Pode ser que a chave API não tenha permissão para esse álbum');
                }
            } else {
                console.log('ℹ️ Sem album configurado - imagem na galeria padrão');
            }
            
            // 7. Retornar URLs organizadas
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
                album_id: albumRecebido,
                album_configurado: imgbbAlbumId,
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

    // Função para verificar permissões do álbum
    async function verificarPermissoesAlbum(lojaServices = null) {
        try {
            const config = this.verificarConfigAlbum(lojaServices);
            
            if (!config.temChave || !config.temAlbum) {
                return {
                    success: false,
                    error: 'Chave ou album não configurados'
                };
            }
            
            console.log(`🔍 Verificando permissões para album ${config.albumId}...`);
            
            // Teste 1: Verificar se consegue enviar para o álbum
            const imagemTeste = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 pixel
            
            const formData = new FormData();
            formData.append('key', config.chave);
            formData.append('image', imagemTeste);
            formData.append('name', 'test_permissao_album');
            formData.append('album', config.albumId);
            
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                const albumRecebido = data.data?.album;
                let albumIdRecebido = null;
                
                if (albumRecebido) {
                    albumIdRecebido = typeof albumRecebido === 'string' 
                        ? albumRecebido 
                        : albumRecebido.id || albumRecebido.title;
                }
                
                const temPermissao = albumIdRecebido && 
                    (albumIdRecebido === config.albumId || 
                     albumIdRecebido.includes(config.albumId));
                
                return {
                    success: true,
                    temPermissao: temPermissao,
                    albumConfigurado: config.albumId,
                    albumRecebido: albumIdRecebido,
                    mensagem: temPermissao 
                        ? '✅ Permissão do álbum confirmada!' 
                        : '❌ Problema com permissão do álbum',
                    dados: data.data
                };
            } else {
                return {
                    success: false,
                    error: data.error?.message || 'Erro ao testar permissões',
                    dados: data
                };
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar permissões:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Adicionar ao objeto imagemServices
    imagemServices.verificarPermissoesAlbum = verificarPermissoesAlbum;
    
    // Upload múltiplo com chave da loja atual
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
    
    // Testar conexão da loja atual incluindo álbum
    async testarConexaoLoja(lojaServices = null) {
        try {
            // Obter chave e album
            let imgbbApiKey = null;
            let imgbbAlbumId = null;
            let lojaId = '';
            
            if (lojaServices && lojaServices.imgbbKey) {
                imgbbApiKey = lojaServices.imgbbKey;
                imgbbAlbumId = lojaServices.imgbbAlbumId;
                lojaId = lojaServices.lojaId;
            } else if (window.lojaServices && window.lojaServices.imgbbKey) {
                imgbbApiKey = window.lojaServices.imgbbKey;
                imgbbAlbumId = window.lojaServices.imgbbAlbumId;
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
            if (imgbbAlbumId) {
                console.log(`📁 Album ID configurado: ${imgbbAlbumId}`);
            }
            
            // Imagem de teste mínima (1x1 pixel transparente)
            const imagemTeste = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            
            const formData = new FormData();
            formData.append('key', imgbbApiKey);
            formData.append('image', imagemTeste);
            formData.append('name', 'test_connection');
            
            // Adicionar album se existir
            if (imgbbAlbumId) {
                formData.append('album', imgbbAlbumId);
                console.log(`🎯 Enviando teste para album: ${imgbbAlbumId}`);
            }
            
            const response = await fetch('https://api.imgbb.com/1/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Verificar album
            let albumVerificado = false;
            let albumRecebido = null;
            
            if (data.success && data.data && imgbbAlbumId) {
                albumRecebido = data.data.album;
                if (albumRecebido) {
                    const albumId = typeof albumRecebido === 'string' ? albumRecebido : albumRecebido.id;
                    albumVerificado = (albumId === imgbbAlbumId);
                    console.log(`Album recebido: ${albumId}, Esperado: ${imgbbAlbumId}, Igual: ${albumVerificado}`);
                }
            }
            
            return {
                success: data.success === true,
                message: data.success ? 
                    (imgbbAlbumId ? `API ImgBB está funcionando! ${albumVerificado ? 'Album correto!' : 'Album incorreto!'}` : 'API ImgBB está funcionando!') : 
                    data.error?.message,
                data: data,
                loja_id: lojaId,
                loja_key: imgbbApiKey.substring(0, 8) + '...',
                album_id: imgbbAlbumId || null,
                album_verificado: albumVerificado,
                album_recebido: albumRecebido
            };
            
        } catch (error) {
            console.error('❌ Erro ao testar conexão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Testar especificamente se o álbum está funcionando
    async testarAlbumLoja(lojaServices = null) {
        try {
            const resultado = await this.testarConexaoLoja(lojaServices);
            
            if (resultado.success) {
                const mensagem = resultado.album_id ? 
                    `Album configurado: ${resultado.album_id}\n` +
                    `Album verificado: ${resultado.album_verificado ? '✅ Sim' : '❌ Não'}` :
                    'Nenhum album configurado';
                
                return {
                    success: true,
                    ...resultado,
                    message: mensagem
                };
            } else {
                return resultado;
            }
            
        } catch (error) {
            console.error('❌ Erro no teste do album:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Verificar configuração do álbum da loja
    verificarConfigAlbum(lojaServices = null) {
        try {
            const services = lojaServices || window.lojaServices;
            
            if (!services) {
                return {
                    temChave: false,
                    temAlbum: false,
                    lojaId: null
                };
            }
            
            return {
                temChave: !!services.imgbbKey,
                temAlbum: !!services.imgbbAlbumId,
                lojaId: services.lojaId,
                chave: services.imgbbKey ? `${services.imgbbKey.substring(0, 8)}...` : null,
                albumId: services.imgbbAlbumId || null
            };
            
        } catch (error) {
            console.error('❌ Erro ao verificar configuração:', error);
            return {
                temChave: false,
                temAlbum: false,
                lojaId: null,
                error: error.message
            };
        }
    },
    
    // ========== MÉTODOS AUXILIARES ==========
    
    // Validar imagem antes do upload
    validarImagem(file) {
        // Verificar tipo
        if (!this.config.formatosPermitidos.includes(file.type.toLowerCase())) {
            return { 
                valido: false, 
                erro: `Formato ${file.type} não suportado. Use: ${this.config.formatosPermitidos.join(', ')}` 
            };
        }
        
        // Verificar tamanho
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
    
    // Gerar URL otimizada (ImgBB tem parâmetros de redimensionamento)
    gerarURLOtimizada(urlOriginal, width = null, height = null, qualidade = null) {
        if (!urlOriginal) return urlOriginal;
        
        const url = new URL(urlOriginal);
        
        // Adicionar parâmetros de otimização se fornecidos
        if (width) url.searchParams.set('width', width);
        if (height) url.searchParams.set('height', height);
        if (qualidade) url.searchParams.set('quality', qualidade);
        
        return url.toString();
    },
    
    // Gerar thumbnail (150x150, qualidade 80)
    gerarThumbnailURL(urlOriginal) {
        return this.gerarURLOtimizada(urlOriginal, 150, 150, 80);
    },
    
    // Gerar URL para exibição (500px, qualidade 85)
    gerarDisplayURL(urlOriginal) {
        return this.gerarURLOtimizada(urlOriginal, 500, null, 85);
    },
    
    // Deletar imagem (se delete_url estiver disponível)
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
    
    // Fallback: Base64 local para imagens pequenas (se API falhar)
    async salvarBase64Local(file, maxSize = 100 * 1024) { // 100KB para fallback
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
    
    // Compactar imagem antes do upload (opcional - reduz tamanho)
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
                    // Calcular novo tamanho mantendo proporção
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    // Criar canvas para redimensionar
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Converter para blob com qualidade reduzida
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        
                        // Criar novo arquivo com nome original
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
    
    // Salvar dados da imagem no produto do Firebase
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
                album_id: imagemData.album_id,
                album_configurado: imagemData.album_configurado,
                loja_id: imagemData.loja_id,
                tipo: tipo
            };
            
            // Se for imagem principal, salvar no campo imagens.principal
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
    
    // Upload e salvar em um passo só (método mais conveniente)
    async uploadESalvarImagemProduto(produtoId, file, lojaServices, tipo = 'principal') {
        try {
            if (!lojaServices) {
                lojaServices = window.lojaServices;
            }
            
            // 1. Upload da imagem com album
            const uploadResult = await this.uploadImagem(
                file, 
                `produto_${produtoId}_${tipo}_${lojaServices.lojaId}`, 
                lojaServices
            );
            
            if (!uploadResult.success) {
                // Tentar fallback local
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
            
            // 2. Salvar no produto (se não for apenas local)
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
                message: 'Imagem salva localmente (sem upload para ImgBB)'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Obter estatísticas do álbum (se disponível)
    async obterEstatisticasAlbum(lojaServices = null) {
        try {
            const config = this.verificarConfigAlbum(lojaServices);
            
            if (!config.temChave) {
                return {
                    success: false,
                    error: 'Loja não tem chave ImgBB configurada'
                };
            }
            
            if (!config.temAlbum) {
                return {
                    success: false,
                    error: 'Loja não tem album configurado'
                };
            }
            
            // A API do ImgBB não tem um endpoint direto para estatísticas do álbum
            // Podemos apenas retornar informações básicas
            return {
                success: true,
                loja_id: config.lojaId,
                album_id: config.albumId,
                status: 'Album configurado',
                mensagem: `Album ID: ${config.albumId}\nPara ver imagens, acesse: https://imgbb.com/album/${config.albumId}`
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

console.log("✅ Serviço de imagens carregado (com suporte a álbuns por loja)");


