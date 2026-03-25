let video;
let bodyPose;
let poses = [];

function preload() {
  // MoveNet 모델을 사용하여 사람의 포즈(관절)를 추적합니다.
  bodyPose = ml5.bodyPose("MoveNet");
}

function setup() {
  // 웹캠 비율에 맞춰 캔버스 생성
  createCanvas(1920, 1080);
  
  // 웹캠 캡처 시작
  video = createCapture(VIDEO);
  video.size(1920, 1080);
  video.hide(); // 기본 비디오 요소는 숨기고 캔버스에 직접 그립니다.

  // 모델에 비디오를 넣고 지속적인 추적 시작
  bodyPose.detectStart(video, gotPoses);
}

// 추적된 포즈 데이터를 배열에 저장하는 콜백 함수
function gotPoses(results) {
  poses = results;
}

function draw() {
  // 1. 캔버스에 웹캠 영상 출력 (index.html의 CSS로 인해 거울처럼 좌우 반전되어 보임)
  image(video, 0, 0, width, height);

  // 2. 인식된 사람 수만큼 반복 (한 사람당 블롭 한 칸)
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    
    // 상체 바운딩 박스를 구하기 위한 최소/최대 좌표 변수 초기화
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let validPoints = 0;

    // keypoints 0번(코)부터 12번(오른쪽 골반)까지만 계산하여 '상체'만 타겟팅
    for (let j = 0; j <= 12; j++) {
      let kp = pose.keypoints[j];
      
      // 0.1 이상의 신뢰도를 가진 관절 데이터만 사용 (오류 방지)
      if (kp.confidence > 0.1) {
        minX = min(minX, kp.x);
        minY = min(minY, kp.y);
        maxX = max(maxX, kp.x);
        maxY = max(maxY, kp.y);
        validPoints++;
      }
    }

    // 3. 유효한 상체 데이터가 있다면 빨간색 테두리 블롭 생성
    if (validPoints > 0) {
      let padding = 30;     // 양옆 및 아래쪽 여유 공간
      let headPadding = 80; // 머리 꼭대기(정수리)를 덮기 위한 위쪽 추가 여유 공간

      // 박스의 시작점(X, Y)과 너비(W), 높이(H) 계산
      let boxX = minX - padding;
      let boxY = minY - headPadding; 
      let boxW = (maxX - minX) + (padding * 2);
      let boxH = (maxY - minY) + padding + headPadding;

      // 블롭 스타일 설정: 속은 비우고 테두리만 빨갛게
      noFill();             // 색상 채우기 없음
      stroke(255, 0, 0);    // 테두리 색상: 빨강 (R, G, B)
      strokeWeight(4);      // 테두리 선 두께
      
      // 모서리가 둥근 사각형 그리기 (마지막 숫자 20이 모서리 둥글기 정도)
      rect(boxX, boxY, boxW, boxH, 20); 
    }
  }
}