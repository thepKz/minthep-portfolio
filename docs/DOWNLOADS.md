# DOWNLOADS — inventory tệp tải về

> Kiểm kê mọi payload tải về của `minthep-portfolio`: đường dẫn chính xác, dung lượng byte,
> số trang (với PDF), và trang nào trỏ tới nó.
> Đo trực tiếp trên repo, nhánh `refactor/2026-relaunch`, ngày **2026-07-26**.

Base URL của site: `https://thepkz.github.io/minthep-portfolio/`
(GitHub Pages **project page** — mọi liên kết nội bộ phải là đường dẫn **tương đối**.)

**Nguyên tắc của tài liệu này**

- Không có file nào bị xoá, đổi tên hay di chuyển. Tài liệu này chỉ **thêm**.
- Mọi PDF giữ **nguyên byte**. Không nén lại, không tối ưu, không đổi metadata.
  (Ghostscript không có trên máy build → bước nén PDF bị bỏ hoàn toàn.)
- Hai file `.rar` giữ nguyên tại URL cũ. `.zip` được **thêm vào bên cạnh**, không thay thế.

---

## 1. Tổng quan

| Nhóm | Số file | Tổng dung lượng |
|---|---:|---:|
| `downloadfile/` (7 PDF + 1 RAR + 1 ZIP mới) | 9 | 25 109 498 B (23,94 MiB) |
| `blog/textblog-3/` (3 PDF + 1 RAR + 1 ZIP mới) | 5 | 24 077 428 B (22,96 MiB) |
| `blog/Speaking/**.mp3` | 23 | 3 829 824 B (3,65 MiB) |
| `img/0508.mp4` (không được tham chiếu) | 1 | 6 598 259 B (6,29 MiB) |
| **Tổng payload tải về** | **38** | **59 615 009 B (56,85 MiB)** |

PDF + archive (không tính media): **49 186 926 B** trước khi thêm ZIP;
hai file ZIP mới cộng thêm **7 002 674 B** vào repo, nhưng **0 B** vào bất kỳ lượt tải nào —
khách chỉ tải một trong hai định dạng.

---

## 2. `downloadfile/` — tài liệu tiếng Nhật (JPD113 / JPD123)

| Đường dẫn (tương đối từ repo root) | Bytes | Trang | Trang HTML trỏ tới | Nhãn trên trang |
|---|---:|---:|---|---|
| `downloadfile/JDP113SPK.pdf` | 406 524 | 4 | `blog/textblog-1.html` (dòng 315) | “File Hướng dẫn thi SPEAKING” |
| `downloadfile/JDP123SPK.pdf` | 166 562 | 3 | `blog/textblog-2.html` (dòng 56) | “File Hướng dẫn thi SPEAKING” |
| `downloadfile/grammar.pdf` | 9 957 946 | 63 | `blog/textblog-1.html` (dòng 319) | “File sách Grammar Dekiru Nihongo” |
| `downloadfile/gvocab.pdf` | 8 112 184 | 38 | `blog/textblog-1.html` (dòng 321) | “File sách Vocaburary Dekiru Nihongo” |
| `downloadfile/ghoctuvung.pdf` | 1 083 710 | 46 | `blog/textblog-1.html` (dòng 323) | “File từ vựng sách Dekiru Nihongo” |
| `downloadfile/SoDoTuDuy.pdf` | 587 576 | 1 | `blog/textblog-1.html` (dòng 329) | “File sơ đồ tư duy bài 1” |
| `downloadfile/jpd-script.pdf` | 4 031 539 | 206 | `blog/textblog-1.html` (dòng 331) | “File script phần nghe Dekiru” |
| `downloadfile/nguphap.rar` | 381 891 | — (7 ảnh JPG) | `blog/textblog-1.html` (dòng 326) | “File ngữ pháp (RAR, 373KB)” |
| `downloadfile/nguphap.zip` | **381 566** | — (7 ảnh JPG) | **chưa có** — xem §4 | *(mới, chưa được liên kết)* |

**Sai lệch dung lượng ghi trên trang so với thực tế** (`blog/textblog-1.html` tự ghi số MB trong
nhãn link — các số này đã lệch, nên sửa khi viết lại trang):

| File | Trang ghi | Thực tế |
|---|---|---|
| `grammar.pdf` | “9.49 mb” | 9 957 946 B = 9,50 MiB ✅ khớp |
| `gvocab.pdf` | “7.73 mb” | 8 112 184 B = 7,74 MiB ✅ khớp |
| `ghoctuvung.pdf` | “1.03 mb” | 1 083 710 B = 1,03 MiB ✅ khớp |
| `nguphap.rar` | “RAR, 373KB” | 381 891 B = 372,9 KiB ✅ khớp |
| `SoDoTuDuy.pdf` | “574KB” | 587 576 B = 573,8 KiB ✅ khớp |
| `jpd-script.pdf` | “3.84MB” | 4 031 539 B = 3,84 MiB ✅ khớp |

