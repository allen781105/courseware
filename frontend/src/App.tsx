import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CourseOutline, CoursewareArtifact, InteractionType } from './api/types';
import { apiClient } from './api/client';
import './App.css';

interface FormState {
  topic: string;
  audience: string;
  objectives: string;
  tone: string;
  imageStyle: string;
  constraints: string;
}

const DEFAULT_FORM_STATE: FormState = {
  topic: '',
  audience: '',
  objectives: '',
  tone: '',
  imageStyle: '',
  constraints: '',
};

const INTERACTION_OPTIONS: { value: InteractionType; label: string }[] = [
  { value: 'single', label: '单选题' },
  { value: 'multi', label: '多选题' },
  { value: 'truefalse', label: '判断题' },
];

const AUDIENCE_OPTIONS: string[] = [
  '小学低年级学生',
  '小学高年级学生',
  '初中学生',
  '高中学生',
  '大学本科生',
  '成人职业学习者',
  '企业内训学员',
];

const IMAGE_STYLE_OPTIONS: string[] = [
  '扁平化插画风格',
  '水彩画风格',
  '写实摄影风格',
  '线条插画风格',
  '卡通漫画风格',
  '赛博朋克风格',
  '中国传统水墨风格',
];

type Step = 'request' | 'outline' | 'courseware';

