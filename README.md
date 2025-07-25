> moti 전용 stomp 기반 websocket 테스트 페이지입니다.

## 소개
- moti의 WebSocket 서버와 STOMP 실시간 통신(JWT 인증 포함) 테스트를 위한 React 단일 페이지 앱입니다.
- 브라우저에서 WebSocket 연결/구독/전송/수신을 편하게 실험할 수 있습니다.


## 실행 방법
1. 프로젝트 설치
```
npm install
```

2. 개발 서버 실행  
```
npm start
```

## 주요 기능
- **연결**: WebSocket URL 및 헤더(JWT 토큰 등) 입력 후 연결/해제
- **구독**: 구독 destination 입력, 여러 토픽 구독/해제 가능
- **전송**: 원하는 destination과 JSON 메시지 입력 후 메시지 전송 (템플릿 버튼 제공)
- **로그 확인**: 하단에서 발송/수신 메시지, 오류, 상태를 실시간으로 확인가능합니다.
