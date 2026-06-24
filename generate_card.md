Tôi đang muốn dùng nextjs để tạo 1 repo để chơi game splendor, đầu tiên tôi cần tạo card, init trước 1 repo nextjs, sau đó tạo 1 UI đơn giản để hiển thị full list card, với list card như sau:
Trong img đang có các ảnh:
- cards.jpg: 15 arts về background cho card, được xếp sát nhau thành hàng ngang 15 art
- chips.jpg: 6 ảnh về các chip, chip là hình tròn, sát viền, xếp hàng ngang thành 6 chips, có nền trắng. Theo thứ tự là: black, blue, white, green, red, yellow
- gems.png: 5 ảnh tách nền của 5 gems như trên, trừ yellow, cũng được xếp hàng ngang, sát nhau.
- nobles.jpg: 10 nobles, xếp sát nhau.
- deck.jpg: ảnh mặt sau của card, gồm 3 ảnh sát nhau, lần lượt là lv 1,2,3
Trong json gồm 2 loại card:
- card.json: 90 cards game
- noble.json: 10 cards noble.

Giúp tôi tạo 1 dashboard để test việc tạo card trước, UI tạo ra các card như sau:
hàng 1, 6 chips: 6 button/div gì đó, có thể ấn được, khi click vào sẽ có animate nhẹ để nhận biết. ảnh của 6 button sẽ là 6 ảnh được cắt lần lượt dựa theo chiều ngang chia 6 của chips.jpg
hàng 2, ảnh noble, 6 noble đầu tiên
hàng 3, ảnh card level 1, 1 ảnh mặt sau đại diện cho level cắt từ deck.jpg và  5 card level 1 đầu tiên
hàng 4, ảnh card level 2, cũng 1 bìa + 5 card
hàng 5, ảnh card level 3, cũng 1 bìa + 5 card.

Với quy tắc tạo ảnh noble, card như sau:
ảnh background: cắt từ nobles.jpg và cards.jpg. Với nobles thì đang có 10 ảnh ứng với 10 nobles. Còn cards.jpg thì đang có 15 ảnh và 90 cards, cứ random từng card ứng với 1 trong 15 ảnh là được.
đè lên backgound sẽ gồm:
- Góc trên bên phải: trong card có field color: mỗi card sẽ có 1 color, cắt từ gems.png để lấy ảnh tương ứng với color đó, gắn vào.
- Góc trên bên trái: points, ponit của thẻ, chọn 1 font đầy đăn, in hoa để dễ nhìn
- Góc dưới bên trái: list các cost, sẽ hiện theo hàng dọc. mỗi cost sẽ là:
ảnh của gems ứng với field cost, kế bên sẽ là 1 số hiện số lượng cần cho cost đó

## Note sizing đã căn đẹp

Giữ các giá trị sizing hiện tại khi tiếp tục generate UI/game, không tự ý đổi nếu không có yêu cầu mới:

- Base development card: `CARD_W = 230`, `CARD_H = 320`; render width là `CARD_W * scale`, giữ aspect ratio `230 / 320`.
- Base noble: `NOBLE_SIZE = 180`; render size là `NOBLE_SIZE * scale * 1.625`.
- Default dashboard scale hiện tại: `0.72`.
- Chip button: `94px * scale`.
- Development/deck border radius: `8px`.
- Card border: `3px * scale`.
- Noble border: `3px * scale`.
- Point badge: chỉ render khi `points > 0`; vị trí `left/top = 12px * scale`; size `48px * scale`; font `36px * scale`.
- Noble point badge: chỉ render khi `points > 0`; size `42px * scale`; font `28px * scale`.
- Bonus gem góc trên bên phải: selector cần là `.gem-sprite.bonus-gem` để không bị `.gem-sprite` override; vị trí `right/top = 12px * scale`; width `80px * scale`.
- Gem mặc định trong cost: width `28px * scale`; riêng cost gem width `33px * scale`.
- Cost list: `bottom = 12px * scale`, `left = 10px * scale`, `gap = 6px * scale`.
- Cost pill: `gap = 5px * scale`, columns `33px * scale` và `26px * scale`, min-height `36px * scale`, padding `2px * scale 9px * scale`.
- Cost number: font size `26px * scale`, font weight `900`.
