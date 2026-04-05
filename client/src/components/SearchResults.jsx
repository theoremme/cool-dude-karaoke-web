import React from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';

const SearchResults = ({ results }) => {
  const { addItem, items } = usePlaylist();

  if (results.length === 0) {
    return null;
  }

  const isInPlaylist = (videoId) =>
    items.some((item) => item.videoId === videoId);

  const handleAdd = (video) => {
    addItem(video);
  };

  return (
    <div className="search-results">
      <h2>Search Results</h2>
      <div className="results-grid">
        {results.map((video) => {
          const alreadyAdded = isInPlaylist(video.videoId);
          return (
            <div key={video.videoId} className="result-card">
              <div className="result-thumbnail">
                <img src={video.thumbnail} alt={video.title} />
                <span className="result-duration">{video.duration}</span>
              </div>
              <div className="result-info">
                {video.vibeSuggestion && (
                  <p className="result-vibe-tag">✦ {video.vibeSuggestion}</p>
                )}
                <h3 className="result-title" title={video.title}>
                  {video.title}
                </h3>
                <p className="result-channel">{video.channelName}</p>
                <button
                  className={`btn-add ${alreadyAdded ? 'btn-add-disabled' : ''}`}
                  onClick={() => !alreadyAdded && handleAdd(video)}
                  disabled={alreadyAdded}
                >
                  {alreadyAdded ? '✓ Added' : '+ Add to Playlist'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResults;
