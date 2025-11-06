import { validateImageUrl } from "./convert";
import { getAiApi } from "./variables";

// AI 분석 함수 (Chain-of-Thought)
export async function analyzeWithAI(imageUrls, promptItems, onProgress) {
  // promptItems: [{ prompt: string, withImage: boolean }, ...]

  if (!promptItems || promptItems.length === 0) {
    return {
      ok: false,
      error: "프롬프트가 없습니다.",
    };
  }

  // 이미지가 필요한 프롬프트가 있는지 확인
  const needsImage = promptItems.some((p) => p.withImage);
  if (needsImage && (!imageUrls || imageUrls.length === 0)) {
    return {
      ok: false,
      error: "이미지가 필요한 프롬프트가 있지만 이미지가 없습니다.",
    };
  }

  console.log(`=== AI 분석 시작 ===`);
  console.log(`총 ${imageUrls?.length || 0}개 이미지 분석 예정`);
  console.log(`Chain-of-Thought 단계: ${promptItems.length}개`);
  console.log(`프롬프트:`, promptItems);

  try {
    const results = [];

    // 이미지 URL이 없는 경우 (텍스트만 처리)
    const processImageUrls =
      imageUrls && imageUrls.length > 0 ? imageUrls : [null];

    // 각 이미지에 대해 분석 수행 (이미지가 없으면 1회만 실행)
    for (let imgIdx = 0; imgIdx < processImageUrls.length; imgIdx++) {
      // 진행 상황 업데이트
      if (onProgress) {
        onProgress({
          current: imgIdx + 1,
          total: processImageUrls.length,
          step: 0,
          totalSteps: promptItems.length,
        });
      }
      const imageUrl = processImageUrls[imgIdx];

      if (imageUrl) {
        console.log(
          `\n[페이지 ${imgIdx + 1}/${processImageUrls.length}] 분석 시작`,
        );
        console.log(`이미지 URL: ${imageUrl}`);
      } else {
        console.log(`\n[텍스트 전용 분석] 시작`);
      }

      const pageResults = [];

      try {
        // 이미지 URL 검증 (이미지가 있는 경우에만)
        if (imageUrl && !validateImageUrl(imageUrl)) {
          throw new Error(`유효하지 않은 이미지 URL: ${imageUrl}`);
        }
        if (imageUrl) {
          console.log(`이미지 URL 검증 완료: ${imageUrl}`);
        }

        // Chain-of-Thought: 각 프롬프트를 순차적으로 실행
        let previousResponse = "";

        for (let promptIdx = 0; promptIdx < promptItems.length; promptIdx++) {
          // 진행 상황 업데이트 (Step)
          if (onProgress) {
            onProgress((prev) => ({
              ...prev,
              step: promptIdx + 1,
            }));
          }

          const promptItem = promptItems[promptIdx];
          const { prompt, withImage: needsImage } = promptItem;

          console.log(
            `\n  [Step ${promptIdx + 1}/${promptItems.length}] 실행 중...`,
          );
          console.log(`  프롬프트: ${prompt}`);
          console.log(`  이미지 필요: ${needsImage ? "Yes" : "No"}`);

          // 이전 응답이 있으면 프롬프트에 포함
          const enhancedPrompt = previousResponse
            ? `이전 분석 결과:\n${previousResponse}\n\n새로운 지시사항:\n${prompt}`
            : prompt;

          if (previousResponse) {
            console.log(`  이전 결과 포함됨 (${previousResponse.length}자)`);
          }

          // 엔드포인트 및 요청 데이터 결정
          let endpoint;
          let requestBody;

          if (needsImage && imageUrl) {
            // 이미지와 함께 요청 (ImageUrlRequest)
            endpoint = `${getAiApi()}/api/generate`;
            requestBody = {
              image_url: imageUrl,
              prompt: enhancedPrompt,
              temperature: 0.7,
              max_tokens: 2000,
            };
            console.log(`  엔드포인트: /api/generate (이미지 포함)`);
          } else {
            // 텍스트만 요청 (TextPromptRequest)
            endpoint = `${getAiApi()}/api/generate/text`;
            requestBody = {
              prompt: enhancedPrompt,
              temperature: 0.7,
              max_tokens: 2000,
            };
            console.log(`  엔드포인트: /api/generate/text (텍스트 전용)`);
          }

          console.log(`  요청 데이터:`, requestBody);

          // AI API 호출
          try {
            const resp = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            });

            console.log(`  API 응답 상태: ${resp.status} ${resp.statusText}`);

            if (!resp.ok) {
              let errorText = "";
              let errorDetail = "";

              try {
                const text = await resp.text();
                if (text) {
                  try {
                    const errorJson = JSON.parse(text);
                    errorText =
                      errorJson.error ||
                      errorJson.message ||
                      errorJson.detail ||
                      text;
                    errorDetail = JSON.stringify(errorJson);
                    console.error(`  API 오류 (JSON):`, errorJson);
                  } catch {
                    errorText = text.substring(0, 200);
                    console.error(`  API 오류 (Text):`, text);
                  }
                }
              } catch (readErr) {
                console.error(`  응답 읽기 실패:`, readErr);
                errorText = "응답을 읽을 수 없습니다";
              }

              pageResults.push({
                step: promptIdx + 1,
                prompt,
                withImage: needsImage,
                success: false,
                error: `API 오류 (${resp.status}): ${errorText}`,
              });
              break; // 에러 발생 시 다음 프롬프트 실행 중단
            }

            // 응답 파싱
            let aiResponse;
            try {
              const text = await resp.text();
              if (!text) {
                throw new Error("AI 응답이 비어있습니다");
              }
              aiResponse = JSON.parse(text);
            } catch (parseErr) {
              console.error(`  JSON 파싱 오류:`, parseErr);
              pageResults.push({
                step: promptIdx + 1,
                prompt,
                withImage: needsImage,
                success: false,
                error: "AI 응답 형식이 올바르지 않습니다",
              });
              break;
            }
            console.log(`  AI 응답 전체:`, aiResponse);

            // 다양한 응답 형식 지원
            let responseText = "";
            if (typeof aiResponse === "string") {
              // 직접 문자열인 경우
              responseText = aiResponse;
            } else if (aiResponse.response) {
              // { response: "텍스트" }
              responseText = aiResponse.response;
            } else if (aiResponse.text) {
              // { text: "텍스트" }
              responseText = aiResponse.text;
            } else if (aiResponse.result) {
              // { result: "텍스트" }
              responseText = aiResponse.result;
            } else if (aiResponse.output) {
              // { output: "텍스트" }
              responseText = aiResponse.output;
            } else if (aiResponse.data) {
              // { data: "텍스트" } 또는 { data: { ... } }
              responseText =
                typeof aiResponse.data === "string"
                  ? aiResponse.data
                  : JSON.stringify(aiResponse.data);
            } else {
              // 알 수 없는 형식 - 전체를 문자열로 변환
              responseText = JSON.stringify(aiResponse);
              console.warn(
                `  예상치 못한 응답 형식, 전체를 문자열로 변환:`,
                aiResponse,
              );
            }

            previousResponse = responseText;
            console.log(
              `  추출된 응답: ${previousResponse.substring(0, 100)}... (총 ${previousResponse.length}자)`,
            );

            if (!previousResponse) {
              throw new Error("AI 응답이 비어있습니다.");
            }

            pageResults.push({
              step: promptIdx + 1,
              prompt,
              withImage: needsImage,
              success: true,
              response: previousResponse,
            });
          } catch (apiErr) {
            console.error(`  API 호출 실패:`, apiErr);

            let errorMessage = "API 호출 실패";
            if (apiErr.message?.includes("시간 초과")) {
              errorMessage =
                "AI 분석 시간 초과 - 응답을 기다리는 중 시간이 초과되었습니다.";
            } else if (apiErr.message?.includes("Failed to fetch")) {
              errorMessage =
                "AI 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.";
            } else if (apiErr.message) {
              errorMessage = apiErr.message;
            }

            pageResults.push({
              step: promptIdx + 1,
              prompt,
              withImage: needsImage,
              success: false,
              error: errorMessage,
            });
            break;
          }
        }

        results.push({
          page: imgIdx + 1,
          imageUrl,
          steps: pageResults,
        });

        console.log(
          `[페이지 ${imgIdx + 1}] 분석 완료 (${pageResults.length}/${promptItems.length} 단계 성공)`,
        );
      } catch (imgErr) {
        console.error(`[페이지 ${imgIdx + 1}] 이미지 처리 실패:`, imgErr);
        results.push({
          page: imgIdx + 1,
          imageUrl,
          steps: [
            {
              step: 1,
              prompt: promptItems[0].prompt,
              withImage: promptItems[0].withImage,
              success: false,
              error: `이미지 처리 실패: ${imgErr.message}`,
            },
          ],
        });
      }
    }

    console.log(`\n=== AI 분석 완료 ===`);
    console.log(`총 ${results.length}개 페이지 분석됨`);

    return {
      ok: true,
      results,
    };
  } catch (err) {
    console.error(`AI 분석 중 전체 오류:`, err);
    return {
      ok: false,
      error: err?.message || "AI 분석 중 오류 발생",
    };
  }
}
