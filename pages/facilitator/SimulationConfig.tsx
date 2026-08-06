import React, { useState, useEffect } from 'react';
import { Settings, TrendingUp, DollarSign, Users, Package, ChevronDown, ChevronRight, Eye, Save, RotateCcw, Edit3 } from 'lucide-react';
import CONFIG from '../../resources/config.json';
import CALC_RULES from '../../resources/calculation_rules.json';
import { formatPercent, formatNumber, parseNumber } from '../../utils/numberFormat';

interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  decimals?: number;
  isFloat?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, className, decimals = 0, isFloat = false }) => {
  const [localValue, setLocalValue] = useState<string>(formatNumber(value, decimals));

  useEffect(() => {
    setLocalValue(formatNumber(value, decimals));
  }, [value, decimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    const rawValue = localValue;
    const numericValue = isFloat ? parseNumber(rawValue) : Math.round(parseNumber(rawValue));
    onChange(numericValue);
    setLocalValue(formatNumber(numericValue, decimals));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <input
      type="text"
      inputMode={isFloat ? "decimal" : "numeric"}
      className={className}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

export const SimulationConfig: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    marketDemand: false,
    suppliers: false,
    training: false,
    costs: false,
    buyingCriteria: false,
    financial: false,
    calculations: false
  });

  const [editableConfig, setEditableConfig] = useState<any>(JSON.parse(JSON.stringify(CONFIG)));
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateConfig = (path: string[], value: any) => {
    const newConfig = JSON.parse(JSON.stringify(editableConfig));
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setEditableConfig(newConfig);
    setHasChanges(true);
    setSaveMessage('');
  };

  const handleSave = () => {
    // Save to localStorage for persistence across sessions
    localStorage.setItem('simulation_config_overrides', JSON.stringify(editableConfig));
    setHasChanges(false);
    setSaveMessage('Configuration saved! Note: Changes are stored in browser. To apply to simulation engine, integrate with SimulationContext.');
    setTimeout(() => setSaveMessage(''), 5000);
  };

  const handleReset = () => {
    setEditableConfig(JSON.parse(JSON.stringify(CONFIG)));
    localStorage.removeItem('simulation_config_overrides');
    setHasChanges(false);
    setSaveMessage('Configuration reset to original values.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Load saved overrides on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('simulation_config_overrides');
    if (saved) {
      setEditableConfig(JSON.parse(saved));
      setHasChanges(false);
    }
  }, []);

  const config = editableConfig as any;
  const calcRules = CALC_RULES as any;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Edit3 className="w-7 h-7" />
              Backend Configuration Editor
            </h1>
            <p className="text-purple-100 mt-2">
              Edit and configure all simulation parameters
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
                hasChanges 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-800">{saveMessage}</div>
        </div>
      )}

      {/* Status Indicator */}
      <div className={`border rounded-lg p-4 ${hasChanges ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasChanges ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
          <div>
            <div className={`font-semibold ${hasChanges ? 'text-orange-900' : 'text-green-900'}`}>
              {hasChanges ? 'Unsaved Changes' : 'All Changes Saved'}
            </div>
            <div className={`text-sm ${hasChanges ? 'text-orange-700' : 'text-green-700'}`}>
              {hasChanges 
                ? 'You have unsaved changes. Click "Save Changes" to persist them.' 
                : 'Configuration is up to date.'}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-lg">Simulation Metadata</span>
          </div>
          {expandedSections.metadata ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.metadata && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 uppercase block mb-1">Num Teams</label>
                <NumberInput
                  value={config.metadata?.num_teams || 0}
                  onChange={(val) => updateConfig(['metadata', 'num_teams'], val)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-right"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase block mb-1">Num Periods</label>
                <NumberInput
                  value={config.metadata?.num_periods || 0}
                  onChange={(val) => updateConfig(['metadata', 'num_periods'], val)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-right"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase block mb-1">Version</label>
                <input
                  type="text"
                  value={config.metadata?.version || ''}
                  onChange={(e) => updateConfig(['metadata', 'version'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase block mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={config.metadata?.currency_symbol || ''}
                  onChange={(e) => updateConfig(['metadata', 'currency_symbol'], e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Demand */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('marketDemand')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-lg">Market Demand & Growth Schedule (Year 0 - Year 4)</span>
          </div>
          {expandedSections.marketDemand ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.marketDemand && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Manually configure or adjust the product market demand (units) per year (Year 0 through Year 4). Custom edits will directly drive simulation period processing.
            </p>
            {Object.entries(config.market_demand || {}).map(([product, data]: [string, any]) => {
              const defaultYearlyDemand: Record<number, number> = {
                0: product === 'TechBook' ? 288750 : product === 'Zroid' ? 179888 : 89750,
                1: product === 'TechBook' ? 187588 : product === 'Zroid' ? 260242 : 127559,
                2: product === 'TechBook' ? 197905 : product === 'Zroid' ? 279760 : 140953,
                3: product === 'TechBook' ? 208790 : product === 'Zroid' ? 300742 : 155753,
                4: product === 'TechBook' ? 220274 : product === 'Zroid' ? 323298 : 172107
              };
              const yearlyDemand = data.yearly_units || defaultYearlyDemand;

              return (
                <div key={product} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-base">{product} — Market Demand Schedule</h4>
                    <span className="text-xs text-slate-500 font-mono">CAGR: {formatPercent(data.cagr || 0, 2)}</span>
                  </div>

                  {/* Multi-Year Inputs Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                          {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                            <th key={idx} className="py-2.5 px-3 text-center font-bold">
                              {yr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-2 px-2 text-center">
                              <NumberInput
                                value={yearlyDemand[y] ?? defaultYearlyDemand[y] ?? 0}
                                onChange={(val) => updateConfig(['market_demand', product, 'yearly_units', String(y)], val)}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Growth CAGR Decimal</label>
                      <NumberInput
                        value={data.cagr || 0}
                        onChange={(val) => updateConfig(['market_demand', product, 'cagr'], val)}
                        decimals={3}
                        isFloat={true}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Description</label>
                      <input
                        type="text"
                        value={data.description || ''}
                        onChange={(e) => updateConfig(['market_demand', product, 'description'], e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suppliers */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('suppliers')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-lg">Supplier Configuration (Year 0 - Year 4)</span>
          </div>
          {expandedSections.suppliers ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.suppliers && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Configure supplier component prices, finished goods prices, and performance attributes per year (Year 0 through Year 4).
            </p>

            {Object.entries(config.suppliers || {}).map(([supplierId, supplier]: [string, any]) => (
              <div key={supplierId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="w-full max-w-sm">
                    <label className="text-xs text-slate-500 uppercase block mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={supplier.name || ''}
                      onChange={(e) => updateConfig(['suppliers', supplierId, 'name'], e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Component Prices Table */}
                <div>
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Component Prices by Year</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-700">
                          <th className="py-2 px-3 text-left font-bold w-48">Product</th>
                          {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                            <th key={idx} className="py-2 px-3 text-center font-bold">{yr}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {['TechBook', 'Zroid', 'iTab'].map(pName => {
                          const basePrice = supplier.component_prices?.[pName] ?? 1200;
                          const yearMap = supplier.component_prices?.[`${pName}_by_year`] || {};
                          return (
                            <tr key={pName} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-700">{pName}</td>
                              {[0, 1, 2, 3, 4].map(y => (
                                <td key={y} className="py-1 px-2 text-center">
                                  <NumberInput
                                    value={yearMap[y] ?? basePrice}
                                    onChange={(val) => updateConfig(['suppliers', supplierId, 'component_prices', `${pName}_by_year`, String(y)], val)}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Finished Goods Prices Table */}
                <div>
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Finished Goods Prices by Year</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-700">
                          <th className="py-2 px-3 text-left font-bold w-48">Product</th>
                          {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                            <th key={idx} className="py-2 px-3 text-center font-bold">{yr}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {['TechBook', 'Zroid', 'iTab'].map(pName => {
                          const basePrice = supplier.finished_goods_prices?.[pName] ?? 1600;
                          const yearMap = supplier.finished_goods_prices?.[`${pName}_by_year`] || {};
                          return (
                            <tr key={pName} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-700">{pName}</td>
                              {[0, 1, 2, 3, 4].map(y => (
                                <td key={y} className="py-1 px-2 text-center">
                                  <NumberInput
                                    value={yearMap[y] ?? basePrice}
                                    onChange={(val) => updateConfig(['suppliers', supplierId, 'finished_goods_prices', `${pName}_by_year`, String(y)], val)}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance Attributes Table */}
                <div>
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Performance Attributes by Year</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b text-slate-700">
                          <th className="py-2 px-3 text-left font-bold w-48">Attribute</th>
                          {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                            <th key={idx} className="py-2 px-3 text-center font-bold">{yr}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(supplier.performance_attributes || {}).map(([attr, val]: [string, any]) => {
                          const baseVal = typeof val === 'number' ? val : 0;
                          const yearMap = supplier.performance_attributes?.[`${attr}_by_year`] || {};
                          return (
                            <tr key={attr} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-700">{attr.replace(/_/g, ' ')}</td>
                              {[0, 1, 2, 3, 4].map(y => (
                                <td key={y} className="py-1 px-2 text-center">
                                  <NumberInput
                                    value={yearMap[y] ?? baseVal}
                                    onChange={(newVal) => updateConfig(['suppliers', supplierId, 'performance_attributes', `${attr}_by_year`, String(y)], newVal)}
                                    decimals={1}
                                    isFloat={true}
                                    className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Description</label>
                  <textarea
                    value={supplier.description || ''}
                    onChange={(e) => updateConfig(['suppliers', supplierId, 'description'], e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buying Criteria */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('buyingCriteria')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-lg">Customer Buying Criteria Weights (Year 0 - Year 4)</span>
          </div>
          {expandedSections.buyingCriteria ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.buyingCriteria && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Configure and manually adjust buying criteria factor weights by year (Year 0 through Year 4) for each product. Custom per-year weights will determine team scoring and market share allocation.
            </p>

            {Object.entries(config.customer_buying_criteria || {}).map(([product, criteria]: [string, any]) => {
              const defaultFactors: Record<string, number> = {
                Price: product === 'TechBook' ? 10 : product === 'Zroid' ? 5 : 3,
                Payment_Terms: product === 'TechBook' ? 9 : product === 'Zroid' ? 3 : 2,
                Availability: product === 'TechBook' ? 7 : product === 'Zroid' ? 6 : 9,
                Stores: product === 'TechBook' ? 8 : product === 'Zroid' ? 8 : 5,
                Agents: product === 'TechBook' ? 4 : product === 'Zroid' ? 7 : 6,
                Staff_Availability: product === 'TechBook' ? 3 : product === 'Zroid' ? 4 : 8,
                Product_Innovation: product === 'TechBook' ? 8 : product === 'Zroid' ? 8 : 10,
                Company_Advertising: product === 'TechBook' ? 6 : product === 'Zroid' ? 9 : 4,
                Product_Advertising: product === 'TechBook' ? 5 : product === 'Zroid' ? 10 : 7
              };

              const factorKeys = Object.keys(defaultFactors);

              return (
                <div key={product} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-base">{product} — Customer Buying Criteria Weights by Year</h4>

                  {/* Multi-Year Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                          <th className="py-2.5 px-3 text-left font-bold w-48">Buying Criteria Factor</th>
                          {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                            <th key={idx} className="py-2.5 px-3 text-center font-bold">
                              {yr}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {factorKeys.map(factor => {
                          const yearWeights = criteria[`${factor}_by_year`] || {};
                          const baseWeight = criteria[factor] ?? defaultFactors[factor] ?? 5;

                          return (
                            <tr key={factor} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-700">
                                {factor.replace(/_/g, ' ')}
                              </td>
                              {[0, 1, 2, 3, 4].map(y => {
                                const currentWeight = yearWeights[y] ?? baseWeight;
                                return (
                                  <td key={y} className="py-1.5 px-2 text-center">
                                    <NumberInput
                                      value={currentWeight}
                                      onChange={(val) => updateConfig(['customer_buying_criteria', product, `${factor}_by_year`, String(y)], val)}
                                      decimals={1}
                                      isFloat={true}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-slate-500 block mb-1">Description</label>
                    <textarea
                      value={criteria.description || ''}
                      onChange={(e) => updateConfig(['customer_buying_criteria', product, 'description'], e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Training Programs */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('training')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-lg">Training Programs & Productivity (Year 0 - Year 4)</span>
          </div>
          {expandedSections.training ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.training && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Set training program costs, productivity boost effects, and base staff productivity units per year (Year 0 through Year 4).
            </p>

            {/* Training Program Costs by Year Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-base">Training Program Cost per Employee by Year</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2.5 px-3 text-left font-bold w-48">Program Level</th>
                      {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                        <th key={idx} className="py-2.5 px-3 text-center font-bold">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {['None', 'Basic', 'Moderate', 'Advanced'].map(level => {
                      const baseVal = config.training_programs?.[level]?.cost_per_employee ?? (level === 'Basic' ? 9600 : level === 'Moderate' ? 32000 : level === 'Advanced' ? 48000 : 0);
                      const yearMap = config.training_programs?.[level]?.cost_per_employee_by_year || {};
                      return (
                        <tr key={level} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{level}</td>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-1.5 px-2 text-center">
                              <NumberInput
                                value={yearMap[y] ?? baseVal}
                                onChange={(val) => updateConfig(['training_programs', level, 'cost_per_employee_by_year', String(y)], val)}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Productivity Effect by Year Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-base">Training Productivity Effect (Decimal) by Year</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2.5 px-3 text-left font-bold w-48">Program Level</th>
                      {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                        <th key={idx} className="py-2.5 px-3 text-center font-bold">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {['None', 'Basic', 'Moderate', 'Advanced'].map(level => {
                      const baseVal = config.training_programs?.[level]?.productivity_effect ?? (level === 'Basic' ? 0.03 : level === 'Moderate' ? 0.055 : level === 'Advanced' ? 0.1 : 0);
                      const yearMap = config.training_programs?.[level]?.productivity_effect_by_year || {};
                      return (
                        <tr key={level} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{level}</td>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-1.5 px-2 text-center">
                              <NumberInput
                                value={yearMap[y] ?? baseVal}
                                onChange={(val) => updateConfig(['training_programs', level, 'productivity_effect_by_year', String(y)], val)}
                                decimals={3}
                                isFloat={true}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Costs */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('costs')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-lg">Operating Costs Schedule (Year 0 - Year 4)</span>
          </div>
          {expandedSections.costs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.costs && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Configure store operations costs, unit production costs, capacity CAPEX per unit, and R&D feature costs per year (Year 0 through Year 4).
            </p>

            {/* Store Operations Costs Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-base">Store Operations Costs by Year</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2.5 px-3 text-left font-bold w-48">Cost Category</th>
                      {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                        <th key={idx} className="py-2.5 px-3 text-center font-bold">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { key: 'setup_cost', label: 'Store Setup Cost', defaultVal: 8900000 },
                      { key: 'close_cost', label: 'Store Close Cost', defaultVal: 2320000 },
                      { key: 'running_cost', label: 'Store Running Cost', defaultVal: 5341584 }
                    ].map(row => {
                      const baseVal = config.costs?.store_operations?.[row.key] ?? row.defaultVal;
                      const yearMap = config.costs?.store_operations?.[`${row.key}_by_year`] || {};
                      return (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.label}</td>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-1.5 px-2 text-center">
                              <NumberInput
                                value={yearMap[y] ?? baseVal}
                                onChange={(val) => updateConfig(['costs', 'store_operations', `${row.key}_by_year`, String(y)], val)}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Production & Capacity Costs Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-base">Production & Capacity Costs by Year</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2.5 px-3 text-left font-bold w-48">Cost Item</th>
                      {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                        <th key={idx} className="py-2.5 px-3 text-center font-bold">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { path: ['costs', 'production', 'cost_per_unit'], label: 'Cost per Unit', defaultVal: 720 },
                      { path: ['costs', 'capacity', 'capex_per_unit'], label: 'Capacity CAPEX per Unit', defaultVal: 750 },
                      { path: ['costs', 'innovation', 'base_cost_per_feature'], label: 'R&D Base Cost per Feature', defaultVal: 2350000 }
                    ].map(row => {
                      let baseVal = config;
                      for (const p of row.path) { baseVal = baseVal?.[p]; }
                      baseVal = baseVal ?? row.defaultVal;

                      const lastKey = row.path[row.path.length - 1];
                      const parentPath = row.path.slice(0, row.path.length - 1);
                      let parentObj = config;
                      for (const p of parentPath) { parentObj = parentObj?.[p]; }
                      const yearMap = parentObj?.[`${lastKey}_by_year`] || {};

                      return (
                        <tr key={lastKey} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.label}</td>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-1.5 px-2 text-center">
                              <NumberInput
                                value={yearMap[y] ?? baseVal}
                                onChange={(val) => updateConfig([...parentPath, `${lastKey}_by_year`, String(y)], val)}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Parameters */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('financial')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-lg">Financial Parameters (Year 0 - Year 4)</span>
          </div>
          {expandedSections.financial ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.financial && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500">
              Configure interest rates, corporate tax rates, overdraft interest rates, and WACC rates per year (Year 0 through Year 4).
            </p>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-base">Financial Rates Schedule by Year</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b text-slate-700">
                      <th className="py-2.5 px-3 text-left font-bold w-48">Financial Rate (Decimal)</th>
                      {['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].map((yr, idx) => (
                        <th key={idx} className="py-2.5 px-3 text-center font-bold">{yr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { key: 'interest_income_rate', label: 'Interest Income Rate', defaultVal: 0.065 },
                      { key: 'overdraft_interest_rate', label: 'Overdraft Interest Rate', defaultVal: 0.15 },
                      { key: 'tax_rate', label: 'Corporate Tax Rate', defaultVal: 0.28 },
                      { key: 'wacc', label: 'WACC Rate', defaultVal: 0.132 }
                    ].map(row => {
                      const baseVal = config.financial_parameters?.[row.key] ?? row.defaultVal;
                      const yearMap = config.financial_parameters?.[`${row.key}_by_year`] || {};
                      return (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">{row.label}</td>
                          {[0, 1, 2, 3, 4].map(y => (
                            <td key={y} className="py-1.5 px-2 text-center">
                              <NumberInput
                                value={yearMap[y] ?? baseVal}
                                onChange={(val) => updateConfig(['financial_parameters', `${row.key}_by_year`, String(y)], val)}
                                decimals={3}
                                isFloat={true}
                                className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-center text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calculation Rules */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('calculations')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-600" />
            <span className="font-semibold text-lg">Calculation Sequence</span>
          </div>
          {expandedSections.calculations ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.calculations && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="bg-white p-4 rounded border border-slate-200">
              <ol className="space-y-2">
                {calcRules.calculation_sequence?.sequence?.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Calculation Rules */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleSection('calculations')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-600" />
            <span className="font-semibold text-lg">Calculation Sequence</span>
          </div>
          {expandedSections.calculations ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.calculations && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="bg-white p-4 rounded border border-slate-200">
              <ol className="space-y-2">
                {calcRules.calculation_sequence?.sequence?.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