function parseMultiline(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function App() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);
  const [selectedInteractionTypes, setSelectedInteractionTypes] = useState<InteractionType[]>(['single']);
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [coursewareArtifact, setCoursewareArtifact] = useState<CoursewareArtifact | null>(null);
  const [activeStep, setActiveStep] = useState<Step>('request');
  const [loadingOutline, setLoadingOutline] = useState(false);
  const [loadingCourseware, setLoadingCourseware] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audienceSelectValue, setAudienceSelectValue] = useState<string>('');
  const [imageStyleSelectValue, setImageStyleSelectValue] = useState<string>('');

  const courseware = coursewareArtifact?.courseware ?? null;
  const coursewareHtml = coursewareArtifact?.html ?? '';

  const objectivesCount = useMemo(() => parseMultiline(formState.objectives).length, [formState.objectives]);

  const handleFormChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleAudienceSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setAudienceSelectValue(value);
    if (value === '__custom') {
      setFormState((prev) => ({
        ...prev,
        audience: '',
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        audience: value,
      }));
    }
  };

  const handleImageStyleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setImageStyleSelectValue(value);
    if (value === '__custom') {
      setFormState((prev) => ({
        ...prev,
        imageStyle: '',
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        imageStyle: value,
      }));
    }
  };

  const toggleInteractionType = (value: InteractionType) => {
    setSelectedInteractionTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleGenerateOutline = async () => {
    setErrorMessage(null);
    setLoadingOutline(true);
    setCoursewareArtifact(null);
    setActiveStep('request');

    try {
      if (!formState.topic.trim() || !formState.audience.trim()) {
        throw new Error('请先填写课件主题和教学对象。');
      }

      const objectives = parseMultiline(formState.objectives);
      const constraints = parseMultiline(formState.constraints);
      const interactionTypes = selectedInteractionTypes.length > 0 ? selectedInteractionTypes : undefined;
      const imageStyleValue = formState.imageStyle.trim();

      const request = {
        topic: formState.topic,
        audience: formState.audience,
        objectives: objectives.length > 0 ? objectives : undefined,
        interactionTypes,
        tone: formState.tone || undefined,
        imageStyle: imageStyleValue ? imageStyleValue : undefined,
        constraints: constraints.length > 0 ? constraints : undefined,
      };

      const generatedOutline = await apiClient.generateOutline(request);
      setOutline(generatedOutline);
      setActiveStep('outline');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '生成大纲失败，请重试。');
      setOutline(null);
      setActiveStep('request');
    } finally {
      setLoadingOutline(false);
    }
  };

  const handleGenerateCourseware = async () => {
    if (!outline) return;

    setErrorMessage(null);
    setLoadingCourseware(true);

    try {
      if (!formState.topic.trim() || !formState.audience.trim()) {
        throw new Error('请先填写课件主题和教学对象。');
      }

      const objectives = parseMultiline(formState.objectives);
      const constraints = parseMultiline(formState.constraints);
      const interactionTypes = selectedInteractionTypes.length > 0 ? selectedInteractionTypes : undefined;
      const imageStyleValue = formState.imageStyle.trim();

      const request = {
        topic: formState.topic,
        audience: formState.audience,
        objectives: objectives.length > 0 ? objectives : undefined,
        interactionTypes,
        tone: formState.tone || undefined,
        imageStyle: imageStyleValue ? imageStyleValue : undefined,
        constraints: constraints.length > 0 ? constraints : undefined,
      };

      const generatedCourseware = await apiClient.generateCourseware({
        outline,
        request,
      });

      setCoursewareArtifact(generatedCourseware);
      setActiveStep('courseware');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '生成课件失败，请重试。');
      setCoursewareArtifact(null);
    } finally {
      setLoadingCourseware(false);
    }
  };

  const handleReset = () => {
    setFormState(DEFAULT_FORM_STATE);
    setSelectedInteractionTypes(['single']);
    setOutline(null);
    setCoursewareArtifact(null);
    setErrorMessage(null);
    setAudienceSelectValue('');
    setImageStyleSelectValue('');
    setActiveStep('request');
  };

  const handleDownloadHtml = () => {
    if (!coursewareArtifact) return;

    const filename = `${coursewareArtifact.courseware.title.replace(/[\\/:*?"<>|]/g, '_') || 'interactive-courseware'}.html`;
    const blob = new Blob([coursewareArtifact.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleOpenPreview = () => {
    if (!coursewareArtifact) return;
    const blob = new Blob([coursewareArtifact.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  };

  const steps: Array<{ id: Step; title: string; subtitle: string }> = [
    { id: 'request', title: '步骤 1', subtitle: '填写课件需求' },
    { id: 'outline', title: '步骤 2', subtitle: '确认课程大纲' },
    { id: 'courseware', title: '步骤 3', subtitle: '预览 & 导出课件' },
  ];

  const isStepDisabled = (step: Step): boolean => {
    if (step === 'outline') {
      return !outline || loadingOutline;
    }
    if (step === 'courseware') {
      return !coursewareArtifact || loadingCourseware;
    }
    return false;
  };

  const handleStepChange = (step: Step) => {
    if (isStepDisabled(step)) return;
    setActiveStep(step);
  };

  return (
    <div className="app">
      <header className="app__header">
      <div>
          <h1>交互式课件生成平台</h1>
          <p>输入需求，使用 Gemini 自动生成课程大纲与交互式 HTML 课件。</p>
      </div>
        <button className="secondary" type="button" onClick={handleReset}>
          重置
        </button>
      </header>

      <nav className="steps">
        {steps.map((step) => {
          const disabled = isStepDisabled(step.id);
          const isActive = activeStep === step.id;

          return (
            <button
              key={step.id}
              type="button"
              className={`steps__item${isActive ? ' steps__item--active' : ''}`}
              onClick={() => handleStepChange(step.id)}
              disabled={disabled}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="steps__title">{step.title}</span>
              <span className="steps__subtitle">{step.subtitle}</span>
            </button>
          );
        })}
      </nav>

      <main className="app__main">
        {activeStep === 'request' && (
          <section className="panel">
          <header className="panel__header">
            <h2>需求设置</h2>
            <span className="panel__subtitle">步骤 1 · 收集课件需求</span>
          </header>

          <div className="form-grid">
            <label>
              课件主题
              <input value={formState.topic} onChange={handleFormChange('topic')} placeholder="示例：人工智能基础概念" />
            </label>

            <label>
              教学对象
              <select value={audienceSelectValue} onChange={handleAudienceSelect}>
                <option value="">请选择教学对象</option>
                {AUDIENCE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
                <option value="__custom">自定义</option>
              </select>
              {audienceSelectValue === '__custom' && (
                <input
                  className="custom-input"
                  value={formState.audience}
                  onChange={handleFormChange('audience')}
                  placeholder="请输入教学对象"
                />
              )}
            </label>

            <label className="form-grid__full">
              教学目标 / 章节（可选，每行一条）
              <textarea value={formState.objectives} onChange={handleFormChange('objectives')} rows={4} placeholder="示例：了解 AI 的发展历程&#10;示例：掌握机器学习与深度学习的区别" />
              <span className="helper-text">已填写 {objectivesCount} 条</span>
            </label>
            <label>
              文案语气（可选）
              <input value={formState.tone} onChange={handleFormChange('tone')} placeholder="示例：鼓励式、轻松" />
            </label>

            <label>
              图片风格
              <select value={imageStyleSelectValue} onChange={handleImageStyleSelect}>
                <option value="">请选择图片风格（可选）</option>
                {IMAGE_STYLE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
                <option value="__custom">自定义</option>
              </select>
              {imageStyleSelectValue === '__custom' && (
                <input
                  className="custom-input"
                  value={formState.imageStyle}
                  onChange={handleFormChange('imageStyle')}
                  placeholder="请输入图片风格提示"
                />
              )}
            </label>

            <label className="form-grid__full">
              约束条件（可选，逐行填写）
              <textarea value={formState.constraints} onChange={handleFormChange('constraints')} rows={3} placeholder="示例：互动题需包含解析&#10;示例：每页最多 200 字" />
            </label>
          </div>

          <div className="interaction-selector">
            <span>互动题型（可选）</span>
            <div className="interaction-selector__options">
              {INTERACTION_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedInteractionTypes.includes(option.value)}
                    onChange={() => toggleInteractionType(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <button className="primary" type="button" onClick={handleGenerateOutline} disabled={loadingOutline}>
            {loadingOutline ? '生成大纲中...' : '生成课程大纲'}
          </button>

          {errorMessage && <p className="error-message">{errorMessage}</p>}
          </section>
        )}

        {activeStep === 'outline' && (
          <section className="panel">
          <header className="panel__header">
            <h2>课程大纲</h2>
            <span className="panel__subtitle">步骤 2 · 确认分页内容</span>
            <button className="link-button" type="button" onClick={() => setActiveStep('request')}>
              ← 返回需求设置
            </button>
          </header>

          {!outline && !loadingOutline && (
            <p className="placeholder-text">生成大纲后将在此展示，可在满意后继续生成课件。</p>
          )}

          {outline && (
            <div className="outline">
              <h3>{outline.title}</h3>
              <ol>
                {outline.sections.map((section) => (
                  <li key={section.id}>
                    <div className="outline__section">
                      <h4>{section.title}</h4>
                      <p>{section.summary}</p>
                      <div className="outline__meta">
                        {section.interactionHint && <span>互动建议：{section.interactionHint}</span>}
                        {section.assetsHint && <span>素材提示：{section.assetsHint}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <button className="primary" type="button" onClick={handleGenerateCourseware} disabled={loadingCourseware}>
                {loadingCourseware ? '生成课件中...' : '确认大纲并生成课件'}
              </button>
            </div>
          )}
        </section>
        )}

        {activeStep === 'courseware' && !courseware && (
          <section className="panel">
            <header className="panel__header">
              <h2>课件预览</h2>
              <span className="panel__subtitle">步骤 3 · 请先完成前序步骤</span>
              <button className="link-button" type="button" onClick={() => setActiveStep('outline')}>
                ← 返回课程大纲
              </button>
            </header>
            <p className="placeholder-text">请先生成课程大纲和课件，再查看预览。</p>
          </section>
        )}

        {activeStep === 'courseware' && courseware && (
          <section className="panel">
            <header className="panel__header">
              <h2>课件预览</h2>
              <span className="panel__subtitle">步骤 3 · 在线体验与导出</span>
              <button className="link-button" type="button" onClick={() => setActiveStep('outline')}>
                ← 返回课程大纲
              </button>
            </header>

            <div className="courseware">
              <header className="courseware__header">
                <div>
                  <h3>{courseware.title}</h3>
                  <p>
                    生成时间：{new Date(courseware.metadata.generatedAt).toLocaleString()} · 面向 {courseware.metadata.audience} · 目标{' '}
                    {courseware.metadata.objectives.join('、')}
                  </p>
                </div>
                <div className="courseware__actions">
                  <button className="secondary" type="button" onClick={handleOpenPreview}>
                    在新窗口预览
                  </button>
                  <button className="primary" type="button" onClick={handleDownloadHtml}>
                    下载 HTML 课件
                  </button>
                </div>
              </header>

              <div className="courseware__preview">
                <iframe title="互动课件预览" srcDoc={coursewareHtml} />
              </div>

              <details className="courseware__details">
                <summary>查看生成内容结构</summary>
                <div className="courseware__structure">
                  {courseware.sections.map((section) => (
                    <article key={section.id} className="courseware__section">
                      <div className="courseware__media">
                        <img src={section.image.url} alt={section.image.alt} />
                        <span className="caption">图片提示词：{section.image.prompt}</span>
                      </div>
                      <div className="courseware__content">
                        <h4>{section.title}</h4>
                        <div dangerouslySetInnerHTML={{ __html: section.body }} />
                        {section.interaction && (
                          <div className="interaction">
                            <h5>互动题：{section.interaction.question}</h5>
                            <ul>
                              {section.interaction.options.map((option) => (
                                <li key={option.id}>{option.label}</li>
                              ))}
                            </ul>
                            <p>
                              答案：
                              {section.interaction.answers
                                .map((answerId) => section.interaction?.options.find((option) => option.id === answerId)?.label)
                                .filter((label): label is string => Boolean(label))
                                .join('、') || '暂无'}
                            </p>
                            <p>解析：{section.interaction.explanation}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
