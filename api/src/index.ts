import { Hono } from "hono";
import { cors } from "hono/cors";
import { PDFDocument } from "pdf-lib";

type Bindings = {
  pdf_to_summary: R2Bucket;
  DB: D1Database;
  pdf_to_summary_kv: KVNamespace;
  PUBLIC_URL?: string; // R2 public URL (선택사항, 예: https://your-domain.com)
};

const KV_PREFIX = "prompt:";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
  }),
);

app.get("/", (c) => c.text("Hello Hono!"));

/**
 * 유틸: R2 오브젝트 키 생성 (폴더/날짜/UUID.pdf)
 */
function buildKey(filename?: string) {
  const safe = (filename || "upload.pdf").replace(/[^\w.\-]+/g, "_");
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const ext = safe.toLowerCase().endsWith(".pdf") ? "" : ".pdf";
  return `uploads/${yyyy}/${mm}/${dd}/${uuid}-${safe}${ext}`;
}

/**
 * 유틸: 이미지 키 생성 (폴더/날짜/UUID.확장자)
 */
function buildImageKey(filename?: string) {
  const safe = (filename || "upload.jpg").replace(/[^\w.\-]+/g, "_");
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  
  // 확장자 추출 (없으면 .jpg 사용)
  const extMatch = safe.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const ext = extMatch ? extMatch[0] : ".jpg";
  const nameWithoutExt = extMatch ? safe.replace(extMatch[0], "") : safe;
  
  return `images/${yyyy}/${mm}/${dd}/${uuid}-${nameWithoutExt}${ext}`;
}

/**
 * 유틸: 이미지 content-type 검증
 */
function isValidImageType(contentType: string, filename: string): boolean {
  const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  
  return (
    imageTypes.some((type) => contentType.toLowerCase().includes(type)) ||
    imageExts.some((ext) => filename.toLowerCase().endsWith(ext))
  );
}

/**
 * 유틸: Content-Type에서 이미지 MIME 타입 추출
 */
function getImageContentType(contentType: string, filename: string): string {
  if (contentType.includes("image/")) {
    return contentType;
  }
  
  // 파일명에서 추론
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg"; // 기본값
}

/**
 * 1) multipart/form-data 업로드 (필드명: `file`)
 * 작은/중간 크기 파일에 적합. (Workers가 폼을 파싱해야 하므로 아주 큰 파일엔 비권장)
 */
app.post("/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return c.json(
      { error: 'form-data field "file" (PDF) 가 필요합니다.' },
      400,
    );
  }

  // 콘텐츠 타입 점검(완벽 보장은 아님)
  const contentType = file.type || "application/pdf";
  if (!/pdf/i.test(contentType) && !file.name.toLowerCase().endsWith(".pdf")) {
    return c.json({ error: "PDF 파일만 업로드할 수 있습니다." }, 415);
  }

  const key = buildKey(file.name);

  // R2에 스트리밍 업로드
  await c.env.pdf_to_summary.put(key, file.stream(), {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      originalName: file.name || "unknown.pdf",
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  // 업로드 정보 조회
  const head = await c.env.pdf_to_summary.head(key);

  return c.json(
    {
      ok: true,
      key,
      size: head?.size ?? null,
      etag: head?.etag ?? null,
    },
    201,
  );
});

/**
 * 2) RAW 바디 스트리밍 업로드 (권장)
 * - 요청: PUT /upload/:filename
 * - 헤더: Content-Type: application/pdf
 * - 바디: 파일 바이트 스트림
 * 폼 파싱 없이 바로 R2로 스트리밍 → 큰 파일에 유리
 */
