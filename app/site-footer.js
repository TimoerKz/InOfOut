'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, X, Copy, Mail } from 'lucide-react';

const feedbackEmail = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || 'tijmoer@gmail.com';
const tipUrl = process.env.NEXT_PUBLIC_TIP_URL || '';

export default function SiteFooter() {
  const [kind, setKind] = useState('feedback');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const opener = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    const restore = () => opener.current?.focus();
    node.addEventListener('close', restore);
    return () => node.removeEventListener('close', restore);
  }, []);
  const open = (event, nextKind) => {
    opener.current = event.currentTarget;
    setKind(nextKind);
    setNotice('');
    dialog.current.showModal();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.trim());
      setNotice('Gekopieerd. Je kunt je bericht nu zelf delen.');
    } catch {
      setNotice('Kopiëren lukte niet. Selecteer en kopieer je tekst handmatig.');
    }
  };
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-story">
          <strong>Meer samen. Minder plannen.</strong>
          <p>InOfOut blijft gratis en advertentievrij.</p>
          <small>© {new Date().getFullYear()} InOfOut</small>
        </div>
        <div className="footer-actions">
          <button onClick={(event) => open(event, 'feedback')}><MessageCircle size={17} /> Feedback & ideeën</button>
          {tipUrl ? (
            <a className="tip-button" href={tipUrl} target="_blank" rel="noopener noreferrer"><Heart size={17} /> Geef een fooi</a>
          ) : (
            <button className="tip-button" onClick={(event) => open(event, 'tip')}><Heart size={17} /> Geef een fooi</button>
          )}
        </div>
      </div>
      <dialog ref={dialog} className="footer-dialog" aria-labelledby="footer-dialog-title">
        <button className="close" aria-label="Sluiten" onClick={() => dialog.current.close()}><X size={22} /></button>
        <span className="footer-dialog-icon">{kind === 'tip' ? <Heart /> : <MessageCircle />}</span>
        <h2 id="footer-dialog-title">{kind === 'tip' ? 'Een klein gebaar. Dank je wel.' : 'Wat kan er beter?'}</h2>
        {kind === 'tip' ? (
          <p>Een fooi is helemaal vrijwillig. InOfOut blijft voor iedereen gratis en advertentievrij. De betaalmogelijkheid komt binnenkort beschikbaar.</p>
        ) : (
          <>
            <p>Een idee, een foutje of iets dat makkelijker kan? Laat het weten.</p>
            <label htmlFor="feedback-message">Jouw feedback of idee</label>
            <textarea id="feedback-message" value={message} onChange={(event) => { setMessage(event.target.value); setNotice(''); }} rows={5} placeholder="Ik zou het handig vinden als…" maxLength={4000} />
            {feedbackEmail ? (
              <a className="footer-submit" aria-disabled={!message.trim()} href={message.trim() ? `mailto:${feedbackEmail}?subject=${encodeURIComponent('Feedback over InOfOut')}&body=${encodeURIComponent(message.trim())}` : undefined}><Mail size={17} /> Open in e-mail</a>
            ) : (
              <>
                <p className="footer-note">Direct versturen komt binnenkort. Je kunt je tekst alvast kopiëren; er wordt hier nog niets verzonden.</p>
                <button className="footer-submit" disabled={!message.trim()} onClick={copy}><Copy size={17} /> Kopieer feedback</button>
              </>
            )}
            <p role="status" className="footer-note">{notice}</p>
          </>
        )}
      </dialog>
    </footer>
  );
}
