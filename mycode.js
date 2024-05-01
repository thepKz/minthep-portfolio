window.onload = function () { // Khi minh Scroll thi no moi xuan hien
    // Định cấu hình ScrollReveal
    ScrollReveal().reveal('.box-bottom', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 2500, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'bottom', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '500px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease-in-out', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-left', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 2500, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'left', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '500px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-top', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 2500, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'top', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '500px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-right', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 2500, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'right', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '500px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    // Lấy ra tất cả các đoạn p trong phần About Me
    var paragraphs = document.querySelectorAll('.about-me p');

    // Khởi tạo ScrollReveal với các tùy chọn phù hợp cho từng đoạn p
    paragraphs.forEach(function(paragraph, index) {
        ScrollReveal().reveal(paragraph, {
            delay: 100 * index,  // Mỗi đoạn p sẽ xuất hiện sau 200ms so với đoạn trước
            distance: '500px',   // Khoảng cách di chuyển
            duration: 2500,     // Thời gian thực hiện hiệu ứng (ms)
            easing: 'ease', // Kiểu easing
            origin: 'right',   // Hướng xuất hiện
            reset: true         // Đặt lại hiệu ứng sau mỗi lần xuất hiện
        });
    });
};

////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
    const profileImgContainer = document.querySelector('.profile-img');

    // Nếu bạn có nhiều hơn một hình ảnh, bạn có thể cần chỉnh sửa selector hoặc sử dụng vòng lặp để thêm sự kiện cho từng hình ảnh.

    profileImgContainer.addEventListener('mouseenter', function() {
        // Hiển thị tiếng Nhật
        this.style.setProperty('--after-content-japanese', '"美しい空に心が溶ける\\A現実と夢の間で揺れる\\Aただ、その美しさに惹かれるだけ"');
        this.classList.add('show-japanese');
        
        // Đặt hẹn giờ để đổi thành tiếng Anh sau 5 giây
        setTimeout(() => {
            this.style.setProperty('font-size', '0.9em');
            this.style.setProperty('--after-content-japanese', '"My heart melts in the beautiful sky\\A Between reality and dreams, I sway\\A Just drawn to its beauty alone"');
            // Hủy biến custom sau khi đã hiển thị tiếng Anh
        }, 4000);

        setTimeout(()=>{
            this.style.setProperty('font-size', '0.55em');
            this.style.setProperty('--after-content-japanese', '"Trái tim tôi tan chảy trong bầu trời đẹp\\AGiữa hiện thực và giấc mơ, tôi lung lay \\A Chỉ đơn giản là bị cuốn hút bởi vẻ đẹp duy nhất của nó"');
        },8000);
    });

    profileImgContainer.addEventListener('mouseleave', function() {
        // Xóa nội dung ngay lập tức khi không hover nữa
        this.style.setProperty('font-size', '1em');
        this.classList.remove('show-japanese');
        this.style.removeProperty('--after-content-japanese');
    });
});

// 404 not found
function checkScreenSize() {
    if (window.innerWidth < 1000) {
        document.getElementById('content').style.display = 'none';
        document.getElementById('error-404').style.display = 'block';
    } else {
        document.getElementById('content').style.display = 'block';
        document.getElementById('error-404').style.display = 'none';
    }
}

// Gọi hàm kiểm tra kích thước màn hình khi trang được tải và cửa sổ được thay đổi kích thước
window.addEventListener('load', checkScreenSize);
window.addEventListener('resize', checkScreenSize);



//////////////////////////////////////////
document.addEventListener('DOMContentLoaded', function() {
    var links = document.querySelectorAll('.Container .menu a[href^="#"]');
    
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(e) {
            e.preventDefault();
            var targetId = this.getAttribute('href').substring(1);
            var targetElement = document.getElementById(targetId);
            if (targetElement) {
                var container = document.querySelector('.Container');
                var offset = targetElement.offsetTop - container.offsetTop;
                container.scrollTo({
                    top: offset,
                    behavior: 'smooth'
                });
            }
        });
    }
});