import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ─────────────────────────── TYPES ─────────────────────────── */

export interface DuelResult {
  discipline: string;
  opponent?: string;
  result: 'win' | 'loss' | 'draw';
  score: string;
}

export interface FeedbackPageProps {
  duel: DuelResult;
  userInitial: string;
  onSubmit: (data: { rating: number; tags: string[]; comment: string }) => void;
  onSkip: () => void;
}

/* ─────────────────────────── CONSTANTS ─────────────────────── */

const TAGS = ['Challenges', 'Animationen', 'Balancing', 'Statistiken', 'UI-Design'];

const EMOJIS = [
  { emoji: '😤', label: 'Schlecht' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😄', label: 'Gut' },
  { emoji: '🤩', label: 'Super' },
  { emoji: '🔥', label: 'Episch' },
];

const RESULT_META: Record<DuelResult['result'], { icon: React.ReactNode; text: string; color: string }> = {
  win: {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z" fill="#39FF14" /></svg>,
    text: 'Sieg!',
    color: '#39FF14',
  },
  loss: {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="#FF4444" strokeWidth="3" strokeLinecap="round" /></svg>,
    text: 'Niederlage',
    color: '#FF4444',
  },
  draw: {
    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12H19" stroke="#FFAA00" strokeWidth="3" strokeLinecap="round" /></svg>,
    text: 'Unentschieden',
    color: '#FFAA00',
  },
};

/* ─────────────────────────── COMPONENT ─────────────────────── */

const FeedbackPage: React.FC<FeedbackPageProps> = ({ duel, userInitial, onSubmit, onSkip }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '90px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [comment]);

  const handleEmojiTap = useCallback((idx: number) => setRating(idx), []);
  const handleTagToggle = useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 300) setComment(val);
  }, []);
  const handleSubmit = useCallback(() => {
    if (rating === null) return;
    onSubmit({ rating, tags, comment });
  }, [rating, tags, comment, onSubmit]);

  const meta = RESULT_META[duel.result];
  const titleName = duel.opponent || duel.discipline;

  const s: Record<string, React.CSSProperties> = {
    page: { background: '#0B1A0B', minHeight: '100vh', overflowY: 'auto', paddingBottom: 40, fontFamily: "'Inter', system-ui, sans-serif", color: '#fff', maxWidth: 480, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 20px 8px' },
    logoText: { fontSize: 22, fontWeight: 900, letterSpacing: 3, color: '#fff' },
    logoAccent: { color: '#39FF14' },
    avatar: { width: 38, height: 38, borderRadius: '50%', background: '#1a6a6a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 },
    duelCard: { margin: '14px 16px 0', background: '#112211', border: '1px solid #1e3a1e', borderRadius: 14, padding: '16px 18px' },
    label: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#4a7a4a', textTransform: 'uppercase', marginBottom: 10 },
    duelRow: { display: 'flex', alignItems: 'center', gap: 14 },
    iconBox: { width: 46, height: 46, borderRadius: 12, background: '#0d2a0d', border: '1.5px solid #39FF1444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    duelTitle: { color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: 0.3 },
    duelScore: { color: '#4a7a4a', fontSize: 12, marginTop: 3 },
    section: { padding: '22px 20px 0' },
    sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#4a7a4a', textTransform: 'uppercase', marginBottom: 14 },
    emojiRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
    emojiItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'transform 150ms ease' },
    emojiBtnDefault: { width: 52, height: 52, background: '#112211', border: '1.5px solid #1e3a1e', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer' },
    emojiBtnSelected: { width: 58, height: 58, background: '#0d2a0d', border: '2px solid #39FF14', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, cursor: 'pointer' },
    emojiLabelDefault: { color: '#3a5a3a', fontSize: 10, fontWeight: 600 },
    emojiLabelSelected: { color: '#39FF14', fontSize: 10, fontWeight: 700 },
    tagsWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    tagDefault: { background: '#112211', border: '1px solid #1e3a1e', color: '#4a7a4a', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 20, cursor: 'pointer' },
    tagSelected: { background: '#0d2a0d', border: '1px solid #39FF1455', color: '#39FF14', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 20, cursor: 'pointer' },
    commentCard: { background: '#112211', border: '1.5px solid #1e3a1e', borderRadius: 14, padding: '14px 16px' },
    textarea: { background: 'transparent', border: 'none', outline: 'none', color: '#ccc', fontSize: 13, lineHeight: 1.7, minHeight: 90, resize: 'none', width: '100%', fontFamily: 'inherit' },
    counter: { marginTop: 8, display: 'flex', justifyContent: 'flex-end' },
    counterText: { color: '#2a4a2a', fontSize: 11, fontWeight: 600 },
    submitWrap: { padding: '24px 20px 0' },
    submitBtn: { width: '100%', background: 'linear-gradient(135deg, #00E5CC 0%, #39FF14 100%)', border: 'none', borderRadius: 14, padding: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitBtnDisabled: { width: '100%', background: 'linear-gradient(135deg, #00E5CC 0%, #39FF14 100%)', border: 'none', borderRadius: 14, padding: 18, opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitText: { color: '#071a00', fontSize: 14, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' },
    skipLink: { textAlign: 'center', marginTop: 14, color: '#2a4a2a', fontSize: 12, fontWeight: 600, letterSpacing: 0.5, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logoText}>SCHUSS<span style={s.logoAccent}>DUELL</span></div>
        <div style={s.avatar}>{userInitial}</div>
      </div>

      <div style={s.duelCard}>
        <div style={s.label}>DUELL ERGEBNIS</div>
        <div style={s.duelRow}>
          <div style={s.iconBox}>{meta.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={s.duelTitle}>{titleName} — <span style={{ color: meta.color }}>{meta.text}</span></div>
            <div style={s.duelScore}>{duel.score}</div>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>DEINE BEWERTUNG</div>
        <div style={s.emojiRow}>
          {EMOJIS.map((item, idx) => {
            const selected = rating === idx;
            return (
              <div key={idx} style={s.emojiItem} onClick={() => handleEmojiTap(idx)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}>
                <div style={selected ? s.emojiBtnSelected : s.emojiBtnDefault}>{item.emoji}</div>
                <span style={selected ? s.emojiLabelSelected : s.emojiLabelDefault}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>WAS HAT DIR GEFALLEN?</div>
        <div style={s.tagsWrap}>
          {TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return <span key={tag} style={selected ? s.tagSelected : s.tagDefault} onClick={() => handleTagToggle(tag)}>{tag}</span>;
          })}
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>DEIN KOMMENTAR</div>
        <div style={s.commentCard}>
          <textarea ref={textareaRef} style={s.textarea} placeholder="Was können wir besser machen? Bugs, Ideen, Lob..." value={comment} onChange={handleCommentChange} maxLength={300} rows={3} />
          <div style={s.counter}><span style={s.counterText}>{comment.length} / 300</span></div>
        </div>
      </div>

      <div style={s.submitWrap}>
        <button style={rating === null ? s.submitBtnDisabled : s.submitBtn} onClick={handleSubmit}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#071a00" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#071a00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={s.submitText}>FEEDBACK ABSENDEN</span>
        </button>
        <button style={s.skipLink} onClick={onSkip}>Überspringen</button>
      </div>
    </div>
  );
};

export default FeedbackPage;
