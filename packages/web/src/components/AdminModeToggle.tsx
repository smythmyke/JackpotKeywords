import { useAuthContext } from '../contexts/AuthContext';
import { isAdminDisabled, isRealAdminEmail, setAdminDisabled } from '../lib/adminMode';

export default function AdminModeToggle() {
  const { profile, user } = useAuthContext();
  const email = profile?.email || user?.email;
  if (!isRealAdminEmail(email)) return null;

  const disabled = isAdminDisabled();

  const toggle = () => {
    setAdminDisabled(!disabled);
    window.location.reload();
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
