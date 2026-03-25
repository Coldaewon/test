let video;
let bodyPose;
let poses = [];

// 프레임 조절을 위한 변수들
let snapshotImg;       // 특정 fps마다 캡처될 이미지 버퍼
let lastSnapshotTime = 0; // 마지막으로 캡처한 시간

function preload() {
  bodyPose = ml5.bodyPose("MoveNet");
}

function setup() {
  createCanvas(1920, 1080);
  
  video = createCapture(VIDEO);
  video.size(1920, 1080);
  video.hide();

  // 캡처용 빈 이미지 생성 (웹캠과 동일한 크기)
  snapshotImg = createImage(1920, 1080);

  bodyPose.detectStart(video, gotPoses);
}

function gotPoses(results) {
  poses = results;
}

function draw() {
  // ------------------------------------------
  // 1. 인원 수에 따른 대역폭(Mbps) 및 목표 FPS 계산
  // ------------------------------------------
  let numPeople = poses.length;
  let currentMbps = "";
  let targetFps = 30; // 기본값

  if (numPeople === 1) {
    currentMbps = "20Mbps"; targetFps = 30;
  } else if (numPeople === 2) {
    currentMbps = "5Mbps";  targetFps = 12;
  } else if (numPeople === 3) {
    currentMbps = "1.1Mbps"; targetFps = 6;
  } else if (numPeople === 4) {
    currentMbps = "0.5Mbps"; targetFps = 3;
  } else if (numPeople === 5) {
    currentMbps = "0.1Mbps"; targetFps = 1;
  } else if (numPeople >= 6) {
    currentMbps = "0.0Mbps"; targetFps = 0; // 정지 상태
  } else {
    currentMbps = "Signal Lost"; targetFps = 30; 
  }

  // ------------------------------------------
  // 2. 타이머를 이용한 '블롭 내부용' 지연 프레임 캡처
  // ------------------------------------------
  if (targetFps > 0) {
    let interval = 1000 / targetFps; // fps를 밀리초(ms) 간격으로 변환
    if (millis() - lastSnapshotTime > interval) {
      // 지정된 간격이 지났을 때만 비디오 프레임을 복사해둠
      snapshotImg.copy(video, 0, 0, 1920, 1080, 0, 0, 1920, 1080);
      lastSnapshotTime = millis();
    }
  } 
  // targetFps가 0일 때(6명 이상)는 캡처를 멈추므로 이미지가 정지됨

  // ------------------------------------------
  // 3. 화면 렌더링 시작 (배경 -> 지연된 블롭 내부 -> UI)
  // ------------------------------------------
  
  // A. 실시간 배경 비디오 그리기 (항상 30fps로 부드러움)
  image(video, 0, 0, width, height);

  // B. 전체 화면 글로벌 상태 표시 UI
  push();
  translate(width, 0);
  scale(-1, 1);
  fill(255);       
  noStroke();
  textSize(64);    
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(currentMbps, 50, 50); 
  pop();

  // C. 개별 블롭 데이터 처리
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    
    let minX = width; let minY = height;
    let maxX = 0;     let maxY = 0;
    let validPoints = 0;

    for (let j = 0; j <= 12; j++) {
      let kp = pose.keypoints[j];
      if (kp.confidence > 0.1) {
        minX = min(minX, kp.x);
        minY = min(minY, kp.y);
        maxX = max(maxX, kp.x);
        maxY = max(maxY, kp.y);
        validPoints++;
      }
    }

    if (validPoints > 0) {
      let padding = 50;
      let headPadding = 120;

      let boxX = minX - padding;
      let boxY = minY - headPadding; 
      let boxW = (maxX - minX) + (padding * 2);
      let boxH = (maxY - minY) + padding + headPadding;

      // 박스 좌표가 화면 밖으로 나가는 것을 방지 (에러 방지용)
      let cx = constrain(boxX, 0, width);
      let cy = constrain(boxY, 0, height);
      let cw = constrain(boxW, 0, width - cx);
      let ch = constrain(boxH, 0, height - cy);

      // --- [핵심] 블롭 안쪽 영역에만 딜레이된 캡처 화면 덮어씌우기 ---
      // image(소스이미지, 캔버스X, 캔버스Y, 캔버스W, 캔버스H, 소스X, 소스Y, 소스W, 소스H)
      if (cw > 0 && ch > 0) {
        image(snapshotImg, cx, cy, cw, ch, cx, cy, cw, ch);
      }

      // 블롭 박스 테두리 그리기
      noFill();             
      stroke(255, 0, 0);    
      strokeWeight(6);      
      rect(boxX, boxY, boxW, boxH, 30); 

      // 개별 블롭데이터 왼쪽 상단 텍스트 그리기
      push();
      translate(boxX + boxW, boxY - 15);
      scale(-1, 1);
      fill(255, 0, 0);   
      noStroke();
      textSize(32);      
      textStyle(NORMAL);
      textAlign(LEFT, BOTTOM);
      text(currentMbps + " (" + targetFps + "fps)", 0, 0); // fps 수치도 확인용으로 함께 띄움
      pop();
    }
  }
}