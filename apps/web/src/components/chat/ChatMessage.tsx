'use client';

import { formatDate } from '../../lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  isTyping?: boolean;
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className="animate-slide-up" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 'var(--space-6)',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'var(--space-3)',
        flexDirection: isUser ? 'row-reverse' : 'row',
        maxWidth: '85%'
      }}>
        
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-full)',
          flexShrink: 0,
          background: isUser ? 'var(--bg-secondary)' : 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isUser ? 'var(--text-primary)' : 'white',
          fontSize: '0.8rem',
          border: '1px solid var(--border-color)'
        }}>
          {isUser ? 'U' : '✨'}
        </div>
        
        <div className={isUser ? '' : 'glass'} style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-xl)',
          borderBottomRightRadius: isUser ? '4px' : 'var(--radius-xl)',
          borderBottomLeftRadius: isUser ? 'var(--radius-xl)' : '4px',
          background: isUser ? 'var(--accent-gradient)' : 'var(--bg-glass)',
          color: isUser ? 'white' : 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative'
        }}>
          {message.isTyping ? (
            <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate' }} />
              <span style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate', animationDelay: '0.2s' }} />
              <span style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate', animationDelay: '0.4s' }} />
            </div>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {message.content}
            </div>
          )}
        </div>
      </div>
      
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-2)',
        marginRight: isUser ? '44px' : '0',
        marginLeft: isUser ? '0' : '44px'
      }}>
        {formatDate(message.timestamp)}
      </div>
    </div>
  );
}
