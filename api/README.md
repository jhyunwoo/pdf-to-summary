# PDF to Summary API

Cloudflare Workers 기반 PDF 처리 및 요약 API

## 설치 및 실행

```bash
npm install
npm run dev
```

## 배포

```bash
npm run deploy
```

## API 엔드포인트

### 1. PDF 업로드

#### POST `/upload`

multipart/form-data 방식으로 PDF 파일 업로드

**요청:**

```bash
curl -X POST https://your-worker.workers.dev/upload \
  -F "file=@document.pdf"
```

**응답:**

```json
{
  "ok": true,
  "key": "uploads/2025/10/31/uuid-document.pdf",
  "size": 12345,
  "etag": "abc123"
}
```

#### PUT `/upload/:filename`

RAW 바디 스트리밍 방식으로 PDF 파일 업로드 (권장)

**요청:**

```bash
curl -X PUT https://your-worker.workers.dev/upload/document.pdf \
  -H "Content-Type: application/pdf" \
  --data-binary @document.pdf
```

### 2. PDF 정보 조회

#### GET `/pdf-info/:key`

PDF 파일의 기본 정보 조회 (페이지 수, 크기 등)

**요청:**

```bash
curl https://your-worker.workers.dev/pdf-info/uploads/2025/10/31/uuid-document.pdf
```

**응답:**

```json
{
  "ok": true,
  "key": "uploads/2025/10/31/uuid-document.pdf",
  "pageCount": 3,
  "size": 12345,
  "uploaded": "2025-10-31T12:00:00.000Z",
  "metadata": {
    "originalName": "document.pdf"
  }
}
```

### 3. PDF를 이미지로 변환 (외부 API 사용 - 권장)

#### POST `/pdf-to-images-external`

**Browser Rendering 없이** 외부 API를 사용하여 PDF를 이미지로 변환

**지원 서비스:**

- **CloudConvert** (무료: 25 크레딧/일)
- **ConvertAPI** (무료: 250 크레딧)

**요청 예시:**

```bash
# CloudConvert 사용
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{
    "key": "uploads/2025/10/31/uuid-document.pdf",
    "service": "cloudconvert",
    "format": "png",
    "dpi": 150
  }'

# ConvertAPI 사용
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{
    "key": "uploads/2025/10/31/uuid-document.pdf",
    "service": "convertapi",
    "format": "png",
    "dpi": 150
  }'
```

**파라미터:**

- `key` (필수): R2에 저장된 PDF 파일의 키
- `service` (선택): "cloudconvert" 또는 "convertapi" (기본값: "cloudconvert")
- `format` (선택): 이미지 형식 "png" 또는 "jpeg" (기본값: "png")
- `dpi` (선택): 이미지 해상도 (기본값: 150)

**응답:**

```json
{
  "ok": true,
  "message": "PDF가 성공적으로 이미지로 변환되었습니다.",
  "service": "cloudconvert",
  "pdfKey": "uploads/2025/10/31/uuid-document.pdf",
  "pageCount": 3,
  "imageKeys": [
    "uploads/2025/10/31/uuid-document-page-1.png",
    "uploads/2025/10/31/uuid-document-page-2.png",
    "uploads/2025/10/31/uuid-document-page-3.png"
  ],
  "format": "png",
  "dpi": 150
}
```

#### 외부 API 설정 방법:

**CloudConvert:**

```bash
# 1. https://cloudconvert.com/ 에서 무료 계정 생성
# 2. API 키 발급
# 3. Wrangler로 시크릿 등록
wrangler secret put CLOUDCONVERT_API_KEY
```

**ConvertAPI:**

```bash
# 1. https://www.convertapi.com/ 에서 무료 계정 생성
# 2. Secret 키 확인
# 3. Wrangler로 시크릿 등록
wrangler secret put CONVERTAPI_SECRET
```

### 4. PDF를 이미지로 변환 (Browser Rendering)

#### POST `/pdf-to-images`

Cloudflare Browser Rendering API를 사용하여 PDF를 이미지로 변환 (유료)

**요청:**

```bash
curl -X POST https://your-worker.workers.dev/pdf-to-images \
  -H "Content-Type: application/json" \
  -d '{
    "key": "uploads/2025/10/31/uuid-document.pdf",
    "scale": 2.0,
    "format": "png"
  }'
```

**파라미터:**

- `key` (필수): R2에 저장된 PDF 파일의 키
- `scale` (선택): 이미지 스케일 (기본값: 2.0, 고해상도)
- `format` (선택): 이미지 형식 "png" 또는 "jpeg" (기본값: "png")

