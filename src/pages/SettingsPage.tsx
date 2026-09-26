import React, { useState } from 'react';
import { Settings, School as SchoolIcon, Users, Save, CheckCircle, Shield, Calendar, Clock } from 'lucide-react';
import { School, UserProfile, UserRole, Currency } from '../types';
import { SchoolService } from '../services/schoolService';
import { useAuth } from '../context/AuthContext';
import { getRoleLabel } from '../utils/formatters';
import { MONTHS_OF_YEAR } from '../utils/academic';

interface SettingsPageProps {
  school: School;
  onRefreshData: () => Promise<void>;
  onNavigateToUsers?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ school, onRefreshData, onNavigateToUsers }) => {
  const { schoolId, currentUser, profile } = useAuth();

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: school.name || '',
    code: school.code || '',
    address: school.address || '',
    city: school.city || 'Kinshasa',
    province: school.province || 'Kinshasa',
    country: school.country || 'République Démocratique du Congo',
    phone: school.phone || '',
    email: school.email || '',
    currency: school.currency || 'CDF',
    schoolYear: school.schoolYear || '2026-2027',
    enrollmentStartMonth: school.enrollmentStartMonth || 'Juillet',
    enrollmentEndMonth: school.enrollmentEndMonth || 'Septembre',
    schoolYearStartMonth: school.schoolYearStartMonth || 'Septembre',
    schoolYearEndMonth: school.schoolYearEndMonth || 'Juillet',
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    try {
      await SchoolService.updateSchoolSettings(
        schoolId,
        form,
        currentUser?.uid || 'admin',
        currentUser?.email || profile?.email || 'admin@ecole.cd'
      );
      await onRefreshData();
      setSuccessMessage('Paramètres de l\'établissement mis à jour avec succès.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Configuration & Paramètres de l'Établissement
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Identité officielle de l'école, exercice scolaire en cours, devise monétaire et coordonnées
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Identité Institutionnelle</h3>
          <p className="text-xs text-slate-500">Ces informations figurent sur les reçus officiels d'encaissement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Nom Officiel de l'Établissement *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Code Établissement (Abrégé) *
            </label>
            <input
              type="text"
              required
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Année Scolaire Active *
            </label>
            <input
              type="text"
              required
              value={form.schoolYear}
              onChange={e => setForm({ ...form, schoolYear: e.target.value })}
              placeholder="Ex: 2026-2027"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Devise Monétaire Principale *
            </label>
            <select
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value as Currency })}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="CDF">Franc Congolais (CDF)</option>
              <option value="USD">Dollar Américain (USD)</option>
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
        </div>

        {/* Section Calendrier & Échéances Scolaires */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Calendrier & Échéances de l'Année Scolaire
              </h3>
              <p className="text-xs text-slate-500">
                Définissez la période des inscriptions et les bornes temporelles de l'exercice académique
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
              Exercice {form.schoolYear}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {/* 1. Échéance des Inscriptions */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Échéance des Inscriptions
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Période officielle durant laquelle les inscriptions et réinscriptions sont ouvertes
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Début (Mois) *
                  </label>
                  <select
                    value={form.enrollmentStartMonth}
                    onChange={e => setForm({ ...form, enrollmentStartMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {MONTHS_OF_YEAR.map(m => (
                      <option key={`ens_${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Fin (Mois) *
                  </label>
                  <select
                    value={form.enrollmentEndMonth}
                    onChange={e => setForm({ ...form, enrollmentEndMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {MONTHS_OF_YEAR.map(m => (
                      <option key={`ene_${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200/60 font-medium">
                Période : De <strong>{form.enrollmentStartMonth}</strong> à <strong>{form.enrollmentEndMonth}</strong>
              </div>
            </div>

            {/* 2. Année Scolaire (Période des cours) */}
            <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Année Scolaire (Session des cours)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500">
                Période effective des cours et du minerval pour l'exercice en cours
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Début (Mois) *
                  </label>
                  <select
                    value={form.schoolYearStartMonth}
                    onChange={e => setForm({ ...form, schoolYearStartMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {MONTHS_OF_YEAR.map(m => (
                      <option key={`sys_${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Fin (Mois) *
                  </label>
                  <select
                    value={form.schoolYearEndMonth}
                    onChange={e => setForm({ ...form, schoolYearEndMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {MONTHS_OF_YEAR.map(m => (
                      <option key={`sye_${m}`} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded border border-indigo-200/60 font-medium">
                Période : De <strong>{form.schoolYearStartMonth}</strong> à <strong>{form.schoolYearEndMonth}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section Localisation Géographique */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Localisation Géographique de l'Établissement</h3>
            <p className="text-xs text-slate-500">
              Ces informations remplacent la mention de titre par le format : « Ville – Province – Pays »
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Ville / Commune *
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Ex: Kinshasa, Lubumbashi, Goma"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Province *
              </label>
              <input
                type="text"
                required
                value={form.province}
                onChange={e => setForm({ ...form, province: e.target.value })}
                placeholder="Ex: Kinshasa, Haut-Katanga, Nord-Kivu"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Pays *
              </label>
              <input
                type="text"
                required
                value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value })}
                placeholder="Ex: République Démocratique du Congo"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Live Preview of Header Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Aperçu affiché dans l'en-tête (Navbar)
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {[form.city, form.province, form.country].filter(Boolean).join(' – ') || 'Non défini'}
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-1 rounded">
              Ville – Province – Pays
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Coordonnées de l'École</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Adresse Physique
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Ex: Avenue de la Justice, Commune de Gombe"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Téléphone de Contact
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="Ex: +243 81 000 0000"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Email Officiel
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Ex: direction@ecole.cd"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {onNavigateToUsers ? (
            <button
              type="button"
              onClick={onNavigateToUsers}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Gérer les Utilisateurs & Rôles
            </button>
          ) : <div />}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};
