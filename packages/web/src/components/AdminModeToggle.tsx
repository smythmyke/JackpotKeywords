import { useAuthContext } from '../contexts/AuthContext';
import { isAdminDisabled, isRealAdminEmail, setAdminDisabled } from '../lib/adminMode';

/**
 * Clears client-side caches that hold server-masked result payloads.
 * Server masks keyword strings in the response for unpaid users, so when
 * the admin state flips we must drop those caches — otherwise the masked
 * placeholders linger even after admin status changes.
 */
function clearMaskedResultCaches() {
  try {
    sessionStorage.removeItem('jk_results');
    sessionStorage.removeItem('jk_results_path');
    sessionStorage.removeItem('jk_audit_results');
    sessionStorage.removeItem('jk_audit_results_path');
    sessionStorage.removeItem('jk_maxCpc');
  } catch {}
}

export default function AdminModeToggle() {
  const { profile, user } = useAuthContext();
  const email = profile?.email || user?.email;
  if (!isRealAdminEmail(email)) return null;

  const disabled = isAdminDisabled();

  const toggle = () => {
    setAdminDisabled(!disabled);
    clearMaskedResultCaches();
    // Navigate to home. A reload here could leave the admin stuck on
    // /results/anonymous with no sessionStorage -> "Results expired".
    // Going home gives a clean starting point for testing the new mode.
    window.location.href = '/';
  };

  return (
    <button
      onClick={toggle}
      title={disabled ? 'Currently seeing the app as a free user. Click to restore admin.' : 'Click to preview the app as a free user (admin bypass disabled).'}
      className={`fixed bottom-4 right-4 z-[100] px-3 py-2 rounded-full shadow-lg text-xs font-bold uppercase tracking-wider transition border ${
        disabled
          ? 'bg-red-500/90 hover:bg-red-500 text-white border-red-400'
          : 'bg-jackpot-500/90 hover:bg-jackpot-500 text-black border-jackpot-400'
      }`}
    >
      {disabled ? 'Free Mode' : 'Admin Mode'}
    </button>
  );
}
