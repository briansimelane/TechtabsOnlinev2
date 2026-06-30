import React, { useState } from 'react';
import { Sliders, TrendingUp, DollarSign, AlertTriangle, RefreshCw, Save } from 'lucide-react';
import CONFIG from '../../resources/config.json';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/numberFormat';

interface SimulationParameters {
  marketGrowth: Record<string, number>;
  taxRate: number;
  interestRate: number;
  materialCostModifier: number;
  demandModifier: number;
  productionCostPerUnit: number;
  storeSetupCost: number;
  storeRunningCost: number;
  innovationBaseCost: number;
}

export const ParameterTweaker: React.FC = () => {
  const config = CONFIG as any;

  const [parameters, setParameters] = useState<SimulationParameters>({
    marketGrowth: {
      TechBook: config.market_demand?.TechBook?.cagr || 0.055,
      Zroid: config.market_demand?.Zroid?.cagr || 0.075,
      iTab: config.market_demand?.iTab?.cagr || 0.105,
    },
    taxRate: config.financial_parameters?.tax_rate || 0.28,
    interestRate: config.financial_parameters?.interest_income_rate || 0.065,
    materialCostModifier: 1.0,
    demandModifier: 1.0,
    productionCostPerUnit: config.costs?.production?.cost_per_unit || 720,
    storeSetupCost: config.costs?.store_operations?.setup_cost || 8900000,
    storeRunningCost: config.costs?.store_operations?.running_cost || 5341584,
    innovationBaseCost: config.costs?.innovation?.base_cost_per_feature || 2350000,
  });

  const [savedScenarios, setSavedScenarios] = useState<Array<{ name: string; params: SimulationParameters }>>([
    { name: 'Default', params: { ...parameters } },
  ]);

  const [scenarioName, setScenarioName] = useState('');
  const [activeScenario, setActiveScenario] = useState('Default');

  const handleReset = () => {
    setParameters({
      marketGrowth: {
        TechBook: config.market_demand?.TechBook?.cagr || 0.055,
        Zroid: config.market_demand?.Zroid?.cagr || 0.075,
        iTab: config.market_demand?.iTab?.cagr || 0.105,
      },
      taxRate: config.financial_parameters?.tax_rate || 0.28,
      interestRate: config.financial_parameters?.interest_income_rate || 0.065,
      materialCostModifier: 1.0,
      demandModifier: 1.0,
      productionCostPerUnit: config.costs?.production?.cost_per_unit || 720,
      storeSetupCost: config.costs?.store_operations?.setup_cost || 8900000,
      storeRunningCost: config.costs?.store_operations?.running_cost || 5341584,
      innovationBaseCost: config.costs?.innovation?.base_cost_per_feature || 2350000,
    });
    setActiveScenario('Default');
  };

  const handleSaveScenario = () => {
    if (scenarioName.trim()) {
      setSavedScenarios([...savedScenarios, { name: scenarioName, params: { ...parameters } }]);
      setActiveScenario(scenarioName);
      setScenarioName('');
    }
  };

  const handleLoadScenario = (name: string) => {
    const scenario = savedScenarios.find(s => s.name === name);
    if (scenario) {
      setParameters(scenario.params);
      setActiveScenario(name);
    }
  };

  const calculateImpact = (product: string, period: number) => {
    const baseUnits = config.market_demand?.[product]?.year1_units || 0;
    const originalGrowth = config.market_demand?.[product]?.cagr || 0;
    const newGrowth = parameters.marketGrowth[product] || 0;
    
    const originalSize = Math.floor(baseUnits * Math.pow(1 + originalGrowth, period - 1));
    const newSize = Math.floor(baseUnits * Math.pow(1 + newGrowth, period - 1));
    const difference = newSize - originalSize;
    const percentChangeValue = (difference / originalSize) * 100;
    const percentChangeLabel = formatPercent(difference / originalSize, 2);
    
    return { originalSize, newSize, difference, percentChangeValue, percentChangeLabel };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sliders className="w-7 h-7" />
              Simulation Parameter Tweaker
            </h1>
            <p className="text-orange-100 mt-2">
              Adjust simulation parameters and see real-time impact on calculations
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Active Scenario */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div>
              <div className="font-semibold text-blue-900">Active Scenario: {activeScenario}</div>
              <div className="text-sm text-blue-700">
                Changes will affect next turn calculations
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Scenario name..."
              className="px-3 py-1 border border-blue-300 rounded text-sm"
            />
            <button
              onClick={handleSaveScenario}
              disabled={!scenarioName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Saved Scenarios */}
      {savedScenarios.length > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold mb-3">Saved Scenarios</h3>
          <div className="flex flex-wrap gap-2">
            {savedScenarios.map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => handleLoadScenario(scenario.name)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  activeScenario === scenario.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Growth Rates */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Market Growth Rates (CAGR)</h3>
          </div>
          
          <div className="space-y-4">
            {(Object.entries(parameters.marketGrowth) as Array<[string, number]>).map(([product, rate]) => {
              const original = config.market_demand?.[product]?.cagr || 0;
              const isModified = Math.abs(rate - original) > 0.001;
              
              return (
                <div key={product}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-slate-700">{product}</label>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${isModified ? 'text-orange-600' : 'text-slate-900'}`}>
                        {formatPercent(rate, 2)}
                      </span>
                      {isModified && (
                        <span className="text-xs text-slate-500">
                          (was {formatPercent(original, 2)})
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.20"
                    step="0.005"
                    value={rate}
                    onChange={(e) => setParameters({
                      ...parameters,
                      marketGrowth: { ...parameters.marketGrowth, [product]: parseFloat(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>10%</span>
                    <span>20%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Impact Preview */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Impact on Year 3 Market Size</h4>
            <div className="space-y-2">
              {Object.keys(parameters.marketGrowth).map((product) => {
                const impact = calculateImpact(product, 3);
                return (
                  <div key={product} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{product}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatNumber(impact.newSize)}</span>
                      <span className={`text-xs ${impact.percentChangeValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({impact.percentChangeValue > 0 ? '+' : ''}{impact.percentChangeLabel})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Financial Parameters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Financial Parameters</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Tax Rate</label>
                <span className="font-mono font-bold text-slate-900">
                  {formatPercent(parameters.taxRate, 2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.50"
                step="0.01"
                value={parameters.taxRate}
                onChange={(e) => setParameters({ ...parameters, taxRate: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Interest Income Rate</label>
                <span className="font-mono font-bold text-slate-900">
                  {formatPercent(parameters.interestRate, 2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.15"
                step="0.005"
                value={parameters.interestRate}
                onChange={(e) => setParameters({ ...parameters, interestRate: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>7.5%</span>
                <span>15%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Economic Modifiers */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Economic Event Modifiers</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Material Cost Modifier</label>
                <span className={`font-mono font-bold ${
                  parameters.materialCostModifier !== 1 ? 'text-orange-600' : 'text-slate-900'
                }`}>
                  {formatPercent(parameters.materialCostModifier * 100, 2, false)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={parameters.materialCostModifier}
                onChange={(e) => setParameters({ ...parameters, materialCostModifier: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{formatPercent(50, 2, false)} off</span>
                <span>{formatPercent(100, 2, false)} normal</span>
                <span>{formatPercent(200, 2, false)} double</span>
              </div>
              {parameters.materialCostModifier !== 1 && (
                <div className="mt-2 text-xs text-orange-600">
                  ⚠️ Simulates global supply chain disruption or commodity price changes
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Demand Modifier</label>
                <span className={`font-mono font-bold ${
                  parameters.demandModifier !== 1 ? 'text-orange-600' : 'text-slate-900'
                }`}>
                  {formatPercent(parameters.demandModifier * 100, 2, false)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={parameters.demandModifier}
                onChange={(e) => setParameters({ ...parameters, demandModifier: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{formatPercent(50, 2, false)} recession</span>
                <span>{formatPercent(100, 2, false)} normal</span>
                <span>{formatPercent(200, 2, false)} boom</span>
              </div>
              {parameters.demandModifier !== 1 && (
                <div className="mt-2 text-xs text-orange-600">
                  ⚠️ Simulates economic boom/recession affecting overall market demand
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cost Parameters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Cost Parameters</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Production Cost/Unit</label>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(parameters.productionCostPerUnit)}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1500"
                step="10"
                value={parameters.productionCostPerUnit}
                onChange={(e) => setParameters({ ...parameters, productionCostPerUnit: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Store Setup Cost</label>
                <span className="font-mono font-bold text-slate-900">
                  R {formatNumber(parameters.storeSetupCost / 1000000, 0)}M
                </span>
              </div>
              <input
                type="range"
                min="2000000"
                max="15000000"
                step="100000"
                value={parameters.storeSetupCost}
                onChange={(e) => setParameters({ ...parameters, storeSetupCost: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Store Running Cost/Year</label>
                <span className="font-mono font-bold text-slate-900">
                  R {formatNumber(parameters.storeRunningCost / 1000000, 0)}M
                </span>
              </div>
              <input
                type="range"
                min="1000000"
                max="10000000"
                step="100000"
                value={parameters.storeRunningCost}
                onChange={(e) => setParameters({ ...parameters, storeRunningCost: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-slate-700">Innovation Base Cost</label>
                <span className="font-mono font-bold text-slate-900">
                  R {formatNumber(parameters.innovationBaseCost / 1000000, 0)}M
                </span>
              </div>
              <input
                type="range"
                min="500000"
                max="5000000"
                step="50000"
                value={parameters.innovationBaseCost}
                onChange={(e) => setParameters({ ...parameters, innovationBaseCost: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <div className="font-semibold mb-1">How to Apply Changes:</div>
            <p>
              These parameters currently affect the display only. To make them active in the simulation:
            </p>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Export these parameter changes to a JSON file</li>
              <li>Update the corresponding values in <code className="bg-amber-100 px-1 rounded">resources/config.json</code></li>
              <li>Or implement a runtime parameter override system in SimulationContext</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
