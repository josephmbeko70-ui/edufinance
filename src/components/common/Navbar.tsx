import React from 'react';
import {
  School as SchoolIcon,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { School } from '../../types';

interface NavbarProps {
  school: School | null;
  onSearchOpen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ school }) => {
  const { currentUser, profile, signOut, signInWithGoogle } = useAuth();

  const schoolLocation = [school?.city, school?.province, school?.country]
    .filter(val => val && val.trim().length > 0)
    .join(' – ') || 'Kinshasa – Kinshasa – République Démocratique du Congo';

  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Utilisateur';

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    director: 'Directeur',
    cashier: 'Caissier',
    secretary: 'Secrétaire',
  };

  const roleLabel = roleLabels[profile?.role || ''] || 'Utilisateur';

  const initials = displayName
    .split(/\\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U';

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 h-16">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand & School Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            <SchoolIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-base leading-tight truncate">
                {school?.name || 'EduFinance Pro'}
              </h1>
              <span className="hidden sm:inline-flex text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                {school?.schoolYear || '2026-2027'}
              </span>
            </div>
            <p
              className="text-xs text-slate-500 font-medium truncate max-w-[220px] sm:max-w-md"
              title={schoolLocation}
            >
              {schoolLocation}
            </p>
          </div>
        </div>

        {/* Right: User workspace */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 pl-2 pr-1 py-1 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold">{initials}</span>
                )}
              </div>

              <div className="hidden md:block min-w-0 mx-3">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[170px]">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                  {roleLabel}
                </p>
              </div>

              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 mr-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connecté
              </span>

              <button
                onClick={signOut}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <UserRound className="w-4 h-4" />
              Connexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
