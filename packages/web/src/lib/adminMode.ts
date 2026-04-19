const STORAGE_KEY = 'jk_disable_admin';

export const ADMIN_EMAILS = ['smythmyke@gmail.com'];

export function isAdminDisabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdminDisabled(disabled: boolean): void {
  try {
    if (disabled) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function isRealAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

export function isEffectiveAdmin(email: string | null | undefined): boolean {
  return isRealAdminEmail(email) && !isAdminDisabled();
}
