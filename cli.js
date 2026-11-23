// Execução pelo console: node cli.js [listar-origem | listar-destino | migrar]
// Aluno: Pedro_henrique_da_silva
require('dotenv').config({ quiet: true });
const { listarArquivosOrigem } = require('./src/googleDrive');
const { listarArquivosDestino } = require('./src/azureBlob');
const { migrar } = require('./src/migracao');

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const CONTAINER = process.env.AZURE_CONTAINER_NAME || 'aluno-pedro-henrique-da-silva';

(async () => {
  const cmd = process.argv[2] || 'migrar';
  if (cmd === 'listar-origem') {
    const a = await listarArquivosOrigem(FOLDER_ID);
    console.log(`\nOrigem: Google Drive (pasta ${FOLDER_ID}) - ${a.length} arquivo(s)`);
    console.table(a.map((f) => ({ nome: f.nome, tipo: f.mimeType, bytes: f.tamanho, modificado: f.modificado })));
  } else if (cmd === 'listar-destino') {
    const b = await listarArquivosDestino(CONTAINER);
    console.log(`\nDestino: Azure Blob Storage (container ${CONTAINER}) - ${b.length} blob(s)`);
    console.table(b.map((x) => ({ nome: x.nome, tipo: x.mimeType, bytes: x.tamanho, modificado: x.modificado.toISOString() })));
  } else {
    const r = await migrar({ folderId: FOLDER_ID, container: CONTAINER });
    process.exitCode = r.erro ? 1 : 0;
  }
})().catch((e) => { console.error('Falha:', e.message); process.exit(1); });
