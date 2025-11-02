# PDF to Summary API 사용 예시

## 빠른 시작 (Browser Rendering 없이)

### 1. PDF 업로드
```bash
curl -X POST https://your-worker.workers.dev/upload \
  -F "file=@document.pdf"
```

**응답:**
```json
{
  "ok": true,
  "key": "uploads/2025/10/31/abc123-document.pdf",
  "size": 153429,
  "etag": "xyz789"
}
```

### 2. PDF 정보 확인
```bash
curl https://your-worker.workers.dev/pdf-info/uploads/2025/10/31/abc123-document.pdf
```

**응답:**
```json
{
  "ok": true,
  "key": "uploads/2025/10/31/abc123-document.pdf",
  "pageCount": 5,
  "size": 153429
}
```

### 3. PDF를 이미지로 변환 (CloudConvert)
```bash
# API 키 먼저 설정 (최초 1회만)
wrangler secret put CLOUDCONVERT_API_KEY

# 변환 실행
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{
    "key": "uploads/2025/10/31/abc123-document.pdf",
    "service": "cloudconvert",
    "format": "png",
    "dpi": 150
  }'
```

**응답:**
```json
{
  "ok": true,
  "message": "PDF가 성공적으로 이미지로 변환되었습니다.",
  "service": "cloudconvert",
  "pdfKey": "uploads/2025/10/31/abc123-document.pdf",
  "pageCount": 5,
  "imageKeys": [
    "uploads/2025/10/31/abc123-document-page-1.png",
    "uploads/2025/10/31/abc123-document-page-2.png",
    "uploads/2025/10/31/abc123-document-page-3.png",
    "uploads/2025/10/31/abc123-document-page-4.png",
    "uploads/2025/10/31/abc123-document-page-5.png"
  ],
  "format": "png",
  "dpi": 150
}
```

## JavaScript/TypeScript 예시

### Fetch API 사용
```typescript
// 1. PDF 업로드
async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('https://your-worker.workers.dev/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

// 2. PDF를 이미지로 변환
async function convertPDFToImages(pdfKey: string) {
  const response = await fetch('https://your-worker.workers.dev/pdf-to-images-external', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key: pdfKey,
      service: 'cloudconvert',
      format: 'png',
      dpi: 150
    })
  });
  
  return await response.json();
}

// 3. 사용 예시
async function processPDF(file: File) {
  // 업로드
  const uploadResult = await uploadPDF(file);
  console.log('업로드 완료:', uploadResult.key);
  
  // 변환
  const convertResult = await convertPDFToImages(uploadResult.key);
  console.log('변환 완료:', convertResult.imageKeys);
  
  return convertResult.imageKeys;
}
```

### React 컴포넌트 예시
```jsx
import { useState } from 'react';

function PDFConverter() {
  const [pdfKey, setPdfKey] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    
    try {
      // 업로드
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('https://your-worker.workers.dev/upload', {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      setPdfKey(uploadData.key);
      
      // 변환
      const convertRes = await fetch('https://your-worker.workers.dev/pdf-to-images-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: uploadData.key,
          service: 'cloudconvert',
          format: 'png'
        })
      });
      
      const convertData = await convertRes.json();
      setImages(convertData.imageKeys);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileUpload} />
      {loading && <p>처리 중...</p>}
      {images.map((imageKey, i) => (
        <img 
          key={i} 
          src={`https://your-r2-bucket.com/${imageKey}`} 
          alt={`Page ${i + 1}`} 
        />
      ))}
    </div>
  );
}
```

## Python 예시

```python
import requests
import json

# 1. PDF 업로드
def upload_pdf(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'https://your-worker.workers.dev/upload',
            files=files
        )
        return response.json()

# 2. PDF를 이미지로 변환
def convert_pdf_to_images(pdf_key, service='cloudconvert'):
    payload = {
        'key': pdf_key,
        'service': service,
        'format': 'png',
        'dpi': 150
    }
    
    response = requests.post(
        'https://your-worker.workers.dev/pdf-to-images-external',
        headers={'Content-Type': 'application/json'},
        data=json.dumps(payload)
    )
    
    return response.json()

# 3. 사용 예시
if __name__ == '__main__':
    # 업로드
    upload_result = upload_pdf('document.pdf')
    print(f"업로드 완료: {upload_result['key']}")
    
    # 변환
    convert_result = convert_pdf_to_images(upload_result['key'])
    print(f"변환 완료: {len(convert_result['imageKeys'])} 페이지")
    
    for i, image_key in enumerate(convert_result['imageKeys'], 1):
        print(f"페이지 {i}: {image_key}")
```

## 서비스 비교 및 선택 가이드

### CloudConvert (권장)
```bash
# 장점
- 무료 플랜: 25 크레딧/일
- 높은 변환 품질
- 다양한 형식 지원
- 안정적인 API

# 사용 예시
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{"key": "your-pdf", "service": "cloudconvert", "dpi": 300}'
```

### ConvertAPI
```bash
# 장점
- 무료 크레딧: 250개 (1회성)
- 빠른 변환 속도
- 간단한 API

# 사용 예시
curl -X POST https://your-worker.workers.dev/pdf-to-images-external \
  -H "Content-Type: application/json" \
  -d '{"key": "your-pdf", "service": "convertapi", "dpi": 150}'
```

### Browser Rendering (선택사항)
```bash
# 장점
- Cloudflare 네이티브 통합
- 추가 외부 서비스 불필요

# 단점
- 유료 플랜 필요
- 설정이 복잡함
- 변환 속도가 느림

# 사용 예시
curl -X POST https://your-worker.workers.dev/pdf-to-images \
  -H "Content-Type: application/json" \
  -d '{"key": "your-pdf", "scale": 2.0, "format": "png"}'
```

## 트러블슈팅

### API 키가 설정되지 않았을 때
```json
{
  "error": "CloudConvert API 키가 설정되지 않았습니다.",
  "setup": {
    "step1": "https://cloudconvert.com/ 에서 무료 계정 생성",
    "step2": "API 키 발급받기",
    "step3": "wrangler secret put CLOUDCONVERT_API_KEY 명령으로 키 등록"
  }
}
```

**해결 방법:**
```bash
cd api
wrangler secret put CLOUDCONVERT_API_KEY
# 프롬프트에 API 키 입력
```

### PDF 파일을 찾을 수 없을 때
```json
{
  "error": "PDF 파일을 찾을 수 없습니다."
}
```

**해결 방법:**
1. PDF 키가 올바른지 확인
2. `GET /pdf-info/:key` 엔드포인트로 파일 존재 여부 확인

### 변환 시간이 오래 걸릴 때
- CloudConvert/ConvertAPI: 일반적으로 10-30초
- Browser Rendering: 페이지당 2-5초

큰 PDF 파일(10페이지 이상)의 경우 변환에 시간이 걸릴 수 있습니다.

## 프로덕션 체크리스트

- [ ] API 키 설정 (CloudConvert 또는 ConvertAPI)
- [ ] R2 버킷 설정 및 권한 확인
- [ ] CORS 설정 확인
- [ ] 에러 핸들링 구현
- [ ] 사용량 모니터링 설정
- [ ] 무료 크레딧 한도 확인
- [ ] 백업 서비스 준비 (CloudConvert ↔ ConvertAPI)

