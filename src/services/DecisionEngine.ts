export type RiskLevel = 'Low (Govt backed)' | 'Medium' | 'Market-linked';
export type InvestmentCategory = 'Tax Saving' | 'Income' | 'Growth';

export interface DecisionInput {
  calculatorId: 'NSC' | 'KVP' | 'POMIS' | 'POTD' | 'Gratuity';
  realReturn: number; // Inflation-adjusted return %
  is80CEligible: boolean;
  postTaxCAGR: number;
  liquidityScore: number; // 1-10
  riskLevel: RiskLevel;
}

export interface RecommendationOutput {
  title: string;
  description: string;
  status: 'success' | 'warning' | 'info';
}

export class DecisionEngine {
  static getRecommendation(input: DecisionInput): RecommendationOutput {
    const { calculatorId, realReturn, is80CEligible, postTaxCAGR, liquidityScore } = input;

    // 1. Critical wealth erosion check (applies globally)
    if (realReturn < 0) {
      return {
        title: "Wealth Erosion Warning",
        description: `Not ideal for wealth growth due to negative real return (${realReturn.toFixed(1)}%). Your post-tax returns do not beat inflation.`,
        status: 'warning'
      };
    }

    // 2. Calculator-specific evaluations
    switch (calculatorId) {
      case 'NSC':
        if (is80CEligible) {
          return {
            title: "Best for Tax Saving",
            description: "NSC is highly tax-efficient when utilizing 80C. It provides guaranteed growth with low risk. Best held until maturity.",
            status: 'success'
          };
        } else {
          return {
            title: "Guaranteed Compounding",
            description: "Provides zero credit risk growth. However, without 80C benefits, check if post-tax returns meet your financial goals.",
            status: 'info'
          };
        }

      case 'POMIS':
        if (postTaxCAGR > 5) { // Arbitrary good benchmark for post-tax income
          return {
            title: "Best for Monthly Income",
            description: "MIS provides excellent sovereign-backed regular income. Reinvesting this income (e.g., in RD/SIP) can accelerate tracking.",
            status: 'success'
          };
        } else {
          return {
            title: "Reliable Income Stream",
            description: "Provides steady monthly income, but be mindful of the tax liability which reduces effective yield.",
            status: 'info'
          };
        }

      case 'POTD':
        if (is80CEligible) { // 5-Year TD
          return {
            title: "Tax-Efficient Fixed Return",
            description: "The 5-Year TD is an excellent alternative to Bank FDs for Section 80C deduction with sovereign guarantee.",
            status: 'success'
          };
        } else {
          if (liquidityScore < 5) {
            return {
              title: "Short-Term Safe Parking",
              description: "Good for capital preservation over short tenures, though early withdrawal carries penalties.",
              status: 'info'
            };
          }
          return {
            title: "Capital Preservation",
            description: "Offers fixed returns backed by Govt. Compare with liquid funds or short-term FDs for better post-tax efficiency.",
            status: 'info'
          };
        }

      case 'KVP':
        return {
          title: "Long-Term Capital Doubling",
          description: "KVP is purely for growth through doubling. It lacks tax benefits and liquidity is locked for 2.5 years, making it strictly a long-term hold.",
          status: 'info'
        };

      case 'Gratuity':
        return {
          title: "Service Reward",
          description: "Gratuity is a statutory benefit. Maximizing your tenure beyond 5 years solidifies this tax-efficient corpus.",
          status: 'success'
        };

      default:
        return {
          title: "Stable Asset",
          description: "Provides steady returns based on the defined parameters.",
          status: 'info'
        };
    }
  }

  static getRiskConfig(calculatorId: string): { risk: RiskLevel, categories: InvestmentCategory[] } {
    switch (calculatorId) {
      case 'NSC': return { risk: 'Low (Govt backed)', categories: ['Tax Saving', 'Growth'] };
      case 'KVP': return { risk: 'Low (Govt backed)', categories: ['Growth'] };
      case 'POMIS': return { risk: 'Low (Govt backed)', categories: ['Income'] };
      case 'POTD': return { risk: 'Low (Govt backed)', categories: ['Income', 'Tax Saving'] };
      case 'Gratuity': return { risk: 'Low (Govt backed)', categories: ['Income'] };
      default: return { risk: 'Medium', categories: ['Growth'] };
    }
  }
}
