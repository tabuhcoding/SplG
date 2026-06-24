Tôi muốn nâng cấp game Splendor hiện tại từ chơi nhiều user trên cùng 1 máy thành chơi được trên nhiều máy, nhưng scope rất nhỏ và đơn giản.

Quy mô:
- Luôn chỉ có 1 bàn chơi duy nhất.
- Tối đa 5 user/player trong bàn.
- Mỗi máy/device có thể chơi nhiều user/player, giống logic local hiện tại.
- Ví dụ: máy tôi chơi 2 user, máy bạn A chơi 1 user, máy bạn B chơi 2 user, tổng cộng 5 user.
- Deploy nhẹ để bạn bè có thể access qua web, ưu tiên Vercel nếu tiện.

## Flow mong muốn

Khi mở web:
- Tạo/lấy `deviceId` của máy hiện tại từ `localStorage` và cookie.
- Check xem có bàn chơi nào đang tồn tại chưa.
- Nếu chưa có bàn, hoặc bàn đang ở trạng thái lobby/reset thì vào màn hình chờ.
- Màn hình chờ là màn hiện tại khi mới start app: chọn số user của máy mình, đặt tên user.
- Nếu đã có bàn và bàn đang lobby thì cho máy hiện tại join lobby.
- Nếu bàn đang chơi:
  - Nếu `deviceId` của máy hiện tại đã có trong bàn thì cho vào lại bàn.
  - Nếu `deviceId` chưa có trong bàn thì báo bàn đang chơi, không cho join.
  - Có nút reset bàn, yêu cầu nhập password nhỏ để reset.

Trong lobby:
- Mỗi máy chọn số user/player của máy mình.
- Đặt tên các user/player của máy mình.
- Sau khi đặt tên xong có nút Play để bắt đầu chơi.
- Khi bắt đầu, tạo game state từ settings và danh sách players đã join.

## Kiến trúc đề xuất

Ưu tiên dùng:
- Next.js deploy Vercel.
- Supabase Postgres để lưu state.
- Supabase Realtime để sync thay đổi giữa các máy.

Không cần tự dựng WebSocket server nếu deploy Vercel, vì Vercel serverless không phù hợp để giữ WebSocket connection lâu dài.

Supabase Realtime free đủ cho case này vì chỉ có tối đa 5 máy, data transfer chỉ là JSON/text, mỗi lượt update rất nhỏ.

## State lưu server

Chỉ cần 1 row duy nhất cho bàn chơi, ví dụ bảng `game_table`:

```sql
create table game_table (
  id text primary key,
  status text not null,
  version int not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

insert into game_table (id, status, state)
values ('main', 'lobby', '{}');
```

Shape state gợi ý:

```js
{
  status: "lobby" | "playing" | "finished",
  devices: [
    {
      deviceId: "...",
      name: "Bao's laptop",
      seats: ["player-1", "player-2"],
      joinedAt: "..."
    }
  ],
  players: [
    {
      id: "player-1",
      name: "Bao",
      ownerDeviceId: "...",
      score: 0,
      chips: {},
      bonuses: {},
      reserved: [],
      nobles: []
    }
  ],
  game: {
    settings: {},
    table: {},
    activePlayerIndex: 0,
    history: [],
    turnActions: {}
  }
}
```

Có thể giữ gần nhất với state hiện tại trong `GameScreen.jsx`, nhưng chuyển nguồn sự thật từ client `useState` sang row `game_table.state`.

## Sync realtime

Client subscribe thay đổi row `game_table` bằng Supabase Realtime:

```js
const channel = supabase
  .channel("game-table")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "game_table",
      filter: "id=eq.main",
    },
    (payload) => {
      setGameState(payload.new.state);
      setVersion(payload.new.version);
    }
  )
  .subscribe();
```

Cần bật table vào realtime publication:

```sql
alter publication supabase_realtime add table game_table;
```

## Mutate state

Client không tự update DB trực tiếp cho action trong game.

Client gửi action lên API server:

```js
POST /api/table/action
{
  deviceId,
  playerId,
  version,
  action: {
    type: "TAKE_CHIPS",
    payload: {}
  }
}
```

Server sẽ:
- Load row `game_table` id `main`.
- Check `version` để tránh 2 máy cùng submit state cũ.
- Check `deviceId` có quyền điều khiển `playerId`.
- Check đúng lượt.
- Validate action theo luật hiện tại.
- Mutate state.
- Update Postgres với optimistic locking:

```sql
update game_table
set state = $newState,
    version = version + 1,
    updated_at = now()
where id = 'main'
  and version = $clientVersion;
```

Nếu update 0 row nghĩa là có máy khác vừa update trước, client fetch lại state mới.

## Định danh device

Dùng `deviceId` random và bền vững:

```js
crypto.randomUUID()
```

Lưu ở:
- `localStorage`, để client đọc nhanh.
- cookie `splendor_device_id`, để API/server đọc được nếu cần.

Không dùng IP làm định danh vì IP có thể đổi, nhiều máy có thể chung mạng, mobile network không ổn định.

Mỗi player có `ownerDeviceId`. Khi F5, nếu deviceId vẫn còn thì máy đó được vào lại đúng các player của mình.

## Reset bàn

Có endpoint:

```txt
POST /api/table/reset
```

Body gồm password reset.

Password để trong env:

```txt
RESET_PASSWORD=...
```

Nếu đúng password thì reset row `game_table` về lobby/empty state.

## Postgres hay Mongo

Chọn Postgres/Supabase cho project này.

Lý do:
- Supabase đã có Postgres + Realtime sẵn, hợp với Vercel.
- State game là JSON nên lưu `jsonb` vẫn tiện.
- Có transaction/version check rõ ràng.
- Chỉ có 1 bàn nên không cần thiết kế database phức tạp.
- Ít phải tự dựng backend realtime.

Mongo cũng lưu JSON tiện, nhưng realtime thường cần Change Streams hoặc backend riêng để broadcast, không tiện bằng Supabase Realtime cho scope nhỏ này.

## Các điểm cần giữ

- Mục tiêu là làm multi-device đơn giản, không làm hệ thống nhiều room.
- Không cần login/auth đầy đủ.
- Không cần chat, invite, match making.
- Không cần lưu lịch sử nhiều trận.
- Chỉ cần vào lại được sau F5 bằng `deviceId`.
- Resource free của Vercel + Supabase là đủ cho quy mô 5 máy.
- Giữ UI/gameplay hiện tại càng nhiều càng tốt, chỉ tách state và thêm lobby/reconnect/reset.
