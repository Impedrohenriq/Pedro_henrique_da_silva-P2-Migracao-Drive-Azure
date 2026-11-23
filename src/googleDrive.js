// Origem: Google Drive (autenticação via Service Account)
// Aluno: Pedro_henrique_da_silva
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Arquivos nativos do Google (Docs, Planilhas, Apresentações) não têm binário;
// precisam ser exportados para um formato comum antes da cópia.
const EXPORTS = {
  'application/vnd.google-apps.document': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' },
  'application/vnd.google-apps.spreadsheet': {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
  'application/vnd.google-apps.presentation': {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ext: '.pptx' },
  'application/vnd.google-apps.drawing': { mime: 'application/pdf', ext: '.pdf' },
};

// Lê as credenciais da Service Account de forma segura:
// 1) GOOGLE_SERVICE_ACCOUNT_JSON (JSON puro ou em base64) – usado no Azure App Service
// 2) GOOGLE_APPLICATION_CREDENTIALS (caminho do arquivo .json) – uso local
function carregarCredenciais() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const texto = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(texto);
  }
  const arquivo = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(__dirname, '..', 'service-account.json');
  return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

let driveClient;
function getDrive() {
  if (!driveClient) {
    const cred = carregarCredenciais();
    const auth = new google.auth.JWT({
      email: cred.client_email,
      key: cred.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

function emailServiceAccount() {
  try { return carregarCredenciais().client_email; } catch { return null; }
}

// Função para listar os dados de ORIGEM (Google Drive)
async function listarArquivosOrigem(folderId) {
  const drive = getDrive();
  const arquivos = [];
  let pageToken;
  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'name',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    arquivos.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return arquivos.map((f) => {
    const exp = EXPORTS[f.mimeType];
    return {
      id: f.id,
      nome: exp && !f.name.endsWith(exp.ext) ? f.name + exp.ext : f.name,
      mimeType: exp ? exp.mime : f.mimeType,
      mimeOriginal: f.mimeType,
      tamanho: f.size ? Number(f.size) : null,
      modificado: f.modifiedTime,
      exportado: !!exp,
    };
  });
}

// Baixa o conteúdo de um arquivo como stream (exporta se for arquivo nativo do Google)
async function baixarArquivo(arquivo) {
  const drive = getDrive();
  if (EXPORTS[arquivo.mimeOriginal]) {
    const res = await drive.files.export(
      { fileId: arquivo.id, mimeType: EXPORTS[arquivo.mimeOriginal].mime },
      { responseType: 'stream' });
    return res.data;
  }
  const res = await drive.files.get(
    { fileId: arquivo.id, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' });
  return res.data;
}

module.exports = { listarArquivosOrigem, baixarArquivo, emailServiceAccount };
