import React, { useState } from 'react';
import { FlaskConical, Gavel, Sparkles, CheckCircle2, Layers } from 'lucide-react';
import ZenAuctionSandbox from './ZenAuctionSandbox';

interface SandboxModule {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
}

const SANDBOX_MODULES: SandboxModule[] = [
  {
    id: 'zen-auction-sandbox',
    title: 'Zen Open-Bid Auction & B2B Sandbox',
    badge: 'ALP Year 3',
    description:
      'Interactive test harness for timing windows, increment bidding, self-outbid protection, post-award JV splits, B2B client pricing/KPIs, and Other Income reconciliation.',
    icon: <Gavel className="w-5 h-5 text-blue-600" />
  }
];

const TestingHub: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState<string>(SANDBOX_MODULES[0].id);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Testing Navigation Header & Module Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <FlaskConical className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Testing &amp; Sandboxes
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3" /> Facilitator QA Hub
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Isolated test environments and interactive sandboxes for verifying simulation scenarios, financial models, and mechanics without affecting live class data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>{SANDBOX_MODULES.length} Active Test Module{SANDBOX_MODULES.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Module Selector Cards / Tabs */}
        <div className="pt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Select Sandbox or Test Suite
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SANDBOX_MODULES.map((mod) => {
              const isSelected = mod.id === activeModuleId;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModuleId(mod.id)}
                  className={`text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/15 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                    {mod.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {mod.badge}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-sm text-slate-900 mt-1.5">{mod.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Sandbox Content */}
      {activeModuleId === 'zen-auction-sandbox' && <ZenAuctionSandbox />}
    </div>
  );
};

export default TestingHub;
