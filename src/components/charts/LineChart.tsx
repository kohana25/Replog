import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export interface LinePoint {
  label: string;
  value: number;
}

/**
 * Minimal progression line, drawn with react-native-svg (bundled with
 * Expo Go). Used for exercise weight progression and body-weight trend.
 */
export function LineChart({
  points,
  height = 150,
  width = 320,
  unitSuffix = '',
  emptyMessage = 'Log this at least twice to see a trend.',
}: {
  points: LinePoint[];
  height?: number;
  width?: number;
  unitSuffix?: string;
  emptyMessage?: string;
}) {
  const { colors, typography, spacing } = useTheme();

  if (points.length < 2) {
    return <Text style={[typography.caption, { color: colors.textMuted }]}>{emptyMessage}</Text>;
  }

  const padding = { top: 12, right: 10, bottom: 10, left: 10 };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);

  const coords = points.map((point, index) => {
    const x = padding.left + (index / (points.length - 1)) * plotWidth;
    const y = padding.top + (1 - (point.value - min) / span) * plotHeight;
    return { x, y, ...point };
  });

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const change = last - first;

  const summary = `Trend from ${Math.round(first)}${unitSuffix} to ${Math.round(last)}${unitSuffix}, ${
    change >= 0 ? 'up' : 'down'
  } ${Math.abs(Math.round(change * 10) / 10)}${unitSuffix} over ${points.length} sessions.`;

  return (
    <View accessible accessibilityLabel={summary} style={{ gap: spacing.sm }}>
      <Svg width={width} height={height}>
        <Line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline
          points={coords.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={index === coords.length - 1 ? 5 : 3.5}
            fill={index === coords.length - 1 ? colors.accent : colors.primary}
          />
        ))}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[typography.micro, { color: colors.textSubtle }]}>{points[0].label}</Text>
        <Text style={[typography.micro, { color: colors.textSubtle }]}>
          {points[points.length - 1].label}
        </Text>
      </View>

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Trend: {change >= 0 ? '+' : ''}
        {Math.round(change * 10) / 10}
        {unitSuffix} over {points.length} sessions
      </Text>
    </View>
  );
}
