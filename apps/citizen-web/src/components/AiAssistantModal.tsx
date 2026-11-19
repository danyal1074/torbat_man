import React, { useState } from 'react';
import { Dialog, Button } from '@torbat/ui';
import { Sparkles, Send, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
export interface AiAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectService: (slug: string) => void;
}
export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose, onSelectService, }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Array<{
        sender: 'user' | 'assistant';
        text: string;
        suggestedServices?: Array<{
            slug: string;
            title: string;
        }>;
    }>>([
        {
            sender: 'assistant',
            text: 'سلام! من دستیار هوشمند تربت من هستم. مسئله یا درخواستی که در شهر داری رو به زبان ساده بگو تا راهنماییت کنم.',
        },
    ]);
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading)
            return;
        const userText = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
        setLoading(true);
        try {
            const res = await api.aiAssistant(userText);
            setMessages((prev) => [
                ...prev,
                {
                    sender: 'assistant',
                    text: res.data.reply,
                    suggestedServices: res.data.suggestedServices,
                },
            ]);
        }
        catch {
            setMessages((prev) => [
                ...prev,
                {
                    sender: 'assistant',
                    text: 'متأسفانه در برقراری ارتباط مشکلی رخ داد. لطفاً دوباره تلاش کنید.',
                },
            ]);
        }
        finally {
            setLoading(false);
        }
    };
    return (<Dialog isOpen={isOpen} onClose={onClose} title="دستیار هوشمند تربت من">
      <div className="flex flex-col gap-4 min-h-[340px]">
        {/* Messages scroll */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[380px] p-1">
          {messages.map((m, idx) => (<div key={idx} className={`flex flex-col gap-2 ${m.sender === 'user' ? 'items-start text-left' : 'items-end text-right'}`}>
              <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${m.sender === 'user'
                ? 'bg-[#6F248E] text-white rounded-br-xs'
                : 'bg-[#F5EDF9] text-[#20212A] border border-[#E9E6EE] rounded-bl-xs'}`}>
                {m.text}
              </div>

              {/* Service recommendations */}
              {m.suggestedServices && m.suggestedServices.length > 0 && (<div className="flex flex-col gap-1.5 w-full mt-1">
                  <span className="text-[11px] font-bold text-[#6F248E]">خدمات پیشنهادی:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestedServices.map((svc) => (<button key={svc.slug} type="button" onClick={() => {
                        onClose();
                        onSelectService(svc.slug);
                    }} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6F248E] bg-white border border-[#6F248E]/30 px-3 py-1.5 rounded-xl hover:bg-[#6F248E] hover:text-white transition-all shadow-xs">
                        <span>{svc.title}</span>
                        <ArrowLeft className="w-3.5 h-3.5"/>
                      </button>))}
                  </div>
                </div>)}
            </div>))}

          {loading && (<div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-2xl w-fit">
              <Sparkles className="w-4 h-4 text-[#6F248E] animate-pulse"/>
              <span>درحال بررسی و پیشنهاد...</span>
            </div>)}
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="مثلاً: فشار آب محله کمه، یا آسفالت کوچه خراب شده..." className="flex-1 h-11 px-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-[#6F248E] transition-all"/>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            <Send className="w-4 h-4 rotate-180"/>
          </Button>
        </form>
      </div>
    </Dialog>);
};
