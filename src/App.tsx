import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { Navbar } from './components/common/Navbar';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { ClassesPage } from './pages/ClassesPage';
import { SectionsPage } from './pages/SectionsPage';
import { OptionsPage } from './pages/OptionsPage';
import { FeeCatalogPage } from './pages/FeeCatalogPage';
import { BillingPage } from './pages/BillingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { CashRegisterPage } from './pages/CashRegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { FinancialTestsPage } from './pages/FinancialTestsPage';
import { ReceiptModal } from './components/common/ReceiptModal';
import { PaymentModal } from './components/common/PaymentModal';
import { SchoolService } from './services/schoolService';
import { seedInitialDemoData } from './services/seedData';
import {
  School,
  Student,
  UserProfile,
  SectionItem,
  ClassItem,
  OptionItem,
  FeeType,
  StudentCharge,
  Payment,
  CashOperation,
  AuditLog,
  Receipt,
} from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { currentUser, profile, loading: authLoading, schoolId, role } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Entities
  const [school, setSchool] = useState<School | null>(null);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [charges, setCharges] = useState<StudentCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashOperations, setCashOperations] = useState<CashOperation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Navigation / Modal States
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [studentForPayment, setStudentForPayment] = useState<Student | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);

  // Load only the datasets needed by the current workspace.
  // This avoids downloading the entire school database every time the app opens
  // or a page requests a refresh.
  const fetchInFlightRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return fetchInFlightRef.current;
    }

    const request = (async () => {
      try {
        // School settings are lightweight and needed by every workspace.
        const schoolData = await SchoolService.getSchool(schoolId);
        setSchool(schoolData);

        if (!schoolData || schoolData.status !== 'active') {
          return;
        }

        switch (activeTab) {
          case 'dashboard': {
            const [studentsData, chargesData, paymentsData] = await Promise.all([
              SchoolService.getStudents(schoolId),
              SchoolService.getCharges(schoolId),
              SchoolService.getPayments(schoolId),
            ]);
            setStudents(studentsData || []);
            setCharges(chargesData || []);
            setPayments(paymentsData || []);
            break;
          }
          case 'students': {
            const [studentsData, classesData, optionsData, chargesData, paymentsData] = await Promise.all([
              SchoolService.getStudents(schoolId),
              SchoolService.getClasses(schoolId),
              SchoolService.getOptions(schoolId),
              SchoolService.getCharges(schoolId),
              SchoolService.getPayments(schoolId),
            ]);
            setStudents(studentsData || []);
            setClasses(classesData || []);
            setOptions(optionsData || []);
            setCharges(chargesData || []);
            setPayments(paymentsData || []);
            break;
          }
          case 'classes': {
            const [classesData, sectionsData, optionsData, studentsData] = await Promise.all([
              SchoolService.getClasses(schoolId),
              SchoolService.getSections(schoolId),
              SchoolService.getOptions(schoolId),
              SchoolService.getStudents(schoolId),
            ]);
            setClasses(classesData || []);
            setSections(sectionsData || []);
            setOptions(optionsData || []);
            setStudents(studentsData || []);
            break;
          }
          case 'sections': {
            const [sectionsData, classesData, studentsData] = await Promise.all([
              SchoolService.getSections(schoolId),
              SchoolService.getClasses(schoolId),
              SchoolService.getStudents(schoolId),
            ]);
            setSections(sectionsData || []);
            setClasses(classesData || []);
            setStudents(studentsData || []);
            break;
          }
          case 'options': {
            const [optionsData, classesData, studentsData] = await Promise.all([
              SchoolService.getOptions(schoolId),
              SchoolService.getClasses(schoolId),
              SchoolService.getStudents(schoolId),
            ]);
            setOptions(optionsData || []);
            setClasses(classesData || []);
            setStudents(studentsData || []);
            break;
          }
          case 'fees': {
            const [feeTypesData, classesData] = await Promise.all([
              SchoolService.getFeeTypes(schoolId),
              SchoolService.getClasses(schoolId),
            ]);
            setFeeTypes(feeTypesData || []);
            setClasses(classesData || []);
            break;
          }
          case 'billing': {
            const [chargesData, classesData, feeTypesData, studentsData] = await Promise.all([
              SchoolService.getCharges(schoolId),
              SchoolService.getClasses(schoolId),
              SchoolService.getFeeTypes(schoolId),
              SchoolService.getStudents(schoolId),
            ]);
            setCharges(chargesData || []);
            setClasses(classesData || []);
            setFeeTypes(feeTypesData || []);
            setStudents(studentsData || []);
            break;
          }
          case 'payments': {
            const [paymentsData, studentsData, chargesData] = await Promise.all([
              SchoolService.getPayments(schoolId),
              SchoolService.getStudents(schoolId),
              SchoolService.getCharges(schoolId),
            ]);
            setPayments(paymentsData || []);
            setStudents(studentsData || []);
            setCharges(chargesData || []);
            break;
          }
          case 'cash': {
            const cashData = await SchoolService.getCashOperations(schoolId);
            setCashOperations(cashData || []);
            break;
          }
          case 'reports': {
            const [studentsData, chargesData, paymentsData, classesData, feeTypesData] = await Promise.all([
              SchoolService.getStudents(schoolId),
              SchoolService.getCharges(schoolId),
              SchoolService.getPayments(schoolId),
              SchoolService.getClasses(schoolId),
              SchoolService.getFeeTypes(schoolId),
            ]);
            setStudents(studentsData || []);
            setCharges(chargesData || []);
            setPayments(paymentsData || []);
            setClasses(classesData || []);
            setFeeTypes(feeTypesData || []);
            break;
          }
          case 'audit': {
            const auditData = await SchoolService.getAuditLogs(schoolId);
            setAuditLogs(auditData || []);
            break;
          }
          case 'users': {
            const usersData = await SchoolService.getUsers(schoolId);
            setUsers(usersData || []);
            break;
          }
          case 'settings':
            break;
          case 'tests': {
            const [studentsData, chargesData, paymentsData] = await Promise.all([
              SchoolService.getStudents(schoolId),
              SchoolService.getCharges(schoolId),
              SchoolService.getPayments(schoolId),
            ]);
            setStudents(studentsData || []);
            setCharges(chargesData || []);
            setPayments(paymentsData || []);
            break;
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();

    fetchInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (fetchInFlightRef.current === request) {
        fetchInFlightRef.current = null;
      }
    }
  }, [schoolId, activeTab]);

  useEffect(() => {
    if (currentUser && !currentUser.isAnonymous && profile && profile.schoolId === schoolId && schoolId) {
      setLoading(true);
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Demo data is opt-in. Never auto-seed an empty production school:
  // doing so can trigger extra writes and repeated full-dataset reads.
  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedInitialDemoData(schoolId);
      await fetchData();
      alert('Données de démonstration chargées avec succès !');
    } catch (err) {
      console.error(err);
      alert('Erreur lors du chargement des données démo.');
    } finally {
      setSeeding(false);
    }
  };

  // Open Payment modal helper
  const handleOpenPaymentModal = (student?: Student) => {
    if (student) {
      setStudentForPayment(student);
    } else if (students.length > 0) {
      setStudentForPayment(students[0]);
    } else {
      alert('Veuillez d\'abord inscrire ou sélectionner un élève.');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>;
  }

  if (!currentUser || currentUser.isAnonymous) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="text-sm font-medium text-slate-300">
          Chargement de l'espace financier EduFinance Pro...
        </p>
      </div>
    );
  }

  if (school && school.status !== 'active') {
    const pending = school.status === 'pending';
    return (
      <div className="min-h-screen bg-[#07101f] text-white overflow-x-hidden">
        <div className="min-h-screen flex items-center justify-center px-5 py-12 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/[.05] p-8 md:p-10 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-300"><Loader2 className="w-7 h-7" /></div>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-indigo-300">EduFinance · Votre établissement</p>
            <h1 className="mt-3 text-3xl font-bold">{pending ? 'Demande en cours de validation' : 'Demande non approuvée'}</h1>
            <p className="mt-4 text-slate-400 leading-7">{pending ? 'Votre établissement a bien été enregistré. L’équipe EduFinance doit encore valider votre demande avant l’ouverture de l’espace financier.' : 'Cet établissement n’est pas actif. L’espace financier reste fermé tant que la demande n’a pas été approuvée.'}</p>
            <div className="mt-7 rounded-2xl border border-white/10 bg-black/10 p-4"><p className="text-sm font-semibold">{school.name}</p><p className="mt-1 text-xs text-slate-500">Statut : {pending ? 'En attente de validation' : 'Rejeté'}</p></div>
          </div>
        </div>
      </div>
    );
  }

  // Aucune école fictive : l'espace financier ne s'ouvre que lorsque
  // AuthContext a résolu une école active réelle depuis userSchoolLinks/{uid}.
  if (!profile || !schoolId || profile.schoolId !== schoolId || !school) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm">Vérification de votre établissement...</p>
        </div>
      </div>
    );
  }

  const currentSchool: School = school;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        school={currentSchool}
        onSeedData={handleSeedData}
        seeding={seeding}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setSelectedStudentForDetail(null);
            setActiveTab(tab);
          }}
          role={role}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto">
          {/* If an individual student dossier is open */}
          {selectedStudentForDetail ? (
            <StudentDetailPage
              student={selectedStudentForDetail}
              school={currentSchool}
              classes={classes}
              options={options}
              charges={charges}
              payments={payments}
              onBack={() => setSelectedStudentForDetail(null)}
              onOpenPaymentModal={handleOpenPaymentModal}
              onViewReceipt={(receipt) => setActiveReceipt(receipt)}
              onRefreshData={fetchData}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardPage
                  school={currentSchool}
                  students={students}
                  charges={charges}
                  payments={payments}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  onNavigateTo={(tab) => setActiveTab(tab)}
                  onViewReceipt={(receipt) => setActiveReceipt(receipt)}
                />
              )}

              {activeTab === 'students' && (
                <StudentsPage
                  school={currentSchool}
                  students={students}
                  classes={classes}
                  options={options}
                  charges={charges}
                  payments={payments}
                  onSelectStudent={(student) => setSelectedStudentForDetail(student)}
                  onOpenPaymentModal={handleOpenPaymentModal}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'classes' && (
                <ClassesPage
                  school={currentSchool}
                  classes={classes}
                  sections={sections}
                  options={options}
                  students={students}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'sections' && (
                <SectionsPage
                  school={currentSchool}
                  sections={sections}
                  classes={classes}
                  students={students}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'options' && (
                <OptionsPage
                  school={currentSchool}
                  options={options}
                  classes={classes}
                  students={students}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'fees' && (
                <FeeCatalogPage
                  school={currentSchool}
                  feeTypes={feeTypes}
                  classes={classes}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'billing' && (
                <BillingPage
                  school={currentSchool}
                  charges={charges}
                  classes={classes}
                  feeTypes={feeTypes}
                  students={students}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'payments' && (
                <PaymentsPage
                  school={currentSchool}
                  payments={payments}
                  students={students}
                  onOpenPaymentModal={() => handleOpenPaymentModal()}
                  onViewReceipt={(receipt) => setActiveReceipt(receipt)}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'cash' && (
                <CashRegisterPage
                  school={currentSchool}
                  cashOperations={cashOperations}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsPage
                  school={currentSchool}
                  students={students}
                  charges={charges}
                  payments={payments}
                  classes={classes}
                  feeTypes={feeTypes}
                />
              )}

              {activeTab === 'audit' && (
                <AuditPage
                  school={currentSchool}
                  auditLogs={auditLogs}
                />
              )}

              {activeTab === 'users' && (
                <UsersPage
                  school={currentSchool}
                  users={users}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsPage
                  school={currentSchool}
                  onRefreshData={fetchData}
                  onNavigateToUsers={() => setActiveTab('users')}
                />
              )}

              {activeTab === 'tests' && (
                <FinancialTestsPage
                  school={currentSchool}
                  students={students}
                  charges={charges}
                  payments={payments}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Payment Modal */}
      {studentForPayment && (
        <PaymentModal
          student={studentForPayment}
          charges={charges.filter(c => c.studentId === studentForPayment.id)}
          currency={currentSchool.currency || 'CDF'}
          onSuccess={async (_payment, receipt) => {
            setStudentForPayment(null);
            await fetchData();
            setActiveReceipt(receipt);
          }}
          onClose={() => setStudentForPayment(null)}
        />
      )}

      {/* Official Receipt Modal (Print & PDF) */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          school={currentSchool}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
