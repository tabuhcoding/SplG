A. UI/UX Của Game như sau:

Gồm 3 phần:
- Desk
- List User
- History

Trước khi vào game, sẽ có màn hình chọn:
- Số user (bấm add thêm, đặt tên cho user, mặc định là user_number)
- Số lượng cho mỗi chips
- Số point cần đạt để win
- Số chips tối đa trên tay

Bàn game:

Desk sẽ là màn bự bên trái, UI có thể gần giống như dashboard hiện tại cũng được, bao gồm:
- List Chips như hiện tại, nhưng sẽ có thêm 1 số thể hiện số lượng chips
- List Các Noble (cố định là 4 noble)
- List Các Card Level 1,2,3 (Cố định 4 card + 1 ảnh bìa)
Tất cả các giá trị trên đều có thể click vào, cụ thể UI/UX tôi sẽ prompt sau.

List user, hàng dọc bên phải, mỗi user hiển thị gồm:
- Username, Total point, ban đầu là 0
- Danh sách các chips vĩnh viễn (không có chip vàng, không ảnh hưởng bởi số chips tối đa).
- Danh sách các chips tạm thời (ảnh hưởng bởi số chips tối đa)
Có thể click vào User, UI/UX prompt sau.
Khi đến lượt của user nào thì sẽ có viền xanh lá quanh user đó

History, chỉ cần hiện text là đủ. Bao gồm 1 câu thể hiện User + hành động vừa làm

B. Luật:

Trước khi bắt đầu, hiển thị 1 popup để lựa chọn:
- Số user (mặc định là 4. có thể bấm add thêm hoặc remove, có thể bấm vào text để sửa tên cho user tối đa 8 ký tự, tên mặc định là user 1, user 2, user 3)
- Số lượng cho mỗi chips
- Số point cần đạt để win
- Số chips tối đa trên tay
- 1 Nút để bấm bắt đầu.

Khi bắt đầu, load json các card và novel, thực hiện flavor ngẫu nhiên thứ tự các card. sau đó bốc ra 4 lá đầu tiên sau flavor cho mỗi card hiển thị trên ui như hiện tại. Lưu ý Novel là 4 lá, thay vì 5 như hiện tại

Thêm các số ở trên header để hiển thị số chips tối đa và số point cần để thắng và nút bắt đầu lại.

Tất cả người chơi đều thực hiện chơi trên cùng 1 máy tôi.
Bắt đầu sẽ là lượt theo thứ tự từ trên xuống của từng người chơi, người chơi nào đang chơi sẽ có viền xanh bao quanh và button kết thúc lượt.

Ở mỗi lượt, người chơi có thể thực hiện các hành động sau (bạn không cần quan tâm limit số hành động, tôi sẽ tự kiểm soát):

I. - Thu thập đá: Thêm 1 nút collect vào trong Bank
Flow sẽ là:
Ở mỗi viên đá (trừ đá vàng, đá vàng sẽ un-clickable), khi click vào lần 1 sẽ có viền xanh dương (nghĩa là collect 1 viên), click vào lần 2 sẽ có viền xanh biển (nghĩa là collect 2 viên). Khi collect sẽ collect tất cả viên đã chọn đưa vào chip của bản thân.
Các ràng buộc:
- Chỉ được chọn 1 trong 2: Collect 2 viên cùng màu, hoặc collect 3 viên khác màu mỗi màu 1 viên (Đ1)
- Không được phép collect dưới 3 viên trừ khi số màu khác nhau còn lại trên bàn là không đủ (Đ2)
- Tối đa cầm trên tay số viên = với số lượng đã input lúc đầu. (Đ3)
Nghĩa là trên tay đang có 8 viên, không thể chọn collect 3 viên khác nhau (vi phạm Đ3), cũng không thể chọn collect 2 viên khác nhau (VP Đ2), trừ khi đang cầm trên tay 8 viên, mà trên bàn chỉ còn mỗi 2 loại đá khác màu thì sẽ được collect 2 viên đó.
Hành động sẽ được thêm vào log kiểu:
"User <> + collect + 1R, 1G, 1B"

II. Thu thập/Đặt trước card:
Flow sẽ là:

Thêm 1 UI đè lên các card khi được click vào, click vào sẽ hiện 2 button "Thu thập" và "Đặt trước"

- Thu thập: Khi bấm thu thập. Sẽ check xem user có đang giữ chip vàng hay không, nếu có hiện lên 1 pop up. Dùng chip vàng cho: Chọn 1 trong 5 màu còn lại, hoặc click không chọn. Sau đó sẽ tính toán xem user có đủ chip so với cost của card đó không (lưu ý nhớ đếm đúng chip vàng cho card đó, chỉ tối đa 1 chip vàng sử dụng trong 1 lượt thu thập). Sau khi tính toán, nếu đủ thì remove card đó, pop card khác từ chồng bài cùng level. Sau đó cộng/trừ số chip, số bonus, số point tương ứng của user. Nếu không đủ thì hiển thị fail to collect

- Đặt trước: Available to click khi số chip vàng trong bank > 0. Khi click sẽ được đưa xuống 1 hàng thẻ mới, hàng thẻ đặt trước. Sau đó + 1 chip vàng cho user đó, không cộng trừ các field số chip, số bonus, số point khác. Thực hiện rremove bài khỏi hàng level và đưa xuống hàng đặt trước, đồng thời pop thêm lá bài khác
Ở ngay bên dưới hàng Level 1 sẽ có thêm 1 hàng bài nữa, dành cho hàng các card đã được đặt trước. Ở trên mỗi card sẽ đè thêm 1 text tên của user đó

- Do đó khi thu thập, user có thể chọn vào card dưới hàng đặt trước (nếu người đặt trước là user đó), để bấm collect, luồng collect lúc này sẽ tương tự như collect bên trên.

Hành động sẽ được thêm vào log kiểu:
- User <> + "Collect" + Chip <gems> + Point <Point> + By 1R, 1B, 1G,...
- User <> + "Preorder" + Chip <gems> + Point <Point>

III. Thu thập Noble:
- Thẻ noble sẽ click-able ngay khi số Bonus của user = với số cost trên thẻ noble (không tính số chip). Click vào cũng sẽ có nút collect. Thẻ noble không có tính năng Preorder.
Log kiểu:
- User <> + "Add Noble" + Point <Point> + By ...

Vì vậy sẽ cần thêm 1 bảng log ngay bên dưới danh sách các user ở bên phải, thêm các nút phù hợp.