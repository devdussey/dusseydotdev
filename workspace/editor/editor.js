// Session check
window.addEventListener('load', () => {
  const user = sessionStorage.getItem('user');
  if (!user) {
    window.location.href = '../../login/';
  } else {
    const userData = JSON.parse(user);
    document.getElementById('userInfo').textContent = userData.username;
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('user');
  window.location.href = '../../login/';
});

const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

let img = new Image();
let originalImage = null;

// Tools
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const downloadBtn = document.getElementById("downloadBtn");
const rotateBtn = document.getElementById("rotateBtn");
const resizeBtn = document.getElementById("resizeBtn");
const cropBtn = document.getElementById("cropBtn");
const removeBgBtn = document.getElementById("removeBgBtn");
const bgThresholdSlider = document.getElementById("bgThreshold");
const statusMessage = document.getElementById("statusMessage");

// Initial state
let rotation = 0;
let cropMode = false;
let startX = 0;
let startY = 0;
let cropRect = null;

// Load image
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      originalImage = img;
      rotation = 0;
      statusMessage.textContent = "Image loaded. Start editing!";
      drawImage();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function drawImage() {
  if (!originalImage) return;
  canvas.width = originalImage.width;
  canvas.height = originalImage.height;

  ctx.save();

  // Apply rotation
  if (rotation !== 0) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
  } else {
    ctx.drawImage(originalImage, 0, 0);
  }

  ctx.restore();

  // Apply brightness/contrast
  const brightness = brightnessSlider.value;
  const contrast = contrastSlider.value;

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let data = imageData.data;

  const bFactor = brightness / 100;
  const cFactor = contrast / 100;

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = ((data[i] - 128) * cFactor) + 128 * bFactor;
    data[i + 1] = ((data[i + 1] - 128) * cFactor) + 128 * bFactor;
    data[i + 2] = ((data[i + 2] - 128) * cFactor) + 128 * bFactor;
  }

  ctx.putImageData(imageData, 0, 0);
}

brightnessSlider.oninput = drawImage;
contrastSlider.oninput = drawImage;

// Rotate
rotateBtn.onclick = () => {
  rotation = (rotation + 90) % 360;
  drawImage();
};

// Resize
resizeBtn.onclick = () => {
  if (!originalImage) return;

  const newWidth = prompt("New width:");
  const newHeight = prompt("New height:");

  if (!newWidth || !newHeight) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = parseInt(newWidth, 10);
  tempCanvas.height = parseInt(newHeight, 10);

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

  originalImage = new Image();
  originalImage.onload = () => {
    rotation = 0;
    drawImage();
  };
  originalImage.src = tempCanvas.toDataURL();
};

// Crop mode
cropBtn.onclick = () => {
  if (!originalImage) return;

  cropMode = !cropMode;
  cropBtn.innerText = cropMode ? "Finish Crop" : "Crop";

  if (!cropMode && cropRect) applyCrop();
};

canvas.onmousedown = (e) => {
  if (!cropMode) return;

  const rect = canvas.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  cropRect = { x: startX, y: startY, w: 0, h: 0 };
};

canvas.onmousemove = (e) => {
  if (!cropMode || !cropRect) return;

  const rect = canvas.getBoundingClientRect();
  cropRect.w = (e.clientX - rect.left) - startX;
  cropRect.h = (e.clientY - rect.top) - startY;

  drawImage();
  drawCropOverlay();
};

canvas.onmouseup = () => {};

function drawCropOverlay() {
  if (!cropRect) return;
  ctx.strokeStyle = "#00f2ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
}

function applyCrop() {
  const { x, y, w, h } = cropRect;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.abs(w);
  tempCanvas.height = Math.abs(h);

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(
    canvas,
    Math.min(x, x + w),
    Math.min(y, y + h),
    Math.abs(w),
    Math.abs(h),
    0,
    0,
    Math.abs(w),
    Math.abs(h)
  );

  originalImage = new Image();
  originalImage.onload = () => {
    rotation = 0;
    drawImage();
  };
  originalImage.src = tempCanvas.toDataURL();

  cropRect = null;
  cropMode = false;
  cropBtn.innerText = "Crop";
}

// Background removal
removeBgBtn.onclick = () => {
  if (!originalImage) return;
  removeBgBtn.disabled = true;
  removeBgBtn.textContent = "Removing...";
  statusMessage.textContent = "Detecting and removing background...";
  requestAnimationFrame(() => {
    removeBackground(parseInt(bgThresholdSlider.value, 10));
    removeBgBtn.disabled = false;
    removeBgBtn.textContent = "Remove Background";
    statusMessage.textContent = "Background removed. Use sensitivity slider if needed.";
  });
};

function removeBackground(threshold) {
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = originalImage.width;
  baseCanvas.height = originalImage.height;
  const baseCtx = baseCanvas.getContext("2d");
  baseCtx.drawImage(originalImage, 0, 0);

  const imageData = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
  const bgColor = sampleBackgroundColor(imageData);

  const data = imageData.data;
  const threshSq = threshold * threshold;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bgColor.r;
    const dg = data[i + 1] - bgColor.g;
    const db = data[i + 2] - bgColor.b;
    const distanceSq = dr * dr + dg * dg + db * db;
    if (distanceSq <= threshSq) {
      data[i + 3] = 0;
    }
  }

  baseCtx.putImageData(imageData, 0, 0);

  const cleanedImage = new Image();
  cleanedImage.onload = () => {
    originalImage = cleanedImage;
    drawImage();
  };
  cleanedImage.src = baseCanvas.toDataURL();
}

function sampleBackgroundColor(imageData) {
  const { width, height, data } = imageData;
  const sampleSize = Math.max(1, Math.floor(Math.min(width, height) * 0.02));
  const positions = [
    [0, 0],
    [width - sampleSize, 0],
    [0, height - sampleSize],
    [width - sampleSize, height - sampleSize],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - sampleSize]
  ];

  let total = { r: 0, g: 0, b: 0 };
  let count = 0;

  positions.forEach(([startX, startY]) => {
    for (let y = startY; y < startY + sampleSize; y++) {
      for (let x = startX; x < startX + sampleSize; x++) {
        const clampedX = Math.min(width - 1, Math.max(0, x));
        const clampedY = Math.min(height - 1, Math.max(0, y));
        const index = (clampedY * width + clampedX) * 4;
        total.r += data[index];
        total.g += data[index + 1];
        total.b += data[index + 2];
        count++;
      }
    }
  });

  return {
    r: total.r / count,
    g: total.g / count,
    b: total.b / count
  };
}

// Download
downloadBtn.onclick = () => {
  if (!originalImage) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "edited-image.png";
  a.click();
};
