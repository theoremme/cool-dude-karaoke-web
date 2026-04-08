// Parse ISO 8601 duration (PT3M42S) to seconds
// Returns null if duration is invalid or implausible for karaoke
export function parseVideoDuration(isoDuration) {
  if (!isoDuration) return null;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  // Sanity check: karaoke songs should be 30s–60min
  if (total < 30 || total > 3600) return null;
  return total;
}

// Format ISO 8601 duration to human-readable "M:SS" or "H:MM:SS"
export function formatDuration(isoDuration) {
  if (!isoDuration) return '';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
