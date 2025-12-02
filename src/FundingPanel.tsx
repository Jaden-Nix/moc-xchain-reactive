import { useState, useEffect } from 'react';

interface FundingStatus {
  chain: string;
  address: string;
  balance: string;
  usdValue: string;
  status: 'healthy' | 'warning' | 'critical';
  type: 'wallet' | 'reactor' | 'destination';
}

interface GasEstimate {
  operation: string;
  gasUnits: number;
  costEth: string;
  costUsd: string;
}

const ADDRESSES = {
  wallet: '0xe47Dce1b7e31333329734E24089C0472c030d95B',
  reactors: {
    'ETH/USD': '0x7d6a70f8303385D182ABAd16a8159B6A27FE6B25',
    'BTC/USD': '0xe8B05809c380e7E52bd68b113A737241678c202C',
    'LINK/USD': '0x7a0D8E6FDd1760C61a9f422036Db098E4D3ae659',
  },
  destinations: {
    'ETH/USD': '0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581',
    'BTC/USD': '0x3C828678De4F4184952D66f2d0260B5db2e0f522',
    'LINK/USD': '0x3E6114bdd39db5c624C67FbCEDe7B3053E621915',
  },
};

const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const LASNA_RPC = 'https://lasna-rpc.rnk.dev';

async function fetchFundingStatus(): Promise<{ statuses: FundingStatus[], estimates: GasEstimate[] }> {
  const { ethers } = await import('ethers');
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const lasnaProvider = new ethers.JsonRpcProvider(LASNA_RPC);
  
  const statuses: FundingStatus[] = [];
  
  const walletBalance = await sepoliaProvider.getBalance(ADDRESSES.wallet);
  const walletEth = parseFloat(ethers.formatEther(walletBalance));
  
  statuses.push({
    chain: 'Sepolia',
    address: ADDRESSES.wallet,
    balance: walletEth.toFixed(6) + ' ETH',
    usdValue: '$' + (walletEth * 3030).toFixed(2),
    status: walletEth > 0.01 ? 'healthy' : walletEth > 0.005 ? 'warning' : 'critical',
    type: 'wallet',
  });
  
  for (const [feed, addr] of Object.entries(ADDRESSES.reactors)) {
    const balance = await lasnaProvider.getBalance(addr);
    const balEth = parseFloat(ethers.formatEther(balance));
    statuses.push({
      chain: 'Lasna',
      address: addr,
      balance: balEth.toFixed(6) + ' ETH',
      usdValue: '$' + (balEth * 3030).toFixed(2),
      status: balEth > 0.1 ? 'healthy' : balEth > 0.01 ? 'warning' : 'critical',
      type: 'reactor',
    });
  }
  
  const estimates: GasEstimate[] = [
    {
      operation: 'Relay Price (new data)',
      gasUnits: 261000,
      costEth: '0.000261',
      costUsd: '$0.79',
    },
    {
      operation: 'Relay Price (skip)',
      gasUnits: 47000,
      costEth: '0.000047',
      costUsd: '$0.14',
    },
    {
      operation: 'Reactive Callback',
      gasUnits: 150000,
      costEth: '0.000150',
      costUsd: '$0.45',
    },
  ];
  
  return { statuses, estimates };
}

export function FundingPanel() {
  const [statuses, setStatuses] = useState<FundingStatus[]>([]);
  const [estimates, setEstimates] = useState<GasEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await fetchFundingStatus();
      setStatuses(data.statuses);
      setEstimates(data.estimates);
      
      const critical = data.statuses.filter(s => s.status === 'critical').length;
      setTotalDebt(critical * 0.05);
    } catch (error) {
      console.error('Failed to fetch funding status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = statuses.filter(s => s.status === 'critical').length;
  const warningCount = statuses.filter(s => s.status === 'warning').length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💰</span>
            Funding & Gas Economics
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Monitor balances and operational costs
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            background: '#8b5cf620',
            border: '1px solid #8b5cf6',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#8b5cf6',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {(criticalCount > 0 || warningCount > 0) && (
        <div style={{
          background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${criticalCount > 0 ? '#ef4444' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{criticalCount > 0 ? '🚨' : '⚠️'}</span>
          <div>
            <div style={{ color: criticalCount > 0 ? '#ef4444' : '#f59e0b', fontWeight: 'bold', fontSize: '15px' }}>
              {criticalCount > 0 ? `${criticalCount} Critical Balance Alert${criticalCount > 1 ? 's' : ''}` : `${warningCount} Low Balance Warning${warningCount > 1 ? 's' : ''}`}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
              {criticalCount > 0 ? 'Some addresses have critically low balances. Relays may fail!' : 'Consider topping up balances soon.'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Total Available</div>
          <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>
            {statuses.reduce((sum, s) => sum + parseFloat(s.balance), 0).toFixed(4)} ETH
          </div>
        </div>
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Est. Relays Remaining</div>
          <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold' }}>
            {Math.floor(statuses.reduce((sum, s) => sum + parseFloat(s.balance), 0) / 0.0003)}
          </div>
        </div>
        <div style={{
          background: totalDebt > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
          border: `1px solid ${totalDebt > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
        }}>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>Funding Debt</div>
          <div style={{ color: totalDebt > 0 ? '#ef4444' : '#8b5cf6', fontSize: '24px', fontWeight: 'bold' }}>
            {totalDebt.toFixed(3)} ETH
          </div>
        </div>
      </div>

      <h3 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '16px' }}>Balance Status</h3>
      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Chain</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Address</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Balance</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status, idx) => (
              <tr key={status.address} style={{
                borderBottom: idx < statuses.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
              }}>
                <td style={{ padding: '12px 16px', color: '#fff', fontSize: '13px', textTransform: 'capitalize' }}>
                  {status.type === 'wallet' ? '💳 Wallet' : status.type === 'reactor' ? '⚛️ Reactor' : '📍 Destination'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>{status.chain}</td>
                <td style={{ padding: '12px 16px' }}>
                  <code style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                    {status.address.slice(0, 10)}...{status.address.slice(-8)}
                  </code>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{status.balance}</div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>{status.usdValue}</div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{
                    background: status.status === 'healthy' ? '#22c55e20' : status.status === 'warning' ? '#f59e0b20' : '#ef444420',
                    color: status.status === 'healthy' ? '#22c55e' : status.status === 'warning' ? '#f59e0b' : '#ef4444',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {status.status === 'healthy' ? '✓ Healthy' : status.status === 'warning' ? '⚠ Low' : '✕ Critical'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ color: '#e2e8f0', marginBottom: '12px', fontSize: '16px' }}>Gas Cost Estimates</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {estimates.map(est => (
          <div key={est.operation} style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>{est.operation}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{est.costEth} ETH</div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>{est.costUsd}</div>
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
              ~{est.gasUnits.toLocaleString()} gas
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FundingPanel;
