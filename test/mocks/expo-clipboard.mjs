let clipboardContent = '';

export async function setStringAsync(text) {
  clipboardContent = text;
  return true;
}

export async function getStringAsync() {
  return clipboardContent;
}

export function _getClipboard() {
  return clipboardContent;
}

export function _clearClipboard() {
  clipboardContent = '';
}
