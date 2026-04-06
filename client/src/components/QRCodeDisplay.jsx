import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeDisplay({ inviteCode, roomName, members = [], guestsExpanded, onToggleGuests, formatTime }) {
  const qrRef = useRef(null);
  const joinUrl = `${window.location.origin}/room/${inviteCode}`;
  const activeCount = members.filter((m) => m.active).length;

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `karaoke-room-${inviteCode}.png`;
    link.href = url;
    link.click();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
  };

  return (
    <div className="qr-code-section">
      <div className="qr-code-container">
        <h3 className="qr-title">Get in, loser.</h3>
        <p className="qr-subtitle">You're up next.</p>

        <div className={`qr-flipper ${guestsExpanded ? 'qr-flipped' : ''}`}>
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
            <div className="guest-overlay-list">
              {members.map((m) => (
                <div key={m.id} className={`guest-panel-item ${m.active ? '' : 'guest-panel-item-left'}`}>
                  <span className="guest-panel-name">{m.guestName || 'Anonymous'}</span>
                  <span className="guest-panel-time">
                    {m.active
                      ? `joined ${formatTime(m.joinedAt)}`
                      : `left ${formatTime(m.leftAt)}`}
                  </span>
                </div>
              ))}
            </div>
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
          <button className="btn-neon btn-small" onClick={downloadQR}>
            Download QR
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
