import React, { useState, useRef, useEffect } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import { formatDuration } from '../services/durationParser';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

const PlaylistQueue = ({ guestMode = false, loading = false, playbackMode }) => {
  const {
    items,
    currentIndex,
    isPlaying,
    removeItem,
    playIndex,
    playNext,
    togglePlay,
    moveItem,
    clearPlaylist,
    userName,
  } = usePlaylist();

  const isMobile = useIsMobile();
  const activeItemRef = useRef(null);

  // Auto-scroll to current song when it changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex]);

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragCounter = useRef(0);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image slightly transparent
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      moveItem(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    dragCounter.current++;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
  };

  return (
    <div className="playlist-queue">
      <div className="queue-header">
        <h2>Playlist</h2>
        {!guestMode && (
          <div className="queue-controls">
            {items.length > 0 && (
              <>
                <button className="btn-neon btn-small" onClick={togglePlay}>
                  {isPlaying ? '❚❚ Pause' : '► Play'}
                </button>
                <button
                  className="btn-neon btn-small"
                  onClick={playNext}
                  disabled={currentIndex >= items.length - 1 && currentIndex !== -1}
                  title="Skip to next song"
                >
                  ►❚ Skip
                </button>
                <button
                  className="btn-neon btn-small btn-danger"
                  onClick={clearPlaylist}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="queue-empty">
          <div className="player-spinner" style={{ margin: '20px auto' }} />
          <p>Loading playlist...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="queue-empty">
          <p>No songs in the queue</p>
          <p className="queue-empty-hint">
            Search for songs and click + to add them
          </p>
        </div>
      ) : (
        <div className="queue-list">
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={index === currentIndex ? activeItemRef : null}
              className={`queue-item ${index === currentIndex ? 'queue-item-active' : ''} ${dragOverIndex === index ? 'queue-item-dragover' : ''} ${playbackMode === 'unplugged' && !item.embeddable ? 'queue-item-disabled' : ''}`}
              onDoubleClick={!guestMode && !(playbackMode === 'unplugged' && !item.embeddable) ? () => playIndex(index) : undefined}
              draggable={!guestMode && !isMobile}
              onDragStart={!guestMode && !isMobile ? (e) => handleDragStart(e, index) : undefined}
              onDragEnd={!guestMode && !isMobile ? handleDragEnd : undefined}
              onDragEnter={!guestMode && !isMobile ? (e) => handleDragEnter(e, index) : undefined}
              onDragLeave={!guestMode && !isMobile ? handleDragLeave : undefined}
              onDragOver={!guestMode && !isMobile ? handleDragOver : undefined}
              onDrop={!guestMode && !isMobile ? handleDrop : undefined}
            >
              {!guestMode && !isMobile && <span className="queue-drag-handle" title="Drag to reorder">⠿</span>}
              {!guestMode && isMobile && (
                <div className="queue-reorder-btns">
                  <button
                    className="queue-reorder-btn"
                    onClick={(e) => { e.stopPropagation(); if (index > 0) moveItem(index, index - 1); }}
                    disabled={index === 0}
                  >▲</button>
                  <button
                    className="queue-reorder-btn"
                    onClick={(e) => { e.stopPropagation(); if (index < items.length - 1) moveItem(index, index + 1); }}
                    disabled={index === items.length - 1}
                  >▼</button>
                </div>
              )}
              <span className="queue-position">
                {index === currentIndex && isPlaying ? '♪' : index + 1}
              </span>
              <img
                className="queue-thumbnail"
                src={item.thumbnail}
                alt={item.title}
              />
              <div className="queue-item-info">
                <p className="queue-item-title" title={item.title}>
                  {item.title}
                </p>
                <p className="queue-item-meta">
                  {item.channelName} · {formatDuration(item.duration)}
                  {item.addedByName && (
                    <span className={`queue-added-by ${userName && item.addedByName === userName ? 'queue-added-by-you' : ''}`}>
                      {' · '}{item.addedByName === userName ? 'You' : item.addedByName}
                    </span>
                  )}
                </p>
                {playbackMode === 'unplugged' && !item.embeddable && (
                  <span className="queue-amped-badge">Amped Only</span>
                )}
              </div>
              {!guestMode && (
                <button
                  className="queue-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(index);
                  }}
                  title="Remove from playlist"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="queue-footer">
        {items.length > 0 && (
          <span className="queue-count">
            {items.length} song{items.length !== 1 ? 's' : ''}
            {currentIndex >= 0 &&
              ` · Playing ${currentIndex + 1} of ${items.length}`}
          </span>
        )}
      </div>
    </div>
  );
};

export default PlaylistQueue;