Các con số trên trang đều đúng — **giữ nguyên**, chỉ cần thêm dòng cho `.zip` mới.

### Payload ngoài repo (chỉ để tham chiếu, không do repo phục vụ)

| Link | Trang chứa | Ghi chú |
|---|---|---|
| `https://drive.google.com/file/d/1MLvq1RWvAXTsVs8m36yyN4lOaRkJu9L4/view` | `blog/textblog-1.html` (dòng 316–318) | “File Sách DEKIRU NIHONGO - Sơ Cấp (PDF, 67,8 MB)”. Nằm trên Google Drive cá nhân, **không** nằm trong repo. Rủi ro bản quyền giống §5 nhưng không thuộc phạm vi DMCA của repo này. |

---

## 3. `blog/textblog-3/` — tài liệu MAS291 (Xác suất Thống kê)

| Đường dẫn | Bytes | Trang | Trang HTML trỏ tới | Nhãn |
|---|---:|---:|---|---|
| `blog/textblog-3/Exercise Book MAS291  2021.pdf` | 1 241 074 | 48 | `blog/textblog-3.html` (dòng 129) | “Exercises” |
| `blog/textblog-3/Montgomery_Runger_Applied_Statistics_and_Probability_for_Engineers,_5th.pdf` | 9 378 109 | **792** | `blog/textblog-3.html` (dòng 139) | “Book” |
| `blog/textblog-3/SummaryMAS291.pdf` | 438 416 | 8 | `blog/textblog-3.html` (dòng 134) | “Formula Sheet” |
| `blog/textblog-3/slide.rar` | 6 398 721 | — (10 file `.ppt`) | `blog/textblog-3.html` (dòng 124) | “Slides” |
| `blog/textblog-3/slide.zip` | **6 621 108** | — (10 file `.ppt`) | **chưa có** — xem §4 | *(mới, chưa được liên kết)* |

---

## 4. ⚠️ Tên file “độc” — phải giữ nguyên từng byte

Ba tên file dưới đây chứa ký tự dễ bị công cụ tự động “dọn dẹp”. **Bất kỳ script nào chạm vào
hai thư mục này phải thao tác theo đường dẫn tuyệt đối, tuyệt đối không dùng glob-rename,
không `sed` tên file, không chuẩn hoá khoảng trắng.** Đổi tên = URL cũ 404 = mất traffic.

```text
# 1) DOUBLE SPACE giữa "MAS291" và "2021"  (0x20 0x20)
blog/textblog-3/Exercise Book MAS291  2021.pdf
                              ^^
# hexdump tên file:
# 4578 6572 6369 7365 2042 6f6f 6b20 4d41   Exercise Book MA
# 5332 3931 2020 3230 3231 2e70 6466        S291··2021.pdf
#              ^^^^ <- hai byte 0x20 liền nhau

# 2) COMMA sau "Engineers"  (0x2c)
blog/textblog-3/Montgomery_Runger_Applied_Statistics_and_Probability_for_Engineers,_5th.pdf
                                                                                ^
# hexdump đuôi tên file:
# 732c 5f35 7468 2e70 6466                  s,_5th.pdf
#   ^^ <- byte 0x2c (dấu phẩy)

# 3) DOUBLE SPACE giữa "of" và "Parameters" — nằm BÊN TRONG slide.rar / slide.zip
slide/Chapter 7_Point Estimation of  Parameters and Sampling Distributions.ppt
                                   ^^
```

Kiểm chứng lại bất cứ lúc nào:

```bash
cd /Users/minthep/Github/minthep-portfolio
ls blog/textblog-3/ | grep -E 'Exercise|Montgomery' | xxd
unzip -l blog/textblog-3/slide.zip | grep 'Chapter 7'
```

**Lưu ý khi viết lại `blog/textblog-3.html`:** hiện tại thuộc tính `href` chứa khoảng trắng thô,
chưa mã hoá:

```html
<a href="textblog-3/Exercise Book MAS291  2021.pdf" download …>
```

Trình duyệt tự mã hoá nên link vẫn chạy, nhưng dạng an toàn — và **bắt buộc phải giữ đúng hai
`%20` liên tiếp** — là:

```html
<a href="textblog-3/Exercise%20Book%20MAS291%20%202021.pdf" download …>
```

