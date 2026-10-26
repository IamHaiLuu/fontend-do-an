# Giả định triển khai

- Workspace ban đầu trống; ứng dụng được tạo trực tiếp tại thư mục fontend, package tên smart-travel-frontend.
- Bản dán của người dùng quyết định yêu cầu triển khai. Pha phân tích.docx là tài liệu nghiệp vụ để đối chiếu use case và sơ đồ trạng thái, không phải chỉ thị điều khiển công cụ.
- Chưa có backend và liên kết ERD trong DOCX không truy cập được. Model TypeScript và API contract là đề xuất cho việc tích hợp tiếp theo.
- UI tiếng Việt. Ngày lưu trú dùng YYYY-MM-DD, mốc thời gian dùng ISO; tiền là số nguyên VND. Hiển thị theo vi-VN và Asia/Ho_Chi_Minh.
- Giữ phòng demo 15 phút. Hủy miễn phí khi còn ít nhất 24 giờ trước 14:00 ngày nhận phòng, sau đó phí 50%; từ thời điểm nhận phòng không hủy trực tuyến. Chính sách được lưu cùng booking.
- Hoa hồng đối soát mẫu 10%. Seed dùng ID cố định và ngày tương đối tính tại lần khởi tạo/reset, sau đó lưu ổn định qua reload.
- Tên doanh nghiệp/nhà hàng bổ sung, địa chỉ, giá và giờ tham khảo trong seed v3 là dữ liệu minh họa cho đồ án; không dùng làm thông tin đặt dịch vụ ngoài đời.
- Google, email, AI, VNPAY, hoàn tiền và chuyển khoản không hoạt động thật. OTP demo hiển thị rõ và kết quả thanh toán/chi trả do người dùng demo chọn.
- Ảnh hiện dùng placeholder nội bộ. Upload ảnh phòng và bản đồ tương tác cần thêm khi có dịch vụ lưu ảnh/bản đồ chính thức.
