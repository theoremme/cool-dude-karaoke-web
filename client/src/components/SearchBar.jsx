import React, { useState } from 'react';

const SearchBar = ({ onSearch, onVibe, loading, vibeLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !loading && !vibeLoading) {
      onSearch(trimmed);
    }
  };

  const handleVibe = () => {
    const trimmed = query.trim();
    if (trimmed && !loading && !vibeLoading) {
      onVibe(trimmed);
    }
  };

  const busy = loading || vibeLoading;

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="search-input"
        placeholder="Search songs or describe a vibe... (e.g. &quot;80s Power Ballads&quot;)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={busy}
      />
      <button type="submit" className="search-button" disabled={busy || !query.trim()}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      <button
        type="button"
        className="vibe-button"
        disabled={busy || !query.trim()}
        onClick={handleVibe}
        title="Generate a themed playlist using AI"
      >
        {vibeLoading ? 'Vibing...' : '✦ Vibe'}
      </button>
    </form>
  );
};

export default SearchBar;
