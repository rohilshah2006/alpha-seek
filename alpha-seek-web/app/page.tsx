'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    if (!email || !ticker) return

    try {
      // 1. Insert into Supabase
      const { error } = await supabase
        .from('subscriptions')
        .insert([{ email, ticker: ticker.toUpperCase(), active: true }])

      if (error) throw error

      // 2. Success State
      setStatus('success')
      setEmail('')
      setTicker('')
    } catch (error) {
      console.error('Error:', error)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-green-500 selection:text-black">
      {/* Grid Background Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <main className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center">
        
        {/* Badge */}
        <div className="mb-8 inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-400 backdrop-blur-xl">
          <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          Now Live: Alpha Seek v1.0
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          Financial Intelligence, <br />
          Automated.
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
          Wake up to a deep-dive analysis of your favorite stock. 
          Powered by Multi-Agent AI, Goldman Sachs logic, and real-time data.
        </p>

        {/* Form Card */}
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 text-green-400">
              <CheckCircle className="w-16 h-16 mb-4" />
              <h3 className="text-2xl font-bold mb-2">You're in.</h3>
              <p className="text-gray-400">Watch your inbox at 6:00 AM.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-sm text-white underline hover:text-green-400"
              >
                Add another stock
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Stock Ticker</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="e.g. NVDA"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all uppercase"
                  />
                  <LineChart className="absolute right-3 top-3.5 w-5 h-5 text-gray-600" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Start Tracking'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 justify-center">
                  <AlertCircle className="w-4 h-4" />
                  <span>Something went wrong. Try again.</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-sm text-gray-600">
          Built with LangGraph, Llama 3, and Next.js
        </div>
      </main>
    </div>
  )
}