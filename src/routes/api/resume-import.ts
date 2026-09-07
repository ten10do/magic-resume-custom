import { createFileRoute } from "@tanstack/react-router";
import { formatGeminiErrorMessage, getGeminiModelInstance } from "@/lib/server/gemini";

type ResumeImportProvider = "deepseek" | "gemini";

const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_VISION_MODEL = "deepseek-v4-flash-vision-exp";

const parseJsonPayload = (content: string) => {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch (error) {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch (error) {}
  }

  const objectBlock = text.match(/\{[\s\S]*\}/);
  if (objectBlock?.[0]) {
    try {
      return JSON.parse(objectBlock[0]);
    } catch (error) {}
  }

  return null;
};

const extractBase64Payload = (value: string) => {
  const matched = value.match(/^data:(.*?);base64,(.*)$/);
  if (matched) {
    return {
      mimeType: matched[1] || "image/jpeg",
      data: matched[2] || "",
    };
  }

  return {
    mimeType: "image/jpeg",
    data: value,
  };
};

const getSystemInstruction = (language: string) => `你是一个专业的简历结构化助手。根据用户提供的简历内容，提取信息并只输出一个合法 JSON 对象。

输出约束：
1. 只允许输出 JSON，不要输出 Markdown，不要输出解释。
2. 如果某个字段不确定，使用空字符串或空数组。
3. 请使用 ${language} 输出内容文本。
4. description/details 字段输出字符串数组，每一项为一句可读内容。
5. 如果页面中包含人物证件照，请返回 photo；page 从 1 开始，bbox 使用相对于整页图片的 0-1000 归一化坐标 [左, 上, 右, 下]。bbox 必须框住整张证件照的矩形区域（包含照片背景和完整边缘），不能只框人物脸部、头部或身体。不要把 Logo、二维码或装饰图当作证件照。没有证件照时返回 null。
6. 以一页 A4 简历为目标提炼内容，不要逐字转录冗长描述。保留单位、岗位、项目名称、日期和量化成果；每段工作或项目最多 3 条要点，每条中文不超过 45 字、英文不超过 90 个字符；技能最多 6 条并合并同类项。

JSON 结构：
{
  "title": "简历标题",
  "photo": {
    "page": 1,
    "bbox": [0, 0, 0, 0]
  },
  "basic": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "employementStatus": "",
    "birthDate": ""
  },
  "education": [
    {
      "school": "",
      "major": "",
      "degree": "",
      "startDate": "",
      "endDate": "",
      "gpa": "",
      "description": ["", ""]
    }
  ],
  "experience": [
    {
      "company": "",
      "position": "",
      "date": "",
      "details": ["", ""]
    }
  ],
  "projects": [
    {
      "name": "",
      "role": "",
      "date": "",
      "description": ["", ""],
      "link": "",
      "linkLabel": ""
    }
  ],
  "skills": ["", ""]
}`;

const requestDeepseekResume = async (params: {
  apiKey: string;
  model?: string;
  content?: string;
  images?: string[];
  systemInstruction: string;
}) => {
  const imageParts = (params.images || []).map((image) => {
    const payload = extractBase64Payload(image);
    const dataUrl = image.startsWith("data:")
      ? image
      : `data:${payload.mimeType};base64,${payload.data}`;

    return {
      type: "image_url",
      image_url: { url: dataUrl },
    };
  });

  const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || DEEPSEEK_VISION_MODEL,
      messages: [
        { role: "system", content: params.systemInstruction },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                params.content ||
                "请识别以下简历页面图片中的信息，并严格按 JSON 结构输出。",
            },
            ...imageParts,
          ],
        },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.error?.message || `DeepSeek request failed (${response.status})`
    );
    Object.assign(error, { status: response.status });
    throw error;
  }

  return data?.choices?.[0]?.message?.content;
};

