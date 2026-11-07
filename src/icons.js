// 버튼에 쓰이는 Font Awesome 아이콘을 여기서 한 번에 관리해요.
// 각 줄의 'fa-solid fa-house' 부분만 원하는 아이콘 이름으로 바꾸면 사이트 전체에 반영돼요.
// (https://fontawesome.com/search?ic=free 에서 아이콘을 고르고 class="..." 안의 값을 복사해 넣으면 돼요)

export const ICONS = {
  edit: 'fa-solid fa-house',      // 수정 (일기, 댓글)
  delete: 'fa-solid fa-house',    // 삭제 (일기, 댓글, 설정의 멤버/반응/항목)
  photo: 'fa-solid fa-house',     // 사진 추가 (일기 작성, 댓글)
  submit: 'fa-solid fa-house',    // 댓글 등록
  settings: 'fa-solid fa-house',  // 설정
  logout: 'fa-solid fa-house',    // 로그아웃
}

// 아이콘 기본 색: 설정에서 고른 '내 색상'을 그대로 따라가요. (로그인한 사람마다 자기 색으로 보여요)
// 고정 색을 쓰고 싶으면 'rgb(116, 192, 252)' 처럼 직접 적어도 돼요.
export const ICON_COLOR = 'var(--accent)'

// 이름별로 따로 색을 정하고 싶을 때. 여기 적은 색이 기본 색보다 우선해요.
// 댓글 등록 버튼은 바탕이 '내 색상'이라 아이콘까지 같은 색이면 안 보여서 흰색으로 둬요.
export const ICON_COLORS = {
  submit: '#ffffff',
}
