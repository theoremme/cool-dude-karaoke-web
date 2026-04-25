import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name;
  return parts.map((p) => p[0]).join('').toUpperCase();
};

function QRCodeDisplay({ inviteCode, roomName, members = [], guestsExpanded, onToggleGuests, formatTime, currentUserId }) {
  const qrRef = useRef(null);
  const flipperRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('full'); // 'full' | 'compact' | 'count-only'
  const joinUrl = `${window.location.origin}/room/${inviteCode}`;
  const activeCount = members.filter((m) => m.active).length;

  // Watch flipper size to decide what to show in posse
  useEffect(() => {
    const el = flipperRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width < 90) {
        setDisplayMode('count-only');
      } else if (width < 150) {
        setDisplayMode('compact');
      } else {
        setDisplayMode('full');
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
  };

  const formatTimeFull = (dateStr) => {
    const d = new Date(dateStr);
    return `Joined ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="qr-code-section">
      <div className="qr-code-container">
        <h3 className="qr-title">Get in, loser.</h3>
        <p className="qr-subtitle">You're up next.</p>

        <div className={`qr-flipper ${guestsExpanded ? 'qr-flipped' : ''}`} ref={flipperRef}>
          {/* Front: QR code */}
          <div className="qr-flip-front">
            <div className="qr-code-wrapper" ref={qrRef}>
              <QRCodeCanvas
                value={joinUrl}
                size={128}
                level="H"
                includeMargin={true}
                bgColor="#0d1117"
                fgColor="#00ffff"
              />
            </div>
          </div>

          {/* Back: Posse list */}
          <div className="qr-flip-back">
            <h3 className="guest-overlay-title">Posse ({activeCount})</h3>
            {displayMode !== 'count-only' && (
              <div className="guest-overlay-list">
                {members.map((m) => {
                  const isYou = currentUserId && m.userId === currentUserId;
                  const rawName = isYou ? 'You' : (m.guestName || 'Guest');
                  const displayName = rawName === 'You' ? 'You' : (rawName.trim().split(/\s+/).length > 1 ? getInitials(rawName) : rawName);
                  return (
                    <div key={m.id} className={`guest-panel-item ${m.active ? '' : 'guest-panel-item-left'}`}>
                      <span className="guest-panel-name" title={rawName}>{displayName}</span>
                      {displayMode === 'full' && (
                        <span className="guest-panel-time" title={formatTimeFull(m.active ? m.joinedAt : m.leftAt)}>
                          {m.active
                            ? formatTime(m.joinedAt)
                            : `left ${formatTime(m.leftAt)}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="qr-info">
          <p className="qr-scan-label">Scan to join</p>
          {roomName && <p className="qr-room-name" style={{ textTransform: 'uppercase', fontWeight: 700 }}>{roomName}</p>}
          <p className="qr-invite-code">Code: <span>{inviteCode}</span></p>
        </div>

        <div className="qr-actions">
          <button className="btn-neon btn-small" onClick={copyLink}>
            Copy Link
          </button>
          {members.length > 0 && (
            <button className="btn-neon btn-small guest-toggle-btn" onClick={onToggleGuests}>
              {guestsExpanded ? '◈ QR Code' : `◈ Posse (${activeCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;
