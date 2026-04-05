import React, { useState, useRef } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const PlaylistQueue = () => {
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
  } = usePlaylist();

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
        <div className="queue-controls">
          {items.length > 0 && (
            <>
              <button className="btn-neon btn-small" onClick={togglePlay}>
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                className="btn-neon btn-small"
                onClick={playNext}
                disabled={currentIndex >= items.length - 1 && currentIndex !== -1}
                title="Skip to next song"
              >
                ⏭ Skip
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
      </div>

      {items.length === 0 ? (
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
              className={`queue-item ${index === currentIndex ? 'queue-item-active' : ''} ${dragOverIndex === index ? 'queue-item-dragover' : ''}`}
              onDoubleClick={() => playIndex(index)}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <span className="queue-drag-handle" title="Drag to reorder">⠿</span>
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
                  {item.channelName} · {item.duration}
                </p>
              </div>
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
