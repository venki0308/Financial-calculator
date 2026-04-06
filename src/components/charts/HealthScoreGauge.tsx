// ═══════════════════════════════════════════════════════════════
// FINCALIX — FINANCIAL HEALTH SCORE GAUGE (SVG Arc)
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import type { FinancialHealthScore } from '../../utils/expenseCalculations';

interface Props {
  score: FinancialHealthScore;
  size?: number;
  textColor?: string;
  mutedColor?: string;
  bgColor?: string;
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#16A34A',
  'A': '#22c55e',
  'B+': '#84cc16',
  'B': '#eab308',
  'C': '#f59e0b',
  'D': '#ef4444',
  'F': '#dc2626',
};

export default function HealthScoreGauge({
  score,
  size = 180,
  textColor = '#1C1917',
  mutedColor = '#78716C',
  bgColor = 'rgba(0,0,0,0.06)',
}: Props) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size / 2 - 16;
  const strokeWidth = 14;

  // Arc from -210° to +30° (240° sweep, bottom-centered gap)
  const startAngle = -210;
  const endAngle = 30;
  const totalSweep = endAngle - startAngle; // 240°
  const scoreAngle = startAngle + (score.overall / 100) * totalSweep;
  const gradeColor = GRADE_COLORS[score.grade] || '#94a3b8';

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startA: number, endA: number) => {
    const start = polarToCartesian(startA);
    const end = polarToCartesian(endA);
    const sweep = endA - startA;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Calculate stroke-dasharray for animated fill
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalSweep / 360) * circumference;
  const filledLength = (score.overall / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Score arc */}
        <motion.path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={gradeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={arcLength - filledLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: arcLength - filledLength }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(tick => {
          const tickAngle = startAngle + (tick / 100) * totalSweep;
          const outer = polarToCartesian(tickAngle);
          const inner = {
            x: cx + (radius - strokeWidth / 2 - 4) * Math.cos((tickAngle * Math.PI) / 180),
            y: cy + (radius - strokeWidth / 2 - 4) * Math.sin((tickAngle * Math.PI) / 180),
          };
          return (
            <line key={tick} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke={mutedColor} strokeWidth={1.5} opacity={0.3} />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 12 }}>
        <motion.span
          className="text-3xl font-black leading-none"
          style={{ color: gradeColor }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {score.overall}
        </motion.span>
        <span className="text-[10px] font-bold mt-0.5" style={{ color: mutedColor }}>/ 100</span>
        <motion.span
          className="text-xs font-black mt-1 px-3 py-0.5 rounded-full"
          style={{ backgroundColor: `${gradeColor}18`, color: gradeColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Grade {score.grade}
        </motion.span>
      </div>
    </div>
  );
}
