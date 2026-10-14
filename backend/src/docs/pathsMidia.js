// Additional media routes retained from the merge; D1A permissions reconciled.
export const pathsMidia = {
  "/api/admin/patrimonios/{id}/imagens/{imagemId}": {
    "patch": {
      "tags": [
        "Mídias administrativas"
      ],
      "summary": "Edita metadados de uma imagem",
      "description": "Identificadores são UUIDs em texto. O patrimônio é conferido antes do processamento e a permissão é conferida novamente após bloquear sua linha na transação de gravação. A mídia precisa pertencer a ele. ADMIN/EDITOR em qualquer status, conforme D1A. Metadados textuais recebem trim; ordem, principal e datas são convertidos de texto conforme o schema. Altera apenas metadados; para trocar o arquivo, cadastre o novo e remova o antigo. Recusa corpo vazio, campos desconhecidos e a url. Marcar principal desmarca a anterior na mesma transação.",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "in": "path",
          "name": "id",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "22222222-2222-4222-8222-222222222222",
          "description": "UUID do patrimônio, tratado como texto."
        },
        {
          "in": "path",
          "name": "imagemId",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "44444444-4444-4444-8444-444444444444",
          "description": "UUID da imagem, tratado como texto."
        }
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ImagemPatch"
            },
            "example": {
              "titulo": "Fachada reformada",
              "ordem": 1
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Imagem atualizada.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ImagemMidiaResponse"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Token ausente, inválido, expirado ou conta inativa.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Autenticação necessária.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Autenticação necessária."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Patrimônio ou imagem inexistente, ou imagem de outro patrimônio.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Imagem não encontrada.",
                "details": [],
                "error": {
                  "code": "IMAGEM_NOT_FOUND",
                  "message": "Imagem não encontrada."
                }
              }
            }
          }
        },
        "413": {
          "description": "Corpo JSON acima de 100 kb.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Corpo da requisição muito grande.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Corpo da requisição muito grande."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    },
    "delete": {
      "tags": [
        "Mídias administrativas"
      ],
      "summary": "Remove uma imagem do patrimônio",
      "description": "Somente ADMIN. Identificadores são UUIDs em texto. O patrimônio é conferido antes do processamento e a permissão é conferida novamente após bloquear sua linha na transação de gravação. A mídia precisa pertencer a ele. Exclusao restrita a ADMIN em qualquer status. Metadados textuais recebem trim; ordem, principal e datas são convertidos de texto conforme o schema. Remove o registro e o arquivo gerenciado sem afetar as demais mídias. URLs externas não são movidas nem apagadas; arquivo já ausente é permitido. Arquivos locais passam por quarentena privada antes do DELETE no banco e são apagados somente após confirmar o commit. Se o banco falhar, inclusive na confirmação da transação, tenta restaurar o arquivo e preserva o erro original. Não há atomicidade entre disco e banco. Falhas de restauração ou limpeza geram log com IDs e caminhos para recuperação operacional. Se apenas a limpeza final falhar, o registro já foi excluído: retorna sucesso com arquivoRemovido=false; a pendência deve ser resolvida na quarentena, sem repetir o DELETE.",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "in": "path",
          "name": "id",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "22222222-2222-4222-8222-222222222222",
          "description": "UUID do patrimônio, tratado como texto."
        },
        {
          "in": "path",
          "name": "imagemId",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "44444444-4444-4444-8444-444444444444",
          "description": "UUID da imagem, tratado como texto."
        }
      ],
      "responses": {
        "200": {
          "description": "Imagem removida.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ImagemMidiaResponse"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Token ausente, inválido, expirado ou conta inativa.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Autenticação necessária.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Autenticação necessária."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Patrimônio ou imagem inexistente, ou imagem de outro patrimônio.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Imagem não encontrada.",
                "details": [],
                "error": {
                  "code": "IMAGEM_NOT_FOUND",
                  "message": "Imagem não encontrada."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/admin/patrimonios/{id}/documentos": {
    "post": {
      "tags": [
        "Mídias administrativas"
      ],
      "summary": "Envia um documento PDF e associa ao patrimônio",
      "description": "Identificadores são UUIDs em texto. O patrimônio é conferido antes do processamento e a permissão é conferida novamente após bloquear sua linha na transação de gravação. A mídia precisa pertencer a ele. EDITOR atua em rascunhos; ADMIN em qualquer status. Metadados textuais recebem trim; ordem, principal e datas são convertidos de texto conforme o schema. O arquivo vai no campo arquivo. titulo e tipo são obrigatórios; a url é gerada e o mimeType é determinado a partir do conteúdo validado (application/pdf).",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "in": "path",
          "name": "id",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "22222222-2222-4222-8222-222222222222",
          "description": "UUID do patrimônio, tratado como texto."
        }
      ],
      "requestBody": {
        "required": true,
        "content": {
          "multipart/form-data": {
            "schema": {
              "$ref": "#/components/schemas/DocumentoUpload"
            },
            "example": {
              "titulo": "Inventário do imóvel",
              "tipo": "inventario",
              "dataDocumento": "2026-01-02"
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Documento cadastrado.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DocumentoMidiaResponse"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Token ausente, inválido, expirado ou conta inativa.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Autenticação necessária.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Autenticação necessária."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Patrimônio inexistente.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Patrimônio não encontrado.",
                "details": [],
                "error": {
                  "code": "PATRIMONIO_NOT_FOUND",
                  "message": "Patrimônio não encontrado."
                }
              }
            }
          }
        },
        "413": {
          "description": "Arquivo acima do limite (5 MB para imagens, 10 MB para PDFs).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Arquivo excede o tamanho máximo permitido.",
                "details": [],
                "error": {
                  "code": "FILE_TOO_LARGE",
                  "message": "Arquivo excede o tamanho máximo permitido."
                }
              }
            }
          }
        },
        "415": {
          "description": "Formato não suportado ou conteúdo diferente do declarado.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "O conteúdo do arquivo não corresponde a um formato suportado.",
                "details": [],
                "error": {
                  "code": "UNSUPPORTED_MEDIA_TYPE",
                  "message": "O conteúdo do arquivo não corresponde a um formato suportado."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/admin/patrimonios/{id}/documentos/{documentoId}": {
    "patch": {
      "tags": [
        "Mídias administrativas"
      ],
      "summary": "Edita metadados de um documento",
      "description": "Identificadores são UUIDs em texto. O patrimônio é conferido antes do processamento e a permissão é conferida novamente após bloquear sua linha na transação de gravação. A mídia precisa pertencer a ele. EDITOR atua em rascunhos; ADMIN em qualquer status. Metadados textuais recebem trim; ordem, principal e datas são convertidos de texto conforme o schema. Altera apenas metadados; para trocar o arquivo, cadastre o novo e remova o antigo. Recusa corpo vazio, campos desconhecidos, a url e o mimeType. O tipo e imutavel; o PATCH nao troca LINK/ARQUIVO nem o proprietario.",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "in": "path",
          "name": "id",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "22222222-2222-4222-8222-222222222222",
          "description": "UUID do patrimônio, tratado como texto."
        },
        {
          "in": "path",
          "name": "documentoId",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "66666666-6666-4666-8666-666666666666",
          "description": "UUID do documento, tratado como texto."
        }
      ],
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/DocumentoPatch"
            },
            "example": {
              "titulo": "Inventário revisado",
              "dataDocumento": "2026-02-10"
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Documento atualizado.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DocumentoMidiaResponse"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Token ausente, inválido, expirado ou conta inativa.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Autenticação necessária.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Autenticação necessária."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Patrimônio ou documento inexistente, ou documento de outro patrimônio.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Documento não encontrado.",
                "details": [],
                "error": {
                  "code": "DOCUMENTO_NOT_FOUND",
                  "message": "Documento não encontrado."
                }
              }
            }
          }
        },
        "413": {
          "description": "Corpo JSON acima de 100 kb.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Corpo da requisição muito grande.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Corpo da requisição muito grande."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    },
    "delete": {
      "tags": [
        "Mídias administrativas"
      ],
      "summary": "Remove um documento do patrimônio",
      "description": "Somente ADMIN. Identificadores são UUIDs em texto. O patrimônio é conferido antes do processamento e a permissão é conferida novamente após bloquear sua linha na transação de gravação. A mídia precisa pertencer a ele. Exclusao restrita a ADMIN em qualquer status. Metadados textuais recebem trim; ordem, principal e datas são convertidos de texto conforme o schema. Remove o registro e o arquivo gerenciado sem afetar as demais mídias. URLs externas não são movidas nem apagadas; arquivo já ausente é permitido. Arquivos locais passam por quarentena privada antes do DELETE no banco e são apagados somente após confirmar o commit. Se o banco falhar, inclusive na confirmação da transação, tenta restaurar o arquivo e preserva o erro original. Não há atomicidade entre disco e banco. Falhas de restauração ou limpeza geram log com IDs e caminhos para recuperação operacional. Se apenas a limpeza final falhar, o registro já foi excluído: retorna sucesso com arquivoRemovido=false; a pendência deve ser resolvida na quarentena, sem repetir o DELETE.",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "in": "path",
          "name": "id",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "22222222-2222-4222-8222-222222222222",
          "description": "UUID do patrimônio, tratado como texto."
        },
        {
          "in": "path",
          "name": "documentoId",
          "required": true,
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "example": "66666666-6666-4666-8666-666666666666",
          "description": "UUID do documento, tratado como texto."
        }
      ],
      "responses": {
        "200": {
          "description": "Documento removido.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DocumentoMidiaResponse"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Token ausente, inválido, expirado ou conta inativa.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Autenticação necessária.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Autenticação necessária."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Patrimônio ou documento inexistente, ou documento de outro patrimônio.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Documento não encontrado.",
                "details": [],
                "error": {
                  "code": "DOCUMENTO_NOT_FOUND",
                  "message": "Documento não encontrado."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  },
  "/api/uploads/{tipo}/{arquivo}": {
    "get": {
      "tags": [
        "Mídias públicas"
      ],
      "summary": "Entrega uma mídia cadastrada",
      "description": "PUBLICADO permite visitante; RASCUNHO e ARQUIVADO exigem ADMIN ou EDITOR ativo. Token enviado inválido ou conta desativada retorna 401. Consulta o registro e o status em cada requisição. Arquivo sem registro, ausente ou caminho redirecionado retorna 404. Cache-Control: private, no-store, inclusive quando publicado. Os arquivos ficam em UPLOAD_ROOT; não há exposição estática dessas mídias.",
      "parameters": [
        {
          "in": "path",
          "name": "tipo",
          "required": true,
          "schema": {
            "type": "string",
            "enum": [
              "imagens",
              "documentos"
            ]
          },
          "example": "imagens"
        },
        {
          "in": "path",
          "name": "arquivo",
          "required": true,
          "schema": {
            "type": "string",
            "pattern": "^[0-9a-f-]+\\.[a-z0-9]+$"
          },
          "example": "9f1c2f7a-6c5b-4a3e-9d10-2b8f0c7e4a11.jpg",
          "description": "Nome gerado pela API."
        }
      ],
      "responses": {
        "200": {
          "description": "Conteúdo binário do arquivo.",
          "content": {
            "image/jpeg": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "image/png": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "image/webp": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "application/pdf": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Mídia não publicada sem autenticação, ou credencial enviada inválida/conta desativada (inclusive para arquivo publicado).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Mídia disponível apenas para usuários autenticados.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Mídia disponível apenas para usuários autenticados."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Arquivo ou registro de mídia inexistente.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Arquivo não encontrado.",
                "details": [],
                "error": {
                  "code": "NOT_FOUND",
                  "message": "Arquivo não encontrado."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  },
  "/uploads/patrimonios/{arquivo}": {
    "get": {
      "tags": [
        "Mídias públicas"
      ],
      "summary": "Entrega patrimonios pela URL anterior",
      "description": "Preserva URL e arquivo existentes. PUBLICADO é público; RASCUNHO/ARQUIVADO exigem ADMIN ou EDITOR ativo. Credencial enviada inválida/usuário desativado retorna 401. Acesso depende do registro e status consultados em cada requisição, sem fallback estático. Aceita somente um nome de arquivo, sem subpastas ou symlinks. Cache-Control: private, no-store; X-Content-Type-Options: nosniff. Imagem inline.",
      "parameters": [
        {
          "in": "path",
          "name": "arquivo",
          "required": true,
          "schema": {
            "type": "string",
            "maxLength": 255
          },
          "description": "Nome seguro com extensão jpg/jpeg/png/webp/gif."
        }
      ],
      "responses": {
        "200": {
          "description": "Arquivo vinculado a patrimônio autorizado.",
          "headers": {
            "Cache-Control": {
              "schema": {
                "type": "string",
                "enum": [
                  "private, no-store"
                ]
              }
            },
            "X-Content-Type-Options": {
              "schema": {
                "type": "string",
                "enum": [
                  "nosniff"
                ]
              }
            },
            "Content-Disposition": {
              "schema": {
                "type": "string"
              },
              "description": "inline"
            }
          },
          "content": {
            "image/jpeg": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "image/png": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "image/webp": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "image/gif": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Mídia não publicada sem autenticação, ou credencial enviada inválida/conta desativada (inclusive para arquivo publicado).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Mídia disponível apenas para usuários autenticados.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Mídia disponível apenas para usuários autenticados."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Arquivo ou registro de mídia inexistente.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Arquivo não encontrado.",
                "details": [],
                "error": {
                  "code": "NOT_FOUND",
                  "message": "Arquivo não encontrado."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  },
  "/uploads/referencias/{arquivo}": {
    "get": {
      "tags": [
        "Mídias públicas"
      ],
      "summary": "Entrega referencias pela URL anterior",
      "description": "Preserva URL e arquivo existentes. PUBLICADO é público; RASCUNHO/ARQUIVADO exigem ADMIN ou EDITOR ativo. Credencial enviada inválida/usuário desativado retorna 401. Acesso depende do registro e status consultados em cada requisição, sem fallback estático. Aceita somente um nome de arquivo, sem subpastas ou symlinks. Cache-Control: private, no-store; X-Content-Type-Options: nosniff. Download como attachment.",
      "parameters": [
        {
          "in": "path",
          "name": "arquivo",
          "required": true,
          "schema": {
            "type": "string",
            "maxLength": 255
          },
          "description": "Nome seguro com extensão pdf/doc/docx/odt/txt/md."
        }
      ],
      "responses": {
        "200": {
          "description": "Arquivo vinculado a patrimônio autorizado.",
          "headers": {
            "Cache-Control": {
              "schema": {
                "type": "string",
                "enum": [
                  "private, no-store"
                ]
              }
            },
            "X-Content-Type-Options": {
              "schema": {
                "type": "string",
                "enum": [
                  "nosniff"
                ]
              }
            },
            "Content-Disposition": {
              "schema": {
                "type": "string"
              },
              "description": "attachment"
            }
          },
          "content": {
            "application/pdf": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "application/msword": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "application/vnd.oasis.opendocument.text": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "text/plain": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            },
            "text/markdown": {
              "schema": {
                "type": "string",
                "format": "binary"
              }
            }
          }
        },
        "400": {
          "description": "Dados inválidos (incluindo JSON inválido).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Dados inválidos.",
                "details": [],
                "error": {
                  "code": "BAD_REQUEST",
                  "message": "Dados inválidos."
                }
              }
            }
          }
        },
        "401": {
          "description": "Mídia não publicada sem autenticação, ou credencial enviada inválida/conta desativada (inclusive para arquivo publicado).",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Mídia disponível apenas para usuários autenticados.",
                "details": [],
                "error": {
                  "code": "UNAUTHORIZED",
                  "message": "Mídia disponível apenas para usuários autenticados."
                }
              }
            }
          }
        },
        "403": {
          "description": "Papel sem permissão.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Você não possui permissão para realizar esta ação.",
                "details": [],
                "error": {
                  "code": "FORBIDDEN",
                  "message": "Você não possui permissão para realizar esta ação."
                }
              }
            }
          }
        },
        "404": {
          "description": "Arquivo ou registro de mídia inexistente.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Arquivo não encontrado.",
                "details": [],
                "error": {
                  "code": "NOT_FOUND",
                  "message": "Arquivo não encontrado."
                }
              }
            }
          }
        },
        "500": {
          "description": "Falha inesperada, inclusive falha de acesso ao banco.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              },
              "example": {
                "success": false,
                "message": "Erro interno do servidor.",
                "details": [],
                "error": {
                  "code": "INTERNAL_ERROR",
                  "message": "Erro interno do servidor."
                }
              }
            }
          }
        }
      }
    }
  }
};
