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
  const newWidth = prompt("New width:");
  const newHeight = prompt("New height:");

  if (!newWidth || !newHeight) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = parseInt(newWidth);
  tempCanvas.height = parseInt(newHeight);

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

  canvas.width = tempCanvas.width;
  canvas.height = tempCanvas.height;

  ctx.drawImage(tempCanvas, 0, 0);
  originalImage = new Image();
  originalImage.src = canvas.toDataURL();
};

// Crop mode
cropBtn.onclick = () => {
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
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
}

function applyCrop() {
  const { x, y, w, h } = cropRect;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(tempCanvas, 0, 0);

  originalImage = new Image();
  originalImage.src = canvas.toDataURL();

  cropRect = null;
  drawImage();
}

// Download
downloadBtn.onclick = () => {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "edited-image.png";
  a.click();
};
