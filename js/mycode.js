window.onload = function () { // Khi minh Scroll thi no moi xuan hien
    // Định cấu hình ScrollReveal
    ScrollReveal().reveal('.box-bottom', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 1700, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'bottom', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '150px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease-in-out', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-left', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 1700, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'left', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '150px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-top', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 1700, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'top', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '150px', // Khoảng cách mà phần tử di chuyển (pixels)
        easing: 'ease', // Kiểu chuyển động (ease, ease-in, ease-out, ease-in-out)
        reset: true // Thiết lập lại hiệu ứng sau mỗi lần xuất hiện
    });
    ScrollReveal().reveal('.box-right', { // Áp dụng hiệu ứng cho các phần tử có class 'box'
        delay: 150, // Khoảng thời gian chờ trước khi hiệu ứng xuất hiện (milliseconds)
        duration: 1700, // Thời gian thực hiện hiệu ứng (milliseconds)
        origin: 'right', // Nơi mà phần tử xuất hiện từ (top, right, bottom, left)
        distance: '150px', // Khoảng cách mà phần tử di chuyển (pixels)
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

    // Ở đây thiết lập lại hiệu ứng cho phần tử có class 'profile-img'
    // Bởi vì dính nhiều bugs quá, nên set --after-content-japanese thay đổi 4 ngôn ngữ dựa trên var này luôn


    profileImgContainer.addEventListener('mouseenter', function() {
        // Hiển thị tiếng Nhật
        this.style.setProperty('--after-content-japanese', '"美しい空に心が溶ける\\A現実と夢の間で揺れる\\Aただ、その美しさに惹かれるだけ"');
        this.classList.add('show-japanese');
        console.log("Run okay japan");

        // Hiện thị tiếng Hàn
        setTimeout(() => {
            this.style.setProperty('font-size', '0.9em');
            this.style.setProperty('--after-content-japanese', '"아름다운 하늘에 마음이 녹다\\A 현실과 꿈의 사이에서 흔들리다\\A 그저, 그 아름다움에 끌리다"');
        }, 4000);
        
        // Đặt hẹn giờ để đổi thành tiếng Anh sau 4 giây
        setTimeout(() => {
            this.style.setProperty('font-size', '0.9em');
            this.style.setProperty('--after-content-japanese', '"My heart melts in the beautiful sky\\A Between reality and dreams, I sway\\A Just drawn to its beauty alone"');
        }, 8000);

        setTimeout(()=>{
            this.style.setProperty('font-size', '0.55em');
            this.style.setProperty('--after-content-japanese', '"Trái tim tôi tan chảy trong bầu trời đẹp\\AGiữa hiện thực và giấc mơ, tôi lung lay \\A Chỉ đơn giản là bị cuốn hút bởi vẻ đẹp duy nhất của nó"');
        },12000);
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
    if (window.innerWidth < 1200) {
        document.getElementById('content').style.display = 'none';
        document.getElementById('error-404').style.display = 'block';
        document.getElementById('wonyoung-background').style.display = 'none';
    } else {
        document.getElementById('content').style.display = 'block';
        document.getElementById('error-404').style.display = 'none';
        document.getElementById('wonyoung-background').style.display = 'block';
    }
}

// Gọi hàm kiểm tra kích thước màn hình khi trang được tải và cửa sổ được thay đổi kích thước
window.addEventListener('load', checkScreenSize);
window.addEventListener('resize', checkScreenSize);



//////////////////////////////////////////
// dùng để chạy tới điểm ở trên menu
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

// Set cursor đầu
 var cursor = document.querySelector('.div-cursor');
 var img_circle = document.querySelector('#profile-img');

img_circle.addEventListener('mouseenter', function() {
    cursor.style.display = 'none';
});
// header js


/**
 * Sử dụng sự kiện scroll để kiểm tra vị trí cuốn của người dùng trên trang web.
 * Nếu vị trí cuốn lớn hơn chiều cao của thanh điều hướng, thì sẽ thêm class 'scrolled' vào thanh điều hướng.
 * Ngược lại, nếu vị trí cuốn nhỏ hơn hoặc bằng chiều cao của thanh điều hướng, thì sẽ xóa class 'scrolled' khỏi thanh điều hướng.
 */

