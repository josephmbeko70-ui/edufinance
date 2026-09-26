import React, { useState } from 'react';
import { Plus, Layers, Edit3, Tag, DollarSign, Check, X } from 'lucide-react';
import { FeeType, FeeFrequency, ClassItem, School } from '../types';
import { formatCurrency } from '../utils/formatters';
import { SchoolService } from '../services/schoolService';
import { useAuth } from '../context/AuthContext';

interface FeeCatalogPageProps {
  school: School;
  feeTypes: FeeType[];
  classes: ClassItem[];
  onRefreshData: () => Promise<void>;
}

export const FeeCatalogPage: React.FC<FeeCatalogPageProps> = ({
  school,
  feeTypes,
  classes,
  onRefreshData,
}) => {
  const { schoolId, currentUser, profile, role } = useAuth();
  const currency = school.currency || 'CDF';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    description: string;
    amount: number;
    frequency: FeeFrequency;
    classId: string;
  }>({
    name: '',
    description: '',
    amount: 50000,
    frequency: 'monthly',
    classId: '',
  });

  const getFrequencyLabel = (freq: FeeFrequency) => {
    switch (freq) {
      case 'monthly':
        return 'Mensuel';
      case 'termly':
        return 'Trimestriel';
      case 'annual':
        return 'Annuel';
      case 'once':
        return 'Unique';
      default:
        return freq;
    }
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.amount <= 0) return;

    setSaving(true);
    try {
      await SchoolService.saveFeeType(
        schoolId,
        formData,
        currentUser?.uid || 'admin',
        currentUser?.email || profile?.email || 'admin@ecole.cd'
      );
      await onRefreshData();
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        amount: 50000,
        frequency: 'monthly',
        classId: '',
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde du frais');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Catalogue des Frais Scolaires
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Paramétrez la grille tarifaire : minerval, inscriptions, laboratoires, examens d'État, transports
          </p>
        </div>

        {['admin', 'director'].includes(role) && (
          <button
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                amount: 50000,
                frequency: 'monthly',
                classId: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Type de Frais
          </button>
        )}
      </div>

      {/* Grid of Fees */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeTypes.map(fee => {
          const targetClass = classes.find(c => c.id === fee.classId);

          return (
            <div
              key={fee.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                      Fréquence : {getFrequencyLabel(fee.frequency)}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{fee.name}</h3>
                  </div>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrency(fee.amount, currency)}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  {fee.description || 'Frais applicable aux élèves scolarisés'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Périmètre :</span>{' '}
                  <strong className="text-slate-800">
                    {targetClass ? `Réservé à ${targetClass.name}` : 'Toutes les classes de l\'établissement'}
                  </strong>
                </div>
              </div>

              {['admin', 'director'].includes(role) && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setFormData({
                        id: fee.id,
                        name: fee.name,
                        description: fee.description || '',
                        amount: fee.amount,
                        frequency: fee.frequency,
                        classId: fee.classId || '',
                      });
                      setIsModalOpen(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifier
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {formData.id ? 'Modifier le Frais' : 'Nouveau Frais au Catalogue'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Intitulé du Frais *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Minerval - Octobre 2026 / Frais Laboratoire"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Montant ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Périodicité *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value as FeeFrequency })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="monthly">Mensuel</option>
                    <option value="termly">Trimestriel</option>
                    <option value="annual">Annuel</option>
                    <option value="once">Unique</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Classe Cible (laisser vide pour toutes)
                </label>
                <select
                  value={formData.classId}
                  onChange={e => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description / Justificatif
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails d'affectation pour les parents..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
