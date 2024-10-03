// Khai báo biến toàn cục
let recognition;
let currentWord;
let shuffledLessons = [];
let currentQuestionIndex = 0;
const totalQuestions = 10; // Số câu hỏi trong một phiên
let isJapanese = true; // Biến để theo dõi ngôn ngữ hiện tại

// Mảng chứa các bài học
const lessons = [
    { japanese: "おなまえは。", romaji: "O-namae wa?", vietnamese: "Tên bạn là gì?", type: "introduction" },
    { japanese: "なんさいですか？", romaji: "Nansai desu ka?", vietnamese: "Bạn bao nhiêu tuổi?", type: "age" },
    { japanese: "おくにはどちらですか？", romaji: "Okuni wa dochira desu ka?", vietnamese: "Bạn đến từ quốc gia nào?", type: "origin" },
    { japanese: "おしごとは なんですか？", romaji: "Oshigoto wa nan desu ka?", vietnamese: "Công việc của bạn là gì?", type: "job" },
    { japanese: "しゅみは なんですか？", romaji: "Shumi wa nan desu ka?", vietnamese: "Sở thích của bạn là gì?", type: "hobby" },
    { japanese: "いまなんじですか？", romaji: "Ima nanji desu ka?", vietnamese: "Bây giờ là mấy giờ?", type: "time" },
    { japanese: "あなたの たんじょうびは いつですか？", romaji: "Anata no tanjoubi wa itsu desu ka?", vietnamese: "Sinh nhật của bạn là khi nào?", type: "birthday" },
    { japanese: "にほんごの クラスは なんじから なんじまでですか？", romaji: "Nihongo no kurasu wa nanji kara nanji made desu ka?", vietnamese: "Lớp tiếng Nhật của bạn từ mấy giờ đến mấy giờ?", type: "class_time" },
];

// Hàm xáo trộn mảng
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Hàm thiết lập nhận dạng giọng nói
function setupSpeechRecognition() {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        console.error('Trình duyệt không hỗ trợ nhận dạng giọng nói');
        document.getElementById('startListening').disabled = true;
        document.getElementById('startListening').innerText = 'Không hỗ trợ nhận dạng giọng nói';
        return;
    }

    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Thêm nút chuyển đổi ngôn ngữ
    const toggleLanguageButton = document.createElement('button');
    toggleLanguageButton.innerText = 'Trả lời bằng tiếng việt để Gemix hướng dẫn';
    toggleLanguageButton.className = 'language-toggle';
    toggleLanguageButton.onclick = toggleLanguage;
    document.querySelector('.speak-container').appendChild(toggleLanguageButton);

    recognition.onresult = function(event) {
        const speechResult = event.results[0][0].transcript;
        document.getElementById('result').innerHTML = `<p><strong>Bạn nói:</strong> ${speechResult}</p>`;
        checkPronunciation(speechResult);
    };

    recognition.onerror = function(event) {
        console.error('Lỗi nhận diện giọng nói:', event.error);
    };

    recognition.onend = function() {
        document.getElementById('startListening').style.display = 'inline-block';
        document.getElementById('stopListening').style.display = 'none';
    };

    setRecognitionLanguage();
}

function setRecognitionLanguage() {
    recognition.lang = isJapanese ? 'ja-JP' : 'vi-VN';
}

function toggleLanguage() {
    isJapanese = !isJapanese;
    setRecognitionLanguage();
    const toggleLanguageButton = document.querySelector('.speak-container button:last-child');
    toggleLanguageButton.innerText = isJapanese ? 'Trả lời bằng tiếng việt để Gemix hướng dẫn' : 'Click để chuyển lại trả lời bằng tiếng Nhật';
}

function startListening() {
    setRecognitionLanguage(); // Đảm bảo ngôn ngữ được cập nhật trước khi bắt đầu
    recognition.start();
    document.getElementById('result').innerHTML = '<p>Đang lắng nghe...</p>';
    document.getElementById('startListening').style.display = 'none';
    document.getElementById('stopListening').style.display = 'inline-block';
}

// Thêm hàm stopListening
function stopListening() {
    if (recognition) {
        recognition.stop();
        document.getElementById('result').textContent = 'Đã dừng lắng nghe.';
        document.getElementById('startListening').style.display = 'inline-block';
        document.getElementById('stopListening').style.display = 'none';
    }
}