const requestDeepseekPhotoDetection = async (params: {
  apiKey: string;
  model?: string;
  image: string;
  searchHeightRatio: number;
}) => {
  const payload = extractBase64Payload(params.image);
  const dataUrl = params.image.startsWith("data:")
    ? params.image
    : `data:${payload.mimeType};base64,${payload.data}`;
  const response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model || DEEPSEEK_VISION_MODEL,
      messages: [
        {
          role: "system",
          content: `你是简历证件照区域定位器。只定位页面中独立的矩形人物照片素材。

要求：
1. bbox 使用相对于当前图片的 0-1000 坐标 [左, 上, 右, 下]。
2. bbox 必须紧贴照片素材自身的完整外边缘，包含照片背景或相框，但不能包含照片外的文字、横线、留白或其他简历内容。
3. 不要把个人信息区、Logo、二维码、图标或装饰图当作证件照。
4. 只有明确看到人物照片时才返回结果；不确定时返回 photo: null。
5. 只输出 JSON：{"photo":{"bbox":[0,0,0,0],"confidence":0.0}} 或 {"photo":null}。`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请定位这张简历页面截图中的人物证件照素材。",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0,
      max_tokens: 256,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.error?.message || `DeepSeek photo detection failed (${response.status})`
    );
    Object.assign(error, { status: response.status });
    throw error;
  }

  const parsed = parseJsonPayload(data?.choices?.[0]?.message?.content || "");
  const bbox = Array.isArray(parsed?.photo?.bbox)
    ? parsed.photo.bbox.map(Number)
    : [];
  const confidence = Number(parsed?.photo?.confidence);
  if (
    bbox.length !== 4 ||
    bbox.some((value: number) => !Number.isFinite(value) || value < 0 || value > 1000) ||
    !Number.isFinite(confidence) ||
    confidence < 0.65
  ) {
    return null;
  }

  const [left, top, right, bottom] = bbox;
  const width = right - left;
  const height = bottom - top;
  if (
    width < 20 ||
    height < 20 ||
    width > 550 ||
    height > 850 ||
    right <= left ||
    bottom <= top
  ) {
    return null;
  }

  return {
    page: 1,
    bbox: [
      left,
      top * params.searchHeightRatio,
      right,
      bottom * params.searchHeightRatio,
    ],
    confidence,
  };
};

export const Route = createFileRoute("/api/resume-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const {
            provider = "gemini",
            apiKey,
            model,
            content,
            images,
            locale,
            photoSearchImage,
            photoSearchHeightRatio,
          } = body as {
            provider?: ResumeImportProvider;
            apiKey: string;
            model?: string;
            content?: string;
            images?: string[];
            locale?: string;
            photoSearchImage?: string;
            photoSearchHeightRatio?: number;
          };

          if (!apiKey || (!content && (!images || images.length === 0))) {
            return Response.json(
              { error: "Missing API key or resume content/images" },
              { status: 400 }
            );
          }

          const language = locale === "en" ? "English" : "Chinese";
          const systemInstruction = getSystemInstruction(language);
          let aiContent: string | undefined;

          if (provider === "deepseek") {
            aiContent = await requestDeepseekResume({
              apiKey,
              model,
              content,
              images,
              systemInstruction,
            });
          } else {
            const imageParts = Array.isArray(images)
              ? images.map((image) => {
                  const payload = extractBase64Payload(image);
                  return {
                    inlineData: {
                      mimeType: payload.mimeType,
                      data: payload.data,
                    },
                  };
                })
              : [];
            const modelInstance = getGeminiModelInstance({
              apiKey,
              model: model || "gemini-flash-latest",
              systemInstruction,
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            });
            const result = await modelInstance.generateContent([
              {
                text:
                  content ||
                  "请识别以下简历页面图片中的信息，并严格按 JSON 结构输出。",
              },
              ...imageParts,
            ]);
            aiContent = result.response.text();
          }

          if (!aiContent || typeof aiContent !== "string") {
            return Response.json(
              { error: "AI did not return structured content" },
              { status: 500 }
            );
          }

          const parsedResume = parseJsonPayload(aiContent);
          if (!parsedResume) {
            return Response.json(
              { error: "Failed to parse AI JSON output" },
              { status: 500 }
            );
          }

          if (provider === "deepseek" && photoSearchImage) {
            try {
              const searchHeightRatio =
                typeof photoSearchHeightRatio === "number" &&
                photoSearchHeightRatio > 0 &&
                photoSearchHeightRatio <= 1
                  ? photoSearchHeightRatio
                  : 1;
              parsedResume.photo = await requestDeepseekPhotoDetection({
                apiKey,
                model,
                image: photoSearchImage,
                searchHeightRatio,
              });
            } catch (photoError) {
              console.warn("Unable to detect resume photo:", photoError);
              parsedResume.photo = null;
            }
          }

          return Response.json({ resume: parsedResume });
        } catch (error) {
          console.error("Error in resume import:", error);
          const status =
            typeof (error as any)?.status === "number"
              ? (error as any).status
              : 500;
          const message =
            error instanceof Error
              ? error.message
              : formatGeminiErrorMessage(error);
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
