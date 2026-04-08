import React, { useState, useMemo } from 'react';
import { usePlaylist } from '../contexts/PlaylistContext';
import { formatDuration } from '../services/durationParser';

const COOL_WORDS = [
  'Rad', 'Gnarly', 'Tubular', 'Fresh', 'Dope', 'Ill', 'Sick', 'Fire',
  'Tight', 'Butter', 'Smooth', 'Cold', 'Slick', 'Fly', 'Phat',
  'Legit', 'Solid', 'Boss', 'Primo',
];

const NOT_COOL_WORDS = [
  'Bogus', 'Wack', 'Whack', 'Busted', 'Crusty', 'Dusty', 'Basic', 'Weak',
  'Corny', 'Cheesy', 'Tired', 'Sus', 'Mid', 'Janky', 'Sketchy', 'Tragic',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SearchResults = ({ results }) => {
  const { addItem, items } = usePlaylist();
  const [addedIds, setAddedIds] = useState(new Set());

  // Filter out non-embeddable videos entirely
  const sortedResults = useMemo(() => {
    return results.filter((video) => video.embeddable !== false);
  }, [results]);

  if (results.length === 0) {
    return null;
  }

  const isInPlaylist = (videoId) =>
    addedIds.has(videoId) || items.some((item) => item.videoId === videoId);

  const handleAdd = (video) => {
    setAddedIds((prev) => new Set(prev).add(video.videoId));
    addItem(video);
  };

  return (
    <div className="search-results">
      <h2>Search Results</h2>
      <div className="results-grid">
        {sortedResults.map((video) => {
          const alreadyAdded = isInPlaylist(video.videoId);
          return (
            <div key={video.videoId} className="result-card">
              <div className="result-thumbnail">
                <img src={video.thumbnail} alt={video.title} />
                <span className="result-duration">{formatDuration(video.duration)}</span>
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
