# PDF to Summary Website

## 사용한 기술

- React
- Vite (Website Builder)
- Tailwind CSS (Style)
- Cloudflare Workers (Deploy)

## 시작 방법

### Node.js 설치 확인

```bash
node -v
```

위 명령어 실행 결과 v22.21.0과 같은 버전명이 나와야합니다.

버전은 v20 이상이면 상관 없습니다.

### 필요 패키지 설치

```bash
npm install
```

Node Package Manager (NPM)을 사용하여 package.json에 정의된 웹사이트에 필요한 패키지를 다운받습니다.

### 개발자 모드 실행

개발을 할 때는 변경한 내용을 바로 확인할 수 있도록 개발자 모드로 프로젝트를 실행합니다.

```bash
npm run dev
```

```terminaloutput
> pdf-to-summary-web@0.0.0 dev
> vite

The latest compatibility date supported by the installed Cloudflare Workers Runtime is "2025-10-11",
but you've requested "2025-10-24". Falling back to "2025-10-11"...

  VITE v7.1.12  ready in 777 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  Debug:   http://localhost:5173/__debug
  ➜  press h + enter to show help
```

위와 같은 내용이 터미널에 나타난다면 정상적으로 실행된 것입니다.

이렇게 개발자 모드로 실행 후 브라우저에 [http://localhost:5173](http://localhost:5173) 에 접근하면 기본 웹사이트를 확인할 수 있습니다.