app.put("/upload/:filename", async (c) => {
  const filename = c.req.param("filename") || "upload.pdf";
  const ct = c.req.header("content-type") || "";
  if (!/application\/pdf/i.test(ct)) {
    return c.json(
      { error: "Content-Type: application/pdf 이어야 합니다." },
      415,
    );
  }

  const body = c.req.raw.body;
  if (!body) return c.json({ error: "요청 바디가 비었습니다." }, 400);

  const key = buildKey(filename);

  await c.env.pdf_to_summary.put(key, body, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      originalName: filename,
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  const head = await c.env.pdf_to_summary.head(key);

  return c.json(
    {
      ok: true,
      key,
      size: head?.size ?? null,
      etag: head?.etag ?? null,
    },
    201,
  );
});

/**
 * 3) 이미지 업로드 (multipart/form-data)
 * - 요청: POST /upload-image
 * - 필드명: file
 * - 응답: { ok: true, key: string, url: string, size: number }
 */
app.post("/upload-image", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return c.json(
      { error: 'form-data field "file" (이미지) 가 필요합니다.' },
      400,
    );
  }

  // 콘텐츠 타입 점검
  const contentType = file.type || "image/jpeg";
  if (!isValidImageType(contentType, file.name)) {
    return c.json(
      { error: "이미지 파일만 업로드할 수 있습니다. (jpg, png, gif, webp)" },
      415,
    );
  }

  const key = buildImageKey(file.name);
  const imageContentType = getImageContentType(contentType, file.name);

  // R2에 스트리밍 업로드
  await c.env.pdf_to_summary.put(key, file.stream(), {
    httpMetadata: { contentType: imageContentType },
    customMetadata: {
      originalName: file.name || "unknown",
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  // 업로드 정보 조회
  const head = await c.env.pdf_to_summary.head(key);

  // URL 생성
  const baseUrl = c.env.PUBLIC_URL || new URL(c.req.url).origin;
  const url = `${baseUrl}/image/${key}`;

  return c.json(
    {
      ok: true,
      key,
      url,
      size: head?.size ?? null,
      etag: head?.etag ?? null,
      contentType: imageContentType,
    },
    201,
  );
});

/**
 * 4) 이미지 RAW 바디 스트리밍 업로드 (권장)
 * - 요청: PUT /upload-image/:filename
 * - 헤더: Content-Type: image/*
 * - 바디: 파일 바이트 스트림
 */
app.put("/upload-image/:filename", async (c) => {
  const filename = c.req.param("filename") || "upload.jpg";
  const ct = c.req.header("content-type") || "";
  
  if (!isValidImageType(ct, filename)) {
    return c.json(
      { error: "Content-Type이 이미지 타입이어야 합니다. (image/jpeg, image/png, etc.)" },
      415,
    );
  }

  const body = c.req.raw.body;
  if (!body) return c.json({ error: "요청 바디가 비었습니다." }, 400);

  const key = buildImageKey(filename);
  const imageContentType = getImageContentType(ct, filename);

  await c.env.pdf_to_summary.put(key, body, {
    httpMetadata: { contentType: imageContentType },
    customMetadata: {
      originalName: filename,
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  const head = await c.env.pdf_to_summary.head(key);

  // URL 생성
  const baseUrl = c.env.PUBLIC_URL || new URL(c.req.url).origin;
  const url = `${baseUrl}/${key}`;

  return c.json(
    {
      ok: true,
      key,
      url,
      size: head?.size ?? null,
      etag: head?.etag ?? null,
      contentType: imageContentType,
    },
    201,
  );
});

/**
 * GET /image/:key
 * R2에서 이미지를 가져와서 반환
 */
app.get("/image/*", async (c) => {
  const key = c.req.path.replace(/^\/image\//, "");
  
  if (!key) {
    return c.json({ error: "이미지 키가 필요합니다." }, 400);
  }

  // R2에서 이미지 가져오기
  const imageObject = await c.env.pdf_to_summary.get(key);
  if (!imageObject) {
    return c.json({ error: "이미지를 찾을 수 없습니다." }, 404);
  }

  // 이미지 반환
  const headers = new Headers();
  headers.set("Content-Type", imageObject.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000"); // 1년 캐시
  
  if (imageObject.httpMetadata?.contentDisposition) {
    headers.set("Content-Disposition", imageObject.httpMetadata.contentDisposition);
  }

  return new Response(imageObject.body, {
    headers,
    status: 200,
  });
});

/**
 * GET /pdf/:key
 * R2에서 PDF를 가져와서 반환
 */
app.get("/pdf/*", async (c) => {
  const key = c.req.path.replace(/^\/pdf\//, "");
  
  if (!key) {
    return c.json({ error: "PDF 키가 필요합니다." }, 400);
  }

  // R2에서 PDF 가져오기
  const pdfObject = await c.env.pdf_to_summary.get(key);
  if (!pdfObject) {
    return c.json({ error: "PDF를 찾을 수 없습니다." }, 404);
  }

  // PDF 반환
  const headers = new Headers();
  headers.set("Content-Type", pdfObject.httpMetadata?.contentType || "application/pdf");
  headers.set("Cache-Control", "public, max-age=31536000"); // 1년 캐시
  
  if (pdfObject.httpMetadata?.contentDisposition) {
    headers.set("Content-Disposition", pdfObject.httpMetadata.contentDisposition);
  }

  return new Response(pdfObject.body, {
    headers,
    status: 200,
  });
});

/**
 * GET /prompts
 * 저장된 프롬프트 리스트 조회
 * - 응답: { ok: true, prompts: { prompt: string, withImage: boolean }[] }
 */
app.get("/prompts", async (c) => {
  try {
    const prompts: Array<{ prompt: string; withImage: boolean }> = [];
    let cursor: string | undefined = undefined;

    // KV에서 모든 프롬프트 가져오기
    do {
      const batch: KVNamespaceListResult<unknown, string> =
        await c.env.pdf_to_summary_kv.list({
          prefix: KV_PREFIX,
          cursor,
        });

      // 키를 숫자로 정렬하여 순서대로 가져오기
      const sortedKeys = batch.keys
        .map((k) => {
          const numStr = k.name.replace(KV_PREFIX, "");
          const num = parseInt(numStr, 10);
          return { key: k.name, num, value: null };
        })
        .filter((item) => !isNaN(item.num))
        .sort((a, b) => a.num - b.num);

      // 각 키의 값을 가져오기
      for (const item of sortedKeys) {
        const value = await c.env.pdf_to_summary_kv.get(item.key);
        if (value !== null) {
          try {
            // JSON 형식으로 저장된 경우 파싱
            const parsed = JSON.parse(value) as {
              prompt?: string;
              withImage?: boolean;
            };
            
            if (parsed && typeof parsed === 'object' && parsed.prompt) {
              // 새 형식: { prompt: string, withImage: boolean }
              prompts[item.num] = {
                prompt: String(parsed.prompt),
                withImage: Boolean(parsed.withImage ?? true),
              };
            } else {
              // 이전 형식 (문자열만 저장된 경우) - 하위 호환성
              prompts[item.num] = {
                prompt: typeof value === 'string' ? value : String(value),
                withImage: true, // 기본값
              };
            }
          } catch {
            // JSON 파싱 실패 시 문자열로 처리 (하위 호환성)
            prompts[item.num] = {
              prompt: String(value),
              withImage: true, // 기본값
            };
          }
        }
      }

      cursor = batch.list_complete ? undefined : batch.cursor;
    } while (cursor);

    // undefined 제거하고 배열로 변환 (인덱스 순서대로)
    const filteredPrompts = prompts
      .map((p, idx) => (p !== null && p !== undefined ? { ...p, index: idx } : null))
      .filter((p) => p !== null)
      .map((p) => ({ prompt: p!.prompt, withImage: p!.withImage }));

    return c.json({ ok: true, prompts: filteredPrompts });
  } catch (error) {
    return c.json(
      {
        ok: false,
        error: "프롬프트를 가져오는 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

/** POST /prompts
 *  - 기존 전체 삭제 후 새 리스트로 저장(리셋)
 *  - body: { prompts: string[] }
 *  - 응답: { ok: true, deleted: number, saved: number }
 */
app.post("/prompts", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    prompts?: unknown;
  } | null;
  if (!body || !Array.isArray(body.prompts)) {
    return c.json({ error: '"prompts" must be an array of strings' }, 400);
  }

  // 1) 전체 삭제
  let deleted = 0;
  let cursor: string | undefined = undefined;
  do {
    const batch: KVNamespaceListResult<unknown, string> =
      await c.env.pdf_to_summary_kv.list({
        prefix: KV_PREFIX,
        cursor,
      });
    if (batch.keys.length) {
      await Promise.all(
        batch.keys.map((k) => c.env.pdf_to_summary_kv.delete(k.name)),
      );
      deleted += batch.keys.length;
    }
    cursor = batch.list_complete ? undefined : batch.cursor;
  } while (cursor);

  // 2) 새 리스트 저장
  const list = body.prompts.map((p) => String(p ?? "").trim());
  await Promise.all(
    list.map((text, idx) =>
      c.env.pdf_to_summary_kv.put(`${KV_PREFIX}${idx}`, text),
    ),
  );

  return c.json({ ok: true, deleted, saved: list.length });
});

/**
 * GET /pdf-info/:key
 * PDF 파일 정보 조회 (페이지 수 등)
 * Browser Rendering 없이 사용 가능
 */
app.get("/pdf-info/:key", async (c) => {
  const pdfKey = c.req.param("key");

  // R2에서 PDF 가져오기
  const pdfObject = await c.env.pdf_to_summary.get(pdfKey);
  if (!pdfObject) {
    return c.json({ error: "PDF 파일을 찾을 수 없습니다." }, 404);
  }

  try {
    const pdfBuffer = await pdfObject.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    return c.json({
      ok: true,
      key: pdfKey,
      pageCount,
      size: pdfObject.size,
      uploaded: pdfObject.uploaded?.toISOString(),
      metadata: pdfObject.customMetadata,
    });
  } catch (error) {
    return c.json(
      {
        error: "PDF 정보를 가져오는 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default app;