Chỉ một `%20` là 404. Đường dẫn phải **tương đối**, không bao giờ bắt đầu bằng `/`.

---

## 5. File `.zip` mới thêm (song song với `.rar`)

Lý do: khách truy cập trên máy không có phần mềm giải nén RAR (macOS, ChromeOS, Android,
đa số máy tính trường học) hiện không mở được hai file này. `.zip` mở được bằng công cụ có
sẵn của mọi hệ điều hành.

**URL `.rar` cũ không thay đổi và không bao giờ 404.** `.zip` chỉ là bản song song.

| ZIP mới | Bytes | Nguồn RAR | Bytes RAR | Chênh lệch |
|---|---:|---|---:|---:|
| `downloadfile/nguphap.zip` | 381 566 | `downloadfile/nguphap.rar` | 381 891 | −325 B |
| `blog/textblog-3/slide.zip` | 6 621 108 | `blog/textblog-3/slide.rar` | 6 398 721 | +222 387 B (+3,5 %) |

`slide.zip` lớn hơn `slide.rar` vì thuật toán nén RAR5 hiệu quả hơn Deflate trên file `.ppt`.
Đây là cái giá phải trả cho khả năng mở được ở mọi nơi — chấp nhận được.

### Nội dung `downloadfile/nguphap.zip` (7 mục, không có thư mục gốc)

```text
1.jpg   94 777 B
2.jpg   63 796 B
3.jpg   81 867 B
4.jpg   69 746 B
5.jpg   99 368 B
6.jpg   14 098 B
7.jpg   15 887 B
```

### Nội dung `blog/textblog-3/slide.zip` (10 mục, dưới thư mục gốc `slide/`)

```text
slide/Chapter 1_The Roles of Statistics in Engineering.ppt                         1 247 744 B
slide/Chapter 2_Probability.ppt                                                    1 598 464 B
slide/Chapter 3_Discrete radom variables and probability distribution.ppt            879 104 B
slide/Chapter 4_Continuous radom variables and probability distribution.ppt          896 000 B
slide/Chapter 6_Descriptive statistics.ppt                                           960 000 B
slide/Chapter 7_Point Estimation of  Parameters and Sampling Distributions.ppt       639 488 B
slide/Chapter 8_Statistical Intervals for a sample single.ppt                        849 920 B
slide/Chapter 9_Test of Hypotheses for a single sample.ppt                           991 744 B
slide/Chapter 10_Statistical Inference for two samples.ppt                         1 012 224 B
slide/Chapter 11_Simple linear regression and Correlation.ppt                      1 010 176 B
```

> Không có Chapter 5 trong bộ slide gốc — đây là thiếu sót có sẵn của file `.rar`,
> không phải lỗi khi chuyển đổi. `slide.zip` phản ánh đúng nội dung `slide.rar`.
> Tên thư mục viết sai chính tả (`radom` thay vì `random`) cũng được giữ **nguyên**.

### Cách tạo lại (tái lập được)

`bsdtar` (libarchive 3.7.4, có sẵn trên macOS) đọc được RAR5. Không cần cài `unrar`.

```bash
bsdtar -xf downloadfile/nguphap.rar   -C /tmp/nguphap
bsdtar -xf blog/textblog-3/slide.rar  -C /tmp/slide
# rồi zip lại, giữ nguyên tên file và cấu trúc thư mục, bỏ .DS_Store / ._*
```

### Kiểm chứng đã chạy

```console
$ unzip -t downloadfile/nguphap.zip
No errors detected in compressed data of downloadfile/nguphap.zip.

$ unzip -t blog/textblog-3/slide.zip
No errors detected in compressed data of blog/textblog-3/slide.zip.

$ diff -r /tmp/rar-extract /tmp/zip-extract   # cả hai archive
(không có khác biệt — nội dung giống nhau từng byte)
```

### Việc còn lại cho người viết lại HTML

Hai file `.zip` **hiện chưa được trang nào liên kết**. Khi viết lại
`blog/textblog-1.html` và `blog/textblog-3.html`, nên thêm cả hai lựa chọn — giữ link `.rar`,
thêm link `.zip` (đường dẫn tương đối):

```html
<!-- trong blog/textblog-1.html -->
<a href="../downloadfile/nguphap.zip" download>File ngữ pháp (ZIP, 373 KB)</a>
<a href="../downloadfile/nguphap.rar" download>File ngữ pháp (RAR, 373 KB)</a>

<!-- trong blog/textblog-3.html -->
<a href="textblog-3/slide.zip" download>Slides (ZIP, 6,3 MB)</a>
<a href="textblog-3/slide.rar" download>Slides (RAR, 6,1 MB)</a>
```

