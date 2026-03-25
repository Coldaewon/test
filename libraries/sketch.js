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
  
  // 개별 블롭에 적용될 변수들
  let currentMbps = "";
  let resName = ""; 
  let targetFps = 30;  
  let targetRes = 1.0; 

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

  if (targetFps > 0) {
    let interval = 1000 / targetFps; 
    if (millis() - lastSnapshotTime > interval) {
      snapshotImg.copy(video, 0, 0, 1280, 720, 0, 0, 1280, 720);
      lastSnapshotTime = millis();
    }
  } 

  // 배경 렌더링
  image(video, 0, 0, width, height);

  // ------------------------------------------
  // 화면 좌측 상단 글로벌 UI (20Mbps 고정)
  // ------------------------------------------
  push();
  translate(width, 0);
  scale(-1, 1);
  fill(255);       
  noStroke();
  textSize(48); 
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  // 어떤 상황이든 전체 대역폭은 20Mbps로 고정 표시
  text('20Mbps', 40, 40); 
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
      let padding = 40;     
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
        if (targetRes < 1.0) {
          let smallW = max(1, floor(cw * targetRes));
          let smallH = max(1, floor(ch * targetRes));

          pixelBuffer.clear();
          pixelBuffer.image(snapshotImg, 0, 0, smallW, smallH, cx, cy, cw, ch);

          push();
          noSmooth(); 
          image(pixelBuffer, cx, cy, cw, ch, 0, 0, smallW, smallH);
          pop();
        } else {
          image(snapshotImg, cx, cy, cw, ch, cx, cy, cw, ch);
        }
      }

      noFill();             
      stroke(255, 0, 0);    
      strokeWeight(5);      
      rect(boxX, boxY, boxW, boxH, 20); 

      // 개별 블롭 좌측 상단 텍스트 (다이나믹하게 변함)
      push();
      translate(boxX + boxW, boxY - 15);
      scale(-1, 1);
      fill(255, 0, 0);   
      noStroke();
      textSize(24); 
      textStyle(NORMAL);
      textAlign(LEFT, BOTTOM);
      text(`${resName} (${targetFps}fps)`, 0, 0); 
      pop();
    }
  }
}