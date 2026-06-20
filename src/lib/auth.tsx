import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut, SignInButton as ClerkSignInButton, UserButton as ClerkUserButton } from '@clerk/clerk-react';
import { auth as firebaseAuth } from './firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { supabase } from './supabase';
import { useConfigStore } from './store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LogOut } from 'lucide-react';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();
  const { config } = useConfigStore();
  
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);

  // Firebase Auth
  useEffect(() => {
    if (!firebaseAuth) {
      setFirebaseLoading(false);
      return;
    }
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
  
  // Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error) {
        setSupabaseSession(session);
        setSupabaseUser(session?.user ?? null);
      }
      setSupabaseLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isLoaded = clerkAuth.isLoaded && !firebaseLoading && !supabaseLoading;
  
  // Either one is logged in
  const isLoggedIn = !!clerkAuth.userId || !!firebaseUser || !!supabaseUser;
  
  const userId = clerkAuth.userId || firebaseUser?.uid || supabaseUser?.id;
  const user = clerkUser.user || (firebaseUser ? {
    primaryEmailAddress: { emailAddress: firebaseUser.email },
    emailAddresses: [{ emailAddress: firebaseUser.email }],
    publicMetadata: { role: undefined }
  } : supabaseUser ? {
    primaryEmailAddress: { emailAddress: supabaseUser.email },
    emailAddresses: [{ emailAddress: supabaseUser.email }],
    publicMetadata: { role: undefined }
  } : null);
  
  const getToken = async () => {
    if (clerkAuth.userId) return await clerkAuth.getToken();
    if (firebaseUser) return await firebaseUser.getIdToken();
    if (supabaseSession) return supabaseSession.access_token;
    return null;
  };

  const signOut = async () => {
    if (clerkAuth.userId) await clerkAuth.signOut();
    if (firebaseUser) await firebaseSignOut(firebaseAuth);
    if (supabaseUser) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isLoaded, isLoggedIn, userId, user, getToken, signOut, isClerk: !!clerkAuth.userId, isFirebase: !!firebaseUser, isSupabase: !!supabaseUser }}>
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

  const { config } = useConfigStore();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (config.auth_mode === 'supabase') {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          if (password !== confirmPassword) throw new Error("Passwords do not match");
          if (!name || !phone) throw new Error("Please fill in all fields");
          const { data: authData, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, phone } }
          });
          if (error) throw error;
          // Optionally add to users table if trigger doesn't exist
          if (authData?.user) {
            await supabase.from('users').upsert({
               id: authData.user.id,
               email,
               name,
               phone,
               role: 'user',
               plan: 'trial'
            });
          }
        }
        onClose();
        return;
      }
      
      // Fallback to Firebase if not using Supabase
      if (!firebaseAuth) {
        throw new Error("Authentication is currently under moderation or services are temporarily unavailable.");
      }
      
      if (isLogin) {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        if (!name || !phone) throw new Error("Please fill in all fields");
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await supabase.from('users').upsert({
           id: cred.user.uid,
           email,
           phone,
           name,
           role: 'user',
        });
      }
      onClose();
    } catch (err: any) {
      if (err.message?.includes("api-key-not-valid") || err.code?.includes("api-key")) {
        setError("Authentication is currently under moderation. Host services are not available right now.");
      } else {
        setError(err.message || String(err));
      }
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
