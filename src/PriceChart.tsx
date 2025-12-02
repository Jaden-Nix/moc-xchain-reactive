import React, { useEffect, useRef, useState } from 'react'
import { PriceHistory } from './chainlinkFeeds'

interface PriceChartProps {
  data: PriceHistory[]
  title: string
  color?: string
  height?: number
}

const PriceChart: React.FC<PriceChartProps> = ({ data, title, color = '#22c55e', height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; price: number; time: string } | null>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const padding = { top: 20, right: 60, bottom: 30, left: 10 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices) * 0.999
    const maxPrice = Math.max(...prices) * 1.001
    const priceRange = maxPrice - minPrice || 1

    const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth
    const scaleY = (price: number) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight

    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(rect.width - padding.right, y)
      ctx.stroke()

      const price = maxPrice - (priceRange / 4) * i
      ctx.fillStyle = '#64748b'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`$${price.toFixed(2)}`, rect.width - padding.right + 5, y + 3)
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, rect.height - padding.bottom)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '05')

    ctx.beginPath()
    ctx.moveTo(scaleX(0), rect.height - padding.bottom)
    for (let i = 0; i < data.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(data[i].price))
    }
    ctx.lineTo(scaleX(data.length - 1), rect.height - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(scaleX(0), scaleY(data[0].price))
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(data[i].price))
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()

    for (let i = 0; i < data.length; i++) {
      ctx.beginPath()
      ctx.arc(scaleX(i), scaleY(data[i].price), 4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      ctx.stroke()
    }

  }, [data, color])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || data.length === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 10, right: 60 }
    const chartWidth = rect.width - padding.left - padding.right

    const index = Math.round(((x - padding.left) / chartWidth) * (data.length - 1))
    if (index >= 0 && index < data.length) {
      const point = data[index]
      setHoveredPoint({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        price: point.price,
        time: new Date(point.timestamp).toLocaleTimeString(),
      })
    }
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  if (data.length === 0) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#1e293b',
        borderRadius: '0.5rem',
        color: '#64748b',
      }}>
        Loading price data...
      </div>
    )
  }

  const latestPrice = data[data.length - 1]?.price || 0
  const firstPrice = data[0]?.price || latestPrice
  const priceChange = latestPrice - firstPrice
  const priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100) : 0
  const isPositive = priceChange >= 0

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '0.5rem',
        padding: '0 0.5rem',
      }}>
        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.9rem' }}>{title}</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1rem' }}>
            ${latestPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ 
            color: isPositive ? '#22c55e' : '#ef4444', 
            fontSize: '0.8rem',
            marginLeft: '0.5rem',
          }}>
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: height,
          background: '#1e293b',
          borderRadius: '0.5rem',
          cursor: 'crosshair',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoveredPoint && (
        <div style={{
          position: 'absolute',
          left: hoveredPoint.x + 10,
          top: hoveredPoint.y - 30,
          background: '#334155',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          color: '#e2e8f0',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 'bold' }}>${hoveredPoint.price.toFixed(2)}</div>
          <div style={{ color: '#94a3b8' }}>{hoveredPoint.time}</div>
        </div>
      )}
    </div>
  )
}

export default PriceChart
