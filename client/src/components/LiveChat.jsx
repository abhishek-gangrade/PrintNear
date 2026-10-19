import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function LiveChat({ orderId, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_order_chat', orderId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('receive_chat_message', msg => {
      setMessages(prev => [...prev, msg]);
    });

    axios.get(`/api/orders/${orderId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setMessages(res.data)).catch(() => {});

    return () => socket.disconnect();
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = e => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || !socketRef.current?.connected) return;
    socketRef.current.emit('send_chat_message', { orderId, message: clean });
    setText('');
  };

  const currentUserId = currentUser?.id || currentUser?._id;

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col h-[480px] overflow-hidden font-sans">
      <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider">Live Order Chat</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">#{orderId?.slice(-6)} · {connected ? 'Connected' : 'Connecting...'}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 w-7 h-7 rounded-full">✕</button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-center px-4">
            Start a conversation with the print shop.
          </div>
        ) : messages.map((msg, index) => {
          const senderId = msg.senderId || msg.sender?.id;
          const isMe = String(senderId) === String(currentUserId);
          return (
            <div key={msg._id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">
                {msg.senderName || msg.sender?.name || 'User'}
              </span>
              <div className={`p-3 rounded-2xl max-w-[82%] ${isMe ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'}`}>
                {msg.message}
              </div>
              <span className="text-[8px] text-slate-400 mt-1 px-1">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={1000}
          placeholder={connected ? 'Type your message...' : 'Connecting...'}
          disabled={!connected}
          className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-600"
        />
        <button disabled={!connected} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl text-xs">
          Send
        </button>
      </form>
    </div>
  );
}
