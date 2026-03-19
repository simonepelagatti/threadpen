/**
 * Lightweight markdown → HTML for rendering in the side panel.
 * Supports: bold, italic, bullet/numbered lists, headings, line breaks.
 */
export function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close list if this line isn't a list item
    const isBullet = /^[\-\*]\s+/.test(line);
    const isOrdered = /^\d+[\.\)]\s+/.test(line);

    if (inList && !isBullet && !isOrdered) {
      html.push(`</${inList}>`);
      inList = null;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level + 2}>${inlineFormat(headingMatch[2])}</h${level + 2}>`);
      continue;
    }

    // Bullet list
    if (isBullet) {
      if (inList !== 'ul') {
        if (inList) html.push(`</${inList}>`);
        html.push('<ul>');
        inList = 'ul';
      }
      html.push(`<li>${inlineFormat(line.replace(/^[\-\*]\s+/, ''))}</li>`);
      continue;
    }

    // Ordered list
    if (isOrdered) {
      if (inList !== 'ol') {
        if (inList) html.push(`</${inList}>`);
        html.push('<ol>');
        inList = 'ol';
      }
      html.push(`<li>${inlineFormat(line.replace(/^\d+[\.\)]\s+/, ''))}</li>`);
      continue;
    }

    // Empty line → break
    if (line.trim() === '') {
      html.push('<br/>');
      continue;
    }

    // Regular paragraph
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) html.push(`</${inList}>`);

  return html.join('');
}

function inlineFormat(text: string): string {
  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');
  // Inline code: `text`
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  return text;
}

/**
 * Strip markdown to plain text — for clipboard copy and Gmail insertion.
 * Removes formatting markers while preserving readable structure.
 */
export function markdownToPlainText(md: string): string {
  let text = md;
  // Remove bold/italic markers
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1');
  // Remove inline code backticks
  text = text.replace(/`(.+?)`/g, '$1');
  // Remove heading markers
  text = text.replace(/^#{1,3}\s+/gm, '');
  // Convert bullet markers to dash (they already are, but normalize)
  text = text.replace(/^\*\s+/gm, '- ');
  return text;
}
