const store = new Map();

export const getItemAsync = async (key) => {
  return store.has(key) ? store.get(key) : null;
};

export const setItemAsync = async (key, val) => {
  store.set(key, String(val));
};

export const deleteItemAsync = async (key) => {
  store.delete(key);
};

export const isAvailableAsync = async () => true;

export const _getStore = () => store;
export const _clearStore = () => store.clear();

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  _getStore,
  _clearStore,
};
