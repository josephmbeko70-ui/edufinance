import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Filter,
  Eye,
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Sparkles,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import { Student, ClassItem, OptionItem, StudentCharge, Payment, School } from '../types';
import { formatCurrency, exportToCSV } from '../utils/formatters';
import { SchoolService } from '../services/schoolService';
import { useAuth } from '../context/AuthContext';
import { canSelectOption } from '../utils/academic';

interface StudentsPageProps {
  school: School;
  students: Student[];
  classes: ClassItem[];
  options: OptionItem[];
  charges: StudentCharge[];
  payments: Payment[];
  onSelectStudent: (student: Student) => void;
  onOpenPaymentModal: (student: Student) => void;
  onRefreshData: () => Promise<void>;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  school,
  students,
  classes,
  options,
  charges,
  payments,
  onSelectStudent,
  onOpenPaymentModal,
  onRefreshData,
}) => {
  const { schoolId, currentUser, profile, role } = useAuth();
  const currency = school.currency || 'CDF';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Student Transfer State
  const [studentToTransfer, setStudentToTransfer] = useState<Student | null>(null);
  const [transferClassId, setTransferClassId] = useState<string>('');
  const [transferOptionId, setTransferOptionId] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // New Student Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    gender: 'M' | 'F';
    dateOfBirth: string;
    placeOfBirth: string;
    classId: string;
    optionId: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    address: string;
  }>({
    firstName: '',
    lastName: '',
    gender: 'M',
    dateOfBirth: '2010-01-01',
    placeOfBirth: 'Kinshasa',
    classId: classes[0]?.id || '',
    optionId: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
  });

  // Calculate student balance helper
  const getStudentFinancials = (studentId: string) => {
    const studentCharges = charges.filter(c => c.studentId === studentId && c.status !== 'cancelled');
    const studentPayments = payments.filter(p => p.studentId === studentId && p.status === 'posted');
    const totalBilled = studentCharges.reduce((acc, c) => acc + c.netAmount, 0);
    const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, totalBilled - totalPaid);

    let status: 'in_rule' | 'partial' | 'late' = 'in_rule';
    if (remaining > 0) {
      const hasOverdue = studentCharges.some(c => c.status === 'overdue' || (c.status === 'pending' && c.dueDate < new Date().toISOString().split('T')[0]));
      status = hasOverdue ? 'late' : 'partial';
    }
    return { totalBilled, totalPaid, remaining, status };
  };

  // Filtered list
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parentPhone.includes(searchTerm) ||
      s.parentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.firstName || !formData.classId) return;

    setSaving(true);
    try {
      const cls = classes.find(c => c.id === formData.classId);
      const opt = options.find(o => o.id === formData.optionId);

      await SchoolService.saveStudent(
        schoolId,
        {
          ...formData,
          className: cls?.name || '',
          optionName: opt?.name || '',
        },
        currentUser?.uid || 'admin',
        currentUser?.email || profile?.email || 'admin@ecole.cd'
      );

      await onRefreshData();
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        gender: 'M',
        dateOfBirth: '2010-01-01',
        placeOfBirth: 'Kinshasa',
        classId: classes[0]?.id || '',
        optionId: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du dossier élève.');
    } finally {
      setSaving(false);
    }
  };

  const handleClassChange = (newClassId: string) => {
    const cls = classes.find(c => c.id === newClassId);
    const eligible = cls ? canSelectOption(cls.section, cls.level, cls.name) : false;
    setFormData(prev => ({
      ...prev,
      classId: newClassId,
      optionId: eligible ? (cls?.optionId || prev.optionId) : '',
    }));
  };

  const handleConfirmPermanentDelete = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      await SchoolService.deleteStudentPermanently(
        schoolId,
        studentToDelete.id,
        currentUser?.uid || 'admin',
        currentUser?.email || profile?.email || 'admin@ecole.cd'
      );
      await onRefreshData();
      setStudentToDelete(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression définitive de l'élève");
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleOpenTransferModal = (student: Student) => {
    setStudentToTransfer(student);
    const otherClass = classes.find(c => c.id !== student.classId) || classes[0];
    const initialClassId = otherClass ? otherClass.id : student.classId;
    setTransferClassId(initialClassId);

    const targetCls = classes.find(c => c.id === initialClassId);
    if (targetCls && canSelectOption(targetCls.section, targetCls.level)) {
      setTransferOptionId(student.optionId || targetCls.optionId || options[0]?.id || '');
    } else {
      setTransferOptionId('');
    }
    setTransferReason('');
  };

  const handleTransferClassChange = (newClassId: string) => {
    setTransferClassId(newClassId);
    const targetCls = classes.find(c => c.id === newClassId);
    if (targetCls && canSelectOption(targetCls.section, targetCls.level)) {
      setTransferOptionId(studentToTransfer?.optionId || targetCls.optionId || options[0]?.id || '');
    } else {
      setTransferOptionId('');
    }
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToTransfer || !transferClassId) return;

    setTransferring(true);
    try {
      const destCls = classes.find(c => c.id === transferClassId);
      const isEligible = destCls ? canSelectOption(destCls.section, destCls.level) : false;
      const effectiveOptionId = isEligible ? transferOptionId : '';

      await SchoolService.transferStudent(
        schoolId,
        studentToTransfer.id,
        transferClassId,
        effectiveOptionId,
        transferReason,
        currentUser?.uid || 'admin',
        currentUser?.email || profile?.email || 'admin@ecole.cd'
      );

      await onRefreshData();
      setTransferSuccess(
        `L'élève ${studentToTransfer.lastName} ${studentToTransfer.firstName} a été transféré(e) avec succès vers la classe "${destCls?.name}".`
      );
      setStudentToTransfer(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors du transfert de l\'élève');
    } finally {
      setTransferring(false);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredStudents.map(s => {
      const fin = getStudentFinancials(s.id);
      return {
        Matricule: s.matricule,
        Nom: s.lastName,
        Prénom: s.firstName,
        Genre: s.gender,
        Classe: s.className,
        Option: s.optionName || '-',
        Parent: s.parentName,
        Téléphone: s.parentPhone,
        Total_Facturé: fin.totalBilled,
        Total_Payé: fin.totalPaid,
        Reste_Dû: fin.remaining,
        Avance_Crédit: s.creditAdvance || 0,
        Statut: s.status,
      };
    });
    exportToCSV(`eleves_${school.name.replace(/\s+/g, '_')}`, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Gestion des Élèves & Dossiers Scolaires
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {students.length} élèves enregistrés · Effectif actif :{' '}
            {students.filter(s => s.status === 'active').length}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>

          {['admin', 'director', 'secretary'].includes(role) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Inscrire un Élève
            </button>
          )}
        </div>
      </div>

      {/* Transfer success alert */}
      {transferSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{transferSuccess}</span>
          </div>
          <button
            onClick={() => setTransferSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule, parent..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
          >
            <option value="all">Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="transferred">Transféré</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
      </div>

      {/* Students Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Matricule</th>
                <th className="py-3 px-4">Élève</th>
                <th className="py-3 px-4">Classe & Option</th>
                <th className="py-3 px-4">Tuteur / Téléphone</th>
                <th className="py-3 px-4 text-right">Total Facturé</th>
                <th className="py-3 px-4 text-right">Reste à Payer</th>
                <th className="py-3 px-4 text-center">Situation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun élève ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const fin = getStudentFinancials(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-700">
                        {student.matricule}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 uppercase">
                          {student.lastName} {student.firstName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Genre : {student.gender === 'M' ? 'Masculin' : 'Féminin'} · Inscrit le {student.enrollmentDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {student.className || 'Non assigné'}
                        </span>
                        {student.optionName && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                            {student.optionName}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{student.parentName || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{student.parentPhone || '-'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(fin.totalBilled, currency)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold ${
                            fin.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatCurrency(fin.remaining, currency)}
                        </span>
                        {student.creditAdvance > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            Avance : +{formatCurrency(student.creditAdvance, currency)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {fin.remaining === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3 h-3" />
                            En règle
                          </span>
                        ) : fin.status === 'late' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" />
                            En retard
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            Partiel
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenPaymentModal(student)}
                            title="Encaisser paiement"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectStudent(student)}
                            title="Consulter le dossier complet"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Dossier
                          </button>
                          {['admin', 'director', 'secretary'].includes(role) && (
                            <button
                              onClick={() => handleOpenTransferModal(student)}
                              title="Transférer l'élève vers une autre classe (avec changement d'option éventuel)"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          {['admin', 'director'].includes(role) && (
                            <button
                              onClick={() => setStudentToDelete(student)}
                              title="Supprimer définitivement cet élève de la liste de la classe"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Student Registration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Inscription d'un Nouvel Élève</h3>
                <p className="text-xs text-slate-400">Le matricule officiel sera généré automatiquement</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Nom de Famille *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: Kalonji"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Jonathan"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Genre *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date de Naissance
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Lieu de Naissance
                  </label>
                  <input
                    type="text"
                    value={formData.placeOfBirth}
                    onChange={e => setFormData({ ...formData, placeOfBirth: e.target.value })}
                    placeholder="Kinshasa"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Classe *
                  </label>
                  <select
                    required
                    value={formData.classId}
                    onChange={e => handleClassChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Option / Filière
                  </label>
                  {(() => {
                    const selCls = classes.find(c => c.id === formData.classId);
                    const isEligible = selCls
                      ? canSelectOption(selCls.section, selCls.level, selCls.name)
                      : false;

                    if (isEligible) {
                      return (
                        <div>
                          <select
                            value={formData.optionId}
                            onChange={e => setFormData({ ...formData, optionId: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                          >
                            <option value="">Aucune option / Non spécifiée</option>
                            {options.map(o => (
                              <option key={o.id} value={o.id}>
                                {o.name} ({o.section})
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                            ✓ {selCls?.name} : choix d'option disponible ({selCls?.level} Secondaire).
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-500">
                        <span className="font-semibold block text-slate-700">Tronc commun</span>
                        Les options débutent en 1ère, 2è, 3è et 4è section Secondaire.
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase block mb-2">
                  Parent / Tuteur Légal
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Nom du Parent *</label>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="M. ou Mme..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Téléphone Parent *</label>
                    <input
                      type="text"
                      required
                      value={formData.parentPhone}
                      onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="+243 81 000 0000"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
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
                  {saving ? 'Enregistrement...' : 'Créer le Dossier Élève'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Permanent Delete Student */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Suppression Définitive de l'Élève
              </h3>
              <button
                onClick={() => setStudentToDelete(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Êtes-vous certain de vouloir supprimer définitivement l'élève{' '}
                <strong className="text-slate-900 uppercase">
                  {studentToDelete.lastName} {studentToDelete.firstName}
                </strong>{' '}
                (Matricule : <strong className="font-mono">{studentToDelete.matricule}</strong>) de la liste de la classe{' '}
                <strong className="text-indigo-700">{studentToDelete.className || 'Non assignée'}</strong> ?
              </p>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
                <p className="font-bold">⚠️ Action irréversible :</p>
                <p>
                  L'élève sera définitivement retiré de la liste de la classe et son dossier sera supprimé de la base de données de l'école.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={deletingStudent}
                  onClick={handleConfirmPermanentDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {deletingStudent ? 'Suppression en cours...' : 'Supprimer Définitivement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transfer Student between Classes & Options */}
      {studentToTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                  Transfert de Classe & d'Option
                </h3>
                <p className="text-xs text-slate-400">
                  Déplacez l'élève vers une nouvelle classe avec adaptation de l'option
                </p>
              </div>
              <button
                onClick={() => setStudentToTransfer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-6 space-y-4">
              {/* Current Student Profile Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Élève concerné
                  </div>
                  <div className="text-xs font-bold text-slate-900 uppercase">
                    {studentToTransfer.lastName} {studentToTransfer.firstName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Matricule : {studentToTransfer.matricule}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">
                    Classe actuelle
                  </div>
                  <div className="text-xs font-bold text-indigo-700">
                    {studentToTransfer.className || 'Non assignée'}
                  </div>
                  {studentToTransfer.optionName && (
                    <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                      {studentToTransfer.optionName}
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Class Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Nouvelle Classe de Destination *
                </label>
                <select
                  required
                  value={transferClassId}
                  onChange={(e) => handleTransferClassChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="" disabled>-- Sélectionner la nouvelle classe --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.section} · {cls.level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Option Selection (Conditional based on level & section) */}
              {(() => {
                const destCls = classes.find((c) => c.id === transferClassId);
                const isEligible = destCls ? canSelectOption(destCls.section, destCls.level) : false;

                if (isEligible) {
                  return (
                    <div className="space-y-1.5 p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-indigo-900 uppercase">
                          Choix de l'Option / Filière (Secondaire)
                        </label>
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                          1ère à 4è Secondaire
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700">
                        Cette classe autorise une spécialité académique. Vous pouvez changer l'option de l'élève ou laisser sans option.
                      </p>
                      <select
                        value={transferOptionId}
                        onChange={(e) => setTransferOptionId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="">-- Sans option spécifique --</option>
                        {options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} ({opt.section})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                } else if (destCls) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Section sans option :</div>
                        <div className="text-[11px] text-amber-700 mt-0.5">
                          Pour la classe <strong>{destCls.name}</strong> ({destCls.section} · {destCls.level}), les options ne sont pas applicables (réservées aux 1ère, 2è, 3è et 4è du Secondaire). L'option de l'élève sera réinitialisée.
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Motif / Commentaire */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Motif ou Note Administrative (Facultatif)
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Réorientation de filière, passage de classe, décision rectorat..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentToTransfer(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferClassId}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {transferring ? 'Transfert en cours...' : 'Valider le Transfert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
