import React, { useState, useCallback } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const searchYouTube = async (query) => {
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.items || data.data || data;
};

const SongVersions = ({ song, onBack }) => {
  const { addItem, items } = usePlaylist();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const query = `${song.title} ${song.artist} karaoke`;
        const results = await searchYouTube(query);
        setVersions(results);
      } catch (e) {
        setError('Search failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [song]);

  const isInPlaylist = (videoId) =>
    items.some((item) => item.videoId === videoId);

  return (
    <div className="vibe-versions">
      <div className="vibe-versions-header">
        <button className="btn-neon btn-small" onClick={onBack}>
          &larr; Back to Results
        </button>
        <span className="vibe-versions-title">
          {song.title} — {song.artist}
        </span>
      </div>

      {loading && <div className="loading">Searching karaoke versions...</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="vibe-versions-list">
        {versions.map((video) => {
          const added = isInPlaylist(video.videoId);
          return (
            <div key={video.videoId} className="vibe-version-item">
              <img className="vibe-version-thumb" src={video.thumbnail} alt="" />
              <div className="vibe-version-info">
                <p className="vibe-version-name" title={video.title}>
                  {video.title}
                </p>
                <p className="vibe-version-meta">
                  {video.channelName} · {video.duration}
                </p>
              </div>
              <button
                className={`btn-add-version ${added ? 'btn-add-version-done' : ''}`}
                onClick={() => !added && addItem(video)}
                disabled={added}
              >
                {added ? '✓ Added' : '+ Add'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const VibeSuggestionItem = ({ song, index, onShowVersions }) => {
  const { addItem, items } = usePlaylist();
  const [searching, setSearching] = useState(false);
  const [added, setAdded] = useState(false);

  const handleQuickAdd = useCallback(async () => {
    setSearching(true);
    try {
      const query = `${song.title} ${song.artist} karaoke`;
      const results = await searchYouTube(query);
      if (results && results.length > 0) {
        addItem(results[0]);
        setAdded(true);
      }
    } catch (e) {}
    setSearching(false);
  }, [song, addItem]);

  return (
    <div className="vibe-item">
      <span className="vibe-item-number">{index + 1}</span>
      <div className="vibe-item-info">
        <span className="vibe-item-title">{song.title}</span>
        <span className="vibe-item-artist">{song.artist}</span>
      </div>
      <div className="vibe-item-actions">
        <button
          className="btn-neon btn-small"
          onClick={() => onShowVersions(song)}
        >
          Show Versions
        </button>
        <button
          className={`btn-neon btn-small btn-vibe-add ${added ? 'btn-vibe-added' : ''}`}
          onClick={handleQuickAdd}
          disabled={searching || added}
        >
          {searching ? '...' : added ? '✓ Added' : '+ Add'}
        </button>
      </div>
    </div>
  );
};

const VibeSuggestions = ({ theme, suggestions, onRequestMore, loadingMore }) => {
  const { addItem } = usePlaylist();
  const [viewingSong, setViewingSong] = useState(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addAllProgress, setAddAllProgress] = useState(0);

  const handleAddAll = useCallback(async () => {
    setAddingAll(true);
    setAddAllProgress(0);

    for (let i = 0; i < suggestions.length; i++) {
      const song = suggestions[i];
      try {
        const query = `${song.title} ${song.artist} karaoke`;
        const results = await searchYouTube(query);
        if (results && results.length > 0) {
          addItem(results[0]);
        }
      } catch (e) {}
      setAddAllProgress(i + 1);
    }

    setAddingAll(false);
  }, [suggestions, addItem]);

  if (viewingSong) {
    return (
      <div className="vibe-suggestions">
        <div className="vibe-suggestions-header">
          <h2 className="vibe-header">✦ {theme}</h2>
        </div>
        <SongVersions
          song={viewingSong}
          onBack={() => setViewingSong(null)}
        />
      </div>
    );
  }

  return (
    <div className="vibe-suggestions">
      <div className="vibe-suggestions-header">
        <h2 className="vibe-header">✦ {theme}</h2>
        <div className="vibe-suggestions-actions">
          <span className="vibe-count">{suggestions.length} songs</span>
          <button
            className="btn-neon btn-small btn-vibe-add"
            onClick={handleAddAll}
            disabled={addingAll}
          >
            {addingAll
              ? `Adding ${addAllProgress}/${suggestions.length}...`
              : '+ Add All'}
          </button>
        </div>
      </div>
      <div className="vibe-list">
        {suggestions.map((song, index) => (
          <VibeSuggestionItem
            key={`${song.title}-${song.artist}-${index}`}
            song={song}
            index={index}
            onShowVersions={setViewingSong}
          />
        ))}
      </div>
      <button
        className="btn-neon vibe-show-more"
        onClick={onRequestMore}
        disabled={loadingMore}
      >
        {loadingMore ? '✦ Generating more...' : '✦ Show More'}
      </button>
    </div>
  );
};

export default VibeSuggestions;
