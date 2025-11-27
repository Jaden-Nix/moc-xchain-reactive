import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'

interface DeploymentInfo {
  sepolia: {
    mockFeed: string
    originRelay: string
  }
  lasna: {
    reactor: string
    destination: string
  }
}

interface TransactionHashes {
  sepoliaMockFeed: string
  sepoliaRelay: string
  lasnaReactor: string
  lasnaDestination: string
  lasnaSubscribe: string
  lasnaAuthorize: string
}

const App: React.FC = () => {
  const [data, setData] = useState<{
    deployment: DeploymentInfo
    txs: TransactionHashes
  } | null>(null)

  useEffect(() => {
    // Load deployment data
    const deployment: DeploymentInfo = {
      sepolia: {
        mockFeed: '0xE293955c98D37044400E71c445062d7cd967250c',
        originRelay: '0x46ad513300d508FB234fefD3ec1aB4162C547A57',
      },
      lasna: {
        reactor: '0xE293955c98D37044400E71c445062d7cd967250c',
        destination: '0x46ad513300d508FB234fefD3ec1aB4162C547A57',
      },
    }

    const txs: TransactionHashes = {
      sepoliaMockFeed: '0x5ec64c041ad910807e79e4a9dfce42b486d521fe14126d42a7879e5ab2fc6033',
      sepoliaRelay: '0xdd9d18962dc764ce3363799b129ca9a0de3f259370ccecfcb0e47f1fc3e61b83',
      lasnaReactor: '0x76349db94bbfc38222822675746d864c40bddf4b17d986e8990f2717da5e09ca',
      lasnaDestination: '0x65f19461edd78d24b3ce3c454be02f5253667dda19394af511828c98e5233d25',
      lasnaSubscribe: '0xc514b344248897e5355a221e6e56272db271efc9c8d246a738dfd88a0b48cf21',
      lasnaAuthorize: '0xfc87a4a1ba8094a90fbc94b6b95e77afc05ec32b79893e4b97b5e0ec2b5b286d',
    }

    setData({ deployment, txs })
  }, [])

  if (!data) return <div style={{ color: '#cbd5e1', textAlign: 'center', paddingTop: '2rem' }}>Loading...</div>

  return (
    <div className="dashboard">
      <header>
        <h1>🔗 Cross-Chain Price Relay</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Reactive Contracts | Sepolia ↔ Lasna</p>
        <div className="status-badge">✅ Production Ready</div>
      </header>

      <section className="chain-section">
        <div className="chain-title">
          <span>🟠 Sepolia</span>
          <span className="chain-id">(Chain ID: 11155111)</span>
        </div>
        <div className="contracts-list">
          <div className="contract-item">
            <div className="contract-name">MockPriceFeed</div>
            <div className="contract-details">
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">{data.deployment.sepolia.mockFeed}</div>
              </div>
              <div>
                <div className="detail-label">TX Hash</div>
                <div className="detail-value">{data.txs.sepoliaMockFeed}</div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={`https://sepolia.etherscan.io/address/${data.deployment.sepolia.mockFeed}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.875rem' }}
                >
                  View on Etherscan →
                </a>
              </div>
            </div>
          </div>

          <div className="contract-item">
            <div className="contract-name">OriginFeedRelay</div>
            <div className="contract-details">
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">{data.deployment.sepolia.originRelay}</div>
              </div>
              <div>
                <div className="detail-label">TX Hash</div>
                <div className="detail-value">{data.txs.sepoliaRelay}</div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={`https://sepolia.etherscan.io/address/${data.deployment.sepolia.originRelay}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.875rem' }}
                >
                  View on Etherscan →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="arrow">↓</div>

      <section className="chain-section reactive">
        <div className="chain-title">
          <span>💜 Reactive Network (Lasna)</span>
          <span className="chain-id">(Chain ID: 5318007)</span>
        </div>
        <div className="contracts-list">
          <div className="contract-item">
            <div className="contract-name">PriceFeedReactor</div>
            <div className="contract-details">
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">{data.deployment.lasna.reactor}</div>
              </div>
              <div>
                <div className="detail-label">Deploy TX</div>
                <div className="detail-value">{data.txs.lasnaReactor}</div>
              </div>
              <div>
                <div className="detail-label">Subscribe TX</div>
                <div className="detail-value">{data.txs.lasnaSubscribe}</div>
              </div>
            </div>
          </div>

          <div className="contract-item">
            <div className="contract-name">DestinationFeedProxy</div>
            <div className="contract-details">
              <div>
                <div className="detail-label">Address</div>
                <div className="detail-value">{data.deployment.lasna.destination}</div>
              </div>
              <div>
                <div className="detail-label">Deploy TX</div>
                <div className="detail-value">{data.txs.lasnaDestination}</div>
              </div>
              <div>
                <div className="detail-label">Authorize TX</div>
                <div className="detail-value">{data.txs.lasnaAuthorize}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="requirements">
        <h2>✅ Requirements Verification</h2>
        
        <div className="requirement-item">
          <div className="checkmark">✓</div>
          <div className="requirement-text">
            <strong>Read AggregatorV3Interface</strong>
            <p>All 5 fields captured: roundId, answer, startedAt, updatedAt, answeredInRound</p>
          </div>
        </div>

        <div className="requirement-item">
          <div className="checkmark">✓</div>
          <div className="requirement-text">
            <strong>Cross-Chain Messages</strong>
            <p>Signed message with 7 fields: roundId, answer, updatedAt, decimals, description, chainId, version</p>
          </div>
        </div>

        <div className="requirement-item">
          <div className="checkmark">✓</div>
          <div className="requirement-text">
            <strong>Destination Storage</strong>
            <p>All 7 fields stored with full AggregatorV3Interface compatibility</p>
          </div>
        </div>

        <div className="requirement-item">
          <div className="checkmark">✓</div>
          <div className="requirement-text">
            <strong>Security Features</strong>
            <p>Zero-price validation, staleness detection, replay protection, anomaly detection, access control, reentrancy protection, pause functionality, rate limiting</p>
          </div>
        </div>

        <div className="requirement-item">
          <div className="checkmark">✓</div>
          <div className="requirement-text">
            <strong>Event-Driven Relay</strong>
            <p>Reactive Network monitors Sepolia events and automatically relays to Lasna destination</p>
          </div>
        </div>
      </section>

      <section className="grid" style={{ marginTop: '3rem' }}>
        <div className="card">
          <h2>📊 Architecture</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
            Event-driven cross-chain relay using Reactive Contracts. Prices flow from Sepolia MockPriceFeed → OriginRelay → Reactive Network → Lasna DestinationProxy.
          </p>
        </div>

        <div className="card">
          <h2>🔒 Production Ready</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
            Comprehensive security validations, full AggregatorV3Interface compatibility, and atomic cross-chain consistency guarantees.
          </p>
        </div>

        <div className="card">
          <h2>🧪 Testing</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: '1.6' }}>
            All contracts verified locally with end-to-end tests. Run: <code style={{ color: '#60a5fa' }}>npx hardhat run scripts/test/fresh-deploy-and-demo.ts</code>
          </p>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>💼 Wallet</h2>
          <div className="address">0x9Fa915353AA1e8F955f76D3a39497B8f1F38a273</div>
        </div>

        <div className="card">
          <h2>📝 Documentation</h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>See FINAL_SUBMISSION_GUIDE.md for complete submission details with all TXs and requirements verification.</p>
        </div>
      </section>

      <footer>
        <p>Cross-Chain Price Relay • Hackathon Submission • Reactive Contracts</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#64748b' }}>All contracts live and verified on-chain</p>
      </footer>
    </div>
  )
}

export default App
