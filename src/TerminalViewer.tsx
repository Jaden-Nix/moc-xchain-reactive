import React, { useState, useEffect, useRef } from 'react'

interface TerminalViewerProps {
  isOpen: boolean
  onClose: () => void
}

const TerminalViewer: React.FC<TerminalViewerProps> = ({ isOpen, onClose }) => {
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output])

  const runTests = async () => {
    setIsRunning(true)
    setOutput(['$ npm run test', ''])

    try {
      const response = await fetch('/api/run-test', {
        method: 'POST',
      })

      if (!response.ok) {
        setOutput((prev) => [...prev, `Error: ${response.statusText}`])
        setIsRunning(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        setOutput((prev) => [...prev, 'Error: Could not read response'])
        setIsRunning(false)
        return
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')
        setOutput((prev) => [...prev, ...lines.filter((line) => line.length > 0)])
      }

      setOutput((prev) => [...prev, '', '✓ Tests completed'])
    } catch (error: any) {
      setOutput((prev) => [...prev, `Error: ${error.message}`])
    }

    setIsRunning(false)
  }

  const clearTerminal = () => {
    setOutput([])
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: '#0f172a',
        border: '1px solid #475569',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        fontFamily: 'Courier New, monospace',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          padding: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #475569',
        }}
      >
        <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Terminal</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={runTests}
            disabled={isRunning}
            style={{
              padding: '0.375rem 0.75rem',
              background: isRunning ? '#334155' : '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {isRunning ? '⚙️ Running...' : '▶ Run Tests'}
          </button>
          <button
            onClick={clearTerminal}
            style={{
              padding: '0.375rem 0.75rem',
              background: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.375rem 0.75rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div
        ref={terminalRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
          background: '#0f172a',
          color: '#10b981',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {output.map((line, idx) => (
          <div key={idx}>
            {line || '\n'}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TerminalViewer
