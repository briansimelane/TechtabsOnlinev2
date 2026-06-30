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
            <span className="font-semibold text-lg">Market Demand & Growth</span>
          </div>
          {expandedSections.marketDemand ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.marketDemand && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-4">
              {Object.entries(config.market_demand || {}).map(([product, data]: [string, any]) => (
                <div key={product} className="bg-white p-4 rounded border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">{product}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-sm text-slate-600 block mb-1">Year 1 Units</label>
                      <NumberInput
                        value={data.year1_units || 0}
                        onChange={(val) => updateConfig(['market_demand', product, 'year1_units'], val)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 block mb-1">CAGR (decimal)</label>
                      <NumberInput
                        value={data.cagr || 0}
                        onChange={(val) => updateConfig(['market_demand', product, 'cagr'], val)}
                        decimals={3}
                        isFloat={true}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-right"
                      />
                      <div className="text-xs text-green-600 mt-1">= {formatPercent(data.cagr, 2)}</div>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="text-sm text-slate-600 block mb-1">Description</label>
                    <textarea
                      value={data.description || ''}
                      onChange={(e) => updateConfig(['market_demand', product, 'description'], e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-2 rounded">
                    <div>
                      <div className="text-slate-500">Year 2 (Projected)</div>
                      <div className="font-mono font-semibold">
                        {Math.floor(data.year1_units * (1 + data.cagr)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Year 3 (Projected)</div>
                      <div className="font-mono font-semibold">
                        {Math.floor(data.year1_units * Math.pow(1 + data.cagr, 2)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Year 6 (Projected)</div>
                      <div className="font-mono font-semibold">
                        {Math.floor(data.year1_units * Math.pow(1 + data.cagr, 5)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <span className="font-semibold text-lg">Supplier Configuration</span>
          </div>
          {expandedSections.suppliers ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.suppliers && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-4">
              {Object.entries(config.suppliers || {}).map(([supplierId, supplier]: [string, any]) => (
                <div key={supplierId} className="bg-white p-4 rounded border border-slate-200">
                  <div className="mb-3">
                    <label className="text-sm text-slate-600 block mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={supplier.name || ''}
                      onChange={(e) => updateConfig(['suppliers', supplierId, 'name'], e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="text-sm text-slate-600 block mb-2">Performance Attributes</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(supplier.performance_attributes || {}).map(([attr, value]: [string, any]) => (
                        <div key={attr}>
                          <label className="text-xs text-slate-500">{attr.replace(/_/g, ' ')}</label>
                          <NumberInput
                            value={value}
                            onChange={(val) => updateConfig(['suppliers', supplierId, 'performance_attributes', attr], val)}
                            decimals={1}
                            isFloat={true}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-sm text-slate-600 block mb-1">Description</label>
                    <textarea
                      value={supplier.description || ''}
                      onChange={(e) => updateConfig(['suppliers', supplierId, 'description'], e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Component Prices</label>
                      {Object.entries(supplier.component_prices || {}).map(([prod, price]: [string, any]) => (
                        <div key={prod} className="flex items-center gap-2 mb-2">
                          <span className="text-sm flex-1">{prod}:</span>
                          <NumberInput
                            value={price}
                            onChange={(val) => updateConfig(['suppliers', supplierId, 'component_prices', prod], val)}
                            isFloat={true}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono text-right"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-2">Finished Goods Prices</label>
                      {Object.entries(supplier.finished_goods_prices || {}).map(([prod, price]: [string, any]) => (
                        <div key={prod} className="flex items-center gap-2 mb-2">
                          <span className="text-sm flex-1">{prod}:</span>
                          <NumberInput
                            value={price}
                            onChange={(val) => updateConfig(['suppliers', supplierId, 'finished_goods_prices', prod], val)}
                            isFloat={true}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 font-mono text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
            <span className="font-semibold text-lg">Customer Buying Criteria Weights</span>
          </div>
          {expandedSections.buyingCriteria ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.buyingCriteria && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-4">
              {Object.entries(config.customer_buying_criteria || {}).map(([product, criteria]: [string, any]) => (
                <div key={product} className="bg-white p-4 rounded border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">{product}</h4>
                  <div className="space-y-2">
                    {Object.entries(criteria).filter(([k]) => k !== 'description').map(([factor, weight]: [string, any]) => (
                      <div key={factor} className="flex items-center gap-3">
                        <label className="text-sm text-slate-600 w-32">{factor.replace(/_/g, ' ')}</label>
                        <NumberInput
                          value={weight}
                          onChange={(val) => updateConfig(['customer_buying_criteria', product, factor], val)}
                          decimals={2}
                          isFloat={true}
                          className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 font-mono text-right"
                        />
                      </div>
                    ))}
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
              ))}
            </div>
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
            <span className="font-semibold text-lg">Training Programs & Productivity</span>
          </div>
          {expandedSections.training ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.training && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(config.training_programs || {}).map(([level, program]: [string, any]) => (
                <div key={level} className="bg-white p-4 rounded border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">{level}</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Cost per Employee</label>
                      <NumberInput
                        value={program.cost_per_employee || 0}
                        onChange={(val) => updateConfig(['training_programs', level, 'cost_per_employee'], val)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Productivity Effect (decimal)</label>
                      <NumberInput
                        value={program.productivity_effect || 0}
                        onChange={(val) => updateConfig(['training_programs', level, 'productivity_effect'], val)}
                        decimals={2}
                        isFloat={true}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-right"
                      />
                      <div className="text-xs text-green-600 mt-1">= +{formatPercent(program.productivity_effect, 2)}</div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Description</label>
                      <textarea
                        value={program.description || ''}
                        onChange={(e) => updateConfig(['training_programs', level, 'description'], e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
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
            <span className="font-semibold text-lg">Operating Costs</span>
          </div>
          {expandedSections.costs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.costs && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">Store Operations</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Setup Cost</label>
                    <NumberInput
                      value={config.costs?.store_operations?.setup_cost || 0}
                      onChange={(val) => updateConfig(['costs', 'store_operations', 'setup_cost'], val)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Close Cost</label>
                    <NumberInput
                      value={config.costs?.store_operations?.close_cost || 0}
                      onChange={(val) => updateConfig(['costs', 'store_operations', 'close_cost'], val)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Running Cost</label>
                    <NumberInput
                      value={config.costs?.store_operations?.running_cost || 0}
                      onChange={(val) => updateConfig(['costs', 'store_operations', 'running_cost'], val)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Production</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Cost per Unit</label>
                      <NumberInput
                        value={config.costs?.production?.cost_per_unit || 0}
                        onChange={(val) => updateConfig(['costs', 'production', 'cost_per_unit'], val)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Capacity CAPEX per Unit</label>
                      <NumberInput
                        value={config.costs?.capacity?.capex_per_unit || 0}
                        onChange={(val) => updateConfig(['costs', 'capacity', 'capex_per_unit'], val)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Innovation</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Base Cost per Feature</label>
                      <NumberInput
                        value={config.costs?.innovation?.base_cost_per_feature || 0}
                        onChange={(val) => updateConfig(['costs', 'innovation', 'base_cost_per_feature'], val)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Cost Multiplier</label>
                      <NumberInput
                        value={config.costs?.innovation?.cost_multiplier || 0}
                        onChange={(val) => updateConfig(['costs', 'innovation', 'cost_multiplier'], val)}
                        decimals={1}
                        isFloat={true}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
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
            <span className="font-semibold text-lg">Financial Parameters</span>
          </div>
          {expandedSections.financial ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        {expandedSections.financial && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="bg-white p-4 rounded border border-slate-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Interest Income Rate</label>
                  <NumberInput
                    value={config.financial_parameters?.interest_income_rate || 0}
                    onChange={(val) => updateConfig(['financial_parameters', 'interest_income_rate'], val)}
                    decimals={3}
                    isFloat={true}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-right"
                  />
                  <div className="text-xs text-green-600 mt-1">
                    = {formatPercent(config.financial_parameters?.interest_income_rate || 0, 2)}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Tax Rate</label>
                  <NumberInput
                    value={config.financial_parameters?.tax_rate || 0}
                    onChange={(val) => updateConfig(['financial_parameters', 'tax_rate'], val)}
                    decimals={2}
                    isFloat={true}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-right"
                  />
                  <div className="text-xs text-red-600 mt-1">
                    = {formatPercent(config.financial_parameters?.tax_rate || 0, 2)}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">WACC</label>
                  <NumberInput
                    value={config.financial_parameters?.wacc || 0}
                    onChange={(val) => updateConfig(['financial_parameters', 'wacc'], val)}
                    decimals={3}
                    isFloat={true}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-right"
                  />
                  <div className="text-xs text-indigo-600 mt-1">
                    = {formatPercent(config.financial_parameters?.wacc || 0, 2)}
                  </div>
                </div>
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
    </div>
  );
};
