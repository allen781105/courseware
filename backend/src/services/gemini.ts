import { randomUUID } from 'node:crypto';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type {
  CourseOutline,
  Courseware,
  CoursewareArtifact,
  CoursewareBuildRequest,
  CoursewareSection,
  GenerationRequest,
  InteractionBlock,
  InteractionType,
  OutlineSection,
} from '../types';
import { renderCoursewareHtml } from '../templates/courseware-html';

const PLACEHOLDER_IMAGE_BASE = 'https://placehold.co/800x600';
const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image';
const MAX_RETRY = 2;

interface OutlineItem {
  title: string;
  summary: string;
  interactionHint?: InteractionType;
  assetsHint?: string;
}

export class GeminiService {
  private readonly apiKey: string | undefined;
  private readonly textModelId: string;
  private readonly imageModelId: string;
  private readonly client: GoogleGenerativeAI | null;
  private textModel: GenerativeModel | null = null;
  private imageModel: GenerativeModel | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.GEMINI_API_KEY;
    this.textModelId = DEFAULT_TEXT_MODEL;
    this.imageModelId = DEFAULT_IMAGE_MODEL;
    this.client = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async generateOutline(request: GenerationRequest): Promise<CourseOutline> {
    const outline = await this.generateOutlineWithGemini(request);
    if (outline) {
      return outline;
    }

    // fallback
    const interactionTypes = request.interactionTypes ?? [];
    const sections = this.buildDefaultOutlineSections(request.topic).map((section, index) => ({
      ...section,
      id: randomUUID(),
      interactionHint: this.pickInteractionHint(interactionTypes, index),
    }));

    return {
      id: randomUUID(),
      title: `${request.topic} 互动课件`,
      sections,
    };
  }

  async generateCourseware(payload: CoursewareBuildRequest): Promise<CoursewareArtifact> {
    const generatedAt = new Date().toISOString();
    const sections: CoursewareSection[] = [];

    for (let index = 0; index < payload.outline.sections.length; index += 1) {
      const section = payload.outline.sections[index];
      if (index > 0) {
        await this.waitForNextImage();
      }

      const imagePrompt = this.buildImagePrompt(payload.request, section);
      const imageUrl = await this.generateImage(imagePrompt, index);
      const interaction = this.buildInteraction(section, index, payload.request.interactionTypes ?? []);

      sections.push({
        id: section.id,
        title: section.title,
        body: this.buildSectionBody(section, payload.request),
        image: {
          prompt: imagePrompt,
          url: imageUrl,
          alt: `${section.title} 插图`,
        },
        interaction,
      });
    }

    const courseware: Courseware = {
      id: randomUUID(),
      title: payload.outline.title,
      metadata: {
        topic: payload.request.topic,
        audience: payload.request.audience,
        objectives: payload.request.objectives ?? [],
        generatedAt,
      },
      sections,
    };

    const html = renderCoursewareHtml(courseware);

    return {
      courseware,
      html,
    };
  }

