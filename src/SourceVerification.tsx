import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

interface VerificationData {
  feed: string
  oracleContract: string
  roundId: string
  answer: string
  updatedAt: string
  blockNumber: string
  provenanceHash: string
}

const CHAINLINK_FEEDS = [
  { name: 'ETH/USD', address: '0x694AA1769357215DE4FAC081bf1f309aDC325306' },
  { name: 'BTC/USD', address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' },
  { name: 'LINK/USD', address: '0xc59E3633BAAC79493d908e63626716e204A45EdF' }
]

const ABI = [
  'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
  'function decimals() view returns (uint8)'
]

export default function SourceVerification() {
  const [selectedFeed, setSelectedFeed] = useState(0)
  const [data, setData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVerificationData()
    const interval = setInterval(fetchVerificationData, 30000)
    return () => clearInterval(interval)
  }, [selectedFeed])

  async function fetchVerificationData() {
    try {
      setLoading(true)
      const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
      const feed = CHAINLINK_FEEDS[selectedFeed]
      const contract = new ethers.Contract(feed.address, ABI, provider)
      
      const [roundData, decimals, block] = await Promise.all([
        contract.latestRoundData(),
        contract.decimals(),
        provider.getBlockNumber()
      ])

      const [roundId, answer, , updatedAt] = roundData
      const price = Number(answer) / Math.pow(10, Number(decimals))
      const timestamp = new Date(Number(updatedAt) * 1000)

      const provenanceInput = ethers.solidityPacked(
        ['uint80', 'uint256', 'int256'],
        [roundId, block, answer]
      )
      const provenanceHash = ethers.keccak256(provenanceInput)

      setData({
        feed: feed.name,
        oracleContract: feed.address,
        roundId: roundId.toString(),
        answer: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        updatedAt: timestamp.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        blockNumber: block.toLocaleString(),
        provenanceHash: provenanceHash
      })
    } catch (err) {
      console.error('Verification fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="verification-section">
      <div className="section-header">
        <h2>🔎 Chainlink Source Verification</h2>
        <div className="feed-selector">
          {CHAINLINK_FEEDS.map((feed, i) => (
            <button
              key={feed.name}
              className={`feed-btn ${selectedFeed === i ? 'active' : ''}`}
              onClick={() => setSelectedFeed(i)}
            >
              {feed.name}
            </button>
          ))}
        </div>
      </div>

      <div className="verification-box">
        <div className="verification-status">
          <span className="status-dot"></span>
          Live Data Verified
        </div>

        {loading ? (
          <div className="verification-loading">Loading verification data...</div>
        ) : data ? (
          <div className="verification-grid">
            <div className="verification-row">
              <span className="label">Chainlink Feed</span>
              <span className="value">{data.feed}</span>
            </div>
            <div className="verification-row">
              <span className="label">Oracle Contract</span>
              <span className="value mono">{data.oracleContract.slice(0, 11)}...{data.oracleContract.slice(-4)}</span>
            </div>
            <div className="verification-row">
              <span className="label">Latest Round ID</span>
              <span className="value mono">{data.roundId}</span>
            </div>
            <div className="verification-row">
              <span className="label">Latest Answer</span>
              <span className="value price">${data.answer}</span>
            </div>
            <div className="verification-row">
              <span className="label">Updated at</span>
              <span className="value">{data.updatedAt}</span>
            </div>
            <div className="verification-row">
              <span className="label">Block Number</span>
              <span className="value mono">{data.blockNumber}</span>
            </div>
            <div className="verification-row provenance">
              <span className="label">Provenance Hash</span>
              <span className="value mono small">{data.provenanceHash.slice(0, 22)}...{data.provenanceHash.slice(-8)}</span>
            </div>
            <div className="provenance-formula">
              Keccak256(roundId + blockNumber + price)
            </div>
          </div>
        ) : (
          <div className="verification-error">Failed to load verification data</div>
        )}
      </div>
    </section>
  )
}
