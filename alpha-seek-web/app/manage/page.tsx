'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Trash2, Activity, Plus, LogOut } from 'lucide-react';

type Stock = {
  uuid: string;
  ticker: string;
  shares: number;
};

export default function ManagePage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndFetchStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUserAndFetchStocks = async () => {
    try {
      // 1. Get the secure session instead of the URL ID
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      // If they aren't logged in, kick them back to the home page
      if (authError || !session) {
        router.push('/'); 
        return;
      }

      setEmail(session.user.email || '');

      // 2. Fetch their specific active stocks using their secure user_id
      const { data: activeStocks, error: stocksError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id) // Secure RLS lookup!
        .eq('active', true);

      if (stocksError) throw stocksError;
      
      setStocks(activeStocks || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rowId: string) => {
    // Soft Delete: Turn 'active' to false
    await supabase
      .from('subscriptions')
      .update({ active: false })
      .eq('uuid', rowId);
      
    // Refresh the UI
    checkUserAndFetchStocks();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center">
         <div className="text-white/50 animate-pulse font-mono text-sm">Decrypting secure vault...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-4">
      
      {/* Navbar for Dashboard */}
      <nav className="flex items-center justify-between py-6 max-w-7xl mx-auto border-b border-white/10 mb-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <span className="font-bold font-mono text-white">N</span>
          </div>
          <span className="font-bold font-mono text-white text-xl hidden sm:block">Alpha Seek</span>
        </div>
        
        <button 
          onClick={handleLogout}
          className="text-sm font-medium text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Disconnect Session</span>
        </button>
      </nav>

      <div className="w-full max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm z-10">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Manage Portfolio</h2>
              <p className="text-white/50">{email}</p>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/')}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all text-white/70 hover:text-white"
            title="Add New Asset"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Stocks List */}
        {stocks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
             <p className="text-white/50 mb-4">No active assets in your vault.</p>
             <button onClick={() => router.push('/')} className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
               + Add your first stock
             </button>
          </div>
        ) : (
          <div className="space-y-4">
            {stocks.map((stock) => (
              <div key={stock.uuid} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4 transition-all hover:bg-white/10">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-2 rounded-md">
                     <Activity className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase">{stock.ticker}</h3>
                    <p className="text-white/50 text-sm">{stock.shares} {stock.shares === 1 ? 'share' : 'shares'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(stock.uuid)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-all"
                  title="Remove Asset"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}