  private async waitForNextImage(): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }

  private async generateOutlineWithGemini(request: GenerationRequest): Promise<CourseOutline | null> {
    if (!this.client) {
      return null;
    }

    const prompt = this.buildOutlinePrompt(request);

    for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
      try {
        const rawText = await this.generateTextWithGemini(prompt);
        if (!rawText) {
          continue;
        }
        const parsed = this.extractJson<{
          title?: string;
          sections?: OutlineItem[];
        }>(rawText);

        if (!parsed?.sections || parsed.sections.length === 0) {
          continue;
        }

        const interactionTypes = request.interactionTypes ?? [];

        return {
          id: randomUUID(),
          title: parsed.title ?? `${request.topic} 互动课件`,
          sections: parsed.sections.map((section, index) => ({
            id: randomUUID(),
            title: section.title || `第 ${index + 1} 节`,
            summary: section.summary || '请补充该节课程摘要。',
            interactionHint: section.interactionHint ?? this.pickInteractionHint(interactionTypes, index),
            assetsHint: section.assetsHint ?? `请准备与「${section.title || request.topic}」相关的插图。`,
          })),
        };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Gemini outline generation failed', error);
      }
    }

    return null;
  }

  private async generateTextWithGemini(prompt: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      if (!this.textModel) {
        this.textModel = this.client.getGenerativeModel({
          model: this.textModelId,
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
          },
        });
      }

      const result = await this.textModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });
      console.log('-------Gemini text generation result', result.response?.text?.());
      const text = result.response?.text?.();
      return text ? text.trim() : null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Gemini text generation failed', error);
      return null;
    }
  }

  private extractJson<T>(input: string): T | null {
    if (!input) {
      return null;
    }

    const jsonFenceMatch = input.match(/```json\s*([\s\S]*?)```/i);
    const candidate = jsonFenceMatch ? jsonFenceMatch[1] : input;
    const firstBraceIndex = candidate.indexOf('{');
    const lastBraceIndex = candidate.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      return null;
    }

    const jsonString = candidate.slice(firstBraceIndex, lastBraceIndex + 1);

    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse Gemini JSON response', error);
      return null;
    }
  }

  private async generateImage(prompt: string, index: number): Promise<string> {
    if (!this.apiKey) {
      return `${PLACEHOLDER_IMAGE_BASE}?text=Slide+${index + 1}`;
    }

    const image = await this.generateImageWithGemini(prompt);
    //console.log('-------Gemini image generation result', image);
    if (image) {
      return image;
    }

    return `${PLACEHOLDER_IMAGE_BASE}?text=Slide+${index + 1}`;
  }

  private async generateImageWithGemini(prompt: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      if (!this.imageModel) {
        this.imageModel = this.client.getGenerativeModel({
          model: this.imageModelId,
          generationConfig: {
            temperature: 0.7,
          },
        });
      }
      console.log('-------Gemini image generation prompt', prompt);
      const result = await this.imageModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const base64 = result.response?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData?.data;
      if (!base64) {
        return null;
      }

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Gemini image generation failed', error);
      return null;
    }
  }

  private buildSectionBody(section: OutlineSection, request: GenerationRequest): string {
    return [
      `<h2>${section.title}</h2>`,
      `<p>${section.summary}</p>`,
      `<p>教学对象：${request.audience}</p>`,
      request.tone ? `<p>语气：${request.tone}</p>` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildInteraction(
    section: OutlineSection,
    index: number,
    interactionTypes: InteractionType[]
  ): InteractionBlock | undefined {
    if (interactionTypes.length === 0) {
      return undefined;
    }

    const optionId = () => randomUUID();
    const interactionType = interactionTypes[index % interactionTypes.length] ?? 'single';

    if (interactionType === 'truefalse') {
      const trueId = optionId();
      const falseId = optionId();
      return {
        id: randomUUID(),
        type: 'truefalse',
        question: `${section.title} 的陈述是否正确？`,
        options: [
          { id: trueId, label: '正确' },
          { id: falseId, label: '不正确' },
        ],
        answers: [trueId],
        explanation: `本节重点为：${section.summary}`,
        scoring: {
          points: 5,
          analyticsKey: `section-${index + 1}`,
        },
      };
    }

    if (interactionType === 'multi') {
      const optionA = optionId();
      const optionB = optionId();
      const optionC = optionId();
      return {
        id: randomUUID(),
        type: 'multi',
        question: `关于“${section.title}”，以下哪些描述是正确的？`,
        options: [
          { id: optionA, label: section.summary },
          { id: optionB, label: `结合课堂活动的应用场景` },
          { id: optionC, label: '与主题无关的拓展知识' },
        ],
        answers: [optionA, optionB],
        explanation: `正确选项涵盖了本节所需掌握的核心与实践内容。`,
        scoring: {
          points: 15,
          analyticsKey: `section-${index + 1}`,
        },
      };
    }

    const correctOptionId = optionId();
    return {
      id: randomUUID(),
      type: 'single',
      question: `${section.title} 的核心要点是什么？`,
      options: [
        { id: correctOptionId, label: section.summary },
        { id: optionId(), label: `与 ${section.title} 相关的拓展知识` },
        { id: optionId(), label: '课堂活动安排' },
      ],
      answers: [correctOptionId],
      explanation: `正确答案突出“${section.summary}”。`,
      scoring: {
        points: 10,
        analyticsKey: `section-${index + 1}`,
      },
    };
  }

  private buildOutlinePrompt(request: GenerationRequest): string {
    const objectivesText =
      request.objectives && request.objectives.length > 0
        ? request.objectives.map((item, index) => `${index + 1}. ${item}`).join('\n')
        : '无明确教学目标，可按照经验进行设置，但至少要有 4 个章节。';

    const constraintsText =
      request.constraints && request.constraints.length > 0 ? request.constraints.map((item) => `- ${item}`).join('\n') : '无';

    const interactionTypesText =
      request.interactionTypes && request.interactionTypes.length > 0
        ? request.interactionTypes.join('、')
        : '无需互动题';

    return [
      '你是一名拥有 15 年教学经验的资深课件设计师，精通 ADDIE 模型、视觉层级与认知负荷理论，请根据以下需求生成课程大纲，后续可以用来生成教学课件，不要添加额外文本或解释，确保返回可解析的 JSON。',
      '',
      `课程主题：${request.topic}`,
      `教学对象：${request.audience}`,
      `文案语气：${request.tone ?? '未指定，保持专业友好'}`,
      `图片风格：${request.imageStyle ?? '未指定，可给出建议'}`,
      `互动题需求：${interactionTypesText}`,
      '约束条件：',
      constraintsText,
      '',
      '教学目标/章节参考：',
      objectivesText,
      '',
      '转换规则（必须遵守）：',
      '认知负荷：每页信息量 ≤ 5 条，文字 ≤ 100 字，使用“标题-内容-图”黄金三角',
      '语言风格：口语化、亲切，杜绝长难句',
      '重点要求：assetsHint中的图片提示词中要求生成的图片上不要包含任何文字，只要图像元素，这点要在生成的图片提示词中提示词中明确说明，而且这段图片提示词要尽可能精细。这部分需要体现的是图片生成的内容，后续这段提示词会直接发送给图像生成大模型进行图片生成。',
      '请严格输出 JSON，结构如下：',
      '{',
      '  "title": "课程标题",',
      '  "sections": [',
      '    {',
      '      "title": "分页标题",',
      '      "summary": "该分页的教学内容，可以分点展开",',
      '      "interactionHint": "建议的互动题型，可选值 single | multi | truefalse，可省略",',
      '      "assetsHint": "建议的配套图片提示词,重点要求是生成的图片上不要包含任何文字，只要图像元素，这点要在生成的图片提示词中提示词中明确说明。而且这部分的图片提示词要与section.title和section.summary相关，不要偏离主题。"',
      '    }',
      '  ]',
      '}',
      '',
      '不要添加额外文本或解释，确保返回可解析的 JSON。至少生成 3 个章节。',
    ].join('\n');
  }

  private buildImagePrompt(request: GenerationRequest, section: OutlineSection): string {
    const parts = [
      //request.topic,
      //section.title,
      //section.summary,
      section.assetsHint,
      request.imageStyle ?? 'flat illustration, bright colors',
      //`for audience: ${request.audience}`,
    ];

    return parts.join(' | ');
  }

  private pickInteractionHint(interactionTypes: InteractionType[], index: number): InteractionType | undefined {
    if (!interactionTypes || interactionTypes.length === 0) {
      return undefined;
    }
    return interactionTypes[index % interactionTypes.length];
  }

  private buildDefaultOutlineSections(topic: string): Array<Omit<OutlineSection, 'id'>> {
    const safeTopic = topic || '本课';
    return [
      {
        title: '第一节：主题导入',
        summary: `围绕“${safeTopic}”的背景与重要性进行导入，激发学习兴趣。`,
        assetsHint: `展示与“${safeTopic}”相关的引导性图片。`,
      },
      {
        title: '第二节：核心内容讲解',
        summary: `详细阐述“${safeTopic}”的关键知识点，并结合示例说明。`,
        assetsHint: `准备能体现核心概念的图示或案例插画。`,
      },
      {
        title: '第三节：总结与拓展',
        summary: `对“${safeTopic}”进行总结，提出拓展思考或实践建议。`,
        assetsHint: `使用概念图或思维导图形式的图片强化记忆。`,
      },
    ];
  }
}

