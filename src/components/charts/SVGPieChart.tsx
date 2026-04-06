// ═══════════════════════════════════════════════════════════════
// FINCALIX — SVG PIE CHART (Pure React, no dependencies)
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

interface Props {
  data: PieSlice[];
  size?: number;
  innerRadius?: number; // 0 = full pie, >0 = donut
  showLabels?: boolean;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
  textColor?: string;
  mutedColor?: string;
}

export default function SVGPieChart({
  data,
  size = 200,
  innerRadius = 55,
  showLabels = false,
  showLegend = true,
  centerLabel,
  centerValue,
  textColor = '#1C1917',
  mutedColor = '#78716C',
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl mb-1">📭</span>
        <span className="text-[10px]" style={{ color: mutedColor }}>No data</span>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 4;

  // Build slices
  const slices: { slice: PieSlice; startAngle: number; endAngle: number; percentage: number }[] = [];
  let currentAngle = -90; // start from top

  data.forEach(slice => {
    const pct = (slice.value / total) * 100;
    const angle = (slice.value / total) * 360;
    slices.push({
      slice,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      percentage: pct,
    });
    currentAngle += angle;
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) => {
    // Clamp to prevent full-circle edge case
    const sweep = endAngle - startAngle;
    const largeArc = sweep > 180 ? 1 : 0;

    if (sweep >= 359.99) {
      // Full circle — draw two semicircles
      const m1 = polarToCartesian(cx, cy, outerR, startAngle);
      const m2 = polarToCartesian(cx, cy, outerR, startAngle + 180);
      const i1 = polarToCartesian(cx, cy, innerR, startAngle);
      const i2 = polarToCartesian(cx, cy, innerR, startAngle + 180);
      return [
        `M ${m1.x} ${m1.y}`,
        `A ${outerR} ${outerR} 0 0 1 ${m2.x} ${m2.y}`,
        `A ${outerR} ${outerR} 0 0 1 ${m1.x} ${m1.y}`,
        innerR > 0 ? `M ${i1.x} ${i1.y}` : '',
        innerR > 0 ? `A ${innerR} ${innerR} 0 0 0 ${i2.x} ${i2.y}` : '',
        innerR > 0 ? `A ${innerR} ${innerR} 0 0 0 ${i1.x} ${i1.y}` : '',
        'Z',
      ].join(' ');
    }

    const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

    if (innerR > 0) {
      return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerStart.x} ${innerStart.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
        'Z',
      ].join(' ');
    }

    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ');
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s, i) => (
            <motion.path
              key={i}
              d={describeArc(cx, cy, outerRadius, innerRadius, s.startAngle, s.endAngle)}
              fill={s.slice.color}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              stroke={innerRadius > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)'}
              strokeWidth={1}
            />
          ))}
          {/* Label on slices */}
          {showLabels && slices.filter(s => s.percentage > 5).map((s, i) => {
            const midAngle = (s.startAngle + s.endAngle) / 2;
            const labelR = (outerRadius + innerRadius) / 2;
            const pos = polarToCartesian(cx, cy, labelR, midAngle);
            return (
              <text
                key={i}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={9}
                fontWeight={700}
              >
                {s.percentage.toFixed(0)}%
              </text>
            );
          })}
        </svg>

        {/* Center text for donut */}
        {innerRadius > 0 && centerValue && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <span className="text-sm font-bold" style={{ color: textColor }}>{centerValue}</span>
            {centerLabel && (
              <span className="text-[9px] font-medium" style={{ color: mutedColor }}>{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2">
          {data.filter(d => d.value > 0).map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[9px] font-medium" style={{ color: mutedColor }}>
                {d.icon ? `${d.icon} ` : ''}{d.label}
              </span>
              <span className="text-[9px] font-bold" style={{ color: textColor }}>
                {((d.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
