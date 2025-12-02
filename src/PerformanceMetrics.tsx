import React from 'react'
import { PerformanceMetrics as Metrics } from './chainlinkFeeds'

interface PerformanceMetricsProps {
  metrics: Metrics
  isLoading?: boolean
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics, isLoading }) => {
  const formatGas = (gas: number) => {
    if (gas >= 1000000) return `${(gas / 1000000).toFixed(2)}M`
    if (gas >= 1000) return `${(gas / 1000).toFixed(1)}K`
    return gas.toString()
  }

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return '#22c55e'
    if (value >= thresholds.warning) return '#f59e0b'
    return '#ef4444'
  }

  const metricsData = [
    {
      label: 'Success Rate',
      value: `${metrics.successRate}%`,
      color: getStatusColor(metrics.successRate, { good: 95, warning: 80 }),
      icon: '✓',
      description: 'Successful relay transactions',
    },
    {
      label: 'Uptime',
      value: `${metrics.uptime}%`,
      color: getStatusColor(metrics.uptime, { good: 99, warning: 95 }),
      icon: '⚡',
      description: 'System availability',
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avgLatency}s`,
      color: metrics.avgLatency <= 5 ? '#22c55e' : metrics.avgLatency <= 15 ? '#f59e0b' : '#ef4444',
      icon: '⏱',
      description: 'Average time between relays',
    },
    {
      label: 'Total Relays',
      value: metrics.totalRelays.toString(),
      color: '#3b82f6',
      icon: '📊',
      description: 'Total cross-chain transactions',
    },
    {
      label: 'Gas Used',
      value: formatGas(metrics.gasUsed),
      color: '#8b5cf6',
      icon: '⛽',
      description: 'Total gas consumed',
    },
    {
      label: 'Last Update',
      value: metrics.lastUpdateTime > 0 
        ? new Date(metrics.lastUpdateTime).toLocaleTimeString()
        : 'N/A',
      color: '#06b6d4',
      icon: '🕐',
      description: 'Most recent relay',
    },
  ]

  if (isLoading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: '#1e293b',
              borderRadius: '0.5rem',
              padding: '1rem',
              animation: 'pulse 2s infinite',
            }}
          >
            <div style={{ height: '1rem', background: '#334155', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
            <div style={{ height: '2rem', background: '#334155', borderRadius: '0.25rem' }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '1rem',
    }}>
      {metricsData.map((metric) => (
        <div
          key={metric.label}
          style={{
            background: '#1e293b',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: `1px solid ${metric.color}20`,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 4px 12px ${metric.color}20`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem',
          }}>
            <span style={{ fontSize: '1rem' }}>{metric.icon}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{metric.label}</span>
          </div>
          <div style={{ 
            color: metric.color, 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            fontFamily: 'monospace',
          }}>
            {metric.value}
          </div>
          <div style={{ 
            color: '#64748b', 
            fontSize: '0.65rem',
            marginTop: '0.25rem',
          }}>
            {metric.description}
          </div>
        </div>
      ))}
    </div>
  )
}

export default PerformanceMetrics
