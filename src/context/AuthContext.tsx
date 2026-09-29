import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
} from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  schoolId: string;
  role: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (
    e: string,
    p: string,
    name: string,
    role?: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  setSchoolId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_SCHOOL_ID = 'school_college_boboto';

const ADMIN_CONSOLE_URL =
  'https://josephmbeko70-ui.github.io/edufinance-admin/?v=20260928';

type AdminRecord = {
  role?: string;
  active?: boolean;
};

/**
 * Vérifie si l'utilisateur est un super administrateur.
 * Si oui, redirige immédiatement vers l'espace Admin.
 */
const redirectSuperAdminIfAuthorized = async (
  user: FirebaseUser
): Promise<boolean> => {
  console.log('========== EDUFINANCE ADMIN DIAGNOSTIC ==========');
  console.log('Firebase email:', user.email);
  console.log('Firebase UID:', user.uid);
  console.log('isAnonymous:', user.isAnonymous);
  console.log('emailVerified:', user.emailVerified);

  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));

    console.log('Document admins existe:', adminSnap.exists());

    if (!adminSnap.exists()) {
      console.log('Aucun document admin pour cet utilisateur.');
      return false;
    }

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
      console.log(
        'RESULTAT: SUPER_ADMIN AUTORISÉ → redirection Admin.'
      );

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

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentUser, setCurrentUser] =
    useState<FirebaseUser | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [schoolId, setSchoolId] =
    useState<string>(DEFAULT_SCHOOL_ID);

  const [activeRole, setActiveRole] =
    useState<UserRole>('admin');

  const [loading, setLoading] = useState(true);

  /**
   * Permet de distinguer :
   *
   * 1. une session Firebase restaurée automatiquement
   * 2. une connexion réellement déclenchée par l'utilisateur
   */
  const initialAuthResolvedRef = React.useRef(false);

  const authActionRef =
    React.useRef<'login' | 'signup' | null>(null);

  /**
   * Charge ou crée le profil utilisateur.
   */
  const loadUserProfile = async (user: FirebaseUser) => {
    try {
      let resolvedSchoolId = schoolId;
      const linkSnap = await getDoc(doc(db, 'userSchoolLinks', user.uid));
      if (linkSnap.exists() && linkSnap.data().schoolId) {
        resolvedSchoolId = String(linkSnap.data().schoolId);
        if (resolvedSchoolId !== schoolId) setSchoolId(resolvedSchoolId);
      }
      const userDocRef = doc(
        db,
        'schools',
        resolvedSchoolId,
        'users',
        user.uid
      );

      const snap = await getDoc(userDocRef);

      const role: UserRole = 'admin';

      if (snap.exists()) {
        const data = snap.data() as UserProfile;

        setProfile(data);
        setActiveRole(data.role || role);
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          resolvedSchoolId,
          email:
            user.email || 'utilisateur@ecole.cd',
          displayName:
            user.displayName ||
            user.email?.split('@')[0] ||
            'Responsable Scolaire',
          role,
          active: true,
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(userDocRef, newProfile);
        } catch (error) {
          console.warn(
            'Impossible de créer le profil utilisateur:',
            error
          );
        }

        setProfile(newProfile);
        setActiveRole(role);
      }
    } catch (error) {
      console.error(
        'Erreur chargement profil utilisateur:',
        error
      );

      const fallbackProfile: UserProfile = {
        id: user.uid,
        schoolId,
        email:
          user.email || 'admin@ecole.cd',
        displayName:
          user.displayName || 'Administrateur',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      };

      setProfile(fallbackProfile);
      setActiveRole(fallbackProfile.role);
    }
  };

  /**
   * Traite une authentification explicitement déclenchée.
   *
   * routeAdmin = true :
   * vérifie immédiatement si l'utilisateur est super_admin.
   */
  const handleExplicitAuthUser = async (
    user: FirebaseUser,
    routeAdmin: boolean
  ) => {
    setLoading(true);
    setCurrentUser(user);

    if (routeAdmin) {
      const redirected =
        await redirectSuperAdminIfAuthorized(user);

      if (redirected) {
        return;
      }
    }

    await loadUserProfile(user);

    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!isMounted) return;

        console.log(
          '[EduFinance][AUTH] onAuthStateChanged:',
          {
            email: user?.email ?? null,
            uid: user?.uid ?? null,
            isAnonymous: user?.isAnonymous ?? null,
            providerData:
              user?.providerData?.map(
                (provider) => ({
                  providerId: provider.providerId,
                  email: provider.email,
                })
              ) ?? [],
          }
        );

        /**
         * PREMIER ÉVÉNEMENT FIREBASE
         *
         * Il peut correspondre à une ancienne session
         * restaurée automatiquement.
         */
        if (!initialAuthResolvedRef.current) {
          initialAuthResolvedRef.current = true;

          const action = authActionRef.current;

          /**
           * Aucune connexion explicitement déclenchée :
           *
           * On reste sur la Landing Page.
           *
           * Cela évite qu'une ancienne session restaurée
           * envoie automatiquement l'utilisateur vers Admin.
           */
          if (!action) {
            setCurrentUser(null);
            setProfile(null);
            setActiveRole('admin');
            setLoading(false);

            return;
          }

          /**
           * Une connexion était déjà en cours.
           */
          if (user) {
            authActionRef.current = null;

            await handleExplicitAuthUser(
              user,
              action === 'login'
            );

            return;
          }
        }

        /**
         * CORRECTION PRINCIPALE
         *
         * Si cet événement Firebase provient d'une connexion
         * explicitement déclenchée par l'utilisateur,
         * il faut obligatoirement traiter cette connexion
         * comme une nouvelle authentification.
         *
         * AVANT :
         * l'événement passait directement à loadUserProfile()
         * et pouvait laisser l'utilisateur sur la Landing Page.
         *
         * MAINTENANT :
         * la connexion est vérifiée immédiatement et un
         * super_admin est envoyé vers Admin.
         */
        if (user && authActionRef.current === 'login') {
          authActionRef.current = null;

          await handleExplicitAuthUser(user, true);

          return;
        }

        /**
         * Si aucun utilisateur n'est connecté.
         */
        if (!user) {
          setCurrentUser(null);
          setProfile(null);
          setActiveRole('admin');
          setLoading(false);

          return;
        }

        /**
         * Session Firebase déjà existante/restaurée.
         *
         * Elle peut mettre à jour l'interface locale,
         * mais ne déclenche PAS automatiquement Admin.
         */
        setCurrentUser(user);

        await loadUserProfile(user);

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [schoolId]);

  /**
   * CONNEXION GOOGLE
   */
  const signInWithGoogle = async () => {
    authActionRef.current = 'login';

    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const provider = new GoogleAuthProvider();

      const cred = await signInWithPopup(
        auth,
        provider
      );

      /**
       * Si onAuthStateChanged n'a pas encore consommé
       * l'action de connexion, on traite directement
       * l'utilisateur retourné par Firebase.
       */
      if (authActionRef.current === 'login') {
        authActionRef.current = null;

        await handleExplicitAuthUser(
          cred.user,
          true
        );
      }
    } catch (error) {
      authActionRef.current = null;
      setLoading(false);

      handleFirestoreError(
        error,
        OperationType.GET,
        'auth/google'
      );
    }
  };

  /**
   * CONNEXION EMAIL / MOT DE PASSE
   */
  const signInWithEmail = async (
    email: string,
    pass: string
  ) => {
    authActionRef.current = 'login';

    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const cred =
        await signInWithEmailAndPassword(
          auth,
          email,
          pass
        );

      if (authActionRef.current === 'login') {
        authActionRef.current = null;

        await handleExplicitAuthUser(
          cred.user,
          true
        );
      }
    } catch (error) {
      authActionRef.current = null;
      setLoading(false);

      throw error;
    }
  };

  /**
   * INSCRIPTION EMAIL / MOT DE PASSE
   */
  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'cashier',
    schoolName = name
  ) => {
    authActionRef.current = 'signup';

    try {
      await setPersistence(
        auth,
        browserLocalPersistence
      );

      const cred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          pass
        );

      if (authActionRef.current === 'signup') {
        authActionRef.current = null;

        const newSchoolId = `school_${Date.now()}_${cred.user.uid.slice(0, 8)}`;
        const now = new Date().toISOString();
        const newSchool = {
          id: newSchoolId,
          name: schoolName,
          code: newSchoolId.slice(-8).toUpperCase(),
          address: '',
          phone: '',
          email,
          currency: 'CDF' as const,
          schoolYear: '2026-2027',
          matriculePrefix: '2026',
          city: '',
          province: '',
          country: 'République Démocratique du Congo',
          status: 'pending',
          ownerId: cred.user.uid,
          ownerEmail: email,
          ownerName: name,
          createdAt: now,
          updatedAt: now,
        };
        const newProfile: UserProfile = {
          id: cred.user.uid,
          schoolId: newSchoolId,
          email,
          displayName: name,
          role: 'admin',
          active: true,
          createdAt: now,
        };
        await setDoc(doc(db, 'schools', newSchoolId), newSchool);
        await setDoc(doc(db, 'schools', newSchoolId, 'users', cred.user.uid), newProfile);
        await setDoc(doc(db, 'userSchoolLinks', cred.user.uid), { schoolId: newSchoolId, status: 'pending', createdAt: now });
        setSchoolId(newSchoolId);

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

  /**
   * DÉCONNEXION
   */
  const signOut = async () => {
    await fbSignOut(auth);

    authActionRef.current = null;

    setCurrentUser(null);
    setProfile(null);
    setActiveRole('admin');
    setLoading(false);
  };

  /**
   * CHANGEMENT DE RÔLE
   */
  const switchRole = (newRole: UserRole) => {
    setActiveRole(newRole);

    if (profile) {
      setProfile({
        ...profile,
        role: newRole,
      });
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
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};
