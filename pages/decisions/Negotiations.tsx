import React, { useState, useRef, useEffect } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { SUPPLIER_METRICS, SUPPLIERS, COMPONENT_COSTS, PRODUCTS } from '../../constants';
import { BrainCircuit, Send, Lock, CheckCircle, Shield, Briefcase, User, Bot, AlertCircle } from 'lucide-react';
import DecisionsSummary from '../../components/DecisionsSummary';
import { formatPercent } from '../../utils/numberFormat';

const Negotiations: React.FC = () => {
  const { decisions, startNegotiation, sendNegotiationMessage, isReadOnly, currentRole } = useSimulation();
  const { negotiation } = decisions;
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [negotiation.transcript]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    
    setIsSending(true);
    await sendNegotiationMessage(inputMessage);
    setInputMessage('');
    setIsSending(false);
  };

  const handleStart = async (supplierId: string) => {
      // If a deal is already agreed with another supplier, warn user?
      // Logic allows switching but data model only stores one 'selectedSupplierId'.
      await startNegotiation(supplierId);
  };

  if (negotiation.status === 'NOT_STARTED') {
      return (
          <div className="space-y-8 max-w-6xl mx-auto pb-24">
              <DecisionsSummary />
              
              <div className="flex justify-between items-start">
                  <div>
                      <h1 className="text-3xl font-bold text-slate-900">AI Negotiations</h1>
                      <p className="text-slate-500 mt-2 text-lg">Select a strategic partner to negotiate a preferred supplier agreement.</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {SUPPLIERS.map(s => {
                      // @ts-ignore
                      const metrics = SUPPLIER_METRICS[s];
                      return (
                          <div key={s} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                              <div className="p-6">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl">
                                          {s.charAt(0)}
                                      </div>
                                      <div className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">
                                          Term: {metrics.terms} Days
                                      </div>
                                  </div>
                                  <h3 className="text-xl font-bold text-slate-900 mb-2">{s}</h3>
                                  <p className="text-sm text-slate-500 mb-4 h-16">{metrics.desc}</p>
                                  
                                  <div className="space-y-2 mb-6">
                                      <div className="flex justify-between text-sm">
                                          <span className="text-slate-500">Quality Rating</span>
                                          <div className="flex space-x-1">
                                              {[...Array(5)].map((_, i) => (
                                                  <div key={i} className={`w-2 h-2 rounded-full ${i < (metrics.quality/2) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                              ))}
                                          </div>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                          <span className="text-slate-500">Innovation</span>
                                          <div className="flex space-x-1">
                                              {[...Array(5)].map((_, i) => (
                                                  <div key={i} className={`w-2 h-2 rounded-full ${i < (metrics.innovation/2) ? 'bg-blue-500' : 'bg-slate-200'}`} />
                                              ))}
                                          </div>
                                      </div>
                                  </div>

                                  <button 
                                    onClick={() => handleStart(s)}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center"
                                  >
                                      <Briefcase size={16} className="mr-2" />
                                      Open Negotiations
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start text-amber-800 text-sm">
                   <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                   <p>
                       <strong>Important Rule:</strong> You can only hold one Preferred Supplier Agreement per period. 
                       Negotiating a deal applies a global discount to that supplier's base prices across all products.
                       Once a deal is finalized, negotiations are closed for this round.
                   </p>
              </div>
          </div>
      );
  }

  // Active Negotiation View
  // @ts-ignore
  const currentSupplierMetrics = SUPPLIER_METRICS[negotiation.selectedSupplierId];

  return (
    <div className="max-w-6xl mx-auto pb-24 h-[calc(100vh-100px)] flex flex-col">
       <div className="flex items-center justify-between mb-6">
           <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                  Negotiation: {negotiation.selectedSupplierId}
                  {negotiation.status === 'AGREED' && (
                      <span className="ml-3 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <CheckCircle size={12} className="mr-1" /> Deal Closed
                      </span>
                  )}
              </h1>
           </div>
           {negotiation.status === 'AGREED' && (
               <div className="bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm flex space-x-6">
                   <div>
                       <span className="block text-xs text-slate-500 uppercase">Discount Secured</span>
                       <span className="block text-xl font-bold text-emerald-600">{formatPercent(negotiation.agreedDiscount, 2)}</span>
                   </div>
                   <div>
                       <span className="block text-xs text-slate-500 uppercase">Payment Terms</span>
                       <span className="block text-xl font-bold text-slate-800">{negotiation.agreedPaymentTerms} Days</span>
                   </div>
               </div>
           )}
       </div>

       <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
           
           {/* Left Panel: Metrics */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
               <div className="text-center mb-6">
                   <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-3xl mx-auto mb-3">
                       {negotiation.selectedSupplierId?.charAt(0)}
                   </div>
                   <h2 className="font-bold text-xl text-slate-900">{negotiation.selectedSupplierId}</h2>
                   <p className="text-sm text-slate-500">{currentSupplierMetrics.desc}</p>
               </div>

               <div className="space-y-4 border-t border-slate-100 pt-6">
                   <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Performance Stats</h3>
                   
                   {Object.entries(currentSupplierMetrics).map(([key, value]) => {
                       if (key === 'desc') return null;
                       return (
                           <div key={key} className="flex justify-between items-center text-sm">
                               <span className="text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                               <span className="font-mono font-bold text-slate-900">{value as string}</span>
                           </div>
                       );
                   })}
               </div>

                {/* Pricing Comparison Section */}
                <div className="space-y-4 border-t border-slate-100 pt-6 mt-6">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center">
                            Base Component Costs
                    </h3>
                    {PRODUCTS.map(p => {
                        // @ts-ignore
                        const currentCost = COMPONENT_COSTS[p.id][negotiation.selectedSupplierId!];
                        const allCosts = Object.values(COMPONENT_COSTS[p.id]);
                        const avgCost = allCosts.reduce((a, b) => a + b, 0) / allCosts.length;
                        const diff = ((currentCost - avgCost) / avgCost) * 100;
                        
                        return (
                            <div key={p.id} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-slate-700">{p.name}</span>
                                    <span className="font-mono font-bold text-slate-900">R {currentCost.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Avg: R {avgCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                    <span className={`font-bold ${Math.abs(diff) < 0.1 ? 'text-slate-400' : diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {Math.abs(diff) < 0.1 ? 'Average' : `${diff > 0 ? '+' : ''}${formatPercent(diff, 2, false)}`}
                                    </span>
                                </div>
                                {/* Visual Indicator */}
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden flex">
                                     <div 
                                         className={`h-full ${Math.abs(diff) < 0.1 ? 'bg-slate-300' : diff > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} 
                                         style={{ width: '100%' }} 
                                     />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {negotiation.status === 'IN_PROGRESS' && (
                    <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                        <p className="font-bold mb-2 flex items-center"><BrainCircuit size={16} className="mr-2"/> AI Tip</p>
                        <p>
                            Try leveraging your future growth volume or long-term commitment to secure better payment terms. 
                            {negotiation.selectedSupplierId === 'Alpha' && " Alpha values quality over price, mention brand alignment."}
                            {negotiation.selectedSupplierId === 'Neepo' && " Neepo is volume-driven. Promise larger orders."}
                        </p>
                    </div>
                )}
           </div>

           {/* Right Panel: Chat */}
           <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
               
               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50" ref={scrollRef}>
                   {negotiation.transcript.map((msg, idx) => (
                       <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-indigo-600 mr-3'}`}>
                                   {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                               </div>
                               <div className={`p-4 rounded-xl text-sm leading-relaxed shadow-sm ${
                                   msg.role === 'user' 
                                   ? 'bg-white text-slate-800 rounded-tr-none border border-slate-200' 
                                   : 'bg-indigo-600 text-white rounded-tl-none'
                               }`}>
                                   {msg.text}
                               </div>
                           </div>
                       </div>
                   ))}
                   {isSending && (
                       <div className="flex justify-start">
                           <div className="flex flex-row">
                               <div className="w-8 h-8 rounded-full bg-indigo-600 mr-3 flex items-center justify-center flex-shrink-0">
                                   <Bot size={16} className="text-white" />
                               </div>
                               <div className="bg-slate-200 p-4 rounded-xl rounded-tl-none flex space-x-1 items-center">
                                   <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                   <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                   <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                               </div>
                           </div>
                       </div>
                   )}
               </div>

               {/* Input Area */}
               <div className="p-4 bg-white border-t border-slate-200">
                   {negotiation.status === 'AGREED' ? (
                       <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-center text-emerald-800">
                           <Lock size={20} className="mr-2" />
                           <span className="font-bold">Negotiation Closed. Terms finalized for this period.</span>
                       </div>
                   ) : (
                        <form onSubmit={handleSendMessage} className="relative">
                            <input 
                                type="text" 
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder={isReadOnly && currentRole === 'STUDENT' ? "Only the CEO can send messages..." : "Type your offer or response..."}
                                className="w-full pl-4 pr-12 py-4 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSending || (isReadOnly && currentRole === 'STUDENT')}
                            />
                            <button 
                                type="submit" 
                                disabled={!inputMessage.trim() || isSending || (isReadOnly && currentRole === 'STUDENT')}
                                className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                   )}
               </div>

           </div>

       </div>
    </div>
  );
};

export default Negotiations;