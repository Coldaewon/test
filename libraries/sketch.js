let video;
let bodyPose;
let poses = [];

let snapshotImg;       
let lastSnapshotTime = 0; 
let pixelBuffer; 

function preload() {
  bodyPose = ml5.bodyPose("MoveNet");
}

function setup() {
  // 웹캠 네이티브 화질인 720p(1280x720)에 맞춰 캔버스 크기 조정
  createCanvas(1280, 720);
  
  video = createCapture(VIDEO);
  video.size(1280, 720);
  video.hide();

  snapshotImg = createImage(1280, 720);
  pixelBuffer = createGraphics(1280, 720);
  pixelBuffer.noSmooth(); 

  bodyPose.detectStart(video, gotPoses);
}

function gotPoses(results) {
  poses = results;
}

function draw() {
  let numPeople = poses.length;
  let currentMbps = "";
  let resName = ""; // 화면에 띄울 해상도 이름 (720p 등)
  
  let targetFps = 30;  
  let targetRes = 1.0; // 720p를 기준(1.0)으로 한 스케일 비율

  // ------------------------------------------
  // 인원 수에 따른 대역폭, 프레임, 유튜브식 화질(p) 동시 계산
  // ------------------------------------------
  if (numPeople === 1) {
    currentMbps = "20Mbps"; targetFps = 30; targetRes = 1.0; resName = "720p";
  } else if (numPeople === 2) {
    currentMbps = "5Mbps";  targetFps = 12; targetRes = 480/720; resName = "480p";
  } else if (numPeople === 3) {
    currentMbps = "1.1Mbps"; targetFps = 6; targetRes = 360/720; resName = "360p";
  } else if (numPeople === 4) {
    currentMbps = "0.5Mbps"; targetFps = 3; targetRes = 240/720; resName = "240p";
  } else if (numPeople === 5) {
    currentMbps = "0.1Mbps"; targetFps = 1; targetRes = 144/720; resName = "144p";
  } else if (numPeople >= 6) {
    currentMbps = "0.0Mbps"; targetFps = 0; targetRes = 144/720; resName = "144p (Stop)";
  } else {
    currentMbps = "Signal Lost"; targetFps = 30; targetRes = 1.0; resName = "";
  }

  // ------------------------------------------
  // 타이머를 이용한 '블롭 내부용' 지연 프레임 캡처
  // ------------------------------------------
  if (targetFps > 0) {
    let interval = 1000 / targetFps; 
    if (millis() - lastSnapshotTime > interval) {
      snapshotImg.copy(video, 0, 0, 1280, 720, 0, 0, 1280, 720);
      lastSnapshotTime = millis();
    }
  } 

  // 배경 렌더링
  image(video, 0, 0, width, height);

  // 화면 좌측 상단 글로벌 UI
  push();
  translate(width, 0);
  scale(-1, 1);
  fill(255);       
  noStroke();
  textSize(48); // 캔버스가 720p로 작아졌으므로 텍스트 크기도 살짝 줄임
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  // 전체 화면 UI에는 Mbps와 화질(p)을 같이 보여줌
  text(`${currentMbps} [${resName}]`, 40, 40); 
  pop();

  // ------------------------------------------
  // 개별 블롭 데이터 렌더링
  // ------------------------------------------
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
      let padding = 40;     // 720p 비율에 맞춰 패딩값 소폭 조정
      let headPadding = 90;

      let boxX = minX - padding;
      let boxY = minY - headPadding; 
      let boxW = (maxX - minX) + (padding * 2);
      let boxH = (maxY - minY) + padding + headPadding;

      let cx = constrain(boxX, 0, width);
      let cy = constrain(boxY, 0, height);
      let cw = constrain(boxW, 0, width - cx);
      let ch = constrain(boxH, 0, height - cy);

      if (cw > 0 && ch > 0) {
        // --- 화질 열화(Pixelation) 적용 파트 ---
        if (targetRes < 1.0) {
          // 목표 해상도(480p, 360p 등) 비율에 맞춰 박스를 작게 압축
          let smallW = max(1, floor(cw * targetRes));
          let smallH = max(1, floor(ch * targetRes));

          pixelBuffer.clear();
          pixelBuffer.image(snapshotImg, 0, 0, smallW, smallH, cx, cy, cw, ch);

          push();
          noSmooth(); 
          // 작게 압축된 이미지를 다시 원래 박스 크기로 늘려 픽셀을 깨뜨림
          image(pixelBuffer, cx, cy, cw, ch, 0, 0, smallW, smallH);
          pop();
        } else {
          image(snapshotImg, cx, cy, cw, ch, cx, cy, cw, ch);
        }
      }

      // 블롭 테두리 그리기
      noFill();             
      stroke(255, 0, 0);    
      strokeWeight(5);      
      rect(boxX, boxY, boxW, boxH, 20); 

      // 개별 블롭 좌측 상단 텍스트
      push();
      translate(boxX + boxW, boxY - 15);
      scale(-1, 1);
      fill(255, 0, 0);   
      noStroke();
      textSize(24); // 텍스트 크기 조정
      textStyle(NORMAL);
      textAlign(LEFT, BOTTOM);
      // 블롭 위에는 직관적으로 해상도 이름(예: 480p)과 fps를 출력
      text(`${resName} (${targetFps}fps)`, 0, 0); 
      pop();
    }
  }
}