# Tiến độ

## Đã triển khai

- Vite, React, TypeScript strict, Tailwind, giao diện responsive, router và phân quyền ba vai trò.
- Mock repository seed cố định, localStorage có reset, API adapter Axios và domain types.
- Màn hình Tourist, gợi ý/lịch trình demo, CRUD chuyến đi, booking/payment/refund/review demo.
- Dashboard Partner và Admin, quản lý phòng/tồn phòng, xác minh đối tác, dịch vụ/danh mục, kiểm duyệt, báo cáo, đối soát.
- Kiểm thử unit nghiệp vụ và E2E các luồng chính.

## Chưa tích hợp thật

Backend, Google OAuth, email OTP, AI/LLM, VNPAY, refund, chuyển khoản, upload ảnh và bản đồ tương tác. API contract là đề xuất.

## Kiểm tra ngày 25/10/2026

- `npm run lint`: đạt.
- `npm run typecheck`: đạt.
- `npm run test`: 10 unit test đạt, gồm OTP, booking/tồn phòng/thanh toán, hủy và chính sách chụp tại lúc đặt, refund, đánh giá, lập lịch theo giờ mở cửa và xung đột, lịch phòng và đối soát.
- `npm run test:e2e`: 16 kịch bản đạt trên desktop/mobile; gồm tìm kiếm/lọc khách sạn và giữ bộ lọc, phân quyền/404, lịch trình, Partner, booking/hủy/hoàn tiền, xác minh đối tác/đối soát và kiểm tra tràn ngang 360px.
- `npm run build`: đạt với Vite 8.3.5.

Chế độ API mới là contract đề xuất; các kiểm thử trên chạy ở mock mode và chưa xác nhận khả năng tích hợp với backend thật.
