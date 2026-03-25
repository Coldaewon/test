let video;
let bodyPose;
let poses = [];

function preload() {
  bodyPose = ml5.bodyPose("MoveNet");
}

function setup() {
  createCanvas(1920, 1080);
  
  video = createCapture(VIDEO);
  video.size(1920, 1080);
  video.hide();

  bodyPose.detectStart(video, gotPoses);
}

function gotPoses(results) {
  poses = results;
}

function draw() {
  image(video, 0, 0, width, height);

  // ------------------------------------------
  // 인원 수(트래킹된 사람 수)에 따른 대역폭(Mbps) 계산
  // ------------------------------------------
  let currentMbps = "";
  let numPeople = poses.length;

  if (numPeople === 1) {
    currentMbps = "20Mbps";
  } else if (numPeople === 2) {
    currentMbps = "5Mbps";
  } else if (numPeople === 3) {
    currentMbps = "1.1Mbps";
  } else if (numPeople === 4 || numPeople === 5) {
    currentMbps = "0.5Mbps";
  } else if (numPeople >= 6) {
    currentMbps = "0.1Mbps";
  } else {
    currentMbps = "Signal Lost"; // 아무도 없을 때
  }

  // ------------------------------------------
  // 1. 전체 화면 왼쪽 상단 텍스트 (글로벌 상태 표시)
  // ------------------------------------------
  push();
  translate(width, 0);
  scale(-1, 1);
  
  fill(255);       // 흰색 글씨
  noStroke();
  textSize(64);    // 큰 글씨
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(currentMbps, 50, 50); 
  pop();

  // ------------------------------------------
  // 2. 개별 블롭 데이터 생성 및 텍스트 띄우기
  // ------------------------------------------
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
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

      // 블롭 박스 그리기
      noFill();             
      stroke(255, 0, 0);    
      strokeWeight(6);      
      rect(boxX, boxY, boxW, boxH, 30); 

      // ------------------------------------------
      // 3. 개별 블롭데이터 왼쪽 상단에 텍스트 그리기
      // ------------------------------------------
      push();
      // CSS 좌우 반전 상태에서 '시각적인 왼쪽 상단'은 원본 좌표의 우측(boxX + boxW)이 됩니다.
      // 박스보다 살짝 위(boxY - 15)에 글씨가 오도록 위치 조정
      translate(boxX + boxW, boxY - 15);
      scale(-1, 1);

      fill(255, 0, 0);   // 블롭과 동일한 빨간색 텍스트
      noStroke();
      textSize(32);      // 전체 텍스트(64)의 절반 크기로 작게 설정
      textStyle(NORMAL);
      textAlign(LEFT, BOTTOM);
      
      text(currentMbps, 0, 0); 
      pop();
    }
  }
}