**응답:**

```json
{
  "ok": true,
  "message": "PDF가 성공적으로 이미지로 변환되었습니다.",
  "pdfKey": "uploads/2025/10/31/uuid-document.pdf",
  "pageCount": 3,
  "imageKeys": [
    "uploads/2025/10/31/uuid-document-page-1.png",
    "uploads/2025/10/31/uuid-document-page-2.png",
    "uploads/2025/10/31/uuid-document-page-3.png"
  ],
  "format": "png",
  "scale": 2.0
}
```

### 5. Prompt 관리

#### POST `/prompts`

Prompt 리스트 추가 (기존에 추가)

**요청:**

```bash
curl -X POST https://your-worker.workers.dev/prompts \
  -H "Content-Type: application/json" \
  -d '{"prompts": ["prompt1", "prompt2"]}'
```

#### PUT `/prompts`

Prompt 리스트 전체 교체

**요청:**

```bash
curl -X PUT https://your-worker.workers.dev/prompts \
  -H "Content-Type: application/json" \
  -d '{"prompts": ["new prompt1", "new prompt2"]}'
```

## PDF to Image 변환 방법 비교

| 방법                        | 비용                     | 설정 난이도   | 속도 | 추천    |
| --------------------------- | ------------------------ | ------------- | ---- | ------- |
| **외부 API (CloudConvert)** | 무료 25 크레딧/일        | ⭐ 쉬움       | 빠름 | ✅ 권장 |
| **외부 API (ConvertAPI)**   | 무료 250 크레딧          | ⭐ 쉬움       | 빠름 | ✅ 권장 |
| **Browser Rendering**       | 유료 (Workers 유료 플랜) | ⭐⭐⭐ 어려움 | 느림 | 선택적  |

### 권장 사용법:

1. **개발/테스트**: `/pdf-to-images-external` (CloudConvert 또는 ConvertAPI)
2. **프로덕션 (소규모)**: `/pdf-to-images-external` (무료 크레딧 범위 내)
3. **프로덕션 (대규모)**: `/pdf-to-images` (Browser Rendering, 유료 플랜 필요)

## 외부 API 설정 (권장)

### CloudConvert 설정

```bash
# 1. 계정 생성 및 API 키 발급
# https://cloudconvert.com/

# 2. API 키 등록
cd api
wrangler secret put CLOUDCONVERT_API_KEY
# 프롬프트에 API 키 입력

# 3. 사용
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{"key": "your-pdf-key", "service": "cloudconvert"}'
```

**무료 플랜:**

- 25 크레딧/일
- 1 PDF → 이미지 변환 = 약 1 크레딧
- 충분한 테스트 및 소규모 서비스에 적합

### ConvertAPI 설정

```bash
# 1. 계정 생성 및 Secret 키 확인
# https://www.convertapi.com/

# 2. Secret 키 등록
cd api
wrangler secret put CONVERTAPI_SECRET
# 프롬프트에 Secret 키 입력

# 3. 사용
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{"key": "your-pdf-key", "service": "convertapi"}'
```

**무료 플랜:**

- 250 크레딧 (1회성)
- 1 PDF 페이지 = 1 크레딧
- 테스트에 충분

## Browser Rendering API 설정 (선택사항)

PDF를 이미지로 변환하는 기능을 Browser Rendering으로 사용하려면:

### 설정 방법:

1. **Cloudflare Dashboard에서 Browser Rendering 활성화**
   - Workers & Pages 대시보드로 이동
   - Browser Rendering 기능 활성화 (유료 플랜 필요)

2. **이미 설정됨**: `wrangler.jsonc`에 browser binding 추가 완료

   ```jsonc
   "browser": {
     "binding": "BROWSER"
   }
   ```

3. **패키지 설치 완료**:
   - `pdf-lib`: PDF 문서 처리
   - `@cloudflare/puppeteer`: Cloudflare Workers용 Puppeteer

### 참고 문서:

- [Cloudflare Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
- [Cloudflare Puppeteer](https://github.com/cloudflare/puppeteer)

## 타입 생성

[Worker 설정을 기반으로 타입 생성/동기화](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```

`Hono` 인스턴스 생성 시 제네릭으로 전달:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

## 의존성

- `hono`: 웹 프레임워크
- `pdf-lib`: PDF 문서 처리
- `@cloudflare/puppeteer`: PDF를 이미지로 변환
- `drizzle-orm`: 데이터베이스 ORM
