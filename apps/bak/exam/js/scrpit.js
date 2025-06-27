const questions = [
    {
        id: 1,
        score: 10,
        answer: true,
        content: "HTML 是一种标记语言。",
        explanation: "HTML 是一种用于创建网页的标记语言。"
    },
    {
        id: 2,
        score: 10,
        answer: false,
        content: "JavaScript 是一种编译型语言。",
        explanation: "JavaScript 是一种解释型语言。"
    }
    // 更多题目...
];

let currentQuestionIndex = 0;
let totalScore = 0;
let results = [];

function loadQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question-text').innerText = question.content;
    document.getElementById('feedback').innerText = '';
    document.getElementById('explanation').innerText = '';
    document.getElementById('true-btn').disabled = false;
    document.getElementById('false-btn').disabled = false;
}

function checkAnswer(userAnswer) {
    const question = questions[currentQuestionIndex];
    if (userAnswer === question.answer) {
        document.getElementById('feedback').innerText = '正确！';
        document.getElementById('feedback').style.color = 'green';
        totalScore += question.score;
        document.getElementById('score').innerText = totalScore;
        results.push({ id: question.id, result: '正确' });
    } else {
        document.getElementById('feedback').innerText = '错误！';
        document.getElementById('feedback').style.color = 'red';
        document.getElementById('explanation').innerText = question.explanation;
        results.push({ id: question.id, result: '错误' });
        document.getElementById('true-btn').disabled = true;
        document.getElementById('false-btn').disabled = true;
        setTimeout(() => {
            document.getElementById('true-btn').disabled = false;
            document.getElementById('false-btn').disabled = false;
        }, 3000);
    }
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        setTimeout(loadQuestion, 3000);
    } else {
        showResults();
    }
}

function showResults() {
    document.getElementById('question-container').style.display = 'none';
    document.getElementById('result-container').style.display = 'block';
    const resultList = document.getElementById('result-list');
    results.forEach(result => {
        const li = document.createElement('li');
        li.innerText = `题号: ${result.id}, 结果: ${result.result}`;
        resultList.appendChild(li);
    });
}

document.getElementById('true-btn').addEventListener('click', () => checkAnswer(true));
document.getElementById('false-btn').addEventListener('click', () => checkAnswer(false));

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        document.getElementById('true-btn').click();
    } else if (event.key === 'ArrowRight') {
        document.getElementById('false-btn').click();
    }
});

loadQuestion();
