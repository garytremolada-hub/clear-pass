export function calculateReadability(text) {
  // Clean text — remove HTML tags and extra whitespace
  const clean = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Count words — alphabetic tokens only
  const words = clean
    .split(/\s+/)
    .filter(w => w.match(/[a-zA-Z]/));
  const wordCount = words.length;

  if (wordCount === 0) return null;

  // Count sentences — split on . ! ? followed by space or end
  const sentences = clean
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10);
  const sentenceCount = Math.max(sentences.length, 1);

  // Count syllables per word
  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    // Remove silent e and common suffixes
    const cleaned = word
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '');
    const matches = cleaned.match(/[aeiouy]{1,2}/g);
    return matches ? Math.max(matches.length, 1) : 1;
  }

  const totalSyllables = words.reduce(
    (sum, w) => sum + countSyllables(w),
    0
  );

  // FK formulas
  const asl = wordCount / sentenceCount;
  const asw = totalSyllables / wordCount;

  const fkgl = Math.max(0,
    (0.39 * asl) + (11.8 * asw) - 15.59
  );

  const fre = Math.min(100, Math.max(0,
    206.835 - (1.015 * asl) - (84.6 * asw)
  ));

  return {
    fkgl: Math.round(fkgl * 10) / 10,
    fre: Math.round(fre * 10) / 10,
    wordCount,
    sentenceCount,
    syllables: totalSyllables,
    asl: Math.round(asl * 10) / 10,
    asw: Math.round(asw * 10) / 10
  };
}