// Lógica da migração Google Drive -> Azure Blob Storage
// Aluno: Pedro_henrique_da_silva
const { listarArquivosOrigem, baixarArquivo } = require('./googleDrive');
const { enviarArquivo, garantirContainer } = require('./azureBlob');

const cor = { ok: '\x1b[32m', erro: '\x1b[31m', info: '\x1b[36m', fim: '\x1b[0m' };

function log(tipo, msg) {
  const hora = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`${cor[tipo] || ''}[${hora}] ${msg}${cor.fim}`);
}

async function migrar({ folderId, container }, aoProgresso = () => {}) {
  log('info', `Iniciando migração | Drive pasta=${folderId} -> Blob container=${container}`);
  await garantirContainer(container);
  const arquivos = await listarArquivosOrigem(folderId);
  log('info', `${arquivos.length} arquivo(s) encontrado(s) na origem`);

  const resultados = [];
  for (const [i, arq] of arquivos.entries()) {
    const inicio = Date.now();
    try {
      const stream = await baixarArquivo(arq);
      const r = await enviarArquivo(container, arq.nome, stream, arq.mimeType, {
        origem: 'google-drive', driveid: arq.id, aluno: 'Pedro_henrique_da_silva',
      });
      const item = { arquivo: arq.nome, status: 'sucesso', tamanho: r.tamanho, url: r.url, ms: Date.now() - inicio };
      resultados.push(item);
      log('ok', `[${i + 1}/${arquivos.length}] SUCESSO  ${arq.nome} (${r.tamanho} bytes, ${item.ms} ms)`);
      aoProgresso(item);
    } catch (e) {
      const item = { arquivo: arq.nome, status: 'erro', erro: e.message, ms: Date.now() - inicio };
      resultados.push(item);
      log('erro', `[${i + 1}/${arquivos.length}] ERRO     ${arq.nome} -> ${e.message}`);
      aoProgresso(item);
    }
  }
  const ok = resultados.filter((r) => r.status === 'sucesso').length;
  log('info', `Migração concluída: ${ok} sucesso(s), ${resultados.length - ok} erro(s)`);
  return { total: resultados.length, sucesso: ok, erro: resultados.length - ok, resultados };
}

module.exports = { migrar, log };
