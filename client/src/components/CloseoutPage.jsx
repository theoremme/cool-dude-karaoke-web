import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import logo from '../assets/cool-dude-karaoke-logo-v2-nobg.png';
import orbitronBoldUrl from '../assets/Orbitron-Bold.ttf';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const CloseoutPage = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roomName, setRoomName] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [playlistName, setPlaylistName] = useState('');
  const [youtubeToken, setYoutubeToken] = useState(null);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const logoImgRef = useRef(null);

  // Load playlist data from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`karaoke-closeout-${inviteCode}`);
      if (saved) {
        const data = JSON.parse(saved);
        setRoomName(data.roomName || 'Karaoke Session');
        setPlaylist(data.playlist || []);
        setPlaylistName(`${data.roomName || 'Karaoke'} - ${new Date().toLocaleDateString()}`);
        setIsGuest(!!data.isGuest);
        setGuestName(data.guestName || '');
      }
    } catch {}
  }, [inviteCode]);

  // Check if YouTube OAuth is configured
  useEffect(() => {
    fetch('/api/youtube/oauth/status')
      .then((res) => res.json())
      .then((data) => setOauthConfigured(data.configured))
      .catch(() => {});
  }, []);

  // Handle OAuth return with token
  useEffect(() => {
    const token = searchParams.get('youtube_token');
    const error = searchParams.get('youtube_error');
    if (token) {
      setYoutubeToken(token);
      // Clean the URL
      searchParams.delete('youtube_token');
      setSearchParams(searchParams, { replace: true });
    }
    if (error) {
      setPublishError(`YouTube connection failed: ${error}`);
      searchParams.delete('youtube_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Preload logo for PDF
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = logo;
    img.onload = () => { logoImgRef.current = img; };
  }, []);

  const handleConnectYouTube = () => {
    const returnTo = `/closeout/${inviteCode}`;
    window.location.href = `/api/youtube/oauth/redirect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handlePublish = async () => {
    if (!youtubeToken || !playlistName.trim() || playlist.length === 0) return;
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    try {
      const res = await fetch('/api/youtube/playlist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenKey: youtubeToken,
          playlistName: playlistName.trim(),
          description: `Karaoke session: ${roomName} — ${new Date().toLocaleDateString()}`,
          songs: playlist.map((item) => ({
            videoId: item.videoId,
            title: item.title,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublishResult(data);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Load Orbitron font
    let hasOrbitron = false;
    try {
      const fontRes = await fetch(orbitronBoldUrl);
      const fontBuf = await fontRes.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuf)));
      doc.addFileToVFS('Orbitron-Bold.ttf', fontBase64);
      doc.addFont('Orbitron-Bold.ttf', 'Orbitron', 'bold');
      hasOrbitron = true;
    } catch {
      // Fall back to helvetica
    }

    const setOrbitron = () => {
      if (hasOrbitron) doc.setFont('Orbitron', 'bold');
      else doc.setFont('helvetica', 'bold');
    };

    // --- Draw page background with Tron grid ---
    function drawPageBackground() {
      // Dark background
      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Tron grid lines — very subtle
      doc.setDrawColor(18, 22, 30);
      doc.setLineWidth(0.1);

      // Vertical grid lines
      for (let x = 0; x <= pageWidth; x += 10) {
        doc.line(x, 0, x, pageHeight);
      }

      // Horizontal grid lines
      for (let gy = 0; gy <= pageHeight; gy += 10) {
        doc.line(0, gy, pageWidth, gy);
      }

      // Slightly brighter accent lines every 40mm
      doc.setDrawColor(22, 30, 40);
      doc.setLineWidth(0.15);
      for (let x = 0; x <= pageWidth; x += 40) {
        doc.line(x, 0, x, pageHeight);
      }
      for (let gy = 0; gy <= pageHeight; gy += 40) {
        doc.line(0, gy, pageWidth, gy);
      }
    }

    drawPageBackground();

    // Logo
    let y = 20;
    if (logoImgRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = logoImgRef.current.naturalWidth;
        canvas.height = logoImgRef.current.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(logoImgRef.current, 0, 0);
        const logoData = canvas.toDataURL('image/png');
        const logoWidth = 60;
        const logoHeight = (logoImgRef.current.naturalHeight / logoImgRef.current.naturalWidth) * logoWidth;
        doc.addImage(logoData, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
        y += logoHeight + 12;
      } catch {
        y += 10;
      }
    }

    // "Rad sesh, dude!" title
    doc.setTextColor(0, 200, 255);
    doc.setFontSize(26);
    setOrbitron();
    doc.text('RAD SESH, DUDE!', pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Room name
    doc.setTextColor(157, 0, 255);
    doc.setFontSize(14);
    setOrbitron();
    doc.text(roomName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Date
    doc.setTextColor(150, 150, 160);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, pageWidth / 2, y, { align: 'center' });
    y += 14;

    // Setlist header
    doc.setTextColor(0, 200, 255);
    doc.setFontSize(12);
    setOrbitron();
    doc.text('SETLIST', margin, y);
    doc.setTextColor(100, 100, 110);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${playlist.length} song${playlist.length !== 1 ? 's' : ''}`, pageWidth - margin, y, { align: 'right' });
    y += 8;

    // Song list
    doc.setFontSize(9);
    playlist.forEach((item, index) => {
      // New page if needed
      if (y > pageHeight - 30) {
        doc.addPage();
        drawPageBackground();
        y = margin;
      }

      // Song number
      doc.setTextColor(60, 60, 70);
      doc.setFont('helvetica', 'normal');
      const numStr = String(index + 1).padStart(2, '0');
      doc.text(numStr, margin, y);

      // Song title
      doc.setTextColor(230, 230, 240);
      doc.setFont('helvetica', 'bold');
      const title = item.title.length > 55 ? item.title.substring(0, 52) + '...' : item.title;
      doc.text(title, margin + 10, y);

      // Duration
      const dur = typeof item.duration === 'number' ? formatDuration(item.duration) : (item.duration || '');
      if (dur) {
        doc.setTextColor(100, 100, 110);
        doc.setFont('helvetica', 'normal');
        doc.text(dur, pageWidth - margin, y, { align: 'right' });
      }

      y += 4.5;

      // Channel + added by
      doc.setTextColor(80, 80, 90);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      let meta = item.channelName || '';
      if (item.addedByName) meta += (meta ? ' · ' : '') + `Added by ${item.addedByName}`;
      doc.text(meta, margin + 10, y);

      // YouTube link
      doc.setTextColor(60, 60, 70);
      doc.text(`youtu.be/${item.videoId}`, pageWidth - margin, y, { align: 'right' });

      doc.setFontSize(9);
      y += 7;
    });

    // Footer
    y = Math.max(y + 5, pageHeight - 16);
    if (y > pageHeight - 10) {
      doc.addPage();
      drawPageBackground();
      y = pageHeight - 16;
    }
    doc.setTextColor(60, 60, 70);
    doc.setFontSize(7);
    setOrbitron();
    doc.text('COOL DUDE KARAOKE', pageWidth / 2, y, { align: 'center' });

    // Save
    const filename = `${roomName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-setlist.pdf`;
    doc.save(filename);
  };

  return (
    <div className="app closeout-page">
      <div className="closeout-container">
        <img src={logo} alt="Cool Dude Karaoke" className="closeout-logo" />

        <h1 className="closeout-title">Rad sesh, dude!</h1>
        {isGuest && guestName && <p className="closeout-guest-name">Thanks for singing, {guestName}!</p>}
        <p className="closeout-room-name">{roomName}</p>
        <p className="closeout-date">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>

        {playlist.length > 0 && (
          <div className="closeout-stats">
            <span className="closeout-stat">{playlist.length} song{playlist.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="closeout-actions">
          <div className="closeout-action-card">
            <h3>Download Keepsake</h3>
            <p>Save a stylized PDF of tonight's setlist</p>
            <button
              className="btn-neon closeout-btn"
              onClick={handleDownloadPDF}
              disabled={playlist.length === 0}
            >
              Download PDF
            </button>
          </div>

          {!isGuest && <div className="closeout-action-card">
            <h3>Publish to YouTube</h3>
            {!oauthConfigured ? (
              <p className="closeout-note">YouTube publishing not configured on this server.</p>
            ) : publishResult ? (
              <div className="closeout-publish-success">
                <p>Playlist created! {publishResult.added} song{publishResult.added !== 1 ? 's' : ''} added.</p>
                <a
                  href={publishResult.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-neon closeout-btn"
                >
                  View on YouTube
                </a>
              </div>
            ) : (
              <>
                <div className="closeout-playlist-name">
                  <label>Playlist Name</label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="My Karaoke Night"
                    maxLength={100}
                  />
                </div>
                {!youtubeToken ? (
                  <button className="btn-neon closeout-btn" onClick={handleConnectYouTube}>
                    Connect YouTube Account
                  </button>
                ) : (
                  <button
                    className="btn-neon closeout-btn closeout-btn-publish"
                    onClick={handlePublish}
                    disabled={publishing || !playlistName.trim() || playlist.length === 0}
                  >
                    {publishing ? 'Publishing...' : `Publish ${playlist.length} Songs`}
                  </button>
                )}
                {publishError && <p className="closeout-error">{publishError}</p>}
              </>
            )}
          </div>}
        </div>

        <div className="closeout-setlist">
          <h3>Tonight's Setlist</h3>
          <div className="closeout-song-list">
            {playlist.map((item, index) => (
              <div key={item.id || index} className="closeout-song">
                <span className="closeout-song-num">{index + 1}</span>
                <div className="closeout-song-info">
                  <span className="closeout-song-title">{item.title}</span>
                  <span className="closeout-song-meta">
                    {item.channelName}
                    {item.addedByName && ` · ${item.addedByName}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-neon closeout-new-room" onClick={() => navigate('/login')}>
          Open a New Room
        </button>
      </div>
    </div>
  );
};

export default CloseoutPage;
