import type { Courseware, CoursewareSection, InteractionBlock } from '../types';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanSectionBody = (body: string, title: string): string => {
  if (!body) return body;
  let cleaned = body;

  if (title) {
    const titleParagraphPattern = new RegExp(`<p[^>]*>\\s*${escapeRegExp(title)}\\s*</p>`, 'gi');
    cleaned = cleaned.replace(titleParagraphPattern, '');
    const titleHeadingPattern = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegExp(title)}\\s*</h[1-6]>`, 'gi');
    cleaned = cleaned.replace(titleHeadingPattern, '');
  }

  cleaned = cleaned.replace(/<p[^>]*>\s*教学对象[:：][\s\S]*?<\/p>/gi, '');
  cleaned = cleaned.replace(/<h[1-6][^>]*>\s*教学对象[:：][\s\S]*?<\/h[1-6]>/gi, '');
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');

  return cleaned;
};

const renderInteraction = (interaction: InteractionBlock, sectionId: string): string => {
  const inputType = interaction.type === 'multi' ? 'checkbox' : 'radio';
  const nameAttr = `q-${sectionId}`;

  const options = interaction.options
    .map((option) => {
      const isCorrect = interaction.answers.includes(option.id);
      return `
        <li class="interaction__option">
          <label class="option">
            <input
              type="${inputType}"
              name="${nameAttr}"
              value="${escapeHtml(option.id)}"
              data-correct="${isCorrect ? 'true' : 'false'}"
            />
            <span>${escapeHtml(option.label)}</span>
          </label>
        </li>
      `;
    })
    .join('\n');

  return `
    <div class="interaction" data-type="${interaction.type}">
      <div class="interaction__header">
        <h3>${escapeHtml(interaction.question)}</h3>
        <span class="interaction__points">+${interaction.scoring.points} 分</span>
      </div>
      <ul class="interaction__options">
        ${options}
      </ul>
      <div class="interaction__actions">
        <button type="button" class="interaction__submit">提交答案</button>
        <button type="button" class="interaction__reset">重置</button>
      </div>
      <div class="interaction__feedback"></div>
      <details class="interaction__analysis">
        <summary>答案与解析</summary>
        <p>${escapeHtml(interaction.explanation)}</p>
      </details>
    </div>
  `;
};

const renderSection = (section: CoursewareSection, index: number, total: number): string => {
  const bodyHtml = cleanSectionBody(section.body, section.title);
  const interactionHtml = section.interaction
    ? `
          <div class="slide__interaction">
            ${renderInteraction(section.interaction, section.id)}
          </div>`
    : '';

  return `
    <article class="slide" data-index="${index}">
      <div class="slide__inner">
        <div class="slide__media">
          <img src="${section.image.url}" alt="${escapeHtml(section.image.alt)}" />
        </div>
        <div class="slide__content">
          <header class="slide__header">
            <span class="slide__badge">场景 ${index + 1}/${total}</span>
          </header>
          <div class="slide__body">
            ${bodyHtml}
          </div>
        </div>
        ${interactionHtml}
      </div>
    </article>
  `;
};

export const renderCoursewareHtml = (courseware: Courseware): string => {
  const sectionsHtml = courseware.sections
    .map((section, index) => renderSection(section, index, courseware.sections.length))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(courseware.title)}</title>
    <style>
      :root {
        font-family: 'Songti SC', 'STSong', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #4b3b2a;
        background: #f3ebdd;
      }

      body {
        margin: 0;
        background:
          linear-gradient(135deg, rgba(250, 245, 235, 0.94), rgba(242, 226, 205, 0.92)),
          url('data:image/svg+xml,%3Csvg width="200" height="200" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 100h200M100 0v200" stroke="%23e7d9c5" stroke-width=".6" fill="none"/%3E%3C/svg%3E');
        background-size: cover, 200px 200px;
      }

      .app {
        max-width: 960px;
        margin: 40px auto 60px;
        padding: 0 20px 28px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .slides {
        position: relative;
        min-height: 520px;
      }

      .slide {
        display: none;
        animation: fadeIn 400ms ease;
      }

      .slide--active {
        display: block;
      }

      .slide__inner {
        display: grid;
        grid-template-columns: minmax(0, 400px) minmax(0, 1fr);
        gap: 28px;
        padding: 32px 34px;
        border-radius: 32px;
        background: linear-gradient(140deg, rgba(255, 255, 255, 0.96) 0%, rgba(251, 240, 224, 0.95) 52%, rgba(246, 226, 204, 0.94) 100%);
        box-shadow:
          0 24px 40px rgba(120, 88, 55, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.75);
        border: 1px solid rgba(222, 204, 176, 0.75);
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(3px);
      }

      .slide__inner::before {
        content: '';
        position: absolute;
        inset: 18px 26px auto auto;
        width: 200px;
        height: 200px;
        background: radial-gradient(ellipse at top right, rgba(231, 189, 130, 0.2), transparent 70%);
        pointer-events: none;
      }

      .slide__inner::after {
        content: '';
        position: absolute;
        inset: auto auto 18px 24px;
        width: 180px;
        height: 180px;
        background: radial-gradient(ellipse at bottom left, rgba(214, 170, 119, 0.18), transparent 75%);
        pointer-events: none;
      }

      .slide__media {
        display: flex;
        flex-direction: column;
        background: linear-gradient(150deg, rgba(246, 234, 217, 0.86), rgba(234, 215, 189, 0.72));
        padding: 18px 18px;
        border-radius: 24px;
        border: 1px solid rgba(206, 176, 137, 0.45);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.8),
          0 18px 38px rgba(182, 143, 102, 0.18);
        position: relative;
        backdrop-filter: blur(2px);
      }

      .slide__media img {
        width: 100%;
        height: clamp(260px, 28vw, 360px);
        object-fit: contain;
        border-radius: 24px;
        border: 1px solid rgba(212, 184, 144, 0.78);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.8),
          0 18px 32px rgba(118, 94, 70, 0.2);
        background: #fdf9f4;
      }

      .slide__content {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 22px 26px 28px;
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 238, 222, 0.86) 100%);
        border: 1px solid rgba(214, 188, 152, 0.6);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.85),
          0 14px 28px rgba(180, 141, 100, 0.12);
        position: relative;
      }

      .slide__content::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 28px;
        background: linear-gradient(135deg, rgba(211, 168, 117, 0.18), transparent 75%);
        opacity: 0.35;
        pointer-events: none;
      }

      .slide__content > * {
        position: relative;
        z-index: 1;
      }

      .slide__interaction {
        grid-column: 1 / -1;
        margin-top: 16px;
      }

      .slide__interaction .interaction {
        margin-top: 0;
      }

      .slide__header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: center;
      }

      .slide__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        letter-spacing: 0.18em;
        color: #7b532d;
        padding: 6px 18px;
        border-radius: 999px;
        background: rgba(223, 194, 150, 0.35);
        text-transform: uppercase;
        border: 1px solid rgba(202, 168, 120, 0.4);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
      }

      .slide__body {
        line-height: 1.7;
        color: #5a452f;
        font-size: 15px;
        background: rgba(255, 255, 255, 0.78);
        padding: 18px 22px;
        border-radius: 20px;
        border: 1px solid rgba(214, 188, 152, 0.55);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.82),
          0 8px 16px rgba(188, 150, 106, 0.1);
      }

      .slide__body p {
        margin: 0 0 14px;
        text-indent: 2em;
      }

      .slide__body p:first-of-type::first-letter {
        font-size: 1.8em;
        font-weight: 600;
        color: #b88042;
        margin-right: 4px;
      }

      .slide__body strong {
        color: #7d502d;
        font-weight: 600;
      }

      .interaction {
        margin: 0;
        padding: 18px 22px 24px;
        border-radius: 22px;
        border: 1px solid rgba(204, 174, 134, 0.55);
        background: linear-gradient(135deg, rgba(255, 249, 239, 0.94) 0%, rgba(246, 229, 206, 0.9) 100%);
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.82),
          0 12px 22px rgba(190, 150, 105, 0.15);
      }

      .interaction__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .interaction__header h3 {
        margin: 0;
        font-size: 18px;
        color: #6a4324;
        letter-spacing: 0.04em;
      }

      .interaction__points {
        font-size: 13px;
        color: #9a6c3b;
        background: rgba(223, 194, 150, 0.32);
        padding: 4px 12px;
        border-radius: 999px;
        border: 1px solid rgba(204, 168, 122, 0.35);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
      }

      .interaction__options {
        margin: 0;
        padding: 0;
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(214, 182, 138, 0.55);
        transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .option:hover {
        border-color: rgba(196, 154, 104, 0.75);
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(188, 145, 95, 0.16);
      }

      .option input {
        width: 18px;
        height: 18px;
        accent-color: #bf8544;
      }

      .option--correct {
        border-color: rgba(166, 186, 92, 0.75);
        background: rgba(243, 247, 225, 0.9);
      }

      .option--wrong {
        border-color: rgba(219, 132, 110, 0.7);
        background: rgba(251, 232, 224, 0.9);
      }

      .interaction__actions {
        display: flex;
        gap: 12px;
      }

      .interaction__submit,
      .interaction__reset {
        border: none;
        border-radius: 10px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 150ms ease, box-shadow 150ms ease;
      }

      .interaction__submit {
        background: linear-gradient(135deg, #d39f58, #b97834);
        color: #fffdfa;
        box-shadow: 0 16px 28px rgba(195, 138, 72, 0.22);
      }

      .interaction__reset {
        background: rgba(228, 210, 185, 0.72);
        color: #694526;
        border: 1px solid rgba(205, 168, 120, 0.55);
      }

      .interaction__submit:hover,
      .interaction__reset:hover {
        transform: translateY(-1px);
      }

      .interaction__feedback {
        font-size: 14px;
        color: #5c4026;
        min-height: 20px;
      }

      .interaction--correct .interaction__feedback {
        color: #6f892f;
      }

      .interaction--incorrect .interaction__feedback {
        color: #ba4f2f;
      }

      .interaction__analysis {
        font-size: 14px;
        color: #705030;
      }

      .app__topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 22px;
        border-radius: 18px;
        background: rgba(255, 250, 241, 0.94);
        border: 1px solid rgba(214, 186, 146, 0.5);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.7),
          0 12px 20px rgba(177, 140, 98, 0.14);
      }

      .topbar__nav {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .topbar__score {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #6b4d30;
        white-space: nowrap;
      }

      .score-value {
        font-weight: 600;
        color: #a1622c;
      }

      .nav-button {
        border: none;
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        background: linear-gradient(135deg, rgba(233, 206, 168, 0.96), rgba(210, 174, 132, 0.85));
        color: #5b3f25;
        cursor: pointer;
        transition: transform 150ms ease, box-shadow 150ms ease;
        border: 1px solid rgba(198, 162, 118, 0.6);
      }

      .nav-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 12px 20px rgba(177, 140, 98, 0.18);
      }

      .nav-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none;
      }

      .progress {
        font-size: 13px;
        color: #6b4d30;
        letter-spacing: 0.08em;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 960px) {
        .slide__inner {
          grid-template-columns: 1fr;
        }

        .slide__media img {
          height: auto;
        }
      }

      @media (max-width: 720px) {
        .app {
          padding: 24px 16px 36px;
        }

        .app__topbar {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
        }

        .topbar__nav {
          justify-content: space-between;
        }

        .topbar__score {
          justify-content: flex-end;
        }
      }
    </style>
  </head>
  <body>
    <div class="app" data-total-slides="${courseware.sections.length}">
      <header class="app__topbar">
        <div class="topbar__nav">
          <button class="nav-button" id="prevBtn">上一场景</button>
          <div class="progress" id="progress">场景 1 / ${courseware.sections.length}</div>
          <button class="nav-button" id="nextBtn">下一场景</button>
        </div>
        <div class="topbar__score">
          <span>互动完成度：</span>
          <span class="score-value" id="scoreValue">暂无互动题</span>
        </div>
      </header>
      <main class="slides">
        ${sectionsHtml}
      </main>
    </div>
    <script>
      (function () {
        const slides = Array.from(document.querySelectorAll('.slide'));
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const progressEl = document.getElementById('progress');
        const scoreValue = document.getElementById('scoreValue');
        let currentIndex = 0;
        let correctCount = 0;

        const interactions = Array.from(document.querySelectorAll('.interaction'));
        const totalQuizzes = interactions.length;

        const updateScoreboard = () => {
          if (!scoreValue) return;
          if (totalQuizzes === 0) {
            scoreValue.textContent = '暂无互动题';
            return;
          }
          scoreValue.textContent = \`\${correctCount} / \${totalQuizzes}\`;
        };

        const updateSlides = () => {
          slides.forEach((slide, index) => {
            slide.classList.toggle('slide--active', index === currentIndex);
          });
          if (prevBtn) prevBtn.disabled = currentIndex === 0;
          if (nextBtn) nextBtn.disabled = currentIndex === slides.length - 1;
          if (progressEl) progressEl.textContent = \`场景 \${currentIndex + 1} / \${slides.length}\`;
        };

        prevBtn?.addEventListener('click', () => {
          if (currentIndex > 0) {
            currentIndex -= 1;
            updateSlides();
          }
        });

        nextBtn?.addEventListener('click', () => {
          if (currentIndex < slides.length - 1) {
            currentIndex += 1;
            updateSlides();
          }
        });

        interactions.forEach((interaction) => {
          const submitBtn = interaction.querySelector('.interaction__submit');
          const resetBtn = interaction.querySelector('.interaction__reset');
          const feedback = interaction.querySelector('.interaction__feedback');
          const inputs = Array.from(interaction.querySelectorAll('input'));

          const getSelectedValues = () => inputs.filter((input) => input.checked).map((input) => input.value);
          const getCorrectValues = () => inputs.filter((input) => input.dataset.correct === 'true').map((input) => input.value);

          const markOptions = () => {
            inputs.forEach((input) => {
              const wrapper = input.parentElement;
              if (!wrapper) return;
              wrapper.classList.remove('option--correct', 'option--wrong');
              if (input.dataset.correct === 'true') {
                wrapper.classList.add('option--correct');
              } else if (input.checked) {
                wrapper.classList.add('option--wrong');
              }
            });
          };

          const clearMarks = () => {
            inputs.forEach((input) => {
              const wrapper = input.parentElement;
              if (!wrapper) return;
              wrapper.classList.remove('option--correct', 'option--wrong');
            });
          };

          submitBtn?.addEventListener('click', () => {
            const wasCorrect = interaction.classList.contains('interaction--correct');
            const selected = getSelectedValues();
            const correct = getCorrectValues();
            const isCorrect = selected.length === correct.length && selected.every((value) => correct.includes(value));

            interaction.classList.remove('interaction--correct', 'interaction--incorrect');
            clearMarks();

            if (isCorrect) {
              interaction.classList.add('interaction--correct');
              if (feedback) feedback.textContent = '回答正确！';
              markOptions();
            } else {
              interaction.classList.add('interaction--incorrect');
              if (feedback) feedback.textContent = '再思考一下，正确答案已高亮显示。';
              markOptions();
            }

            if (!wasCorrect && isCorrect) {
              correctCount += 1;
              updateScoreboard();
            } else if (wasCorrect && !isCorrect) {
              correctCount = Math.max(0, correctCount - 1);
              updateScoreboard();
            }
          });

          resetBtn?.addEventListener('click', () => {
            const wasCorrect = interaction.classList.contains('interaction--correct');
            interaction.classList.remove('interaction--correct', 'interaction--incorrect');
            if (feedback) feedback.textContent = '';
            inputs.forEach((input) => {
              input.checked = false;
            });
            clearMarks();
            if (wasCorrect) {
              correctCount = Math.max(0, correctCount - 1);
              updateScoreboard();
            }
          });
        });

        updateScoreboard();
        updateSlides();
      })();
    </script>
  </body>
</html>`;
};

