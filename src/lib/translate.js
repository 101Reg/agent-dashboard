// Plain-language translation for stuck items shown in carousel.
// Keyword-based — not exhaustive. Falls back to truncated first sentence.

export function translateStuckDetail(detail) {
  if (!detail) return { summary: 'Unknown stuck item', suggestion: null }
  const d = detail.toLowerCase()

  if (d.includes('explore') && (d.includes('piecewise') || d.includes('first-read'))) {
    return {
      summary: 'Did piecewise reads instead of spawning the Explore agent on a first-time codebase',
      suggestion: 'Tell me: "install a hook that detects 3+ Read calls in a row from a new directory and forces an Explore spawn"',
    }
  }
  if (d.includes('committed') && d.includes('reviewer')) {
    return {
      summary: 'Committed multiple times in one session without spawning the reviewer agent',
      suggestion: 'Tell me: "tighten the reviewer-gate hook so it blocks commits, not just advises"',
    }
  }
  if (d.includes('reviewer not spawned') || d.includes('reviewer skipped')) {
    return {
      summary: 'Skipped the reviewer agent before a commit (markdown / Bruce output / scope reason)',
      suggestion: 'Tell me: "tighten the markdown-bypass logic in reviewer-gate, or remove the bypass entirely"',
    }
  }
  if (d.includes('read tool') && d.includes('pdf')) {
    return {
      summary: 'Read tool hit size limit on a large PDF with images',
      suggestion: 'Tell me: "add an auto-detect for large PDFs and route to pdftotext / pdftoppm pipeline"',
    }
  }
  if (d.includes('hook') && d.includes('catch')) {
    return {
      summary: 'A hook caught a problem but the underlying capability gap was never fixed',
      suggestion: 'Tell me: "look at this hook_catch and either install a real prevention or retire the hook"',
    }
  }

  // Fallback: first sentence, truncated
  const firstSentence = detail.split(/[.\n]/)[0].trim()
  const truncated = firstSentence.length > 110 ? firstSentence.slice(0, 110) + '…' : firstSentence
  return { summary: truncated, suggestion: 'Tell me: "look at this stuck item and decide: install a prevention, retire the trigger, or accept it as one-off"' }
}

export function translatePatternHeading(heading) {
  if (!heading) return { summary: 'Unknown pattern', suggestion: null }
  const h = heading

  if (h.includes('Cross-session') && h.includes('capability_gap')) {
    return {
      summary: 'The same kind of capability gap keeps happening across multiple sessions',
      suggestion: 'Tell me: "extract a template from these recurring gaps so we stop hitting the same wall"',
    }
  }
  if (h.includes('Cross-session') && h.includes('hook_catch')) {
    return {
      summary: 'The same hook is catching the same problem across multiple sessions',
      suggestion: 'Tell me: "either tighten the hook so it prevents instead of just catches, or retire it if it has high false-positive rate"',
    }
  }
  if (h.includes('Similarity cluster')) {
    const m = h.match(/(\d+)\s*events/)
    const n = m ? m[1] : 'multiple'
    return {
      summary: `${n} similar events clustered together — likely a repeating pattern that hasn't been encoded yet`,
      suggestion: 'Tell me: "look at the cluster contents and decide if this deserves a template or a rule"',
    }
  }

  // Fallback
  return {
    summary: heading,
    suggestion: 'Tell me: "look at this pattern and decide: extract a template, install a rule, or skip it"',
  }
}
