export interface RegionalDossier {
  id: string;
  name: string;
  flag: string;
  region: string;
  tagline: string;
  currency: string;
  fxSpotText: string;
  fxDynamics: string;
  hedgingAvailable: string;
  marketDemandTotal: string;
  unitBreakdown: { product: string; units: string }[];
  demandCagr: string;
  priceIndexText: string;
  priceIndexDetail: string;
  hurdleRate: string;
  countryRiskPremium: string;
  repatriationPct: string;
  repatriationDetail: string;
  isTrappedCashWarning?: boolean;
  importDuty: string;
  importDutyDetail: string;
  debtorDaysDefault: number;
  channels: {
    name: string;
    type: 'OWN' | 'DISTRIBUTOR';
    entryCapEx: string;
    marginCut: string;
    debtorTerms: string;
    operationalProfile: string;
    balanceSheetImpact: string;
  }[];
  strategicTakeaways: {
    opportunity: string;
    risks: string[];
    recommendation: string;
  };
}

export const REGIONAL_DOSSIERS: Record<string, RegionalDossier> = {
  za: {
    id: 'za',
    name: 'South Africa',
    flag: '🇿🇦',
    region: 'Southern Africa (Domestic Base)',
    tagline: 'Domestic anchor market and core operating cash flow engine for the enterprise.',
    currency: 'ZAR',
    fxSpotText: '1.0000 (Base Currency)',
    fxDynamics: 'Domestic reporting currency. Zero FX conversion risk on domestic sales.',
    hedgingAvailable: 'Not applicable (Base currency)',
    marketDemandTotal: '250,000+ units / year',
    unitBreakdown: [
      { product: 'TechBook', units: '~120,000 units' },
      { product: 'Zroid', units: '~150,000 units' },
      { product: 'iTab', units: '~80,000 units' }
    ],
    demandCagr: '~6.0% annual trend',
    priceIndexText: '1.00 (Baseline Benchmark)',
    priceIndexDetail: 'Standard domestic benchmark for price tolerance and consumer elasticity.',
    hurdleRate: '12.0% (Company WACC)',
    countryRiskPremium: '0.0% (Domestic baseline)',
    repatriationPct: '100% Free Domestic Cashflow',
    repatriationDetail: 'All domestic earnings flow directly into headquarters operating liquidity with zero foreign exchange delays or trapped balances.',
    isTrappedCashWarning: false,
    importDuty: '0.0%',
    importDutyDetail: 'Zero cross-border customs or tariff duties applied on domestic sales.',
    debtorDaysDefault: 45,
    channels: [
      {
        name: 'Company Stores and Agents',
        type: 'OWN',
        entryCapEx: 'R 0 (Established domestic retail presence)',
        marginCut: '0.0% (Retain 100% of price)',
        debtorTerms: '30 - 60 days (Managed in Marketing & Finance)',
        operationalProfile: 'Direct flagship retail stores combined with accredited commercial agents.',
        balanceSheetImpact: 'Standard domestic PPE store infrastructure and working capital cycle.'
      }
    ],
    strategicTakeaways: {
      opportunity: 'Core foundational cash cow. Strong domestic cash generation funds international growth initiatives and cushions foreign exchange volatility.',
      risks: [
        'Mature market saturation with aggressive domestic competitor pricing',
        'Vulnerability to macroeconomic interest rate cycles'
      ],
      recommendation: 'Protect high gross margins and healthy cash conversion in South Africa. The operating cash flow generated domestically is essential for funding capital entry and supplier commitments in foreign jurisdictions.'
    }
  },
  ng: {
    id: 'ng',
    name: 'Nigeria',
    flag: '🇳🇬',
    region: 'West Africa',
    tagline: 'Fastest-growing tech consumer market in Africa with high volume potential and macro volatility.',
    currency: 'NGN (Nigerian Naira)',
    fxSpotText: '₦1.00 = ~R 0.01156 (Year 1)',
    fxDynamics: 'High currency volatility. Following CBN foreign exchange reforms, the Naira faces steady depreciation against the Rand and USD. Unhedged revenues risk substantial translation losses.',
    hedgingAvailable: 'Forward contracts available up to 12-month tenor',
    marketDemandTotal: '210,000 units / year',
    unitBreakdown: [
      { product: 'TechBook', units: '70,000 units' },
      { product: 'Zroid', units: '95,000 units' },
      { product: 'iTab', units: '45,000 units' }
    ],
    demandCagr: '+25.0% annual growth',
    priceIndexText: '0.85 (Price-Sensitive Mass Market)',
    priceIndexDetail: 'Consumer purchasing power is constrained by local inflation. Competitive pricing in Naira captures immense unit volume; overpricing leads to severe demand contraction.',
    hurdleRate: '18.5% (Base 12.0% + 6.5% Country Risk Premium)',
    countryRiskPremium: '+6.5% (Reflecting macro & sovereign risk)',
    repatriationPct: '60% Repatriable / 40% Trapped Cash',
    repatriationDetail: 'Warning: CBN foreign exchange rationing imposes a 1-period liquidity delay. 40% of generated operating cash remains locked in local Nigerian accounts during the active period and cannot be repatriated immediately.',
    isTrappedCashWarning: true,
    importDuty: '20.0% Import Tariff',
    importDutyDetail: 'Nigerian customs levies 20% import duty on tech hardware, increasing landed COGS by 20% on all units shipped into Nigeria.',
    debtorDaysDefault: 75,
    channels: [
      {
        name: 'Company Stores',
        type: 'OWN',
        entryCapEx: 'R 12,500,000 (Full direct rollout)',
        marginCut: '0.0% (100% price retention)',
        debtorTerms: '45 - 60 days retail cash/credit',
        operationalProfile: 'Direct flagship retail presence in Lagos (Victoria Island, Ikeja) and Abuja. Complete ownership of brand customer experience and retail pricing.',
        balanceSheetImpact: 'Adds R 12.5m directly to balance sheet fixed assets (PPE), creating a higher invested capital base and heavier 18.5% WACC capital charge.'
      },
      {
        name: 'Distributor Network',
        type: 'DISTRIBUTOR',
        entryCapEx: 'R 5,000,000 (60% lower CapEx hurdle)',
        marginCut: '15.0% wholesale distributor margin cut',
        debtorTerms: '75 days default commercial debtor terms',
        operationalProfile: 'Partners with tier-one consumer electronics distributors with established dealer networks across all 36 Nigerian states. Instant nationwide distribution.',
        balanceSheetImpact: 'Asset-light entry. Capitalizes only R 5.0m in PPE, preserving Economic Profit (EVA) through a much lower capital charge.'
      }
    ],
    strategicTakeaways: {
      opportunity: 'Huge scale opportunity. Nigeria offers 210,000 addressable units growing at 25% CAGR, providing massive volume absorption to maximize factory capacity utilization.',
      risks: [
        '40% trapped liquidity constraint restricting immediate cash repatriation',
        '20% import tariff compressing unit gross margins',
        'High 18.5% hurdle rate requiring strong operational margins to generate positive Economic Profit',
        'Persistent Naira currency depreciation against the Rand'
      ],
      recommendation: 'For teams with tighter capital or working capital constraints, the Distributor model (R 5.0m CapEx) offers a lower-risk entry with established partner distribution. If choosing Company Stores (R 12.5m CapEx), ensure unit prices and sales volume are sufficient to overcome the 18.5% WACC hurdle, and secure 12-month forward FX hedging to lock in Rand revenue.'
    }
  },
  ke: {
    id: 'ke',
    name: 'Kenya',
    flag: '🇰🇪',
    region: 'East Africa',
    tagline: 'East Africa\'s leading technology and digital financial services hub with stable regulatory frameworks.',
    currency: 'KES (Kenyan Shilling)',
    fxSpotText: 'KSh 1.00 = ~R 0.1435 (Year 1)',
    fxDynamics: 'Moderate currency fluctuations. The Central Bank of Kenya maintains disciplined monetary policies with stable commercial liquidity and transparent foreign exchange access.',
    hedgingAvailable: 'Forward contracts available up to 6-month tenor',
    marketDemandTotal: '95,000 units / year',
    unitBreakdown: [
      { product: 'TechBook', units: '32,000 units' },
      { product: 'Zroid', units: '43,000 units' },
      { product: 'iTab', units: '20,000 units' }
    ],
    demandCagr: '+12.0% annual growth',
    priceIndexText: '0.95 (Moderate Price Tolerance)',
    priceIndexDetail: 'Strong corporate, SME, and education demand with high willingness to pay near-domestic price levels for certified quality hardware and warranty backing.',
    hurdleRate: '15.5% (Base 12.0% + 3.5% Country Risk Premium)',
    countryRiskPremium: '+3.5% (East African regional risk benchmark)',
    repatriationPct: '100% Free Repatriation (0% Trapped)',
    repatriationDetail: 'Kenya operates an open capital account with full currency convertibility. 100% of local operating cash flow can be converted and repatriated back to headquarters without delays.',
    isTrappedCashWarning: false,
    importDuty: '10.0% Import Tariff',
    importDutyDetail: 'East African Community (EAC) common tariff framework imposes 10% duty on consumer tech imports.',
    debtorDaysDefault: 40,
    channels: [
      {
        name: 'Company Stores',
        type: 'OWN',
        entryCapEx: 'R 7,500,000 (Direct retail rollout)',
        marginCut: '0.0% (100% price retention)',
        debtorTerms: '30 - 45 days direct retail cycle',
        operationalProfile: 'Flagship retail showrooms in Nairobi (Westlands, CBD) and Mombasa. Captures premium corporate and retail buyers with direct after-sales service.',
        balanceSheetImpact: 'Adds R 7.5m to fixed assets (PPE). Requires earning above the 15.5% WACC hurdle rate.'
      },
      {
        name: 'Distributor Network',
        type: 'DISTRIBUTOR',
        entryCapEx: 'R 3,000,000 (60% lower CapEx hurdle)',
        marginCut: '12.0% wholesale distributor margin cut',
        debtorTerms: '40 days default wholesale debtor terms',
        operationalProfile: 'Alliances with established East African IT distributors supplying retail electronics chains, universities, and regional dealers.',
        balanceSheetImpact: 'Lightweight entry capitalizing only R 3.0m in PPE, minimizing balance sheet drag and optimizing Economic Profit.'
      }
    ],
    strategicTakeaways: {
      opportunity: 'High-quality, lower-friction regional beachhead. Clean 100% cash repatriation, lower 10% tariffs, and disciplined payment terms make Kenya an attractive diversification target.',
      risks: [
        'Smaller total addressable unit volume than Nigeria (95,000 vs 210,000)',
        'Regional competitive pressure from international electronics brands in Nairobi'
      ],
      recommendation: 'Kenya is the ideal balance of risk and return. The Distributor route (R 3.0m CapEx) provides immediate regional presence with minimal capital charge. Alternatively, Company Stores (R 7.5m CapEx) is viable given the 100% cash repatriation and moderate 15.5% hurdle rate.'
    }
  }
};
