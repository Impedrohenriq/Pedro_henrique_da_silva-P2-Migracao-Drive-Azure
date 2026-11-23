// Migração de Arquivos: Google Drive -> Azure Blob Storage
// P2 - Computação em Nuvem II - FATEC Cotia
// Aluno: Pedro_henrique_da_silva
require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const { listarArquivosOrigem, emailServiceAccount } = require('./src/googleDrive');
const { listarArquivosDestino, nomeConta } = require('./src/azureBlob');
const { migrar, log } = require('./src/migracao');

const PORT = process.env.PORT || 3000;
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const CONTAINER = process.env.AZURE_CONTAINER_NAME || 'aluno-pedro-henrique-da-silva';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const folder = (req) => (req.query.folderId || req.body?.folderId || FOLDER_ID || '').trim();

app.get('/api/config', (req, res) => {
  res.json({
    aluno: 'Pedro_henrique_da_silva',
    folderId: FOLDER_ID,
    container: CONTAINER,
    storageAccount: nomeConta(),
    serviceAccount: emailServiceAccount(),
  });
});

// Lista os dados de origem (Google Drive)
app.get('/api/origem', async (req, res) => {
  try {
    const arquivos = await listarArquivosOrigem(folder(req));
    log('info', `GET /api/origem -> ${arquivos.length} arquivo(s)`);
    res.json(arquivos);
  } catch (e) {
    log('erro', `GET /api/origem -> ${e.message}`);
    res.status(500).json({ erro: e.message });
  }
});

// Lista os dados de destino (Azure Blob Storage)
app.get('/api/destino', async (req, res) => {
  try {
    const blobs = await listarArquivosDestino(CONTAINER);
    log('info', `GET /api/destino -> ${blobs.length} blob(s)`);
    res.json(blobs);
  } catch (e) {
    log('erro', `GET /api/destino -> ${e.message}`);
    res.status(500).json({ erro: e.message });
  }
});

// Executa a migração; envia o status de cada arquivo em tempo real (NDJSON)
app.post('/api/migrar', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  try {
    const resumo = await migrar({ folderId: folder(req), container: CONTAINER },
      (item) => res.write(JSON.stringify({ tipo: 'arquivo', ...item }) + '\n'));
    res.end(JSON.stringify({ tipo: 'resumo', ...resumo, resultados: undefined }) + '\n');
  } catch (e) {
    log('erro', `POST /api/migrar -> ${e.message}`);
    res.end(JSON.stringify({ tipo: 'falha', erro: e.message }) + '\n');
  }
});

app.listen(PORT, () => log('info', `Servidor Pedro_henrique_da_silva rodando na porta ${PORT}`));