// Hàm kiểm tra phát âm
async function checkPronunciation(spokenWord) {
    const prompt = `
    Hãy đóng vai trò là một giáo viên tiếng Nhật tên là Gemix đang đánh giá câu trả lời của học sinh. Xưng hô với học sinh là "bạn", nhận xét vui vẻ, dễ hiểu, dễ nghe. Nếu có lỗi, hãy chỉ ra lỗi và cách sửa.

    Câu hỏi tiếng Nhật: ${currentWord.japanese}
    Nghĩa tiếng Việt: ${currentWord.vietnamese}
    Phiên âm romaji: ${currentWord.romaji}
    Câu trả lời của học sinh: ${spokenWord}

    Lưu ý: 
    - Vui lòng viết không in đậm
    - Câu hỏi có thể liên quan đến thông tin cá nhân, thời gian, sở thích, nghề nghiệp, quốc tịch, v.v.
    - Câu trả lời có thể bằng tiếng Nhật hoặc tiếng Việt.
    - Nếu trả lời bằng tiếng Việt, hãy đánh giá nội dung và hướng dẫn cách nói bằng tiếng Nhật.
    - Nếu trả lời bằng tiếng Nhật, đánh giá cả nội dung và phát âm.
    - Chú ý đến cấu trúc câu, từ vựng và trợ từ trong câu trả lời tiếng Nhật.
    - Lưu ý từ kanji hạn chế viết (trong khuôn khổ N5 thì viết bằng hiragana).

    Câu hỏi 1: Câu trả lời của học sinh có đúng với câu hỏi không?
    Trả lời 1: [Đúng/Gần đúng/Không đúng]

    Câu hỏi 2: Nhận xét về câu trả lời của học sinh, cách phát âm, nếu lạc với đáp thì nhận xét như nào và cách sửa lỗi nếu có?
    Trả lời 2: [Nhận xét mức chuẩn chỉ bằng tiếng Việt. Nếu có lỗi bao gồm lỗi phát âm, chỉ ra lỗi và cách sửa. Nếu trả lời bằng tiếng Việt, hướng dẫn cách nói bằng tiếng Nhật.(kanji được viết bằng hiragana)]

    Câu hỏi 3: Cho điểm từ 1 đến 10?
    Trả lời 3: [Điểm số từ 1-10]

    Hãy trả lời theo định dạng sau:
    ĐÁNH GIÁ ĐỘ CHÍNH XÁC: [Trả lời 1]
    NHẬN XÉT: [Trả lời 2]
    ĐIỂM: [Trả lời 3]
    `;

    try {
        // Gọi API Gemini để đánh giá phát âm
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDp2aAZ6IiFFKDbddhPnHcrGYuSMvVPBGk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const result = data.candidates[0]?.content?.parts[0]?.text;

        if (!result) {
            throw new Error('Không nhận được kết quả hợp lệ từ API');
        }

        console.log("Kết quả từ API:", result); // Để debug

        // Xử lý kết quả
        const lines = result.split('\n').filter(line => line.trim() !== '');
        let accuracy = 'Không xác định';
        let comment = 'Không có nhận xét';
        let score = 0;

        lines.forEach(line => {
            if (line.includes('ĐÁNH GIÁ ĐỘ CHÍNH XÁC:')) {
                accuracy = line.replace('ĐÁNH GIÁ ĐỘ CHÍNH XÁC:', '').trim();
            } else if (line.includes('NHẬN XÉT:')) {
                comment = line.replace('NHẬN XÉT:', '').trim();
            } else if (line.includes('ĐIỂM:')) {
                score = parseInt(line.replace('ĐIỂM:', '').trim()) || 0;
            }
        });

        console.log("Spoken Word:", spokenWord);
        console.log("Accuracy:", accuracy);
        console.log("Comment:", comment);
        console.log("Score:", score);

        // Xác định màu sắc và đánh giá dựa trên độ chính xác
        let scoreColor, accuracyText, resultClass;
        if (accuracy.toLowerCase().includes('đúng')) {
            scoreColor = 'green';
            accuracyText = 'Chính xác';
            resultClass = 'correct';
        } else if (accuracy.toLowerCase().includes('gần đúng')) {
            scoreColor = 'orange';
            accuracyText = 'Gần đúng';
            resultClass = 'near-correct';
        } else {
            scoreColor = 'red';
            accuracyText = 'Chưa chính xác';
            resultClass = 'incorrect';
        }

        // Tạo HTML với màu sắc và định dạng
        const resultHTML = `
            <p><strong>Bạn nói:</strong> ${spokenWord}</p>
            <p><strong style="color: #4a90e2;">ĐÁNH GIÁ ĐỘ CHÍNH XÁC:</strong> 
               <span style="color: ${scoreColor};">${accuracyText}</span></p>
            <p><strong style="color: #4a90e2;">NHẬN XÉT:</strong> ${comment}</p>
            <p><strong style="color: #4a90e2;">ĐIỂM:</strong> 
               <span style="font-size: 1.2em; font-weight: bold; color: ${scoreColor};">
               ${score}/10
               </span></p>
        `;

        const resultContainer = document.getElementById('result');
        resultContainer.innerHTML = resultHTML;
        resultContainer.className = 'result-container ' + resultClass;

        // Cập nhật tiến trình
        currentQuestionIndex++;
        updateProgressBar();

        // Kiểm tra nếu đã hoàn thành tất cả câu hỏi
        if (currentQuestionIndex >= totalQuestions) {
            endSession();
        } else {
            // Tải câu hỏi tiếp theo sau 3 giây
            // DISABLE FOR TESTING
            // setTimeout(loadPracticeWord, 3000);
        }
    } catch (error) {
        console.error('Lỗi khi gọi API Gemini:', error);
        console.error('Chi tiết lỗi:', error.message);
        document.getElementById('result').innerHTML = `<p class="error">Có lỗi xảy ra khi đánh giá phát âm: ${error.message}</p>`;
    }
}

