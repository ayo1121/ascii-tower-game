function Tower({ gameState, onBuy, onSell, showDevControls }) {
    const { height, log } = gameState

    // Render ASCII tower blocks
    const renderTower = () => {
        if (height === 0) {
            return '(empty)'
        }
        const blocks = []
        for (let i = 0; i < height; i++) {
            blocks.push('[####]')
        }
        return blocks.join('\n')
    }

    // Render tower for sharing (truncate if too tall)
    const renderTowerForShare = () => {
        if (height === 0) {
            return '(empty)'
        }
        const blocks = []
        const maxBlocks = 15
        const displayHeight = Math.min(height, maxBlocks)

        for (let i = 0; i < displayHeight; i++) {
            blocks.push('[####]')
        }

        if (height > maxBlocks) {
            blocks.push('...')
        }

        return blocks.join('\n')
    }

    // Format timestamp for log entries
    const formatTime = (ts) => {
        const date = new Date(ts)
        return date.toLocaleTimeString()
    }

    // Share on X
    const shareOnX = () => {
        const tower = renderTowerForShare()
        const recentLogs = [...log].reverse().slice(0, 3)
        const logLines = recentLogs.length > 0
            ? recentLogs.map(e => `- ${e.message}`).join('\n')
            : '- (no events yet)'

        const tweetText = `building a building

height: ${height}

${tower}

recent:
${logLines}

watch it live:
${window.location.href}`

        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
        window.open(tweetUrl, '_blank', 'noopener,noreferrer')
    }

    return (
        <>
            {/* Tower - dominant element */}
            <div className="tower">
                <pre>{renderTower()}</pre>
            </div>

            {/* Height indicator - subtle meta */}
            <div className="meta">
                height: {height}
            </div>

            {/* Share on X button */}
            <button
                className="share-btn"
                onClick={shareOnX}
                title="share this tower on X"
            >
                share on X
            </button>

            {/* Dev controls - if enabled */}
            {showDevControls && (
                <div className="dev-controls">
                    <div className="dev-label">dev only</div>
                    <div className="buttons">
                        <button onClick={onBuy}>+ buy</button>
                        <button onClick={onSell}>- sell</button>
                    </div>
                </div>
            )}

            {/* Log - archival */}
            <div className="log">
                {log.length === 0 ? (
                    <div className="log-entry">—</div>
                ) : (
                    [...log].reverse().map((entry, index) => (
                        <div key={index} className="log-entry">
                            {formatTime(entry.ts)} · {entry.message}
                        </div>
                    ))
                )}
            </div>
        </>
    )
}

export default Tower
