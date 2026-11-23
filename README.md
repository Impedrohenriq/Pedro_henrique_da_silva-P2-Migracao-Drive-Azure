# Migração de Arquivos: Google Drive → Azure Blob Storage

**P2 · Computação em Nuvem II · FATEC Cotia · Aluno: Pedro_henrique_da_silva**

Aplicação Node.js que copia os arquivos de uma pasta específica do Google Drive para um contêiner do Azure Blob Storage, com interface gráfica web e log de status de cada transferência no console.

## Requisitos atendidos

| Requisito | Implementação |
|---|---|
| Autenticação segura no Google | **Service Account** (`pedro-henrique-da-silva-sa@pedro-henrique-da-silva-p2.iam.gserviceaccount.com`), escopo `drive.readonly`; a pasta do Drive é compartilhada com ela como *Leitor* |
| Autenticação segura no Azure | **Connection String** do Storage Account (`AZURE_STORAGE_CONNECTION_STRING`), com alternativa por **SAS URL** (`AZURE_BLOB_SAS_URL`) |
| Listar a origem e enviar para o destino | `src/migracao.js` → `migrar()` baixa cada arquivo do Drive como stream e envia como Block Blob |
| Status de cada transferência no console | `[n/total] SUCESSO` / `[n/total] ERRO` com tamanho e tempo (stdout do servidor e do CLI) e também na tela |
| Função para listar a origem (Google Drive) | `src/googleDrive.js` → `listarArquivosOrigem(folderId)` · rota `GET /api/origem` |
| Função para listar o destino (Blob Storage) | `src/azureBlob.js` → `listarArquivosDestino(container)` · rota `GET /api/destino` |
| Interface gráfica | `public/index.html` (listar origem, listar destino, migrar com status em tempo real) |

Arquivos nativos do Google (Docs, Planilhas, Apresentações) são exportados automaticamente para `.docx`, `.xlsx` e `.pptx`.

**Contêiner:** `aluno-pedro-henrique-da-silva`. O padrão `Aluno_xxx` foi adaptado porque o Azure só aceita minúsculas, números e hífen em nomes de contêiner.

## Estrutura

```
server.js            API Express + interface web
cli.js               execução pelo console (listar-origem | listar-destino | migrar)
src/googleDrive.js   origem: autenticação Service Account, listagem e download
src/azureBlob.js     destino: autenticação Connection String/SAS, listagem e upload
src/migracao.js      orquestra a cópia e registra o status de cada arquivo
public/index.html    interface gráfica
```

## Como executar localmente

```bash
npm install
cp .env.example .env        # preencher connection string e ID da pasta
# salvar a chave JSON da Service Account como service-account.json
npm start                   # http://localhost:3000
npm run listar-origem
npm run listar-destino
npm run migrar
```

## Publicação no Azure App Service

```bash
az webapp create -g rg-pedro-henrique-da-silva -p plan-pedro-henrique-da-silva \
  -n pedro-henrique-da-silva-migracao --runtime "NODE:20-lts"
az webapp config appsettings set -g rg-pedro-henrique-da-silva -n pedro-henrique-da-silva-migracao --settings \
  AZURE_STORAGE_CONNECTION_STRING="..." AZURE_CONTAINER_NAME=aluno-pedro-henrique-da-silva \
  DRIVE_FOLDER_ID="..." GOOGLE_SERVICE_ACCOUNT_JSON="<json da service account em base64>" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp deploy -g rg-pedro-henrique-da-silva -n pedro-henrique-da-silva-migracao --src-path app.zip --type zip
```

As credenciais não ficam no repositório: elas vão em `.env` (ignorado pelo git) ou nas *App Settings* do Azure.