// Hàm tải từ luyện tập
function loadPracticeWord() {
    if (shuffledLessons.length === 0) {
        shuffledLessons = [...lessons];
        shuffleArray(shuffledLessons);
    }

    currentWord = shuffledLessons.pop();

    // Hiển thị từ luyện tập
    document.getElementById('wordToSay').innerHTML = `
        <p class="japanese">${currentWord.japanese}</p>
        <p class="romaji">${currentWord.romaji}</p>
        <p class="vietnamese">${currentWord.vietnamese}</p>
    `;

    // Reset kết quả
    document.getElementById('result').innerHTML = '';
    document.getElementById('result').className = 'result-container';

    // Reset nút bắt đầu nói
    document.getElementById('startListening').disabled = false;
    document.getElementById('startListening').innerText = 'Bắt đầu trả lời';
}

function speakWord() {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(currentWord.japanese);
        utterance.lang = 'ja-JP';
        speechSynthesis.speak(utterance);
    } else {
        console.error('Trình duyệt không hỗ trợ Text-to-Speech');
        alert('Trình duyệt của bạn không hỗ trợ chức năng phát âm.');
    }
}

// Hàm tải bài học
function loadLesson() {
    console.log("Đang tải bài học...");
    shuffledLessons = [...lessons];
    shuffleArray(shuffledLessons);
}

// Hàm cập nhật thanh tiến trình
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const progress = (currentQuestionIndex / totalQuestions) * 100;
    progressBar.style.width = `${progress}%`;
}

// Hàm kết th��c phiên luyện tập
function endSession() {
    document.getElementById('wordToSay').innerHTML = '<p>Bạn đã hoàn thành phiên luyện tập!</p>';
    document.getElementById('startListening').disabled = true;
    document.getElementById('startListening').innerText = 'Đã hoàn thành';
    // Có thể thêm logic để hiển thị tổng kết, điểm số, v.v.
}

// Khởi tạo khi trang web được tải
window.onload = function () {
    loadLesson();
    setupSpeechRecognition();
    loadPracticeWord();
    updateProgressBar();

    document.getElementById('startListening').addEventListener('click', startListening);
    document.getElementById('stopListening').addEventListener('click', stopListening);
    document.getElementById('listenButton').addEventListener('click', speakWord);
    document.getElementById('changeWordButton').addEventListener('click', loadPracticeWord);
};