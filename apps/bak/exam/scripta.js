// script.js
document.addEventListener('DOMContentLoaded', () => {
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let totalScore = 0;
    let showAnswer = false;
    let answerHistory = [];

    const loadQuestionsButton = document.getElementById('load-questions');
    const startTestButton = document.getElementById('start-test');
    const toggleShowAnswerButton = document.getElementById('toggle-show-answer');
    const questionContainer = document.getElementById('question-container');
    const questionNumber = document.getElementById('question-number');
    const questionType = document.getElementById('question-type');
    const questionScore = document.getElementById('question-score');
    const questionContent = document.getElementById('question-content');
    const answerInput = document.getElementById('answer-input');
    const submitAnswerButton = document.getElementById('submit-answer');
    const progressBar = document.getElementById('progress-bar');
    const resultContainer = document.getElementById('result-container');
    const resultList = document.getElementById('result-list');

    loadQuestionsButton.addEventListener('click', () => {
        // 模拟加载题库
        questions = [
            {
                type: '选择',
                score: 10,
                content: {
                    number: 1,
                    question: 'HTML的全称是什么？',
                    options: ['Hyper Text Markup Language', 'High Tech Markup Language'],
                    answer: 'Hyper Text Markup Language',
                    explanation: 'HTML stands for Hyper Text Markup Language.'
                }
            },
            {
                type: '判断',
                score: 5,
                content: {
                    number: 2,
                    question: 'CSS可以用来美化网页。',
                    options: ['正确', '错误'],
                    answer: '正确',
                    explanation: 'CSS (Cascading Style Sheets) is used to style and layout web pages.'
                }
            },
            // 更多题目...
        ];
        alert('题库已加载');
    });

    startTestButton.addEventListener('click', () => {
        if (questions.length === 0) {
            alert('请先加载题库');
            return;
        }
        currentQuestionIndex = 0;
        score = 0;
        totalScore = questions.reduce((sum, q) => sum + q.score, 0);
        answerHistory = [];
        progressBar.style.width = '0%';
        resultContainer.style.display = 'none';
        showNextQuestion();
    });

    toggleShowAnswerButton.addEventListener('click', () => {
        showAnswer = !showAnswer;
        toggleShowAnswerButton.textContent = showAnswer ? '隐藏解析' : '显示解析';
    });

    submitAnswerButton.addEventListener('click', submitAnswer);

    function showNextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            endTest();
            return;
        }

        const question = questions[currentQuestionIndex];
        questionNumber.textContent = `第 ${question.content.number} 题`;
        questionType.textContent = `[${question.type}]`;
        questionScore.textContent = `分值: ${question.score}`;
        questionContent.textContent = question.content.question;

        answerInput.innerHTML = '';
        if (question.type === '选择') {
            question.content.options.forEach(option => {
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'answer';
                radio.value = option;
                answerInput.appendChild(radio);
                answerInput.appendChild(document.createTextNode(option));
                answerInput.appendChild(document.createElement('br'));
            });
        } else if (question.type === '判断') {
            ['正确', '错误'].forEach(option => {
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'answer';
                radio.value = option;
                answerInput.appendChild(radio);
                answerInput.appendChild(document.createTextNode(option));
                answerInput.appendChild(document.createElement('br'));
            });
        } else if (question.type === '填空') {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = 'answer';
            answerInput.appendChild(input);
        } else if (question.type === '提交绘图') {
            // 绘图逻辑
            answerInput.textContent = '请在此处绘制答案';
        }
    }

    function submitAnswer() {
        let userAnswer;
        if (questions[currentQuestionIndex].type === '填空') {
            userAnswer = answerInput.querySelector('input').value.trim();
        } else {
            userAnswer = Array.from(answerInput.querySelectorAll('input:checked'))
                .map(input => input.value).join(', ');
        }

        const question = questions[currentQuestionIndex];
        const isCorrect = userAnswer === question.content.answer;

        answerHistory.push({
            question: question.content.question,
            userAnswer: userAnswer,
            correctAnswer: question.content.answer,
            explanation: question.content.explanation,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            score += question.score;
            progressBar.style.width = `${(score / totalScore * 100)}%`;
        } else {
            if (showAnswer) {
                setTimeout(() => {
                    currentQuestionIndex++;
                    showNextQuestion();
                }, 3000); // 默认3秒惩罚时间
            }
        }

        if (!showAnswer || isCorrect) {
            currentQuestionIndex++;
            showNextQuestion();
        } else {
            questionContent.textContent += `\n\n正确答案: ${question.content.answer}\n解析: ${question.content.explanation}`;
        }
    }

    function endTest() {
        questionContainer.style.display = 'none';
        resultContainer.style.display = 'block';

        resultList.innerHTML = '';
        answerHistory.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `题目: ${entry.question}\n您的答案: ${entry.userAnswer}\n正确答案: ${entry.correctAnswer}\n解析: ${entry.explanation}`;
            resultList.appendChild(li);
        });

        const totalScoreElement = document.createElement('p');
        totalScoreElement.textContent = `总得分: ${score}/${totalScore}`;
        resultContainer.appendChild(totalScoreElement);

        // 保存到浏览器缓存
        localStorage.setItem('answerHistory', JSON.stringify(answerHistory));
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            currentQuestionIndex++;
            showNextQuestion();
        } else if (event.key === 'Enter') {
            submitAnswer();
        }
    });
});
