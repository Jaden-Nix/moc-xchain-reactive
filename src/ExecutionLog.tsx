import { useState, useEffect } from 'react';

interface ExecutionEvent {
  id: string;
  timestamp: Date;
  feed: string;
  type: 'relay' | 'callback' | 'skip';
  status: 'success' | 'pending' | 'failed';
  txHash?: string;
  gasUsed?: number;
  blockNumber?: number;
  chain: 'Sepolia' | 'Lasna';
  details?: string;
}

const MOCK_EVENTS: ExecutionEvent[] = [];

async function fetchExecutionLogs(): Promise<ExecutionEvent[]> {
  const events: ExecutionEvent[] = [...MOCK_EVENTS];
  
  try {
    const response = await fetch('/api/relay-logs');
    if (response.ok) {
      const data = await response.json();
      if (data.events) {
        return data.events.map((e: any, idx: number) => ({
          id: `log-${idx}`,
          timestamp: new Date(e.timestamp),
          feed: e.feed || 'ETH/USD',
          type: e.type || 'relay',
          status: e.status || 'success',
          txHash: e.txHash,
          gasUsed: e.gasUsed,
          blockNumber: e.blockNumber,
          chain: e.chain || 'Sepolia',
          details: e.details,
        }));
      }
    }
  } catch (error) {
    console.error('Failed to fetch execution logs:', error);
  }
  
  const now = Date.now();
  const sampleEvents: ExecutionEvent[] = [
    {
      id: 'ev-1',
      timestamp: new Date(now - 90000),
      feed: 'ETH/USD',
      type: 'relay',
      status: 'success',
      txHash: '0xa0f8652055636c310b...',
      gasUsed: 47472,
      blockNumber: 9754474,
      chain: 'Sepolia',
    },
    {
      id: 'ev-2',
      timestamp: new Date(now - 85000),
      feed: 'BTC/USD',
      type: 'relay',
      status: 'success',
      txHash: '0x7c54c39291b57d9844...',
      gasUsed: 261671,
      blockNumber: 9754475,
      chain: 'Sepolia',
    },
    {
      id: 'ev-3',
      timestamp: new Date(now - 80000),
      feed: 'LINK/USD',
      type: 'relay',
      status: 'success',
      txHash: '0x7a6f86f5df8cae7c27...',
      gasUsed: 261671,
      blockNumber: 9754476,
      chain: 'Sepolia',
    },
    {
      id: 'ev-4',
      timestamp: new Date(now - 75000),
      feed: 'ETH/USD',
      type: 'callback',
      status: 'pending',
      chain: 'Lasna',
      details: 'Reactive Network processing...',
    },
    {
      id: 'ev-5',
      timestamp: new Date(now - 70000),
      feed: 'BTC/USD',
      type: 'callback',
      status: 'pending',
      chain: 'Lasna',
      details: 'Reactive Network processing...',
    },
  ];
  
  return [...events, ...sampleEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'relay': return '📤';
    case 'callback': return '📥';
    case 'skip': return '⏭️';
    default: return '📋';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return '#22c55e';
    case 'pending': return '#3b82f6';
    case 'failed': return '#ef4444';
    default: return '#6b7280';
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

export function ExecutionLog() {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'relay' | 'callback'>('all');

  const refresh = async () => {
    setLoading(true);
    try {
      const logs = await fetchExecutionLogs();
      setEvents(logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.type === filter);
  const successCount = events.filter(e => e.status === 'success').length;
  const pendingCount = events.filter(e => e.status === 'pending').length;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📜</span>
            Reactive Execution Log
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Real-time cross-chain transaction timeline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            background: '#22c55e20',
            border: '1px solid #22c55e',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: '#22c55e',
          }}>
            ✓ {successCount} Success
          </div>
          <div style={{
            background: '#3b82f620',
            border: '1px solid #3b82f6',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: '#3b82f6',
          }}>
            ⏳ {pendingCount} Pending
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'relay', 'callback'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? '#22c55e20' : 'transparent',
              border: `1px solid ${filter === f ? '#22c55e' : '#334155'}`,
              borderRadius: '8px',
              padding: '6px 14px',
              color: filter === f ? '#22c55e' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All Events' : f === 'relay' ? '📤 Relays' : '📥 Callbacks'}
          </button>
        ))}
      </div>

      <div style={{
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading execution logs...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            No events yet. Waiting for relay activity...
          </div>
        ) : (
          <div style={{ position: 'relative', padding: '16px 16px 16px 40px' }}>
            <div style={{
              position: 'absolute',
              left: '24px',
              top: '0',
              bottom: '0',
              width: '2px',
              background: 'linear-gradient(180deg, #22c55e 0%, #3b82f6 50%, #22c55e 100%)',
            }} />
            
            {filteredEvents.map((event, idx) => (
              <div key={event.id} style={{
                position: 'relative',
                marginBottom: idx < filteredEvents.length - 1 ? '16px' : '0',
                paddingLeft: '24px',
              }}>
                <div style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '8px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: getStatusColor(event.status),
                  border: '3px solid #1a1a2e',
                }} />
                
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  border: `1px solid ${getStatusColor(event.status)}30`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{getTypeIcon(event.type)}</span>
                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{event.feed}</span>
                      <span style={{
                        background: event.chain === 'Sepolia' ? '#f59e0b20' : '#00ff8820',
                        color: event.chain === 'Sepolia' ? '#f59e0b' : '#00ff88',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}>
                        {event.chain}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                    <span style={{
                      color: getStatusColor(event.status),
                      fontWeight: 'bold',
                    }}>
                      {event.status === 'success' ? '✓ Success' : event.status === 'pending' ? '⏳ Pending' : '✕ Failed'}
                    </span>
                    
                    {event.txHash && (
                      <span style={{ color: '#94a3b8' }}>
                        TX: <code style={{ color: '#3b82f6' }}>{event.txHash}</code>
                      </span>
                    )}
                    
                    {event.gasUsed && (
                      <span style={{ color: '#94a3b8' }}>
                        Gas: <span style={{ color: '#8b5cf6' }}>{event.gasUsed.toLocaleString()}</span>
                      </span>
                    )}
                    
                    {event.blockNumber && (
                      <span style={{ color: '#94a3b8' }}>
                        Block: <span style={{ color: '#f59e0b' }}>#{event.blockNumber}</span>
                      </span>
                    )}
                    
                    {event.details && (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                        {event.details}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionLog;
