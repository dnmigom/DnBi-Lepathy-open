// 버튼에 쓰이는 Font Awesome 아이콘을 여기서 한 번에 관리해요.
// 각 줄의 'fa-solid fa-house' 부분만 원하는 아이콘 이름으로 바꾸면 사이트 전체에 반영돼요.
// (https://fontawesome.com/search?ic=free 에서 아이콘을 고르고 class="..." 안의 값을 복사해 넣으면 돼요)

export const ICONS = {
  edit: 'fa-regular fa-pen-to-square',      // 수정 (일기, 댓글)
  delete: 'fa-solid fa-trash-can',    // 삭제 (일기, 댓글, 설정의 멤버/반응/항목)
  photo: 'fa-regular fa-image',     // 사진 추가 (일기 작성, 댓글)
  submit: 'fa-solid fa-paper-plane',    // 댓글 등록
  settings: 'fa-solid fa-gear',  // 설정
  logout: 'fa-solid fa-right-to-bracket',    // 로그아웃
  home: 'fa-solid fa-satellite-dish',   // 유저 메뉴의 '(이름)레파시 모아보기'
  search: 'fa-solid fa-magnifying-glass', // 검색
  bell: 'fa-solid fa-bell',              // 댓글 알림
  bookmark: 'fa-regular fa-bookmark',    // 북마크 하기 전 (일기·댓글)
  bookmarked: 'fa-solid fa-bookmark',    // 북마크 한 뒤 (일기·댓글)
  bookmarks: 'fa-solid fa-bookmark',     // 유저 메뉴의 '북마크 모아보기'
  gallery: 'fa-regular fa-image',        // 유저 메뉴의 '갤러리 모아보기'
  quote: 'fa-solid fa-quote-right',      // 인용 (일기·댓글)
  tags: 'fa-solid fa-hashtag',           // 유저 메뉴의 '태그 모아보기'
  scrollTop: 'fa-solid fa-angle-up',     // 오른쪽 아래: 맨 위로
  scrollBottom: 'fa-solid fa-angle-down', // 오른쪽 아래: 맨 아래로
  prev: 'fa-solid fa-angle-left',        // 갤러리 이전 사진, 달력 이전 달·이전 해
  next: 'fa-solid fa-angle-right',       // 갤러리 다음 사진, 달력 다음 달·다음 해
  plus: 'fa-solid fa-plus',              // 반응 추가
  sortDown: 'fa-solid fa-sort-down',     // 펼치기·고르기 표시 (▾ 자리: 달력 제목, 펼쳐서 보기, 댓글, 타래)
  sortUp: 'fa-solid fa-sort-up',         // 접기 표시 (▴ 자리: 접기, 댓글 접기, 타래 접기)
}

// 알림이 왔을 때 종 버튼 오른쪽 위에 뜨는 숫자 동그라미 색 (숫자는 흰색)
// 멤버 색 팔레트와 같은 톤(채도를 살짝 낮춘)의 붉은색이에요.
export const NOTIFY_DOT_COLOR = '#D9534F'

// 아이콘 기본 색: 설정에서 고른 '내 색상'을 그대로 따라가요. (로그인한 사람마다 자기 색으로 보여요)
// 고정 색을 쓰고 싶으면 'rgb(116, 192, 252)' 처럼 직접 적어도 돼요.
export const ICON_COLOR = 'var(--accent)'

// 이름별로 따로 색을 정하고 싶을 때. 여기 적은 색이 기본 색보다 우선해요.
// 댓글 등록 버튼은 바탕이 '내 색상'이라 아이콘까지 같은 색이면 안 보여서 흰색으로 둬요.
export const ICON_COLORS = {
  submit: '#ffffff',
}