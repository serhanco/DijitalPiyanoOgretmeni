// Profile chart: share of notes played on the beat in each rhythm session.

import { useState } from 'react'
import { findLesson } from '../progress/curriculum'
import type { RhythmTrend } from '../progress/rhythmTrend'
import { describeOffset } from '../rhythm/timing'

const W = 320
const H = 140
const PAD = { top: 16, right: 8, bottom: 8, left: 34 }

const pct = (x: number) => `%${Math.round(x * 100)}`

export function RhythmChart({ trend }: { trend: RhythmTrend }) {
  const [hover, setHover] = useState<number | null>(null)
  const { points, change } = trend
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(points.length, 6)
  const barW = Math.min(22, slot - 6)
  const y = (v: number) => PAD.top + (1 - v) * plotH
  const last = points[points.length - 1]
  const shown = hover !== null ? points[hover] : last

  return (
    <div className="rhythm-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Son ${points.length} ritim dersinde vuruşunda çalınan notalar: ${points.map((p) => pct(p.onBeat)).join(', ')}`}
        onPointerLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
              {pct(v)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2
          const top = y(Math.max(p.onBeat, 0.02))
          const r = Math.min(4, barW / 2)
          const bottom = y(0)
          return (
            <g key={p.at} onPointerEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect className="hit" x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} />
              <path
                className={`bar ${hover === i ? 'on' : ''}`}
                d={`M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${bottom} Z`}
              />
              {i === points.length - 1 && (
                <text className="value" x={x + barW / 2} y={top - 4} textAnchor="middle">
                  {pct(p.onBeat)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="small chart-caption">
        {shown && (
          <>
            <b>{findLesson(shown.lessonId)?.title ?? shown.lessonId}</b>
            {' · '}
            {new Date(shown.at).toLocaleDateString('tr-TR')} · {shown.bpm} BPM · vuruşunda {pct(shown.onBeat)}
            {shown.meanOffsetMs !== null && <> · ortalama {describeOffset(shown.meanOffsetMs)}</>}
          </>
        )}
      </p>
      {change !== null && (
        <p className="small muted">
          {change >= 0.02
            ? `Son derslerinde ilk derslerine göre ${Math.round(change * 100)} puan daha çok vuruşunda çalıyorsun.`
            : change <= -0.02
              ? `Son derslerde vuruşunda çalma oranın ${Math.round(-change * 100)} puan düştü. Tempoyu biraz düşürmeyi dene.`
              : 'Vuruşunda çalma oranın sabit. Tempoyu biraz artırıp kendini zorlayabilirsin.'}
        </p>
      )}
    </div>
  )
}