---

## 6. Media payload (không phải file tải về trực tiếp)

| Đường dẫn | Số file | Tổng bytes | Được dùng bởi |
|---|---:|---:|---|
| `blog/Speaking/jpd113/reading_1..13.mp3` | 13 | 2 184 912 | `blog/Speaking.html` (mảng `courseData`, thuộc tính `audio`) |
| `blog/Speaking/jpd123/reading_1..10.mp3` | 10 | 1 644 912 | `blog/Speaking.html` |
| `img/0508.mp4` | 1 | 6 598 259 | **Không trang nào tham chiếu.** Giữ lại theo quy tắc chỉ-thêm-không-xoá. |

---

## 7. Rủi ro bản quyền

**English summary — please read.** Two files served publicly from this repository appear to be
complete, unlicensed commercial textbooks: `blog/textblog-3/Montgomery_Runger_Applied_Statistics_and_Probability_for_Engineers,_5th.pdf`
(a 792-page Wiley title) and `downloadfile/jpd-script.pdf` (a Japanese-language coursebook
audio script). The repository carries the owner's real name next to his career portfolio, so a
DMCA takedown against either file would reach the **entire repository**, portfolio included.
No change has been made — the options below are presented for the owner to decide.

### 7.1 Chuyện gì đang xảy ra

Repo này phục vụ công khai một số file có dấu hiệu là **sách thương mại bản quyền, không có
giấy phép phân phối**. Bằng chứng lấy trực tiếp từ metadata và trang bìa của chính các file:

| File | Bằng chứng đo được | Đánh giá |
|---|---|---|
| `blog/textblog-3/Montgomery_Runger…_Engineers,_5th.pdf` | 792 trang. Metadata PDF: `Title = "Applied Statistics and Probability for Engineers, 5e"`. Trang 1 là **bìa sách in**: “Applied Statistics and Probabilty for Engineers, Fifth Edition — Douglas C. Montgomery, George C. Runger”. | Sách giáo trình đại học đầy đủ của **John Wiley & Sons**, đang được bán. **Rủi ro cao nhất.** |
| `downloadfile/jpd-script.pdf` | 206 trang. Metadata: `Title = "CDROM_L1_1st.indd"`, tạo bằng Adobe InDesign CS4_J. Trang 1: 「第1課 はじめまして」 với các mục 「聞いてみよう」/「チャレンジ！」 — đây là cấu trúc đặc trưng của bộ **できる日本語 (Dekiru Nihongo)**. | Sách script phần nghe (CD-ROM) của bộ giáo trình thương mại Nhật. **Rủi ro cao.** |
| `downloadfile/grammar.pdf` | 63 trang, bản **scan**. Trang bìa: 『できる日本語 初級 わたしの文法ノート』— 嶋田和子 監修, NXB **凡人社 (Bonjinsha)**. | Sách in thương mại, scan nguyên cuốn. **Rủi ro cao.** |
| `downloadfile/gvocab.pdf` | 38 trang, bản **scan**. Trang bìa: 『できる日本語 初級 わたしのことばノート』— 嶋田和子 監修, NXB **凡人社 (Bonjinsha)**. | Sách in thương mại, scan nguyên cuốn. **Rủi ro cao.** |
| `downloadfile/ghoctuvung.pdf`, `downloadfile/SoDoTuDuy.pdf`, `downloadfile/JDP113SPK.pdf`, `downloadfile/JDP123SPK.pdf` | 46 / 1 / 4 / 3 trang. Không có metadata nhà xuất bản. Nhãn trên trang mô tả là tài liệu tổng hợp, hướng dẫn thi. | Nhiều khả năng là tài liệu tự soạn hoặc trích dẫn ngắn. **Rủi ro thấp.** Cần chủ repo xác nhận nguồn. |
| `blog/textblog-3/Exercise Book MAS291  2021.pdf`, `SummaryMAS291.pdf`, `slide.rar` / `slide.zip` | 48 / 8 trang; 10 slide `.ppt`. | Tài liệu nội bộ môn học (FPT University MAS291). Bản quyền thuộc trường/giảng viên. **Rủi ro trung bình** — thường không bị theo đuổi, nhưng không phải tài liệu công khai. |

> **Đính chính so với bản brief:** brief mô tả `jpd-script.pdf` là tài liệu *Minna no Nihongo*.
> Kiểm tra thực tế cho thấy đó là bộ **Dekiru Nihongo (できる日本語)** — trùng với nhãn
> “File script phần nghe **Dekiru**” mà chính trang `textblog-1.html` đang dùng.
> Mức độ rủi ro pháp lý **không đổi** (đều là giáo trình thương mại Nhật), chỉ khác tên
> nhà xuất bản khi có yêu cầu gỡ.

