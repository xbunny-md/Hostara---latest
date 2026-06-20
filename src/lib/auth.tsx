import { useState, useEffect, createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut, SignInButton as ClerkSignInButton, UserButton as ClerkUserButton } from '@clerk/clerk-react';
import { auth as firebaseAuth } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { useConfigStore } from './store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getDatabase, ref, set } from 'firebase/database';
import { db } from './firebase';
import { LogOut } from 'lucide-react';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();
  const { config } = useConfigStore();
  
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  useEffect(() => {
    try {
      const unsub = onAuthStateChanged(firebaseAuth, (user) => {
        setFirebaseUser(user);
        setFirebaseLoading(false);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Firebase auth could not initialize (missing config?).", e);
      setFirebaseLoading(false);
    }
  }, []);

  const isLoaded = clerkAuth.isLoaded && !firebaseLoading;
  
  // Either one is logged in
  const isLoggedIn = !!clerkAuth.userId || !!firebaseUser;
  
  const userId = clerkAuth.userId || firebaseUser?.uid;
  const user = clerkUser.user || (firebaseUser ? {
    primaryEmailAddress: { emailAddress: firebaseUser.email },
    emailAddresses: [{ emailAddress: firebaseUser.email }],
    publicMetadata: { role: undefined }
  } : null);
  
  const getToken = async () => {
    if (clerkAuth.userId) return await clerkAuth.getToken();
    if (firebaseUser) return await firebaseUser.getIdToken();
    return null;
  };

  const signOut = async () => {
    if (clerkAuth.userId) await clerkAuth.signOut();
    if (firebaseUser) await firebaseSignOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ isLoaded, isLoggedIn, userId, user, getToken, signOut, isClerk: !!clerkAuth.userId, isFirebase: !!firebaseUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAppAuth() {
  return useContext(AuthContext);
}

export function AppSignedIn({ children }: { children: React.ReactNode }) {
  const { isLoaded, isLoggedIn } = useAppAuth();
  if (!isLoaded || !isLoggedIn) return null;
  return <>{children}</>;
}

export function AppSignedOut({ children }: { children: React.ReactNode }) {
  const { isLoaded, isLoggedIn } = useAppAuth();
  if (!isLoaded || isLoggedIn) return null;
  return <>{children}</>;
}

function CustomAuthModal({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        if (!name || !phone) throw new Error("Please fill in all fields");
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await set(ref(db, `users/${cred.user.uid}`), {
          email,
          phone,
          name,
          role: "user",
          created_at: Date.now()
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-500 hover:text-white">✕</button>
        <h2 className="text-2xl font-bold mb-6">{isLogin ? "Sign In" : "Create Account"}</h2>
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm border border-red-500/20">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required disabled={loading} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Phone Number</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} required disabled={loading} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
          </div>
          {!isLogin && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={loading} />
            </div>
          )}
          
          <Button type="submit" className="w-full bg-[var(--primary,#8B5CF6)] hover:opacity-90" disabled={loading}>
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-zinc-400 hover:text-white" disabled={loading}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSignInButton({ children, mode }: any) {
  const { config } = useConfigStore();
  const [showModal, setShowModal] = useState(false);

  if (config.auth_mode === 'clerk') {
    return <ClerkSignInButton mode={mode}>{children}</ClerkSignInButton>;
  }

  return (
    <>
      <div onClick={() => setShowModal(true)}>
        {children}
      </div>
      {showModal && <CustomAuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export function AppUserButton() {
  const { config } = useConfigStore();
  const { signOut, isClerk, user } = useAppAuth();

  if (isClerk || config.auth_mode === 'clerk') {
    return <ClerkUserButton />;
  }

  return (
    <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign Out">
      <LogOut className="h-5 w-5 text-zinc-400 hover:text-white" />
    </Button>
  );
}
