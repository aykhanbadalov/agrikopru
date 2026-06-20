import { Dimensions, StyleSheet, Text } from 'react-native';
import { Circle, Line, Polyline, Svg, Text as SvgText } from 'react-native-svg';
import type { ScoreHistoryPoint } from '../services/api';

export const BAND_COLOR: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#ef4444',
};

const CHART_H = 120;
const PAD = { top: 10, bottom: 28, left: 24, right: 24 };

export default function ScoreChart({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length < 2) {
    return <Text style={styles.noHistory}>Henüz yeterli geçmiş yok.</Text>;
  }

  const W = Dimensions.get('window').width - 64;
  const xStep = (W - PAD.left - PAD.right) / (points.length - 1);
  const yRange = CHART_H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (score: number) => PAD.top + yRange * (1 - score / 1000);

  const polyPoints = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

  return (
    <Svg width={W} height={CHART_H}>
      {[0, 500, 1000].map((v) => (
        <Line
          key={v}
          x1={PAD.left} y1={toY(v)}
          x2={W - PAD.right} y2={toY(v)}
          stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3"
        />
      ))}
      <Polyline points={polyPoints} fill="none" stroke="#6b7280" strokeWidth={1.5} />
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={toX(i)} cy={toY(p.score)} r={5}
          fill={BAND_COLOR[p.risk_band] ?? '#9ca3af'}
        />
      ))}
      {points.map((p, i) => {
        const d = new Date(p.created_at);
        const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        return (
          <SvgText
            key={i}
            x={toX(i)} y={CHART_H - 4}
            fontSize={9} fill="#9ca3af" textAnchor="middle"
          >{label}</SvgText>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  noHistory: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
});
