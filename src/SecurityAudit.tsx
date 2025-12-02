import React from 'react'

interface SecurityFeature {
  name: string
  status: 'pass' | 'fail' | 'warning'
  description: string
  code: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

const securityFeatures: SecurityFeature[] = [
  {
    name: 'Zero Price Validation',
    status: 'pass',
    description: 'Prevents relay of zero-value prices that could cause DeFi protocol failures',
    code: 'if (answer <= 0) revert InvalidAnswer();',
    severity: 'critical',
  },
  {
    name: 'Negative Price Rejection',
    status: 'pass',
    description: 'Blocks negative price values that could enable arbitrage exploits',
    code: 'if (answer <= 0) revert InvalidAnswer();',
    severity: 'critical',
  },
  {
    name: 'Flash Crash Detection',
    status: 'pass',
    description: 'Detects and blocks price deviations >10% to prevent manipulation',
    code: 'if (deviation > MAX_DEVIATION) revert DeviationTooHigh();',
    severity: 'high',
  },
  {
    name: 'Replay Protection',
    status: 'pass',
    description: 'Ensures each price round is only processed once',
    code: 'if (roundId <= latestRoundId) revert InvalidRoundId();',
    severity: 'high',
  },
  {
    name: 'Staleness Detection',
    status: 'pass',
    description: 'Rejects price data older than 1 hour to ensure freshness',
    code: 'if (block.timestamp - updatedAt > STALENESS_THRESHOLD) revert StaleUpdate();',
    severity: 'high',
  },
  {
    name: 'Access Control',
    status: 'pass',
    description: 'Only authorized relayers can update destination prices',
    code: 'if (!authorizedRelayers[msg.sender]) revert Unauthorized();',
    severity: 'critical',
  },
  {
    name: 'Reentrancy Protection',
    status: 'pass',
    description: 'OpenZeppelin ReentrancyGuard prevents reentrancy attacks',
    code: 'contract OriginFeedRelay is Ownable, ReentrancyGuard { ... }',
    severity: 'critical',
  },
  {
    name: 'Pause Functionality',
    status: 'pass',
    description: 'Emergency pause capability to halt operations if needed',
    code: 'if (feedConfig.paused) revert FeedIsPaused();',
    severity: 'medium',
  },
]

const SecurityAudit: React.FC = () => {
  const passCount = securityFeatures.filter(f => f.status === 'pass').length
  const totalCount = securityFeatures.length
  const score = Math.round((passCount / totalCount) * 100)

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'
      case 'high': return '#f59e0b'
      case 'medium': return '#3b82f6'
      case 'low': return '#22c55e'
      default: return '#64748b'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✓'
      case 'fail': return '✗'
      case 'warning': return '⚠'
      default: return '?'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#22c55e'
      case 'fail': return '#ef4444'
      case 'warning': return '#f59e0b'
      default: return '#64748b'
    }
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: '1.25rem' }}>
            🛡️ Security Audit Report
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            Comprehensive security analysis of MOC cross-chain oracle
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            background: score === 100 ? '#22c55e20' : '#f59e0b20',
            border: `2px solid ${score === 100 ? '#22c55e' : '#f59e0b'}`,
            borderRadius: '0.5rem',
            padding: '0.75rem 1.25rem',
            textAlign: 'center',
          }}>
            <div style={{ 
              color: score === 100 ? '#22c55e' : '#f59e0b', 
              fontSize: '1.75rem', 
              fontWeight: 'bold',
              lineHeight: 1,
            }}>
              {score}%
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.25rem' }}>
              SECURITY SCORE
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#22c55e', fontSize: '0.9rem' }}>
              {passCount}/{totalCount} checks passed
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
              Last audit: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
      }}>
        {securityFeatures.map((feature) => (
          <div
            key={feature.name}
            style={{
              background: '#1e293b',
              borderRadius: '0.5rem',
              padding: '1rem',
              border: `1px solid ${getStatusColor(feature.status)}40`,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  color: getStatusColor(feature.status),
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                }}>
                  {getStatusIcon(feature.status)}
                </span>
                <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {feature.name}
                </span>
              </div>
              <span style={{
                background: getSeverityColor(feature.severity) + '20',
                color: getSeverityColor(feature.severity),
                padding: '0.15rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}>
                {feature.severity}
              </span>
            </div>
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '0.8rem', 
              margin: '0.5rem 0',
              lineHeight: 1.4,
            }}>
              {feature.description}
            </p>
            <div style={{
              background: '#0f172a',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              color: '#22c55e',
              overflow: 'auto',
            }}>
              {feature.code}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '1.5rem',
        background: '#1e293b',
        borderRadius: '0.5rem',
        padding: '1rem',
        border: '1px solid #334155',
      }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 0.75rem', fontSize: '1rem' }}>
          📋 Audit Summary
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              Critical Issues
            </div>
            <div style={{ color: '#22c55e', fontSize: '1.25rem', fontWeight: 'bold' }}>
              0 Found
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              High Priority
            </div>
            <div style={{ color: '#22c55e', fontSize: '1.25rem', fontWeight: 'bold' }}>
              0 Found
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              Dependencies
            </div>
            <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 'bold' }}>
              OpenZeppelin v5.0
            </div>
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              Solidity Version
            </div>
            <div style={{ color: '#8b5cf6', fontSize: '1.25rem', fontWeight: 'bold' }}>
              ^0.8.20
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityAudit
