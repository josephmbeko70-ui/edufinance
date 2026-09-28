import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, GraduationCap, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps { onBack: () => void; }

export function LoginPage({ onBack }: LoginPageProps) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setBusy(true); try { await signInWithEmail(email.trim(),password); } catch(err) { const message=err instanceof Error?err.message:''; setError(message.includes('invalid-credential')||message.includes('wrong-password')||message.includes('user-not-found')?'Adresse e-mail ou mot de passe incorrect.':'Connexion impossible. Vérifiez vos informations et réessayez.'); } finally { setBusy(false); } };
  const handleGoogle = async () => { setError(''); setBusy(true); try { await signInWithGoogle(); } catch { setError('La connexion Google n’a pas pu être effectuée.'); } finally { setBusy(false); } };
  return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10"><div className="w-full max-w-md">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-8"><ArrowLeft className="w-4 h-4" />Retour à l’accueil</button>
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 md:p-8 shadow-2xl">
      <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mb-6"><GraduationCap className="w-6 h-6" /></div>
      <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur EduFinance Pro</h1><p className="mt-2 text-sm text-slate-400">Connectez-vous à votre espace de gestion.</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block"><span className="text-sm font-medium text-slate-300">Adresse e-mail</span><div className="relative mt-2"><Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" /><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="vous@ecole.cd" className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" /></div></label>
        <label className="block"><span className="text-sm font-medium text-slate-300">Mot de passe</span><div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" /><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-10 pr-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-3 text-slate-500 hover:text-white">{showPassword?<EyeOff className="w-4 h-4" />:<Eye className="w-4 h-4" />}</button></div></label>
        {error&&<div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <button disabled={busy} className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2">{busy&&<Loader2 className="w-4 h-4 animate-spin" />}Se connecter</button>
      </form>
      <div className="relative my-6"><div className="border-t border-white/10" /><span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-slate-900 px-3 text-xs text-slate-500">ou</span></div>
      <button onClick={handleGoogle} disabled={busy} className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-3.5 text-sm font-medium transition disabled:opacity-60">Continuer avec Google</button>
    </div>
  </div></div>;
}
