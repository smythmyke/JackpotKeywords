const STORAGE_KEY = 'jk_disable_admin';
const SCORING_VERSION_KEY = 'jk_admin_scoring_version';

export const ADMIN_EMAILS = ['smythmyke@gmail.com'];

export type AdminScoringVersion = 'v1' | 'v2';

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

export function getAdminScoringVersion(): AdminScoringVersion {
  try {
    return localStorage.getItem(SCORING_VERSION_KEY) === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}

export function setAdminScoringVersion(version: AdminScoringVersion): void {
  try {
    if (version === 'v2') localStorage.setItem(SCORING_VERSION_KEY, 'v2');
    else localStorage.removeItem(SCORING_VERSION_KEY);
  } catch {}
}
