import React, { useState, useEffect } from 'react';
import { X, CreditCard, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Student, StudentCharge, PaymentMethod, Receipt, Payment } from '../../types';
import { formatCurrency, getPaymentMethodLabel } from '../../utils/formatters';
import { SchoolService } from '../../services/schoolService';
import { useAuth } from '../../context/AuthContext';

interface PaymentModalProps {
  student: Student;
  charges: StudentCharge[];
  currency: string;
  onSuccess: (payment: Payment, receipt: Receipt) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  student,
  charges,
  currency,
  onSuccess,
  onClose,
}) => {
  const { schoolId, currentUser, profile } = useAuth();
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState<string>('');
  const [allocations, setAllocations] = useState<{ [chargeId: string]: number }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter charges that have a balance due
  const unpaidCharges = charges.filter(c => c.status !== 'paid' && c.status !== 'cancelled');

  // Auto-distribute payment across oldest/highest priority charges
  const handleAutoDistribute = (totalToDistribute: number) => {
    let remaining = totalToDistribute;
    const newAllocations: { [chargeId: string]: number } = {};

    for (const c of unpaidCharges) {
      const dueOnFee = Math.max(0, c.netAmount - c.paidAmount);
      if (remaining <= 0) {
        newAllocations[c.id] = 0;
      } else if (remaining >= dueOnFee) {
        newAllocations[c.id] = dueOnFee;
        remaining -= dueOnFee;
      } else {
        newAllocations[c.id] = remaining;
        remaining = 0;
      }
    }
    setAllocations(newAllocations);
  };

  const handleAmountChange = (val: number) => {
    setAmount(val);
    handleAutoDistribute(val);
  };

  const handleManualAllocationChange = (chargeId: string, allocVal: number) => {
    setAllocations(prev => ({
      ...prev,
      [chargeId]: allocVal,
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const advanceAmount = Math.max(0, amount - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount <= 0) {
      setErrorMessage('Veuillez entrer un montant supérieur à zéro.');
      return;
    }

    if (totalAllocated > amount) {
      setErrorMessage('La somme des affectations dépasse le montant total saisi.');
      return;
    }

    // Check individual allocations
    for (const [chargeId, alloc] of Object.entries(allocations)) {
      if (alloc <= 0) continue;
      const chg = unpaidCharges.find(c => c.id === chargeId);
      if (chg) {
        const remainingOnCharge = Math.max(0, chg.netAmount - chg.paidAmount);
        if (alloc > remainingOnCharge) {
          setErrorMessage(`L'affectation pour "${chg.label}" (${alloc}) dépasse le reste dû (${remainingOnCharge}).`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const activeAllocations = Object.entries(allocations)
        .filter(([, val]) => val > 0)
        .map(([chargeId, val]) => {
          const chg = unpaidCharges.find(c => c.id === chargeId);
          return {
            chargeId,
            amount: val,
            label: chg?.label || 'Frais scolaire',
          };
        });

      const { payment, receipt } = await SchoolService.recordPayment(
        schoolId,
        student,
        amount,
        paymentMethod,
        activeAllocations,
        note,
        currency,
        currentUser?.uid || 'user_cashier',
        currentUser?.email || profile?.email || 'caissier@ecole.cd',
        profile?.displayName || 'Caissier Principal'
      );

      onSuccess(payment, receipt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue lors du paiement.';
      setErrorMessage(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Enregistrer un Paiement d'Élève</h3>
              <p className="text-xs text-slate-400">
                {student.lastName} {student.firstName} · Matricule : {student.matricule} · {student.className}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-sm text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Student current credit advance banner */}
          {student.creditAdvance > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex justify-between items-center">
              <span>Cet élève dispose d'un crédit d'avance préalable de :</span>
              <strong className="text-sm font-semibold">{formatCurrency(student.creditAdvance, currency)}</strong>
            </div>
          )}

          {/* Payment Amount & Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Montant Reçu ({currency}) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount || ''}
                onChange={e => handleAmountChange(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 85000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mode de Paiement *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              >
                <option value="cash">{getPaymentMethodLabel('cash')}</option>
                <option value="mobile_money">{getPaymentMethodLabel('mobile_money')}</option>
                <option value="bank_transfer">{getPaymentMethodLabel('bank_transfer')}</option>
                <option value="check">{getPaymentMethodLabel('check')}</option>
                <option value="card">{getPaymentMethodLabel('card')}</option>
              </select>
            </div>
          </div>

          {/* Fee Allocations Breakdown Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Affectation aux Frais ({unpaidCharges.length} ligne(s) impayée(s))
              </span>
              <button
                type="button"
                onClick={() => handleAutoDistribute(amount)}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ventilation Automatique
              </button>
            </div>

            {unpaidCharges.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                Cet élève est en règle pour tous ses frais facturés ! Tout montant versé sera crédité en tant
                qu'<strong>avance</strong>.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Frais / Échéance</th>
                      <th className="py-2.5 px-2 text-right">Net Dû</th>
                      <th className="py-2.5 px-2 text-right">Reste à Payer</th>
                      <th className="py-2.5 px-3 text-right">Montant Alloué</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidCharges.map(charge => {
                      const remaining = Math.max(0, charge.netAmount - charge.paidAmount);
                      const currentAlloc = allocations[charge.id] || 0;
                      return (
                        <tr key={charge.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">{charge.label}</span>
                            <span className="text-[11px] text-slate-400">Échéance : {charge.dueDate}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            {formatCurrency(charge.netAmount, currency)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-rose-600">
                            {formatCurrency(remaining, currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              step="any"
                              value={currentAlloc || ''}
                              onChange={e =>
                                handleManualAllocationChange(charge.id, parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-24 text-right px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-indigo-600 outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Allocation summary row */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-slate-500">Total Affecté aux frais :</span>{' '}
              <strong className="text-slate-800 font-semibold">{formatCurrency(totalAllocated, currency)}</strong>
            </div>
            {advanceAmount > 0 && (
              <div className="text-right space-y-1">
                <span className="text-indigo-600 font-medium">Surplus / Avance reportée :</span>{' '}
                <strong className="text-emerald-600 font-semibold">+{formatCurrency(advanceAmount, currency)}</strong>
              </div>
            )}
          </div>

          {/* Note / Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Note interne ou Référence bordereau (facultatif)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: N° Bordereau Rawbank 492819 / Reçu caisse"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting || amount <= 0}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Validation & Émission du reçu...' : 'Valider & Émettre le Reçu'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
