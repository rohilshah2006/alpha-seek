'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Trash2, Activity } from 'lucide-react';

function ManageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); // Gets the secret UUID from the link
  
  const [stocks, setStocks] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchUserStocks();
  }, [id]);

  const fetchUserStocks = async () => {
    try {
      // 1. Identify the user by their secret UUID
      const { data: userRow, error: userError } = await supabase
        .from('subscriptions')
        .select('email')
        .eq('uuid', id)
        .single();

      if (userError || !userRow) throw new Error('User not found');
      
      setEmail(userRow.email);

      // 2. Fetch all of their active stocks
      const { data: activeStocks, error: stocksError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('email', userRow.email)
        .eq('active', true);

      if (stocksError) throw stocksError;
      
      setStocks(activeStocks || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rowId: string) => {
    // Soft Delete: Turn 'active' to false so the AI ignores it tomorrow
    await supabase
      .from('subscriptions')
      .update({ active: false })
      .eq('uuid', rowId);
      
    // Refresh the UI
    fetchUserStocks();
  };

  if (loading) return <div className="text-center mt-20 text-white animate-pulse">Loading portfolio...</div>;
  if (!email) return <div className="text-center mt-20 text-red-400">Invalid or missing secure link.</div>;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm z-10 mt-20">
      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Manage Portfolio</h2>
          <p className="text-white/50">{email}</p>
        </div>
      </div>

      {stocks.length === 0 ? (
        <p className="text-white/50 text-center py-8">You have no active subscriptions.</p>
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
  );
}

export default function ManagePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white px-4">
      <nav className="flex items-center justify-between py-6 max-w-7xl mx-auto">
         <span className="font-bold font-mono text-white text-xl">Alpha Seek</span>
      </nav>
      <Suspense fallback={<div className="text-white text-center mt-20">Loading...</div>}>
        <ManageContent />
      </Suspense>
    </main>
  );
}