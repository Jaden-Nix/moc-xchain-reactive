import { useState, useEffect } from 'react';

interface DestinationData {
  roundId: string;
  price: string;
  priceFormatted: string;
  updatedAt: string;
  updatedAtFormatted: string;
  decimals: number;
  description: string;
  status: 'live' | 'stale' | 'no_data';
}

interface FeedData {
  eth?: DestinationData;
  btc?: DestinationData;
  link?: DestinationData;
}

const LASNA_RPC = 'https://lasna-rpc.rnk.dev';

const DESTINATION_CONTRACTS = {
  eth: '0x9Fd448E930cE937d8dDCdF6e4F5bE8B9C6aF3581',
  btc: '0x3C828678De4F4184952D66f2d0260B5db2e0f522',
  link: '0x3E6114bdd39db5c624C67FbCEDe7B3053E621915',
};

const DESTINATION_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
  'function description() external view returns (string)',
];

async function fetchDestinationData(contractAddress: string): Promise<DestinationData | null> {
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(LASNA_RPC);
    const contract = new ethers.Contract(contractAddress, DESTINATION_ABI, provider);
    
    const [roundId, answer, , updatedAt] = await contract.latestRoundData();
    const decimals = await contract.decimals();
    let description = 'ETH/USD';
    try {
      description = await contract.description();
    } catch {}
    
    const priceNum = Number(answer) / Math.pow(10, Number(decimals));
    const updatedAtNum = Number(updatedAt);
    const now = Math.floor(Date.now() / 1000);
    const age = now - updatedAtNum;
    
    return {
      roundId: roundId.toString(),
      price: answer.toString(),
      priceFormatted: `$${priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`,
      updatedAt: updatedAt.toString(),
      updatedAtFormatted: new Date(updatedAtNum * 1000).toLocaleString(),
      decimals: Number(decimals),
      description,
      status: age < 300 ? 'live' : age < 3600 ? 'stale' : 'no_data',
    };
  } catch (error) {
    return null;
  }
}

export function LasnaLiveDisplay() {
  const [feedData, setFeedData] = useState<FeedData>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lasnaBlock, setLasnaBlock] = useState<number | null>(null);

  const fetchAllData = async () => {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider(LASNA_RPC);
      const block = await provider.getBlockNumber();
      setLasnaBlock(block);
      
      const [ethData, btcData, linkData] = await Promise.all([
        fetchDestinationData(DESTINATION_CONTRACTS.eth),
        fetchDestinationData(DESTINATION_CONTRACTS.btc),
        fetchDestinationData(DESTINATION_CONTRACTS.link),
      ]);
      
      setFeedData({
        eth: ethData || undefined,
        btc: btcData || undefined,
        link: linkData || undefined,
      });
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching Lasna data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'live': return '#00ff88';
      case 'stale': return '#ffaa00';
      default: return '#ff4444';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'stale': return 'STALE';
      default: return 'WAITING';
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#00ff88', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⛓️</span>
          Lasna Destination - Live Feed
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lasnaBlock && (
            <span style={{ color: '#888', fontSize: '14px' }}>
              Block #{lasnaBlock.toLocaleString()}
            </span>
          )}
          <span style={{ color: '#666', fontSize: '12px' }}>
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          Loading Lasna destination data...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <FeedCard 
            title="ETH/USD"
            data={feedData.eth}
            contractAddress={DESTINATION_CONTRACTS.eth}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
          <FeedCard 
            title="BTC/USD"
            data={feedData.btc}
            contractAddress={DESTINATION_CONTRACTS.btc}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
          <FeedCard 
            title="LINK/USD"
            data={feedData.link}
            contractAddress={DESTINATION_CONTRACTS.link}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
          />
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(0, 255, 136, 0.05)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#888',
      }}>
        <strong style={{ color: '#00ff88' }}>How it works:</strong> The relay worker on Sepolia reads real Chainlink prices 
        and emits events. The Reactive Network detects these events and triggers the PriceFeedReactor, 
        which updates the DestinationFeedProxy on Lasna. This display reads directly from that destination contract.
      </div>
    </div>
  );
}

interface FeedCardProps {
  title: string;
  data?: DestinationData;
  contractAddress: string;
  getStatusColor: (status?: string) => string;
  getStatusText: (status?: string) => string;
}

function FeedCard({ title, data, contractAddress, getStatusColor, getStatusText }: FeedCardProps) {
  const hasData = data && data.roundId !== '0';
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${hasData ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{title}</h3>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          background: `${getStatusColor(data?.status)}22`,
          color: getStatusColor(data?.status),
          border: `1px solid ${getStatusColor(data?.status)}`,
        }}>
          {getStatusText(data?.status)}
        </span>
      </div>

      {hasData ? (
        <>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00ff88', marginBottom: '16px' }}>
            {data.priceFormatted}
          </div>
          
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Round ID:</span>
              <span style={{ color: '#fff', fontFamily: 'monospace' }}>{data.roundId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Updated At:</span>
              <span style={{ color: '#fff' }}>{data.updatedAtFormatted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Decimals:</span>
              <span style={{ color: '#fff' }}>{data.decimals}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Raw Price:</span>
              <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '11px' }}>{data.price}</span>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
          <div>Waiting for first price relay...</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            The Reactive Network is processing cross-chain events
          </div>
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#666',
        fontFamily: 'monospace',
        wordBreak: 'break-all',
      }}>
        {contractAddress}
      </div>
    </div>
  );
}

export default LasnaLiveDisplay;
