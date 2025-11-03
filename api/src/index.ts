import { Hono } from "hono";
import { cors } from "hono/cors";
import buildKey from "./libs/buildKey";
import buildImageKey from "./libs/buildImageKey";
import isValidImageType from "./libs/isValidImageType";
import getImageContentType from "./libs/getImageContentType";

type Bindings = {
  pdf_to_summary: R2Bucket; // PDF 저장용 클라우드 스토리지
  pdf_to_summary_kv: KVNamespace; // 프롬프트 저장용 Key-Value 저장소
  PUBLIC_URL: string; // PDF 저장소 공개 URL
};

const PROMPTS_LIST_KEY = "prompts"; // PDF 저장에 사용할 KEY

// 서버 객체 생성
const app = new Hono<{ Bindings: Bindings }>();

// 모든 요청 origin 허용 (CORS 정책)
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
  }),
);

/**
 * PDF 업로드 (RAW 바디 스트리밍 업로드)
 * - 요청: PUT /upload/:filename
 * - 헤더: Content-Type: application/pdf
 * - 바디: 파일 바이트 스트림
 */
app.put("/upload/:filename", async (c) => {
  const filename = c.req.param("filename");

  if (!filename) {
    return c.json({ error: "파일명이 제공되지 않았습니다." }, 400);
  }

  const ct = c.req.header("content-type") || "";

  // 업로드 하는 파일 타입이 pdf인지 확인
  if (!/application\/pdf/i.test(ct)) {
    return c.json(
      { error: "Content-Type: application/pdf 이어야 합니다." },
      415,
    );
  }

  const body = c.req.raw.body;

  // 파일이 존재하지 않을 경우
  if (!body) {
    return c.json({ error: "요청 바디가 비었습니다." }, 400);
  }

  // 파일 키 생성
  const key = buildKey(filename);

  // 파일 업로드
  await c.env.pdf_to_summary.put(key, body, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      originalName: filename,
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  // 업로드한 파일 정보 수집
  const head = await c.env.pdf_to_summary.head(key);

  // 파일 업로드한 데이터 반환
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
 * 이미지 업로드 (RAW 바디 스트리밍 업로드)
 * - 요청: PUT /upload-image/:filename
 * - 헤더: Content-Type: image/*
 * - 바디: 파일 바이트 스트림
 */
app.put("/upload-image/:filename", async (c) => {
  // param에서 파일명 가져오기
  const filename = c.req.param("filename");

  // 파일명이 존재하지 않을 경우 오류 처리
  if (!filename) {
    return c.json({ error: "파일명이 제공되지 않았습니다." }, 400);
  }

  // 파일 타입 확인
  const ct = c.req.header("content-type") || "";

  // 이미지 타입이 맞는지 확인
  if (!isValidImageType(ct, filename)) {
    return c.json(
      {
        error:
          "Content-Type이 이미지 타입이어야 합니다. (image/jpeg, image/png, etc.)",
      },
      415,
    );
  }

  // 파일 데이터
  const body = c.req.raw.body;
  // 파일 데이터가 존재하지 않을 경우 오류 처리
  if (!body) {
    return c.json({ error: "요청 바디가 비었습니다." }, 400);
  }

  // 이미지 파일 키 생성
  const key = buildImageKey(filename);
  // 이미지 파일 타입 확인
  const imageContentType = getImageContentType(ct, filename);

  // 이미지 파일 업로드
  await c.env.pdf_to_summary.put(key, body, {
    httpMetadata: { contentType: imageContentType },
    customMetadata: {
      originalName: filename,
      uploadedByIp: c.req.header("cf-connecting-ip") || "",
    },
  });

  // 이미지 파일 업로드 확인
  const head = await c.env.pdf_to_summary.head(key);

  // 이미지 접근 URL
  const baseUrl = c.env.PUBLIC_URL || new URL(c.req.url).origin;
  const url = `${baseUrl}/${key}`;

  // 이미지 업로드 확인 정보 반환
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
 * GET /prompts
 * 저장된 프롬프트 리스트 조회
 * - 응답: { ok: true, prompts: { prompt: string, withImage: boolean }[] }
 */
app.get("/prompts", async (c) => {});

/** POST /prompts
 *  - 단일 KV 키에 프롬프트 리스트를 JSON 배열로 저장
 *  - body: { prompts: { prompt: string, withImage: boolean }[] }
 *  - 응답: { ok: true, saved: number }
 */
app.post("/prompts", async (c) => {});

export default app;
