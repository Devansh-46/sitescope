// components/ScoreGauge.tsx
// Animated SVG circular gauge for the overall score
'use client';

import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#00ff88';
  if (score >= 75) return '#00d4ff';
  if (score >= 60) return '#ffb800';
  if (score >= 45) return '#ff7a00';
  return '#ff3366';
}

function getGradeLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 45) return 'Poor';
  return 'Critical';
}

export default function ScoreGauge({ score, grade, size = 180 }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(score);
  useEffect(() => { setAnimatedScore(0) }, []);
  const [strokeOffset, setStrokeOffset] = useState(283);

  const radius = 45;
  const circumference = 2 * Math.PI * radius; // 282.7
  const center = size / 2;

  useEffect(() => {
    // Animate score number counting up
    let frame = 0;
    const totalFrames = 60;
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(score * eased));
      setStrokeOffset(circumference - (score / 100) * circumference * eased);
      if (frame >= totalFrames) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [score, circumference]);

  const color = getScoreColor(score);
  const label = getGradeLabel(score);
  const scaleFactor = size / 100;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="drop-shadow-lg"
        >
          {/* Outer decorative ring */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(0,212,255,0.05)"
            strokeWidth="0.5"
            strokeDasharray="4 2"
          />

          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1a2535"
            strokeWidth="8"
          />

          {/* Animated score arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 50 50)"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: 'stroke 0.3s ease',
            }}
          />

          {/* Inner glow circle */}
          <circle
            cx="50"
            cy="50"
            r="33"
            fill="rgba(8,13,20,0.9)"
          />

          {/* Score number */}
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fill={color}
            fontSize="20"
            fontWeight="700"
            fontFamily="var(--font-display)"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          >
            {animatedScore}
          </text>

          {/* /100 label */}
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="#3d5269"
            fontSize="7"
            fontFamily="var(--font-mono)"
          >
            /100
          </text>

          {/* Tick marks */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = 50 + 46 * Math.cos(rad);
            const y1 = 50 + 46 * Math.sin(rad);
            const x2 = 50 + 42 * Math.cos(rad);
            const y2 = 50 + 42 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0,212,255,0.15)"
                strokeWidth="0.5"
              />
            );
          })}
        </svg>
      </div>

      {/* Grade badge */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 border rounded-lg px-4 py-2"
          style={{
            borderColor: `${color}40`,
            backgroundColor: `${color}10`,
          }}
        >
          <span
            className="font-display font-bold text-2xl"
            style={{ color, textShadow: `0 0 12px ${color}60` }}
          >
            {grade}
          </span>
          <span className="text-text-secondary font-body text-sm">{label}</span>
        </div>
      </div>
    </div>
  );
}
