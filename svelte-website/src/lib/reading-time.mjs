// AI Generated function to convert a markdown body into an "x minute read" label 
const WORDS_PER_MINUTE = 200;


/**
 * Converts a markdown body into an "x minute read" label.
 * @param {string} markdown - The markdown content to evaluate.
 * @param {number} [wordsPerMinute=200] - Optional reading speed in words per minute.
 * @returns {string}
 */
export function readingTimeLabel(markdown, wordsPerMinute = WORDS_PER_MINUTE) {
  const words = String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / wordsPerMinute));
  return `${minutes} minute read`;
}
