import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Server, 
  Terminal,
  AlertCircle
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  onRefreshStatus?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  onRefreshStatus,
}) => {
  const [schemaSql, setSchemaSql] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/chat/schema-sql')
        .then((res) => res.json())
        .then((data) => {
          if (data.sql) setSchemaSql(data.sql);
        })
        .catch((err) => console.warn('Could not fetch schema SQL:', err));
    }
  }, [isOpen]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-white truncate">Supabase History &amp; Context</h3>
                <span
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-mono border shrink-0 ${
                    isConfigured
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {isConfigured ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Persistent conversation memory and multi-turn context
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs text-slate-300 scrollbar-thin flex-1">
          {/* Status info box */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 ${
            isConfigured 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}>
            {isConfigured ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-xs sm:text-sm">
                {isConfigured 
                  ? 'Supabase Integration is Live & Connected' 
                  : 'Operating in High-Speed Local Session Mode'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isConfigured
                  ? 'All user questions, assistant kernel answers, model rotation counts, and multi-turn context summaries are automatically saved to your Supabase PostgreSQL database.'
                  : 'To persist conversations permanently across devices and browser clears, supply SUPABASE_URL and SUPABASE_ANON_KEY in Settings > Secrets.'}
              </p>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px] sm:text-[11px] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Two-Minute Setup Guide</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Step 1: Set Variables</span>
                <p className="text-[11px] text-slate-300 mt-1">
                  In Google AI Studio, open <strong>Settings &gt; Secrets</strong> and add:
                </p>
                <div className="mt-2 bg-slate-900 p-2 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1 break-all">
                  <div>SUPABASE_URL=https://xyz.supabase.co</div>
                  <div>SUPABASE_ANON_KEY=eyJh...</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">Step 2: Run Database SQL</span>
                <p className="text-[11px] text-slate-300 mt-1">
                  In your Supabase <strong>SQL Editor</strong>, paste the schema script and click <strong>Run</strong>.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold min-h-[32px]"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1 min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors"
                  >
                    {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SQL Editor Code Block */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 truncate">
                <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Supabase Schema Definition</span>
              </span>
              <button
                onClick={handleCopySql}
                className="text-[10px] sm:text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied' : 'Copy Schema'}</span>
              </button>
            </div>
            <pre className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[10px] sm:text-[11px] font-mono text-slate-300 max-h-48 sm:max-h-56 overflow-y-auto scrollbar-thin">
              {schemaSql || '-- Loading Supabase Schema...'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (onRefreshStatus) onRefreshStatus();
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Check Status
          </button>

          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
