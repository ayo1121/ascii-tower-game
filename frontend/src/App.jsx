import { useState, useEffect, useRef } from 'react'
import Tower from './components/Tower.jsx'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
const GAME_TITLE = 'building a building'
const SHOW_DEV_CONTROLS = import.meta.env.VITE_DEV_CONTROLS === 'true'
const PUMP_FUN_URL = 'https://pump.fun/coin/89cTtzoGoZQspxSiA3sdnHqANXCDqhQ2nPZ51yKhpump'

function App() {
    const [gameState, setGameState] = useState(null)
    const [connected, setConnected] = useState(false)
    const wsRef = useRef(null)

    useEffect(() => {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            console.log('Connected to server')
            setConnected(true)
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type === 'STATE_UPDATE') {
                    setGameState(data.state)
                }
            } catch (err) {
                console.error('Failed to parse message:', err)
            }
        }

        ws.onclose = () => {
            console.log('Disconnected from server')
            setConnected(false)
        }

        ws.onerror = (err) => {
            console.error('WebSocket error:', err)
        }

        return () => {
            ws.close()
        }
    }, [])

    const sendAction = (type) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type }))
        }
    }

    if (!connected) {
        return (
            <div className="app">
                <div className="header">
                    <h1>{GAME_TITLE}</h1>
                    <p className="subtext">connecting...</p>
                </div>
            </div>
        )
    }

    if (!gameState) {
        return (
            <div className="app">
                <div className="header">
                    <h1>{GAME_TITLE}</h1>
                    <p className="subtext">loading...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="app">
                <div className="header">
                    <h1>{GAME_TITLE}</h1>
                    <p className="subtext">each buy adds a block · each sell removes one</p>
                </div>
                <Tower
                    gameState={gameState}
                    onBuy={() => sendAction('BUY')}
                    onSell={() => sendAction('SELL')}
                    showDevControls={SHOW_DEV_CONTROLS}
                />
            </div>

            {/* Floating buy bubble */}
            <a
                href={PUMP_FUN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-bubble"
                title="buy on pump.fun"
            >
                build
            </a>
        </>
    )
}

export default App
