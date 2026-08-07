import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

export default function LiveChat({ orderId, currentUserRole, customerName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!orderId) return;

    socket.emit('join_order_chat', orderId);

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('receive_chat_message', handleMessage);
    return () => socket.off('receive_chat_message', handleMessage);
  }, [orderId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const senderName = currentUserRole === 'shopkeeper' ? 'Shopkeeper 🟢' : `${customerName || 'Customer'} 🔵`;
    socket.emit('send_chat_message', { orderId, sender: senderName, message: input });
    setInput('');
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm mt-4">
      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">💬 Live Order Chat</h4>
      
      <div className="h-40 overflow-y-auto space-y-2 mb-3 p-2 bg-slate-50 rounded-lg text-xs">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center italic mt-4">Ask a question about this print order...</p>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className="bg-white p-2 rounded shadow-2xs border">
              <span className="font-bold text-slate-800">{m.sender}: </span>
              <span className="text-slate-700">{m.message}</span>
              <span className="text-[9px] text-gray-400 float-right">{m.timestamp}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Is my print ready?"
          className="flex-1 border text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg"
        >
          Send
        </button>
      </form>
    </div>
  );
}