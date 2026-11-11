// Live chat between the customer and the rider for one order.
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useT } from '../i18n';

const ChatBox = ({ orderId, socket, myRole, quickReplies = [] }) => {
  const { t, locale } = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    API.get(`/orders/${orderId}/messages`).then(({ data }) => setMessages(data)).catch(() => {});
  }, [orderId]);

  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (m) => {
      if (String(m.orderId) !== String(orderId)) return;
      setMessages((prev) => (prev.some((p) => p._id === m._id) ? prev : [...prev, m]));
      if (m.senderRole !== myRole) toast(`${m.senderName}: ${m.text}`, { icon: '💬', id: `chat-${m._id}` });
    };
    socket.on('chat_message', onMessage);
    return () => socket.off('chat_message', onMessage);
  }, [socket, orderId, myRole]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (body) => {
    const msg = (body ?? text).trim();
    if (!msg) return;
    setSending(true);
    try {
      const { data } = await API.post(`/orders/${orderId}/messages`, { text: msg });
      setMessages((prev) => (prev.some((p) => p._id === data._id) ? prev : [...prev, data]));
      setText('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 && <p className="muted small center">{t('chat.empty')}</p>}
        {messages.map((m) => (
          <div key={m._id} className={`chat-msg ${m.senderRole === myRole ? 'mine' : ''}`}>
            {m.senderRole !== myRole && <span className="chat-name">{m.senderName}</span>}
            <span>{m.text}</span>
            <time>{new Date(m.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>
      {quickReplies.length > 0 && (
        <div className="chip-row" style={{ margin: '8px 0' }}>
          {quickReplies.map((q) => (
            <button key={q} type="button" className="chip" disabled={sending} onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>{t('chat.send')}</button>
      </form>
    </div>
  );
};

export default ChatBox;
