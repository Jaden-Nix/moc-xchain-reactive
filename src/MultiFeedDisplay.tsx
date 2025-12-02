import React from 'react'
import { PriceData, CHAINLINK_SEPOLIA_FEEDS } from './chainlinkFeeds'

interface MultiFeedDisplayProps {
  prices: PriceData[]
  isLoading: boolean
  onRefresh: () => void
}

const MultiFeedDisplay: React.FC<MultiFeedDisplayProps> = ({ prices, isLoading, onRefresh }) => {
  const getFeedIcon = (pair: string) => {
    if (pair.includes('ETH')) return '⟠'
    if (pair.includes('BTC')) return '₿'
    if (pair.includes('LINK')) return '⬡'
    return '💱'
  }

  const getFeedColor = (pair: string) => {
    if (pair.includes('ETH')) return '#627eea'
    if (pair.includes('BTC')) return '#f7931a'
    if (pair.includes('LINK')) return '#375bd2'
    return '#22c55e'
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <div>
          <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: '1.25rem' }}>
            📡 Live Chainlink Feeds
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
            Real-time prices from Sepolia testnet
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            background: isLoading ? '#334155' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {isLoading ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
              Loading...
            </>
          ) : (
            <>⟳ Refresh</>
          )}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {CHAINLINK_SEPOLIA_FEEDS.map((feed) => {
          const priceData = prices.find(p => p.pair === feed.pair)
          const color = getFeedColor(feed.pair)
          
          return (
            <div
              key={feed.address}
              style={{
                background: '#1e293b',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                border: `1px solid ${color}30`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '80px',
                height: '80px',
                background: `radial-gradient(circle at top right, ${color}15, transparent)`,
              }} />
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                }}>
                  {getFeedIcon(feed.pair)}
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1rem' }}>
                    {feed.pair}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginTop: '0.15rem',
                  }}>
                    <span style={{
                      background: priceData?.isReal ? '#22c55e20' : '#f59e0b20',
                      color: priceData?.isReal ? '#22c55e' : '#f59e0b',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                    }}>
                      {priceData?.isReal ? 'LIVE CHAINLINK' : 'LOADING'}
                    </span>
                  </div>
                </div>
              </div>

              {priceData ? (
                <>
                  <div style={{
                    color: color,
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    marginBottom: '0.75rem',
                  }}>
                    {priceData.priceFormatted}
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                  }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Round ID</div>
                      <div style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                        {priceData.roundId.slice(-8)}...
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>Updated</div>
                      <div style={{ color: '#94a3b8' }}>
                        {formatTimeAgo(priceData.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: '#0f172a',
                    borderRadius: '0.375rem',
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    color: '#64748b',
                    wordBreak: 'break-all',
                  }}>
                    {feed.address}
                  </div>
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100px',
                  color: '#64748b',
                }}>
                  {isLoading ? (
                    <span style={{ animation: 'pulse 2s infinite' }}>Loading...</span>
                  ) : (
                    'Failed to load'
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MultiFeedDisplay
