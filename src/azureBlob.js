// Destino: Azure Blob Storage (autenticação via Connection String ou SAS URL)
// Aluno: Pedro_henrique_da_silva
const { BlobServiceClient } = require('@azure/storage-blob');

let serviceClient;
function getService() {
  if (!serviceClient) {
    const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const sas = process.env.AZURE_BLOB_SAS_URL;
    if (cs) serviceClient = BlobServiceClient.fromConnectionString(cs);
    else if (sas) serviceClient = new BlobServiceClient(sas);
    else throw new Error('Defina AZURE_STORAGE_CONNECTION_STRING ou AZURE_BLOB_SAS_URL');
  }
  return serviceClient;
}

function getContainer(nome) {
  return getService().getContainerClient(nome);
}

async function garantirContainer(nome) {
  await getContainer(nome).createIfNotExists();
}

// Função para listar os dados de DESTINO (Azure Blob Storage)
async function listarArquivosDestino(nomeContainer) {
  const container = getContainer(nomeContainer);
  if (!(await container.exists())) return [];
  const blobs = [];
  for await (const b of container.listBlobsFlat()) {
    blobs.push({
      nome: b.name,
      tamanho: b.properties.contentLength,
      mimeType: b.properties.contentType,
      modificado: b.properties.lastModified,
      url: container.getBlockBlobClient(b.name).url,
    });
  }
  return blobs;
}

// Envia um stream para o container como Block Blob
async function enviarArquivo(nomeContainer, nomeBlob, stream, mimeType, metadados = {}) {
  const blob = getContainer(nomeContainer).getBlockBlobClient(nomeBlob);
  await blob.uploadStream(stream, 4 * 1024 * 1024, 5, {
    blobHTTPHeaders: { blobContentType: mimeType || 'application/octet-stream' },
    metadata: metadados,
  });
  const props = await blob.getProperties();
  return { url: blob.url, tamanho: props.contentLength };
}

function nomeConta() {
  try { return getService().accountName; } catch { return null; }
}

module.exports = { listarArquivosDestino, enviarArquivo, garantirContainer, nomeConta };
