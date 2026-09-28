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
 * Vérifie si l'utilisateur est un super_admin actif.
 *
 * IMPORTANT :
 * active doit être un vrai Boolean Firestore.
 * La valeur String "true" n'est PAS acceptée.
 */
const redirectSuperAdminIfAuthorized = async (
  user: FirebaseUser
): Promise<boolean> => {
  console.log('========== EDUFINANCE ADMIN DIAGNOSTIC ==========');
  console.log('Firebase email:', user.email);
  console.log('Firebase UID:', user.uid);
  console.log('isAnonymous:', user.isAnonymous);
  console.log('emailVerified:', user.emailVerified);

  console.log(
    'providerData:',
    user.providerData.map((provider) => ({
      providerId: provider.providerId,
      email: provider.email,
    }))
  );

  console.log(
    'Vérification du document:',
    `admins/${user.uid}`
  );

  try {
    const adminRef = doc(db, 'admins', user.uid);
    const adminSnap = await getDoc(adminRef);

    console.log(
      'Document admins existe:',
      adminSnap.exists()
    );

    if (!adminSnap.exists()) {
      console.warn(
        'Aucun document admins pour cet UID.'
      );

      console.log('ADMIN DOCUMENT: ABSENT');
      console.log('================================================');

      return false;
    }

    const admin = adminSnap.data() as AdminRecord;

    console.log('ADMIN DOCUMENT: PRESENT');
    console.log('ADMIN ROLE:', admin.role);
    console.log('ADMIN ACTIVE:', admin.active);

    console.log(
      'ADMIN ACTIVE TYPE:',
      typeof admin.active
    );

    console.log(
      'ADMIN ROLE TYPE:',
      typeof admin.role
    );

    console.log(
      'ADMIN ACTIVE JSON:',
      JSON.stringify(admin.active)
    );

    console.log(
      'ADMIN ROLE JSON:',
      JSON.stringify(admin.role)
    );

    const isActiveBoolean =
      typeof admin.active === 'boolean';

    const isActive =
      admin.active === true;

    const isSuperAdmin =
      admin.role === 'super_admin';

    console.log(
      'ACTIVE EST BOOLEAN:',
      isActiveBoolean
    );

    console.log(
      'ACTIVE === TRUE:',
      isActive
    );

    console.log(
      'ROLE === SUPER_ADMIN:',
      isSuperAdmin
    );

    /**
     * CONDITION STRICTE
     *
     * active doit être Boolean true
     * ET
     * role doit être "super_admin"
     */
    if (
      isActiveBoolean &&
      isActive &&
      isSuperAdmin
    ) {
      console.log(
        'RESULTAT: SUPER_ADMIN AUTORISÉ → redirection Admin.'
      );

      console.log(
        'ADMIN RESULT: SUPER_ADMIN AUTHORIZED'
      );

      console.log(
        '==============================================='
      );

      /*
       * Redirection vers le deuxième site.
       * Aucun login n'est nécessaire sur Admin :
       * Firebase conserve la session.
       */
      window.location.replace(
        ADMIN_CONSOLE_URL
      );

      return true;
    }

    console.warn(
      'ACCÈS ADMIN REFUSÉ.'
    );

    console.warn({
      role: admin.role,
      active: admin.active,
      activeType: typeof admin.active,
      roleType: typeof admin.role,
      isActiveBoolean,
      isActive,
      isSuperAdmin,
    });

    console.log(
      '================================================'
    );

    return false;

  } catch (error) {
    console.error(
      'ERREUR LECTURE admins:',
      error
    );

    console.error(
      'Code Firebase:',
      (error as { code?: string })?.code
    );

    console.error(
      'Message Firebase:',
      (error as { message?: string })?.message
    );

    console.log(
      '================================================'
    );

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

  const [loading, setLoading] =
    useState(true);

  // Une session restaurée au chargement ne doit jamais déclencher
  // automatiquement une navigation. La navigation de rôle ne se fait
  // qu'après une connexion initiée depuis la landing page.
  const initialAuthResolvedRef = React.useRef(false);
  const routeAfterLoginRef = React.useRef(false);

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
            isAnonymous:
              user?.isAnonymous ?? null,
            providerData:
              user?.providerData?.map(
                (provider) => ({
                  providerId:
                    provider.providerId,
                  email: provider.email,
                })
              ) ?? [],
          }
        );

        /*
         * Premier état Firebase au chargement.
         * La landing page reste toujours le point d'entrée.
         * Une session déjà restaurée ne déclenche donc aucune redirection.
         */
        if (!initialAuthResolvedRef.current) {
          initialAuthResolvedRef.current = true;
          setCurrentUser(null);
          setProfile(null);
          setActiveRole('admin');
          setLoading(false);
          return;
        }

        /*
         * Aucun utilisateur connecté après une action de session.
         */
        if (!user) {
          setCurrentUser(null);
          setProfile(null);
          setActiveRole('admin');
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        /*
         * La redirection de rôle n'est autorisée que lorsqu'une connexion
         * vient d'être explicitement lancée depuis la landing page.
         */
        const shouldRoute = routeAfterLoginRef.current;
        routeAfterLoginRef.current = false;

        const redirected = shouldRoute
          ? await redirectSuperAdminIfAuthorized(user)
          : false;

        if (redirected) {
          /*
           * On ne charge surtout pas le profil scolaire.
           * On garde loading=true pendant la navigation afin
           * d'éviter un rendu intermédiaire de l'espace client.
           */
          return;
        }

        /*
         * Utilisateur normal.
         * Chargement de son profil scolaire.
         */
        try {

          const userDocRef = doc(
            db,
            'schools',
            schoolId,
            'users',
            user.uid
          );

          const snap =
            await getDoc(userDocRef);

          let role: UserRole = 'admin';

          if (
            user.email ===
            'controlpolytra@gmail.com'
          ) {
            role = 'admin';
          }

          if (snap.exists()) {

            const data =
              snap.data() as UserProfile;

            setProfile(data);

            setActiveRole(
              data.role || role
            );

          } else {

            const newProfile: UserProfile = {
              id: user.uid,
              schoolId,
              email:
                user.email ||
                'utilisateur@ecole.cd',

              displayName:
                user.displayName ||
                user.email?.split('@')[0] ||
                'Responsable Scolaire',

              role,

              active: true,

              createdAt:
                new Date().toISOString(),
            };

            try {

              await setDoc(
                userDocRef,
                newProfile
              );

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
              user.email ||
              'admin@ecole.cd',

            displayName:
              user.displayName ||
              'Administrateur',

            role: 'admin',

            active: true,

            createdAt:
              new Date().toISOString(),
          };

          setProfile(
            fallbackProfile
          );

          setActiveRole(
            fallbackProfile.role
          );
        }

        /*
         * Initialisation terminée
         * pour un utilisateur normal.
         */
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };

  }, [schoolId]);

  /*
   * Connexion Google
   */
  const signInWithGoogle =
    async () => {

      try {
        routeAfterLoginRef.current = true;

        const provider =
          new GoogleAuthProvider();

        await signInWithPopup(
          auth,
          provider
        );

      } catch (error) {

        handleFirestoreError(
          error,
          OperationType.GET,
          'auth/google'
        );
      }
    };

  /*
   * Connexion Email + mot de passe
   */
  const signInWithEmail =
    async (
      email: string,
      pass: string
    ) => {

      routeAfterLoginRef.current = true;

      await signInWithEmailAndPassword(
        auth,
        email,
        pass
      );
    };

  /*
   * Création de compte
   */
  const signUpWithEmail =
    async (
      email: string,
      pass: string,
      name: string,
      role: UserRole = 'cashier'
    ) => {

      routeAfterLoginRef.current = false;

      const cred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          pass
        );

      if (cred.user) {

        const newProfile: UserProfile = {
          id: cred.user.uid,

          schoolId,

          email,

          displayName: name,

          role:
            cred.user.email ===
            'controlpolytra@gmail.com'
              ? 'admin'
              : role,

          active: true,

          createdAt:
            new Date().toISOString(),
        };

        await setDoc(
          doc(
            db,
            'schools',
            schoolId,
            'users',
            cred.user.uid
          ),
          newProfile
        );

        setProfile(newProfile);

        setActiveRole(
          newProfile.role
        );
      }
    };

  /*
   * Déconnexion
   */
  const signOut =
    async () => {

      await fbSignOut(auth);

      setCurrentUser(null);
      setProfile(null);
      setActiveRole('admin');
    };

  /*
   * Changement de rôle local
   */
  const switchRole =
    (newRole: UserRole) => {

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

  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};
