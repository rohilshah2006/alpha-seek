'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, TrendingUp, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('1'); // Default to 1 share
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [isManageMode, setIsManageMode] = useState(false);
  const [manageEmail, setManageEmail] = useState('');
  const [manageStatus, setManageStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [manageError, setManageError] = useState('');

  const handleManageAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setManageStatus('loading');

    try {
      // Look for at least one active stock belonging to this email
      const { data, error } = await supabase
        .from('subscriptions')
        .select('uuid')
        .eq('email', manageEmail)
        .eq('active', true)
        .limit(1)
        .single();

      if (error || !data) {
        setManageError('No active portfolio found for this email.');
        setManageStatus('error');
        return;
      }

      // If found, teleport them to the manage page using their secret ID!
      router.push(`/manage?id=${data.uuid}`);
    } catch (err) {
      setManageError('Something went wrong. Please try again.');
      setManageStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Basic Validation
    if (!email || !ticker) {
      setErrorMessage('Please fill in all fields.');
      setStatus('error');
      return;
    }

    // NEW: Block negative shares
    if (parseFloat(shares) <= 0) {
      setErrorMessage('You must own at least a fraction of a share!');
      setStatus('error');
      return;
    }

    try {
      // 1. Check if user already exists
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('email', email)
        .eq('ticker', ticker)
        .single();

      if (existingSubscription) {
        setErrorMessage('You are already tracking this stock!');
        setStatus('error');
        return;
      }

      // 2. Insert new subscription with SHARES
      const { error } = await supabase
        .from('subscriptions')
        .insert([
          { 
            email, 
            ticker: ticker.toUpperCase(), 
            shares: parseFloat(shares) || 1, // Send shares to DB
            active: true 
          }
        ]);

      if (error) throw error;

      setStatus('success');
      setEmail('');
      setTicker('');
      setShares('1');
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-green-500/30">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <span className="font-bold font-mono text-white">N</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-medium text-green-400">Now Live: Alpha Seek v2.0</span>
        </div>

      {/* NEW: Right side of navbar */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-medium text-green-400">Now Live: Alpha Seek v2.0</span>
          </div>
          <button 
            onClick={() => setIsManageMode(!isManageMode)}
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            {isManageMode ? 'Back to Sign Up' : 'Manage Portfolio'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 mt-20 mb-32 relative">
        {/* Background Grids */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 z-10">
          Financial Intelligence, <br />
          <span className="text-white">Automated.</span>
        </h1>
        
        <p className="text-lg text-white/40 max-w-2xl mb-12 z-10">
          Wake up to a deep-dive analysis of your favorite stock. Powered by Multi-Agent AI, Goldman Sachs logic, and real-time data.
        </p>

        {/* Input Card */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-sm z-10 transition-all duration-300">
          
          {isManageMode ? (
            /* --- MANAGE MODE UI --- */
            <form onSubmit={handleManageAccess} className="p-6 flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-2">
                <h3 className="text-xl font-semibold text-white">Access Portfolio</h3>
                <p className="text-sm text-white/50 mt-1">Enter your email to manage your assets.</p>
              </div>
              
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-white/30" />
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                  value={manageEmail}
                  onChange={(e) => setManageEmail(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={manageStatus === 'loading'}
                className="w-full bg-white text-black font-semibold rounded-lg py-3 mt-2 hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {manageStatus === 'loading' ? 'Searching...' : 'Find Portfolio'}
                {manageStatus !== 'loading' && <ArrowRight className="w-4 h-4" />}
              </button>

              {manageStatus === 'error' && (
                <p className="text-red-400 text-sm text-center mt-2">{manageError}</p>
              )}
            </form>
          ) : status === 'success' ? (
            /* --- EXISTING SUCCESS UI --- */
            <div className="p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">You're in.</h3>
              <p className="text-white/50 mb-6">Watch your inbox at 6:00 AM.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="text-sm text-white/70 hover:text-white underline"
              >
                Add another stock
              </button>
            </div>
          ) : (
            /* --- EXISTING SIGNUP UI --- */
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-medium text-white/50 ml-1">Daily Briefing Destination</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-white/30" />
                  <input 
                    type="email" 
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="space-y-1 text-left flex-1">
                  <label className="text-xs font-medium text-white/50 ml-1">Asset</label>
                  <div className="relative">
                    <Activity className="absolute left-4 top-3.5 w-5 h-5 text-white/30" />
                    <input 
                      type="text" 
                      placeholder="Ticker (e.g. NVDA)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all uppercase"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left w-28">
                  <label className="text-xs font-medium text-white/50 ml-1">Shares Owned</label>
                  <input 
                    type="number" 
                    min="0.01"
                    step="any"
                    placeholder="1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all text-center"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-white text-black font-semibold rounded-lg py-3 mt-2 hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <span className="animate-pulse">Syncing...</span>
                ) : (
                  <>
                    <span>Start Tracking</span>
                    <TrendingUp className="w-4 h-4" />
                  </>
                )}
              </button>

              {status === 'error' && (
                <p className="text-red-400 text-sm text-center mt-2">{errorMessage}</p>
              )}
            </form>
          )}
        </div>

        {/* Social Proof / Footer */}
        <div className="mt-12 flex items-center gap-6 text-white/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Instant Setup</span>
          </div>
          <div className="w-1 h-1 bg-white/20 rounded-full"></div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm">Bank-Grade Privacy</span>
          </div>
        </div>
      </section>

      <footer className="w-full py-6 text-center text-white/10 text-sm">
        <p>Built with LangGraph, Llama 3, and Next.js</p>
      </footer>
    </main>
  );
}