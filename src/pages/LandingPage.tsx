import React from 'react';
import { ArrowRight, BarChart3, GraduationCap, ShieldCheck, WalletCards } from 'lucide-react';

interface LandingPageProps { onLogin: () => void; }

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20"><GraduationCap className="w-5 h-5" /></div>
            <div><div className="font-bold tracking-tight">EduFinance Pro</div><div className="text-[11px] text-slate-400">Gestion scolaire & financière</div></div>
          </div>
          <button onClick={onLogin} className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-semibold hover:bg-slate-100 transition">Se connecter</button>
        </div>
      </header>
      <main>
        <section className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 lg:pt-28">
          <div className="absolute -top-32 right-0 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-200 mb-7"><ShieldCheck className="w-4 h-4" />Une gestion plus claire, plus maîtrisée</div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">Pilotez les finances de votre établissement depuis un seul espace.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">EduFinance Pro centralise les élèves, les frais scolaires, les paiements, la caisse, les rapports et le suivi des opérations dans une interface pensée pour les équipes administratives.</p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button onClick={onLogin} className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-semibold transition shadow-xl shadow-indigo-500/20">Accéder à mon espace<ArrowRight className="w-4 h-4" /></button>
              <a href="#features" className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-medium transition">Découvrir la plateforme</a>
            </div>
          </div>
          <div className="relative mt-16 rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl">
            <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
              <div className="h-10 border-b border-white/10 flex items-center gap-2 px-4"><span className="w-2.5 h-2.5 rounded-full bg-slate-700" /><span className="w-2.5 h-2.5 rounded-full bg-slate-700" /><span className="w-2.5 h-2.5 rounded-full bg-slate-700" /><span className="ml-3 text-[11px] text-slate-500">EduFinance Pro · Tableau de bord</span></div>
              <div className="p-5 md:p-7 grid md:grid-cols-4 gap-4">
                {[['Recettes','24 850 000 CDF'],['Paiements','1 284'],['Élèves','1 092'],['Solde caisse','8 420 500 CDF']].map(([label,value]) => (
                  <div key={label} className="rounded-xl bg-white/[0.04] border border-white/10 p-5"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-xl font-bold">{value}</div><div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 rounded-full bg-indigo-500" /></div></div>
                ))}
              </div>
              <div className="px-5 pb-7"><div className="h-36 rounded-xl border border-white/10 bg-gradient-to-b from-indigo-500/10 to-transparent flex items-end gap-2 px-5 pb-4">{[32,48,40,66,55,78,62,88,72,96,82,100].map((height,i)=><div key={i} className="flex-1 rounded-t bg-indigo-500/70" style={{height:height+'%'}} />)}</div></div>
            </div>
          </div>
        </section>
        <section id="features" className="border-y border-white/10 bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
            <div className="max-w-2xl mb-12"><p className="text-sm font-semibold text-indigo-400">UNE PLATEFORME UNIFIÉE</p><h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Tout ce dont votre administration a besoin.</h2></div>
            <div className="grid md:grid-cols-3 gap-5">
              {[[BarChart3,'Pilotage financier','Suivez les recettes, paiements, charges et indicateurs depuis le tableau de bord.'],[WalletCards,'Caisse & paiements','Centralisez les encaissements et gardez une trace claire de chaque opération.'],[ShieldCheck,'Contrôle & audit','Conservez un historique des opérations pour faciliter le contrôle administratif.']].map(([Icon,title,text])=>{const FeatureIcon=Icon as typeof BarChart3;return <div key={title as string} className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]"><div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><FeatureIcon className="w-5 h-5" /></div><h3 className="mt-5 font-semibold text-lg">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text as string}</p></div>})}
            </div>
          </div>
        </section>
      </main>
      <footer className="max-w-7xl mx-auto px-6 lg:px-8 py-8 text-sm text-slate-500 flex justify-between"><span>© 2026 EduFinance Pro</span><button onClick={onLogin} className="hover:text-white transition">Connexion</button></footer>
    </div>
  );
}
