const STORAGE_KEY = 'jk_anon_id';

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'anon-nostorage';
  }
}
