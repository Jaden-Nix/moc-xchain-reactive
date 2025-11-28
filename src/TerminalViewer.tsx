import React, { useState, useEffect, useRef } from 'react'

interface TerminalViewerProps {
  isOpen: boolean
  onClose: () => void
}

const TerminalViewer: React.FC<TerminalViewerProps> = ({ isOpen, onClose }) => {
  const [output, setOutput] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const runCommand = async (command: string) => {
    if (!command.trim()) return

    setOutput((prev) => [...prev, `$ ${command}`])
    setIsRunning(true)
    setCommandHistory((prev) => [...prev, command])
    setHistoryIndex(-1)
    setInput('')

    try {
      const response = await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
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

      setOutput((prev) => [...prev, ''])
    } catch (error: any) {
      setOutput((prev) => [...prev, `Error: ${error.message}`])
    }

    setIsRunning(false)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      runCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIndex = historyIndex + 1
      if (newIndex < commandHistory.length) {
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = historyIndex - 1
      if (newIndex >= 0) {
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (newIndex < 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const clearTerminal = () => {
    setOutput([])
  }

  const runTests = async () => {
    runCommand('npm run test')
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
        {output.length === 0 ? (
          <div style={{ color: '#64748b' }}>Type a command and press Enter...</div>
        ) : (
          output.map((line, idx) => (
            <div key={idx}>
              {line || '\n'}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid #475569',
          padding: '0.75rem',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ color: '#10b981' }}>$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Enter command (e.g., npm run compile, npm run test)"
          style={{
            flex: 1,
            background: '#1e293b',
            color: '#10b981',
            border: 'none',
            padding: '0.5rem',
            fontFamily: 'Courier New, monospace',
            fontSize: '0.875rem',
            outline: 'none',
            opacity: isRunning ? 0.5 : 1,
          }}
        />
      </div>
    </div>
  )
}

export default TerminalViewer
