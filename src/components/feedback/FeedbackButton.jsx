import { MessageSquare } from 'lucide-react';

export default function FeedbackButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#9ca3af',
                fontSize: '12px',
                padding: '8px 0',
                margin: '0 auto',
                textDecoration: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#6b7280'}
            onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
        >
            <MessageSquare style={{ width: '14px', height: '14px' }} />
            Give feedback on this result
        </button>
    );
}