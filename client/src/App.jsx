import { useState, useEffect, useRef } from 'react';
import { runWorkflow, getWorkflowLogs } from './api';
import './App.css';

const USER_ID = 'paper-search-user';

function App() {
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载历史
  const loadHistory = async () => {
    try {
      const data = await getWorkflowLogs(USER_ID);
      setHistory(data.data || []);
    } catch (err) {
      console.error('加载历史失败:', err);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  // 发送检索
  const handleSend = async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: q, time: new Date().toLocaleString('zh-CN') }]);
    setQuery('');
    setLoading(true);
    setError('');

    try {
      const data = await runWorkflow({ query: q, user: USER_ID });
      if (data.success && data.data?.status === 'succeeded') {
        const outputs = data.data.outputs || {};
        setMessages(prev => [...prev, {
          id: data.workflow_run_id || Date.now(),
          role: 'assistant',
          outputs,
          stats: { elapsed_time: data.data.elapsed_time, total_tokens: data.data.total_tokens, total_steps: data.data.total_steps },
          time: new Date().toLocaleString('zh-CN'),
        }]);
        loadHistory();
      } else {
        setError('检索失败: ' + (data.data?.error || '未知错误'));
      }
    } catch (err) {
      setError('请求失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 解析输出显示
  const renderOutput = (outputs) => {
    const text = outputs.text || '';
    const arxiv = outputs.output || [];

    const lines = text.split('\n').filter(Boolean);
    let cnKeywords = [];
    let enKeywords = [];
    let currentSection = '';
    lines.forEach(line => {
      if (line.includes('中文扩增关键词')) currentSection = 'cn';
      else if (line.includes('英文检索关键词')) currentSection = 'en';
      else if (line.trim()) {
        if (currentSection === 'cn') cnKeywords.push(line.trim());
        else if (currentSection === 'en') enKeywords.push(line.trim());
      }
    });

    return (
      <div className="result-display">
        <div className="result-section">
          <h3>🔤 中文扩展关键词</h3>
          <div className="keyword-tags">
            {cnKeywords.map((kw, i) => (
              <span key={i} className="keyword-tag cn">{kw}</span>
            ))}
          </div>
        </div>

        <div className="result-section">
          <h3>🌐 英文检索关键词</h3>
          <div className="keyword-tags">
            {enKeywords.map((kw, i) => (
              <span key={i} className="keyword-tag en">{kw}</span>
            ))}
          </div>
        </div>

        <div className="result-section">
          <h3>📚 Arxiv 检索结果</h3>
          {Array.isArray(arxiv) && arxiv.length > 0 ? (
            <div className="arxiv-results">
              {arxiv.map((item, i) => (
                <div key={i} className="arxiv-item">{item}</div>
              ))}
            </div>
          ) : (
            <p className="no-result">未找到相关 Arxiv 论文</p>
          )}
        </div>
      </div>
    );
  };

  const handleNew = () => {
    setMessages([]); setError(''); setQuery('');
    inputRef.current?.focus();
  };

  const handleLoadHistory = (item) => {
    setMessages([
      { id: item.id + '-u', role: 'user', content: item.inputs?.input || '', time: new Date(item.created_at * 1000).toLocaleString('zh-CN') },
      { id: item.id, role: 'assistant', outputs: item.outputs || {}, stats: { elapsed_time: item.elapsed_time, total_tokens: item.total_tokens, total_steps: item.total_steps }, time: new Date(item.created_at * 1000).toLocaleString('zh-CN') },
    ]);
    setShowHistory(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="menu-btn" onClick={() => setShowHistory(!showHistory)} title="历史">☰</button>
        <div className="header-title"><span className="header-icon">📄</span><h1>论文关键词检索</h1></div>
        <button className="new-chat-btn" onClick={handleNew}>+ 新检索</button>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${showHistory ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h2>检索历史</h2>
            <button className="sidebar-toggle" onClick={() => setShowHistory(false)}>✕</button>
          </div>
          <div className="conversation-list">
            {history.length === 0 ? <p className="empty-hint">暂无检索记录</p> : history.map(item => (
              <div key={item.id} className="conversation-item" onClick={() => handleLoadHistory(item)}>
                <span className="conv-name">{item.inputs?.input || '检索'}</span>
                <span className="conv-time">{new Date(item.created_at * 1000).toLocaleDateString('zh-CN')}</span>
                <span className={`conv-status ${item.status}`}>{item.status === 'succeeded' ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </aside>

        {showHistory && <div className="sidebar-overlay" onClick={() => setShowHistory(false)} />}

        <main className="main-content">
          <div className="chat-container">
            <div className="messages-area">
              {messages.length === 0 && !loading ? (
                <div className="welcome">
                  <div className="welcome-icon">🔍</div>
                  <h2>论文关键词智能检索</h2>
                  <p>输入论文主题或研究方向，AI 将为您扩展中英文关键词并检索 Arxiv 相关论文</p>
                  <div className="suggestions">
                    <span>试试这些：</span>
                    <button onClick={() => setQuery('人工智能在医学影像中的应用')}>人工智能在医学影像中的应用</button>
                    <button onClick={() => setQuery('神经网络与深度学习最新进展')}>神经网络与深度学习最新进展</button>
                    <button onClick={() => setQuery('自然语言处理中的注意力机制')}>自然语言处理中的注意力机制</button>
                    <button onClick={() => setQuery('计算机视觉目标检测算法综述')}>计算机视觉目标检测算法综述</button>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.role}`}>
                    <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                    <div className="message-body">
                      <div className="message-content">
                        {msg.role === 'user' ? <p>{msg.content}</p> : renderOutput(msg.outputs)}
                      </div>
                      {msg.stats && (
                        <div className="workflow-stats">
                          <span>⏱ {msg.stats.elapsed_time?.toFixed(1)}s</span>
                          <span>🔢 {msg.stats.total_tokens} tokens</span>
                          <span>📋 {msg.stats.total_steps} 步骤</span>
                        </div>
                      )}
                      <div className="message-time">{msg.time}</div>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">🤖</div>
                  <div className="message-body">
                    <div className="typing-indicator"><span></span><span></span><span></span></div>
                    <p className="loading-text">正在扩展关键词并检索论文...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && <div className="error-banner"><span>⚠ {error}</span><button onClick={() => setError('')}>×</button></div>}

            <form className="input-area" onSubmit={handleSend}>
              <div className="input-wrapper">
                <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="请输入论文关键词或研究方向..." disabled={loading} autoComplete="off" />
                <button type="submit" className="send-btn" disabled={loading || !query.trim()} title="检索">
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
              <p className="input-hint">支持中英文关键词检索 · 基于 Dify AI 工作流</p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
