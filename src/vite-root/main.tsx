import React from 'react';
import ReactDOM from 'react-dom/client';
import FeedbackPage from '../pages/FeedbackPage';

const DEMO_DUEL = {
  discipline: '25m Pistole',
  opponent: 'Max M.',
  result: 'win' as const,
  score: '187 / 300',
};

function DemoApp() {
  const handleSubmit = (data: { rating: number; tags: string[]; comment: string }) => {
    console.log('[FeedbackPage] Submitted:', data);
    alert(`Feedback gesendet!\n\nRating: ${data.rating}\nTags: ${data.tags.join(', ')}\nKommentar: ${data.comment || '(kein Kommentar)'}`);
  };

  const handleSkip = () => {
    console.log('[FeedbackPage] Skipped');
    alert('Feedback übersprungen.');
  };

  return (
    <FeedbackPage
      duel={DEMO_DUEL}
      userInitial="T"
      onSubmit={handleSubmit}
      onSkip={handleSkip}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);
