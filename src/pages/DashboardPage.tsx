import React from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertOctagon,
  CreditCard,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Student, StudentCharge, Payment, School, Receipt } from '../types';
import { formatCurrency, formatDateTime, getPaymentMethodLabel, getPaymentStatusMeta } from '../utils/formatters';

interface DashboardPageProps {
  school: School;
  students: Student[];
  charges: StudentCharge[];
  payments: Payment[];
  onOpenPaymentModal: (student?: Student) => void;
  onNavigateTo: (tab: any) => void;
  onViewReceipt: (receipt: Receipt) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  school,
  students,
  charges,
  payments,
  onOpenPaymentModal,
  onNavigateTo,
  onViewReceipt,
}) => {
  const currency = school.currency || 'CDF';
  const today = new Date().toISOString().split('T')[0];

  // Financial calculations
  const totalBilled = charges.reduce((acc, c) => acc + (c.status !== 'cancelled' ? c.netAmount : 0), 0);
  const totalCollected = payments.reduce((acc, p) => acc + (p.status === 'posted' ? p.amount : 0), 0);
  const totalRemaining = Math.max(0, totalBilled - totalCollected);
  const totalAdvances = students.reduce((acc, s) => acc + (s.creditAdvance || 0), 0);

  const todayPayments = payments.filter(p => p.status === 'posted' && p.paymentDate === today);
  const todayInflow = todayPayments.reduce((acc, p) => acc + p.amount, 0);

  const recoveryRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  // Breakdown by payment method
  const methodTotals: { [key: string]: number } = {};
  payments.filter(p => p.status === 'posted').forEach(p => {
    methodTotals[p.paymentMethod] = (methodTotals[p.paymentMethod] || 0) + p.amount;
  });

  // Recent 6 transactions
  const recentPayments = [...payments]
    .filter(p => p.status === 'posted')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Overdue count
  const overdueCharges = charges.filter(c => c.status === 'overdue' || (c.status === 'pending' && c.dueDate < today));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Tableau de Bord Financier
          </span>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-0.5">
            {school.name} — Exercice {school.schoolYear}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {students.length} élèves inscrits · Taux de recouvrement global :{' '}
            <strong className="text-emerald-400">{recoveryRate}%</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenPaymentModal()}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Encaisser un Paiement
          </button>
          <button
            onClick={() => onNavigateTo('billing')}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            Échéancier & Factures
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Facturé"
          value={formatCurrency(totalBilled, currency)}
          subtitle={`${charges.length} obligations de frais`}
          highlightColor="indigo"
          icon={<DollarSign className="w-5 h-5" />}
        />

        <StatCard
          title="Total Encaissé"
          value={formatCurrency(totalCollected, currency)}
          trend={{ label: `${recoveryRate}% recouvré`, isPositive: recoveryRate >= 70 }}
          subtitle={`${payments.filter(p => p.status === 'posted').length} transactions validées`}
          highlightColor="emerald"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <StatCard
          title="Reste à Recouvrer"
          value={formatCurrency(totalRemaining, currency)}
          subtitle={`${overdueCharges.length} factures en retard`}
          highlightColor="rose"
          icon={<AlertOctagon className="w-5 h-5" />}
        />

        <StatCard
          title="Recette du Jour"
          value={formatCurrency(todayInflow, currency)}
          subtitle={`${todayPayments.length} encaissements aujourd'hui`}
          highlightColor="amber"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Secondary Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Élèves Actifs</div>
              <div className="text-lg font-bold text-slate-900">{students.filter(s => s.status === 'active').length}</div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTo('students')}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            Consulter
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Avances & Crédits Élèves</div>
              <div className="text-lg font-bold text-emerald-700">{formatCurrency(totalAdvances, currency)}</div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">Fonds en réserve</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Paiements par Mobile Money</div>
              <div className="text-lg font-bold text-slate-900">
                {formatCurrency(methodTotals['mobile_money'] || 0, currency)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">M-Pesa / Orange</span>
        </div>
      </div>

      {/* Middle Visual Section: Breakdown & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Derniers Encaissements & Reçus</h3>
              <p className="text-xs text-slate-500">Flux d'entrée en caisse en temps réel</p>
            </div>
            <button
              onClick={() => onNavigateTo('payments')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Voir tout ({payments.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">N° Reçu</th>
                  <th className="py-3 px-4">Élève & Classe</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucun paiement enregistré pour l'instant.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map(p => {
                    const statusMeta = getPaymentStatusMeta(p.status);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{p.studentName}</span>
                          <span className="text-[11px] text-slate-500">{p.className || p.matricule}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {getPaymentMethodLabel(p.paymentMethod)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(p.amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              // Fabricate instant receipt for viewing
                              const r: Receipt = {
                                id: `rec_${p.id}`,
                                schoolId: school.id,
                                receiptNumber: p.receiptNumber,
                                paymentId: p.id,
                                studentId: p.studentId,
                                studentName: p.studentName || 'Élève',
                                matricule: p.matricule || '-',
                                className: p.className || 'Classe',
                                amount: p.amount,
                                amountInWords: '',
                                currency,
                                paymentMethod: getPaymentMethodLabel(p.paymentMethod),
                                cashierName: p.createdByName || 'Caissier',
                                issuedAt: p.createdAt,
                              };
                              onViewReceipt(r);
                            }}
                            className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded font-medium transition-colors cursor-pointer"
                          >
                            Reçu
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Payment Methods Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Modes d'Encaissement</h3>
            <p className="text-xs text-slate-500 mb-4">Répartition des recettes validées</p>

            <div className="space-y-3">
              {[
                { key: 'cash', label: 'Espèces / Caisse', color: 'bg-emerald-500' },
                { key: 'mobile_money', label: 'Mobile Money', color: 'bg-amber-500' },
                { key: 'bank_transfer', label: 'Virement Bancaire', color: 'bg-indigo-500' },
                { key: 'check', label: 'Chèque', color: 'bg-slate-400' },
              ].map(m => {
                const total = methodTotals[m.key] || 0;
                const pct = totalCollected > 0 ? Math.round((total / totalCollected) * 100) : 0;
                return (
                  <div key={m.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{m.label}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(total, currency)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateTo('cash')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Consulter le Journal de Caisse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
