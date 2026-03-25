'use client';
import { useState, useEffect, useRef } from 'react';

export default function Chatbot() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Let me know how may i help you?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Auto scroll to bottom when new message arrives
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userQuestion: userMsg }),
            });

            const data = await response.json();

            if (data.answer) {
                setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
            } else {
                setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf kijiyega, kuch masla hua hai.' }]);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Server se connect nahi ho pa raha.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-150 w-full max-w-md mx-auto border border-gray-200 rounded-xl shadow-lg bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white font-bold text-center">
                Dominatic AI Assistant
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                {/* Chat Area - Messages Mapping */}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm  overflow-hidden ${msg.role === 'user'
                                ? 'bg-blue-500 text-white rounded-tr-none'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                            }`}>
                            {msg.role === 'assistant' ? (
                               
                                <Typewriter text={msg.content} speed={10} />
                            ) : (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 animate-pulse p-3 rounded-2xl text-xs text-gray-500">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 flex gap-2 bg-white">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Question"
                    style={{color:"black"}}
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>
            </form>
        </div>
    );
}



const Typewriter = ({ text, speed = 15 }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // 1. Pehle state ko bilkul empty karen
    setDisplayedText("");
    
    let i = 0;
    // 2. Local variable use karen taake character missing na ho
    let currentText = ""; 

    const timer = setInterval(() => {
      if (i < text.length) {
        currentText += text.charAt(i);
        setDisplayedText(currentText);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return <p className="whitespace-pre-wrap leading-relaxed">{displayedText}</p>;
};