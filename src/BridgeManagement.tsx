import { useState, useEffect } from 'react';

interface BridgeStatus {
  feed: string;
  originRelay: string;
  reactor: string;
  destination: string;
  status: 'active' | 'syncing' | 'stale' | 'unfunded' | 'error';
  lastUpdate: number | null;
  lastRoundId: string | null;
  decimals: number;
  gasBalance: string;
}

const BRIDGES = [
  {
    feed: 'ETH/USD',
    originRelay: '0xee481f6Fad0209880D61a072Ee7307CDC74dCDf8',
    reactor: '0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25',
    destination: '0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581',
    chainlinkFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  },
  {
    feed: 'BTC/USD',
    originRelay: '0x12B74592d6077C1E52a814118169b1A7B78DC4F2',
    reactor: '0xe8B05809c380e7E52bd68b113A737241678c202C',
    destination: '0x3C828678De4F4184952D66f2d0260B5db2e0f522',
    chainlinkFeed: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  },
  {
    feed: 'LINK/USD',
    originRelay: '0x760FBf81b2FE506dEc35dA1385E65C79A8fD12FB',
    reactor: '0x7a0D8E6FDd1760C61a9f422036Db098E4D3ae659',
    destination: '0x3E6114bdd39db5c624C67FbCEDe7B3053E621915',
    chainlinkFeed: '0xc59E3633BAAC79493d908e63626716e204A45EdF',
  },
];

const LASNA_RPC = 'https://lasna-rpc.rnk.dev';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

async function fetchBridgeStatuses(): Promise<BridgeStatus[]> {
  const { ethers } = await import('ethers');
  const lasnaProvider = new ethers.JsonRpcProvider(LASNA_RPC);
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  
  const destABI = [
    'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
    'function decimals() view returns (uint8)',
  ];
  
  const statuses: BridgeStatus[] = [];
  
  for (const bridge of BRIDGES) {
    try {
      const destContract = new ethers.Contract(bridge.destination, destABI, lasnaProvider);
      const [reactorBalance, destBalance] = await Promise.all([
        lasnaProvider.getBalance(bridge.reactor),
        lasnaProvider.getBalance(bridge.destination),
      ]);
      
      let status: BridgeStatus['status'] = 'active';
      let lastUpdate: number | null = null;
      let lastRoundId: string | null = null;
      let decimals = 8;
      
      try {
        const [roundId, , , updatedAt] = await destContract.latestRoundData();
        decimals = await destContract.decimals();
        lastUpdate = Number(updatedAt);
        lastRoundId = roundId.toString();
        
        const age = Math.floor(Date.now() / 1000) - lastUpdate;
        if (age < 300) status = 'active';
        else if (age < 3600) status = 'stale';
        else status = 'error';
      } catch {
        status = 'syncing';
      }
      
      const totalBalance = reactorBalance + destBalance;
      if (totalBalance < ethers.parseEther('0.01')) {
        status = 'unfunded';
      }
      
      statuses.push({
        feed: bridge.feed,
        originRelay: bridge.originRelay,
        reactor: bridge.reactor,
        destination: bridge.destination,
        status,
        lastUpdate,
        lastRoundId,
        decimals,
        gasBalance: ethers.formatEther(totalBalance),
      });
    } catch (error) {
      statuses.push({
        feed: bridge.feed,
        originRelay: bridge.originRelay,
        reactor: bridge.reactor,
        destination: bridge.destination,
        status: 'error',
        lastUpdate: null,
        lastRoundId: null,
        decimals: 8,
        gasBalance: '0',
      });
    }
  }
  
  return statuses;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#22c55e';
    case 'syncing': return '#3b82f6';
    case 'stale': return '#f59e0b';
    case 'unfunded': return '#ef4444';
    case 'error': return '#ef4444';
    default: return '#6b7280';
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'active': return '🟢';
    case 'syncing': return '🔵';
    case 'stale': return '🟡';
    case 'unfunded': return '🔴';
    case 'error': return '❌';
    default: return '⚪';
  }
}

function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function BridgeManagement() {
  const [bridges, setBridges] = useState<BridgeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = async () => {
    setLoading(true);
    try {
      const statuses = await fetchBridgeStatuses();
      setBridges(statuses);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch bridge statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = bridges.filter(b => b.status === 'active').length;
  const totalCount = bridges.length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🌉</span>
            Bridge Management
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Cross-chain oracle infrastructure status
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: activeCount === totalCount ? '#22c55e20' : '#f59e0b20',
            border: `1px solid ${activeCount === totalCount ? '#22c55e' : '#f59e0b'}`,
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: activeCount === totalCount ? '#22c55e' : '#f59e0b',
          }}>
            {activeCount}/{totalCount} Active
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              background: '#3b82f620',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#3b82f6',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Feed</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Origin Relay</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Reactor</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Destination</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Last Update</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Gas Balance</th>
            </tr>
          </thead>
          <tbody>
            {bridges.map((bridge, idx) => (
              <tr key={bridge.feed} style={{
                borderBottom: idx < bridges.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                background: bridge.status === 'active' ? 'rgba(34, 197, 94, 0.05)' : 
                           bridge.status === 'syncing' ? 'rgba(59, 130, 246, 0.05)' :
                           bridge.status === 'stale' ? 'rgba(245, 158, 11, 0.05)' :
                           'rgba(239, 68, 68, 0.05)',
              }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '15px' }}>{bridge.feed}</div>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                    {bridge.decimals} decimals
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: `${getStatusColor(bridge.status)}15`,
                    border: `1px solid ${getStatusColor(bridge.status)}`,
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: getStatusColor(bridge.status),
                  }}>
                    {getStatusIcon(bridge.status)} {bridge.status.toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <code style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {bridge.originRelay.slice(0, 8)}...{bridge.originRelay.slice(-6)}
                  </code>
                  <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>Sepolia</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <code style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {bridge.reactor.slice(0, 8)}...{bridge.reactor.slice(-6)}
                  </code>
                  <div style={{ color: '#8b5cf6', fontSize: '10px', marginTop: '2px' }}>Reactive</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <code style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {bridge.destination.slice(0, 8)}...{bridge.destination.slice(-6)}
                  </code>
                  <div style={{ color: '#00ff88', fontSize: '10px', marginTop: '2px' }}>Lasna</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ color: '#fff', fontSize: '13px' }}>
                    {formatTimeAgo(bridge.lastUpdate)}
                  </div>
                  {bridge.lastRoundId && (
                    <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                      Round #{bridge.lastRoundId.slice(-6)}
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ 
                    color: parseFloat(bridge.gasBalance) < 0.01 ? '#ef4444' : 
                           parseFloat(bridge.gasBalance) < 0.1 ? '#f59e0b' : '#22c55e',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}>
                    {parseFloat(bridge.gasBalance).toFixed(4)} ETH
                  </div>
                  {parseFloat(bridge.gasBalance) < 0.01 && (
                    <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '2px' }}>
                      ⚠️ Low balance
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#94a3b8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
        <span>Auto-refresh every 15s</span>
      </div>
    </div>
  );
}

export default BridgeManagement;
