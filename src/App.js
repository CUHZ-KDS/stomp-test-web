import React, { useState, useRef, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import './App.css';

function App() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [subscriptions, setSubscriptions] = useState(new Map());
  const [subscribeDestinations, setSubscribeDestinations] = useState([]);

  // Form states
  const [connectForm, setConnectForm] = useState({
    url: 'ws://localhost:8080/ws',
    headers: 'Authorization: Bearer your-jwt-token-here'
  });

  const [sendForm, setSendForm] = useState({
    destination: '/app/seat/select',
    message: JSON.stringify({ showScheduleId: 123, seatId: 456 }, null, 2)
  });

  const [subscribeForm, setSubscribeForm] = useState({
    destination: '/topic/show-schedule/123/seats'
  });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (type, content) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { type, content, timestamp }]);
  };

  const parseHeaders = (headerString) => {
    const headers = {};
    headerString.split('\n').forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        headers[key] = value;
      }
    });
    return headers;
  };

  const handleConnect = () => {
    try {
      const stompClient = new Client({
        brokerURL: connectForm.url,
        connectHeaders: parseHeaders(connectForm.headers),
        debug: (str) => {
          console.log('STOMP Debug:', str);
        },
        onConnect: (frame) => {
          setConnected(true);
          addMessage('success', `✅ 연결 성공: ${frame}`);
        },
        onDisconnect: () => {
          setConnected(false);
          setSubscriptions(new Map());
          addMessage('info', '🔌 연결 해제됨');
        },
        onStompError: (frame) => {
          addMessage('error', `❌ STOMP 오류: ${frame.headers.message}`);
        },
        onWebSocketError: (error) => {
          addMessage('error', `❌ WebSocket 오류: ${error}`);
        }
      });

      stompClient.activate();
      setClient(stompClient);
      addMessage('info', '🔄 연결 시도 중...');
    } catch (error) {
      addMessage('error', `❌ 연결 오류: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    if (client) {
      client.deactivate();
      setClient(null);
      setConnected(false);
      setSubscriptions(new Map());
    }
  };

  const handleAddDestination = () => {
    const destination = subscribeForm.destination.trim();

    if (!destination) {
      addMessage('error', '❌ 구독할 경로를 입력해주세요.');
      return;
    }

    if (subscribeDestinations.includes(destination)) {
      addMessage('warning', `⚠️ 이미 추가된 경로입니다: ${destination}`);
      return;
    }

    if (subscriptions.has(destination)) {
      addMessage('warning', `⚠️ 이미 구독 중인 경로입니다: ${destination}`);
      return;
    }

    setSubscribeDestinations(prev => [...prev, destination]);
    setSubscribeForm({ ...subscribeForm, destination: '' });
  };

  const handleRemoveDestination = (destination) => {
    setSubscribeDestinations(prev => prev.filter(dest => dest !== destination));
  };

  const handleSubscribeDestination = (destination) => {
    if (!client || !connected) {
      addMessage('error', '❌ 먼저 연결을 수행해주세요.');
      return;
    }

    if (subscriptions.has(destination)) {
      addMessage('warning', `⚠️ 이미 구독 중인 경로입니다: ${destination}`);
      return;
    }

    try {
      const subscription = client.subscribe(destination, (message) => {
        addMessage('message', `📨 [${destination}] ${message.body}`);
      });

      setSubscriptions(prev => new Map(prev).set(destination, subscription));
      setSubscribeDestinations(prev => prev.filter(dest => dest !== destination));
      addMessage('info', `📡 구독 시작: ${destination}`);
    } catch (error) {
      addMessage('error', `❌ 구독 오류: ${error.message}`);
    }
  };


  const handleUnsubscribe = (destination) => {
    const subscription = subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      setSubscriptions(prev => {
        const newMap = new Map(prev);
        newMap.delete(destination);
        return newMap;
      });
      addMessage('info', `📡 구독 해제: ${destination}`);
    }
  };

  const handleSend = () => {
    if (!client || !connected) {
      addMessage('error', '❌ 먼저 연결을 수행해주세요.');
      return;
    }
    const destination = sendForm.destination.trim();
    const message = sendForm.message.trim();
    if (!destination) {
      addMessage('error', '❌ 메시지를 보낼 경로를 입력해주세요.');
      return;
    }
    if (!message) {
      addMessage('error', '❌ 전송할 메시지를 입력해주세요.');
      return;
    }
    try {
      // JSON 형식 검증
      JSON.parse(message);
      client.publish({
        destination: destination,
        body: message
      });
      addMessage('send', `📤 메시지 전송 [${destination}]: ${message}`);
    } catch (error) {
      addMessage('error', `❌ 전송 오류: ${error.message}`);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // 메시지 템플릿 기능
  const messageTemplates = {
    'seat-select': '{"showScheduleId": 123, "seatId": 456}',
    'seat-deselect': '{"showScheduleId": 123, "seatId": 456}',
    'seat-reserve': '{"showScheduleId": 123, "seatIds": [456, 457], "gradeId": 101}'
  };

  const handleTemplateSelect = (template) => {
    setSendForm({
      ...sendForm,
      message: messageTemplates[template]
    });
  };

  const handleDestinationTemplate = (template) => {
    setSubscribeForm({
      ...subscribeForm,
      destination: template
    });
  };

  return (
      <div className="App">
        <header className="App-header">
          <h1>WebSocket STOMP 테스트 클라이언트</h1>
          <div className="connection-status">
            상태: <span className={connected ? 'connected' : 'disconnected'}>
          {connected ? '🟢 연결됨' : '🔴 연결 안됨'}
        </span>
          </div>
        </header>

        <main>
          <div className="top-controls">
            {/* 연결 섹션 */}
            <section className="section narrow-section">
              <h2>🔌 연결 (CONNECT)</h2>
              <div className="form-group">
                <label>WebSocket URL:</label>
                <input
                    type="text"
                    value={connectForm.url}
                    onChange={(e) => setConnectForm({ ...connectForm, url: e.target.value })}
                    placeholder="ws://localhost:8080/ws"
                    disabled={connected}
                />
              </div>
              <div className="form-group">
                <label>Headers (한 줄씩 입력):</label>
                <textarea
                    value={connectForm.headers}
                    onChange={(e) => setConnectForm({ ...connectForm, headers: e.target.value })}
                    placeholder="Authorization: Bearer your-jwt-token"
                    rows="3"
                    disabled={connected}
                />
              </div>
              <div className="button-group">
                <button onClick={handleConnect} disabled={connected}>연결</button>
                <button onClick={handleDisconnect} disabled={!connected}>연결 해제</button>
              </div>
            </section>

            {/* 구독 섹션 */}
            <section className="section narrow-section">
              <h2>📡 구독 (SUBSCRIBE)</h2>

              {/* Destination 템플릿 버튼들 */}
              <div className="form-group">
                <label>Destination 템플릿:</label>
                <div className="destination-template-buttons">
                  <button
                      type="button"
                      onClick={() => handleDestinationTemplate('/topic/show-schedule/123/seats')}
                      disabled={!connected}
                      className="destination-template-btn"
                  >
                    좌석 상태
                  </button>
                  <button
                      type="button"
                      onClick={() => handleDestinationTemplate('/app/show-schedule/123/session-init')}
                      disabled={!connected}
                      className="destination-template-btn"
                  >
                    세션 초기화
                  </button>
                  <button
                      type="button"
                      onClick={() => handleDestinationTemplate('/user/queue/errors')}
                      disabled={!connected}
                      className="destination-template-btn"
                  >
                    에러 알림
                  </button>
                </div>
              </div>

              {/* 구독 추가 영역 */}
              <div className="subscription-add-area">
                <div className="form-group">
                  <label>새 Destination 추가:</label>
                  <div className="destination-input-group">
                    <input
                        type="text"
                        value={subscribeForm.destination}
                        onChange={(e) => setSubscribeForm({ ...subscribeForm, destination: e.target.value })}
                        placeholder="/topic/show-schedule/123/seats"
                        disabled={!connected}
                        className="destination-input"
                    />
                    <button
                        onClick={handleAddDestination}
                        disabled={!connected || !subscribeForm.destination.trim()}
                        className="add-destination-btn"
                    >
                      + 추가
                    </button>
                  </div>
                </div>
              </div>

              {/* 구독 대기 목록 */}
              {subscribeDestinations.length > 0 && (
                  <div className="pending-subscriptions">
                    <h3>구독 대기 목록:</h3>
                    <div className="destinations-list">
                      {subscribeDestinations.map((dest, index) => (
                          <div key={index} className="destination-item pending">
                            <div className="destination-info">
                              <span className="destination-path">{dest}</span>
                              <span className="status-badge pending">대기중</span>
                            </div>
                            <div className="destination-actions">
                              <button
                                  onClick={() => handleSubscribeDestination(dest)}
                                  disabled={!connected || subscriptions.has(dest)}
                                  className="subscribe-btn"
                              >
                                구독 시작
                              </button>
                              <button
                                  onClick={() => handleRemoveDestination(dest)}
                                  className="remove-btn"
                              >
                                제거
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              {/* 활성 구독 목록 */}
              {subscriptions.size > 0 && (
                  <div className="active-subscriptions">
                    <h3>활성 구독 목록:</h3>
                    <div className="destinations-list">
                      {Array.from(subscriptions.keys()).map(destination => (
                          <div key={destination} className="destination-item active">
                            <div className="destination-info">
                              <span className="destination-path">{destination}</span>
                              <span className="status-badge active">구독중</span>
                            </div>
                            <div className="destination-actions">
                              <button
                                  type="button"
                                  onClick={() => handleUnsubscribe(destination)}
                                  className="unsubscribe-btn"
                              >
                                구독 해제
                              </button>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
              )}
            </section>


            {/* 메시지 전송 섹션 */}
            <section className="section narrow-section">
              <h2>📤 메시지 전송 (SEND)</h2>
              <div className="form-group">
                <label>Destination:</label>
                <input
                    type="text"
                    value={sendForm.destination}
                    onChange={(e) => setSendForm({ ...sendForm, destination: e.target.value })}
                    placeholder="/app/seat/select"
                    disabled={!connected}
                />
              </div>
              <div className="form-group">
                <label>메시지 템플릿:</label>
                <div className="template-buttons">
                  <button type="button" onClick={() => handleTemplateSelect('seat-select')}
                          disabled={!connected} className="template-btn">
                    좌석 선택
                  </button>
                  <button type="button" onClick={() => handleTemplateSelect('seat-deselect')}
                          disabled={!connected} className="template-btn">
                    좌석 해제
                  </button>
                  <button type="button" onClick={() => handleTemplateSelect('seat-reserve')}
                          disabled={!connected} className="template-btn">
                    좌석 예약
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Message (JSON):</label>
                <textarea
                    value={sendForm.message}
                    onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                    placeholder='{"showScheduleId": 123, "seatId": 456}'
                    rows="5"
                    disabled={!connected}
                />
              </div>
              <button onClick={handleSend} disabled={!connected}>
                메시지 전송
              </button>
            </section>
          </div>

          {/* 메시지 영역 */}
          <section className="section messages-section">
            <div className="messages-header">
              <h2>📨 메시지 로그</h2>
              <button onClick={clearMessages} className="clear-btn">
                로그 지우기
              </button>
            </div>
            <div className="messages-container">
              {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.type}`}>
                    <span className="timestamp">{msg.timestamp}</span>
                    <span className="content">{msg.content}</span>
                  </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </section>
        </main>
      </div>
  );
}

export default App;
