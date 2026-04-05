import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRCodeDisplay({ inviteCode, roomName }) {
  const qrRef = useRef(null);
  const joinUrl = `${window.location.origin}/room/${inviteCode}`;

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
        <h3 className="qr-title">Scan to Join!</h3>

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

        <div className="qr-info">
          {roomName && <p className="qr-room-name">{roomName}</p>}
          <p className="qr-invite-code">Code: <span>{inviteCode}</span></p>
          <p className="qr-join-url">{joinUrl}</p>
        </div>

        <div className="qr-actions">
          <button className="btn-neon btn-small" onClick={copyLink}>
            Copy Link
          </button>
          <button className="btn-neon btn-small" onClick={downloadQR}>
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRCodeDisplay;
