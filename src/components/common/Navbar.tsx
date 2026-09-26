import React, { useState } from 'react';
import {
  School as SchoolIcon,
  UserCheck,
  LogOut,
  Sparkles,
  Search,
  Check,
  Shield,
  Briefcase,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { School, UserRole } from '../../types';
import { getRoleLabel } from '../../utils/formatters';

interface NavbarProps {
  school: School | null;
  onSeedData: () => Promise<void>;
  seeding: boolean;
  onSearchOpen?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  school,
  onSeedData,
  seeding,
}) => {
  const { currentUser, role, switchRole, signOut, signInWithGoogle } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const rolesList: { role: UserRole; desc: string; icon: React.ReactNode }[] = [
    { role: 'admin', desc: 'Accès total, configurations & utilisateurs', icon: <Shield className="w-3.5 h-3.5 text-indigo-600" /> },
    { role: 'director', desc: 'Supervision pédagogique & financière', icon: <Briefcase className="w-3.5 h-3.5 text-amber-600" /> },
    { role: 'cashier', desc: 'Encaissements, reçus & journal de caisse', icon: <Layers className="w-3.5 h-3.5 text-emerald-600" /> },
    { role: 'secretary', desc: 'Inscriptions & gestion administrative', icon: <UserCheck className="w-3.5 h-3.5 text-blue-600" /> },
  ];

  // Localisation officielle renseignée dans les paramètres : « Ville – Province – Pays »
  const schoolLocation = [school?.city, school?.province, school?.country]
    .filter(val => val && val.trim().length > 0)
    .join(' – ') || 'Kinshasa – Kinshasa – République Démocratique du Congo';

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 h-16">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand & School Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <SchoolIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-base leading-tight">
                {school?.name || 'EduFinance Pro'}
              </h1>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                {school?.schoolYear || '2026-2027'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[280px] sm:max-w-md" title={schoolLocation}>
              {schoolLocation}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Seed Demo Data Button */}
          <button
            onClick={onSeedData}
            disabled={seeding}
            title="Injecte des classes, élèves, factures et paiements de test"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {seeding ? 'Chargement démo...' : 'Données Démo'}
          </button>

          {/* Role Switcher Selector */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{getRoleLabel(role)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Changer de Rôle Utilisateur
                </div>
                {rolesList.map(item => (
                  <button
                    key={item.role}
                    onClick={() => {
                      switchRole(item.role);
                      setRoleDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-start justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{item.icon}</div>
                      <div>
                        <div className="font-semibold text-slate-900">{getRoleLabel(item.role)}</div>
                        <div className="text-[11px] text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                    {role === item.role && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auth State & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={signOut}
                title="Déconnexion"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Connexion Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
