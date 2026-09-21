const files = new Map();

export const documentDirectory = 'file:///mock-documents/';
export const cacheDirectory = 'file:///mock-cache/';

export const getInfoAsync = async (filePath) => {
  return {
    exists: files.has(filePath),
    size: files.has(filePath) ? files.get(filePath).length : 0,
    isDirectory: false,
    modificationTime: Date.now(),
    uri: filePath,
  };
};

export const writeAsStringAsync = async (filePath, content) => {
  files.set(filePath, content);
};

export const readAsStringAsync = async (filePath) => {
  if (!files.has(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return files.get(filePath);
};

export const deleteAsync = async (filePath) => {
  files.delete(filePath);
};

export const _getFiles = () => files;
export const _clearFiles = () => files.clear();

export default {
  documentDirectory,
  cacheDirectory,
  getInfoAsync,
  writeAsStringAsync,
  readAsStringAsync,
  deleteAsync,
  _getFiles,
  _clearFiles,
};
