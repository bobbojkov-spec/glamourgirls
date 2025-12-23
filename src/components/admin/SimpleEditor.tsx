'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeLimitedHtml } from '@/lib/sanitizeLimitedHtml';

interface SimpleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function SimpleEditor({ value, onChange, placeholder, rows = 4 }: SimpleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>('');
  const [focused, setFocused] = useState(false);

  const sanitizedValue = useMemo(() => sanitizeLimitedHtml(value || ''), [value]);

  // Keep editor in sync with external value (without clobbering selection on every keystroke)
  useEffect(() => {
    if (!editorRef.current) return;
    if (focused) return;
    if (sanitizedValue === lastHtmlRef.current) return;
    editorRef.current.innerHTML = sanitizedValue;
    lastHtmlRef.current = sanitizedValue;
  }, [sanitizedValue, focused]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const raw = el.innerHTML || '';
    const cleaned = sanitizeLimitedHtml(raw);
    if (cleaned !== raw) {
      el.innerHTML = cleaned;
      placeCaretAtEnd(el);
    }
    lastHtmlRef.current = cleaned;
    onChange(cleaned);
  };

  const exec = (cmd: 'bold' | 'italic') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(cmd, false);
    emitChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Normalize Enter to <br> instead of <div>/<p>
    if (e.key === 'Enter') {
      e.preventDefault();
      // eslint-disable-next-line deprecation/deprecation
      document.execCommand('insertLineBreak');
      emitChange();
    }
  };

  const heightPx = Math.max(80, rows * 22);

  return (
    <div className="border border-gray-300 rounded">
      {/* Toolbar */}
      <div className="flex gap-2 p-2 bg-gray-100 border-b border-gray-300">
        <button
          type="button"
          onClick={() => exec('bold')}
          className="px-3 py-1 text-sm font-bold border border-gray-300 bg-white hover:bg-gray-50 rounded"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          className="px-3 py-1 text-sm italic border border-gray-300 bg-white hover:bg-gray-50 rounded"
          title="Italic"
        >
          <em>I</em>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          emitChange();
        }}
        onInput={emitChange}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 focus:outline-none overflow-auto"
        style={{
          fontSize: '14px',
          minHeight: `${heightPx}px`,
          whiteSpace: 'pre-wrap',
        }}
        data-placeholder={placeholder || ''}
      />

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

