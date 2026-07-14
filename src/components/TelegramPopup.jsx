export default function TelegramPopup({ onClose }) {
  return (
    <div className="tg-overlay" onClick={onClose}>
      <div className="tg-popup" onClick={(e) => e.stopPropagation()}>
        <div className="tg-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21.5 4.5L2.5 11.5l5 2 2 6 3-4 5 4z" fill="white" stroke="none" />
          </svg>
        </div>
        <h3 className="tg-title">Join our Telegram</h3>
        <p className="tg-desc">
          Get updates, support, and connect with the community on our Telegram channel.
        </p>
        <a
          href="https://t.me/codeflake"
          target="_blank"
          rel="noopener noreferrer"
          className="tg-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M21.5 4.5L2.5 11.5l5 2 2 6 3-4 5 4z" />
          </svg>
          Open Telegram
        </a>
        <button className="tg-close" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