### 7.2 Vì sao rủi ro lan ra cả repo

1. Repo mang **tên thật của chủ sở hữu** và là **portfolio nghề nghiệp** của anh ấy.
   Nó không ẩn danh. Nhà xuất bản có thể xác định danh tính chỉ trong một lần tra cứu.
2. GitHub xử lý DMCA ở **cấp repository**, không phải cấp file. Một thông báo hợp lệ nhắm vào
   một file PDF có thể dẫn tới việc **vô hiệu hoá toàn bộ repo** — kéo theo GitHub Pages,
   toàn bộ 17 URL, và ~12.000 từ nội dung học thuật mà chủ sở hữu đã viết.
3. Chính các bài viết mới là tài sản có giá trị. Các file PDF chỉ là tệp đính kèm.
   **Tỉ lệ rủi ro/lợi ích rất bất lợi**: mất toàn bộ portfolio để giữ vài link tải sách lậu.
4. Wiley là nhà xuất bản có tiền lệ gửi DMCA hàng loạt cho các bản sao giáo trình trên GitHub.

### 7.3 Các lựa chọn (trình bày trung lập — chủ repo quyết định)

**A. Giữ nguyên như hiện tại.**
Không làm gì. URL tiếp tục sống, traffic tiếp tục về.
*Đánh đổi:* rủi ro repo-wide vẫn còn nguyên và tồn tại vô thời hạn. Khi DMCA đến thì đã muộn —
không có bước cảnh báo trước, GitHub gỡ trước rồi mới cho khiếu nại.

**B. Thay nội dung tại cùng URL.**
Giữ **nguyên đường dẫn** (không có URL nào 404, không mất traffic, không mất backlink), nhưng
thay payload bằng một PDF tóm tắt do chủ repo tự viết + danh sách link mua/mượn hợp pháp
(nhà xuất bản, thư viện trường, OpenStax, các bản miễn phí có giấy phép).
*Đánh đổi:* người đang tìm bản PDF lậu sẽ thất vọng; tỉ lệ thoát ở trang đó có thể tăng.
Với `Montgomery_Runger…5th.pdf`, `SummaryMAS291.pdf` (8 trang công thức, do chủ repo soạn)
đã là một bản thay thế hợp pháp có sẵn.

**C. Hạn chế truy cập.**
Đưa file ra khỏi repo công khai (Google Drive giới hạn, gated link, hoặc chỉ gửi khi có yêu cầu).
*Đánh đổi:* URL công khai sẽ 404 — **vi phạm ràng buộc “không route nào được 404”** của dự án
này, trừ khi kèm theo một trang thay thế tại đúng đường dẫn cũ. Về mặt pháp lý là an toàn nhất.

**Có thể áp dụng khác nhau cho từng file.** Ví dụ: B cho hai file rủi ro cao nhất
(`Montgomery_Runger…5th.pdf`, `jpd-script.pdf`), A cho nhóm rủi ro thấp.

### 7.4 Trạng thái hiện tại

**Chưa có thay đổi nào được thực hiện.** Không PDF nào bị sửa, nén lại, thay thế hay gỡ bỏ —
tất cả vẫn **nguyên byte** như trước đợt refactor. Toàn bộ URL vẫn trả về 200.
Việc này **chờ quyết định của chủ sở hữu**.

Ghi chú riêng: tài liệu này chỉ ghi nhận quan sát kỹ thuật, **không phải tư vấn pháp lý**.

### 7.5 Nếu nhận được yêu cầu gỡ bỏ

Đầu mối liên hệ đã công bố trên site: [GitHub Issues](https://github.com/thepKz/minthep-portfolio/issues) (cam kết phản hồi trong 48 giờ).
Khi nhận yêu cầu hợp lệ, gỡ payload nhưng **giữ URL sống** bằng một trang thông báo tại đúng
đường dẫn cũ — như vậy vừa tuân thủ, vừa không mất chỉ mục tìm kiếm.

---

## 8. Lịch sử thay đổi

| Ngày | Thay đổi |
|---|---|
| 2026-07-26 | Tạo tài liệu. Thêm `downloadfile/nguphap.zip` và `blog/textblog-3/slide.zip`. Không PDF nào bị sửa. Không file nào bị xoá, đổi tên hay di chuyển. Nén lại PDF bị bỏ (Ghostscript không có trên máy). |
