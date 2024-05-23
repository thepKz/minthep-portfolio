document.addEventListener('DOMContentLoaded', function () {
    const table = document.getElementById('vocabularyTable');
    const flashcardContainer = document.getElementById('flashcardContainer');
    const shuffleButton = document.getElementById('shuffleButton');
    shuffleButton.addEventListener('click', shuffleCards);
    const vocabularyData = Array.from(table.querySelectorAll('tbody tr')).map(row => ({
        word: row.cells[0].textContent,
        meaning: row.cells[1].textContent
    }));

    // Tạo flashcards và thêm vào container
    const cards = vocabularyData.map(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
        <div class="card-front">${item.word}</div>
        <div class="card-back">${item.meaning}</div>
      `;
        flashcardContainer.appendChild(card);

        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            const shuffleButton = document.getElementById('shuffleButton');
            if (!shuffleButton) {
                createShuffleButton();
            }
        });

        return card;
    });

    // Hàm tạo nút shuffle (không thay đổi)
    function createShuffleButton() { /* ... (giữ nguyên code) ... */ }

    // Hàm xáo trộn flashcards (đã sửa)
    function shuffleCards() {
        const shuffledCards = cards.slice(); // Tạo một bản sao mới của mảng cards
        for (let i = shuffledCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]]; // Hoán đổi vị trí
        }

        flashcardContainer.innerHTML = ''; // Xóa nội dung hiện tại của flashcardContainer

        shuffledCards.forEach(card => {
            flashcardContainer.appendChild(card); // Thêm lại các thẻ đã xáo trộn
        });
    }// Tạo flashcards và thêm vào container
    vocabularyData.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
        <div class="card-front">${item.word}</div>
        <div class="card-back">${item.meaning}</div>
      `;
        flashcardContainer.appendChild(card);

        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    });

    // Xử lý nút "Chế độ Flashcard"
    const flashcardModeButton = document.getElementById('flashcardModeButton');
    flashcardModeButton.addEventListener('click', () => {
        shuffleButton.style.display = 'flex';
        flashcardContainer.style.display = 'flex';
        table.style.display = 'none';

    });

    // Xử lý nút "Chế độ Bảng"
    const tableModeButton = document.getElementById('tableModeButton');
    tableModeButton.addEventListener('click', () => {
        table.style.display = 'table';
        flashcardContainer.style.display = 'none';
        shuffleButton.style.display = 'none';
    });

    // Xử lý nút "Tắt"
    const offModeButton = document.getElementById('offModeButton');
    offModeButton.addEventListener('click', () => {
        table.style.display = 'none';
        flashcardContainer.style.display = 'none';
        shuffleButton.style.display = 'none';
    });
});


