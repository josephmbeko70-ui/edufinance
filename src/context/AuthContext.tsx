import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  schoolId: string;
  role: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  setSchoolId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const DEFAULT_SCHOOL_ID = 'school_college_boboto';
const ADMIN_CONSOLE_URL = 'https://josephmbeko70-ui.github.io/edufinance-admin/?v=20260928';

type AdminRecord = { role?: string; active?: boolean };

const redirectSuperAdminIfAuthorized = async (user: FirebaseUser): Promise<boolean> => {
  console.log('========== EDUFINANCE ADMIN DIAGNOSTIC ==========');
  console.log('Firebase email:', user.email);
  console.log('Firebase UID:', user.uid);
  console.log('isAnonymous:', user.isAnonymous);
  console.log('emailVerified:', user.emailVerified);

  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    console.log('Document admins existe:', adminSnap.exists());
    if (!adminSnap.exists()) return false;

    const admin = adminSnap.data() as AdminRecord;
    const isActiveBoolean = typeof admin.active === 'boolean';
    const isActive = admin.active === true;
    const isSuperAdmin = admin.role === 'super_admin';

    console.log('ADMIN ROLE:', admin.role);
    console.log('ADMIN ACTIVE:', admin.active);
    console.log('ADMIN ACTIVE TYPE:', typeof admin.active);
    console.log('ACTIVE EST BOOLEAN:', isActiveBoolean);
    console.log('ACTIVE === TRUE:', isActive);
    console.log('ROLE === SUPER_ADMIN:', isSuperAdmin);

    if (isActiveBoolean && isActive && isSuperAdmin) {
      console.log('RESULTAT: SUPER_ADMIN AUTORISÉ → redirection Admin.');
      window.location.replace(ADMIN_CONSOLE_URL);
      return true;
    }

    console.warn('ACCÈS ADMIN REFUSÉ.');
    return false;
  } catch (error) {
    console.error('ERREUR LECTURE admins:', error);
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolId, setSchoolId] = useState<string>(DEFAULT_SCHOOL_ID);
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(true);

  // Distinguishes a restored Firebase session from a login/signup action
  // that the user has just initiated from the Landing page.
  const initialAuthResolvedRef = React.useRef(false);
  const authActionRef = React.useRef<'login' | 'signup' | null>(null);

  const loadUserProfile = async (user: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'schools', schoolId, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      const role: UserRole = 'admin';

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        setActiveRole(data.role || role);
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          schoolId,
          email: user.email || 'utilisateur@ecole.cd',
          displayName: user.displayName || user.email?.split('@')[0] || 'Responsable Scolaire',
          role,
          active: true,
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(userDocRef, newProfile);
        } catch (error) {
          console.warn('Impossible de créer le profil utilisateur:', error);
        }

        setProfile(newProfile);
        setActiveRole(role);
      }
    } catch (error) {
      console.error('Erreur chargement profil utilisateur:', error);

      const fallbackProfile: UserProfile = {
        id: user.uid,
        schoolId,
        email: user.email || 'admin@ecole.cd',
        displayName: user.displayName || 'Administrateur',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      };

      setProfile(fallbackProfile);
      setActiveRole(fallbackProfile.role);
    }
  };

  const handleExplicitAuthUser = async (
    user: FirebaseUser,
    routeAdmin: boolean
  ) => {
    setLoading(true);
    setCurrentUser(user);

    if (routeAdmin) {
      const redirected = await redirectSuperAdminIfAuthorized(user);
      if (redirected) return;
    }

    await loadUserProfile(user);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      console.log('[EduFinance][AUTH] onAuthStateChanged:', {
        email: user?.email ?? null,
        uid: user?.uid ?? null,
        isAnonymous: user?.isAnonymous ?? null,
        providerData:
          user?.providerData?.map((provider) => ({
            providerId: provider.providerId,
            email: provider.email,
          })) ?? [],
      });

      // Firebase always emits an initial state. If this is a restored
      // session, keep the Landing page as the entry point.
      if (!initialAuthResolvedRef.current) {
        initialAuthResolvedRef.current = true;

        const action = authActionRef.current;

        if (!action) {
          setCurrentUser(null);
          setProfile(null);
          setActiveRole('admin');
          setLoading(false);
          return;
        }

        // A login/signup was already initiated before Firebase emitted
        // its first state. Do not erase the authenticated user.
        if (user) {
          authActionRef.current = null;
          await handleExplicitAuthUser(user, action === 'login');
          return;
        }
      }

      if (!user) {
        setCurrentUser(null);
        setProfile(null);
        setActiveRole('admin');
        setLoading(false);
        return;
      }

      // Subsequent auth events are allowed to update the local UI,
      // but they never trigger an automatic Admin redirect.
      setCurrentUser(user);
      await loadUserProfile(user);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [schoolId]);

  const signInWithGoogle = async () => {
    authActionRef.current = 'login';

    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);

      // If onAuthStateChanged already consumed the login, it cleared the
      // action ref. Otherwise handle the returned credential here.
      if (authActionRef.current === 'login') {
        authActionRef.current = null;
        await handleExplicitAuthUser(cred.user, true);
      }
    } catch (error) {
      authActionRef.current = null;
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, 'auth/google');
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    authActionRef.current = 'login';

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);

      if (authActionRef.current === 'login') {
        authActionRef.current = null;
        await handleExplicitAuthUser(cred.user, true);
      }
    } catch (error) {
      authActionRef.current = null;
      setLoading(false);
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'cashier'
  ) => {
    authActionRef.current = 'signup';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      if (authActionRef.current === 'signup') {
        authActionRef.current = null;

        const newProfile: UserProfile = {
          id: cred.user.uid,
          schoolId,
          email,
          displayName: name,
          role: cred.user.email === 'controlpolytra@gmail.com' ? 'admin' : role,
          active: true,
          createdAt: new Date().toISOString(),
        };

        await setDoc(
          doc(db, 'schools', schoolId, 'users', cred.user.uid),
          newProfile
        );

        setCurrentUser(cred.user);
        setProfile(newProfile);
        setActiveRole(newProfile.role);
        setLoading(false);
      }
    } catch (error) {
      authActionRef.current = null;
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    authActionRef.current = null;
    setCurrentUser(null);
    setProfile(null);
    setActiveRole('admin');
    setLoading(false);
  };

  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        schoolId,
        role: activeRole,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        switchRole,
        setSchoolId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
