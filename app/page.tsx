'use client';

import { useState, useEffect, useRef } from 'react';
import type { Borrower, Message } from './lib/types';

export default function Home() {
  const [messagesByBorrower, setMessagesByBorrower] = useState<Record<number, Message[]>>({});
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [analytics, setAnalytics] = useState<Record<number, { sent: number; received: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchBorrowers() {
      const res = await fetch('/api/borrowers');
      const data: Borrower[] = await res.json();
      setBorrowers(data);
      if (data.length > 0) {
        setSelectedBorrower(data[0]);
      }
    }
    fetchBorrowers();
  }, []);

  useEffect(() => {
    if (selectedBorrower) {
      setMessages(messagesByBorrower[selectedBorrower.id] || []);
    }
  }, [selectedBorrower, messagesByBorrower]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedBorrower) return;

    setError(null);
    const borrowerId = selectedBorrower.id;
    const userMessage: Message = { sender: 'user', text: input };
    const prevMessages = messagesByBorrower[borrowerId] || [];
    const newMessages: Message[] = [...prevMessages, userMessage];
    setMessages(newMessages);

    setMessagesByBorrower(prev => ({
      ...prev,
      [borrowerId]: newMessages
    }));

    setInput('');
    setAnalytics(prev => ({
      ...prev,
      [borrowerId]: {
        sent: (prev[borrowerId]?.sent || 0) + 1,
        received: prev[borrowerId]?.received || 0,
      }
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          borrower: selectedBorrower,
          history: newMessages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get a response from the AI.');
      }

      const data = await response.json();
      const aiMessage: Message = { sender: 'ai', text: data.reply };
      const updatedMessages = [...newMessages, aiMessage];

      // WhatsApp status message
      let whatsappStatus = 'WhatsApp message sent ✔️';
      try {
        const waResp = await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: data.reply,
            to: selectedBorrower.phone
          }),
        });
        if (!waResp.ok) {
          whatsappStatus = 'WhatsApp message failed ❌';
        }
      } catch {
        whatsappStatus = 'WhatsApp message failed ❌';
      }
      const whatsappStatusMessage: Message = { sender: 'status', text: whatsappStatus };

      // Email status message
      let emailStatus = 'Email sent ✔️';
      try {
        const emailResp = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: data.reply,
            to: selectedBorrower.email,
            subject: "Regarding your outstanding amount"
          }),
        });
        if (!emailResp.ok) {
          emailStatus = 'Email failed ❌';
        }
      } catch {
        emailStatus = 'Email failed ❌';
      }
      const emailStatusMessage: Message = { sender: 'status', text: emailStatus };

      // Update chat with statuses
      const allMessages = [...updatedMessages, whatsappStatusMessage, emailStatusMessage];
      setMessages(allMessages);
      setMessagesByBorrower(prev => ({
        ...prev,
        [borrowerId]: allMessages
      }));
      setAnalytics(prev => ({
        ...prev,
        [borrowerId]: {
          sent: prev[borrowerId]?.sent || 0,
          received: (prev[borrowerId]?.received || 0) + 1,
        }
      }));

    } catch (err: unknown) {
      console.error("An error occurred:", err);
      setError('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <main className="flex h-screen bg-black font-sans">
      {/* Sidebar - solid purple and black */}
      <div className="w-1/4 bg-purple-900 border-r border-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-900">
          <h2 className="text-xl font-bold text-purple-200">Borrowers</h2>
        </div>
        <div className="grow p-2">
          {borrowers.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedBorrower(b)}
              className={`p-3 rounded-lg cursor-pointer mb-2 ${
                selectedBorrower?.id === b.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-800 text-purple-200 hover:bg-purple-700'
              }`}
            >
              <p className="font-semibold">{b.name}</p>
              <p className="text-sm">
                {selectedBorrower?.id === b.id
                  ? `$${b.outstandingAmount}`
                  : `Outstanding: $${b.outstandingAmount}`}
              </p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-900">
          <h3 className="text-lg font-bold text-purple-200 mb-2">Analytics</h3>
          {selectedBorrower && (
            <div className="space-y-2">
              <p className="text-sm text-purple-200">
                Messages Sent:{' '}
                <span className="font-bold text-purple-400">
                  {analytics[selectedBorrower.id]?.sent || 0}
                </span>
              </p>
              <p className="text-sm text-purple-200">
                Replies Received:{' '}
                <span className="font-bold text-green-400">
                  {analytics[selectedBorrower.id]?.received || 0}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="w-3/4 flex flex-col">
        {selectedBorrower ? (
          <>
            <div className="p-4 border-b border-gray-900 bg-black shadow-sm">
              <h3 className="text-xl font-bold text-purple-200">{selectedBorrower.name}</h3>
              <p className="text-sm text-purple-300">{selectedBorrower.email}</p>
            </div>
            {/* Chat messages area */}
            <div className="grow p-6 overflow-y-auto bg-black">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-lg px-4 py-2 rounded-xl shadow 
                      ${msg.sender === 'user'
                        ? 'bg-purple-700 text-white'
                        : msg.sender === 'ai'
                          ? 'bg-purple-200 text-black border border-purple-700'
                          : 'bg-gray-900 text-purple-300 font-semibold border border-purple-800' // status bubble
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* Error message display */}
                {error && (
                  <div className="flex justify-center">
                    <div className="p-3 rounded-lg bg-red-900 text-red-200 max-w-md text-center">
                      <strong>{error}</strong>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* Input area */}
            <div className="p-4 bg-black border-t border-gray-900">
              <div className="flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="w-full p-3 border border-purple-600 bg-gray-950 text-purple-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-700"
                />
                <button
                  onClick={handleSendMessage}
                  className="ml-4 px-6 py-3 bg-purple-700 text-white rounded-full hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-800"
                  disabled={!input.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-purple-300">Select a borrower to start a conversation.</p>
          </div>
        )}
      </div>
    </main>
  );
}
