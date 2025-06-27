// script.js
document.addEventListener('DOMContentLoaded', () => {
    const showSolutionsCheckbox = document.getElementById('show-solutions-checkbox');
    const loadQuestionsBtn = document.getElementById('load-questions-btn');
    const numQuestionsInput = document.getElementById('num-questions-input');
    const startTestBtn = document.getElementById('start-test-btn');
    const questionContainer = document.getElementById('question-container');
    const resultsSection = document.getElementById('results');
    const currentScoreDisplay = document.getElementById('current-score');
    const progressBar = document.getElementById('progress-bar');
    const questionTitle = document.getElementById('question-title');
    const questionContent = document.getElementById('question-content');
    const optionsContainer = document.getElementById('options');
    const fillInAnswerInput = document.getElementById('fill-in-answer');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const solutionDisplay = document.getElementById('solution');
    const prevQuestionBtn = document.getElementById('prev-question-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const resultsList = document.getElementById('results-list');

    let questions = [];
    let currentQuestionIndex = 0;
    let currentScore = 0;
    let totalScore = 0;
    let showSolutions = false;
    let answerHistory = [];

    // 加载题库
    loadQuestionsBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        questions = JSON.parse(e.target.result);
                        totalScore = questions.reduce((sum, category) => sum + category.questions.reduce((catSum, q) => catSum + q.score, 0), 0);
                        progressBar.max = totalScore;
                    } catch (error) {
                        alert('题库格式错误，请检查JSON文件');
                    }
                };
                reader.readAsText(file);
            }
        };
        fileInput.click();
    });

    // 开始答题
    startTestBtn.addEventListener('click', () => {
        if (!questions.length) {
            alert('请先导入题库');
            return;
        }

        showSolutions = showSolutionsCheckbox.checked;
        const numQuestions = parseInt(numQuestionsInput.value, 10);
        if (isNaN(numQuestions) || numQuestions <= 0) {
            alert('请输入有效的题目数量');
            return;
        }

        // 随机抽取题目
        const allQuestions = questions.flatMap(category => category.questions);
        const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
        questions = [{ questions: shuffledQuestions.slice(0, numQuestions) }];

        currentQuestionIndex = 0;
        currentScore = 0;
        answerHistory = [];
        questionContainer.style.display = 'block';
        resultsSection.style.display = 'none';
        loadQuestion();
    });

    // 加载当前题目
    function loadQuestion() {
        const question = questions[0].questions[currentQuestionIndex];
        questionTitle.textContent = `第 ${currentQuestionIndex + 1} 题`;
        questionContent.textContent = question.content;

        optionsContainer.innerHTML = '';
        fillInAnswerInput.style.display = 'none';

        switch (question.type) {
            case '选择':
                question.options.forEach((option, index) => {
                    const label = document.createElement('label');
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'answer';
                    radio.value = option;
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(option));
                    optionsContainer.appendChild(label);
                });
                break;
            case '填空':
                fillInAnswerInput.style.display = 'inline-block';
                break;
            case '判断':
                ['正确', '错误'].forEach(option => {
                    const label = document.createElement('label');
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'answer';
                    radio.value = option;
                    label.appendChild(radio);
                    label.appendChild(document.createTextNode(option));
                    optionsContainer.appendChild(label);
                });
                break;
        }

        solutionDisplay.style.display = 'none';
    }

    // 提交答案
    submitAnswerBtn.addEventListener('click', () => {
        const question = questions[0].questions[currentQuestionIndex];
        let userAnswer;
        if (question.type === '填空') {
            userAnswer = fillInAnswerInput.value.trim();
        } else {
            const selectedOption = document.querySelector('input[name="answer"]:checked');
            if (!selectedOption) {
                alert('请选择一个答案');
                return;
            }
            userAnswer = selectedOption.value;
        }

        const isCorrect = userAnswer === question.answer;
        answerHistory.push({ questionIndex: currentQuestionIndex, userAnswer, isCorrect });

        if (isCorrect) {
            currentScore += question.score;
            progressBar.value += question.score;
        } else if (showSolutions) {
            setTimeout(() => {
                loadQuestion();
            }, 3000);
        }

        currentScoreDisplay.textContent = currentScore;
        if (showSolutions) {
            solutionDisplay.textContent = `解析: ${question.explanation}`;
            solutionDisplay.style.display = 'block';
        }

        if (currentQuestionIndex === questions[0].questions.length - 1) {
            endTest();
        } else {
            currentQuestionIndex++;
            loadQuestion();
        }
    });

    // 上一题
    prevQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        }
    });

    // 下一题
    nextQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions[0].questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
        }
    });

    // 结束答题
    function endTest() {
        questionContainer.style.display = 'none';
        resultsSection.style.display = 'block';
        resultsList.innerHTML = '';

        answerHistory.forEach(({ questionIndex, userAnswer, isCorrect }) => {
            const question = questions[0].questions[questionIndex];
            const li = document.createElement('li');
            li.textContent = `第 ${questionIndex + 1} 题: ${question.content}\n您的答案: ${userAnswer}\n${isCorrect ? '正确' : '错误'}\n解析: ${question.explanation}`;
            resultsList.appendChild(li);
        });
    }

    // 快捷键控制
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            prevQuestionBtn.click();
        } else if (event.key === 'ArrowRight') {
            nextQuestionBtn.click();
        } else if (event.key === 'Enter') {
            submitAnswerBtn.click();
        }
    });
});
