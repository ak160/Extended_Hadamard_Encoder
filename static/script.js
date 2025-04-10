// ---------------------- 3D Animated Background using Three.js ----------------------

// Global variables for Three.js scene
let scene, camera, renderer, shapes = [];

// Available geometries array (cube, sphere, cone, torus)
const geometries = [
  new THREE.BoxGeometry(),
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.ConeGeometry(0.5, 1, 32),
  new THREE.TorusGeometry(0.4, 0.15, 16, 100)
];

// Function to initialize the 3D scene
function init3D() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("bgCanvas"), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Create and add multiple shapes.
  for (let i = 0; i < 20; i++) {
    const geometry = geometries[Math.floor(Math.random() * geometries.length)];
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    const shape = new THREE.Mesh(geometry, material);

    const startPos = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    shape.position.copy(startPos);

    shape.userData.startPosition = startPos.clone();
    shape.userData.targetPosition = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    shape.userData.moveStartTime = Date.now();
    shape.userData.moveDuration = 15000 + Math.random() * 2000;

    shape.userData.cycleDuration = 6000;
    shape.userData.initialOpacity = 0.5;
    shape.userData.opacityCycleStart = Date.now();

    scene.add(shape);
    shapes.push(shape);
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);
}

// Linear interpolation helper for vectors
function lerpVector(a, b, t) {
  return a.clone().lerp(b, t);
}

// Animation loop for updating scene
function animate3D() {
  requestAnimationFrame(animate3D);
  const currentTime = Date.now();

  shapes.forEach(shape => {
    shape.rotation.x += 0.005;
    shape.rotation.y += 0.005;

    let elapsed = currentTime - shape.userData.moveStartTime;
    let t = elapsed / shape.userData.moveDuration;
    if (t >= 1) {
      shape.userData.startPosition = shape.position.clone();
      shape.userData.targetPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      shape.userData.moveStartTime = currentTime;
      shape.userData.moveDuration = 5000 + Math.random() * 2000;
      t = 0;
    }
    shape.position.copy(lerpVector(shape.userData.startPosition, shape.userData.targetPosition, t));

    let cycleTime = (currentTime - shape.userData.opacityCycleStart) % shape.userData.cycleDuration;
    if (cycleTime < 1000) {
      shape.material.opacity = shape.userData.initialOpacity * (1 - cycleTime / 1000);
    } else if (cycleTime < 3000) {
      shape.material.opacity = 0;
    } else if (cycleTime < 4000) {
      shape.material.opacity = shape.userData.initialOpacity * ((cycleTime - 3000) / 1000);
    } else {
      shape.material.opacity = shape.userData.initialOpacity;
    }
  });

  renderer.render(scene, camera);
}

// Update on window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init3D();
animate3D();

// ---------------------- Frontend Application Code ----------------------

// Toggle between text input and image upload options
document.querySelectorAll('input[name="inputOption"]').forEach((elem) => {
  elem.addEventListener("change", function(event) {
    if (event.target.value === "text") {
      document.getElementById("textInputDiv").classList.remove("hidden");
      document.getElementById("imageUploadDiv").classList.add("hidden");
    } else {
      document.getElementById("textInputDiv").classList.add("hidden");
      document.getElementById("imageUploadDiv").classList.remove("hidden");
    }
  });
});

// Event listener for the Encode button click.
// It checks whether text or image input is selected, then sends the appropriate request.
document.getElementById("encodeButton").addEventListener("click", function() {
  // Retrieve the K value from the common input field.
  const kValue = document.getElementById("kInput").value;
  let selectedOption = document.querySelector('input[name="inputOption"]:checked').value;
  
  if (selectedOption === "text") {
    const text = document.getElementById("textInput").value;
    // Send both text and kValue to the '/encode' endpoint.
    fetch('/encode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, k: kValue })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        // Show error message if there's an issue (e.g., K value is too small).
        alert(data.error);
      } else {
        showEncoded(data.encoded);
        generateQRCode(data.encoded);
        document.getElementById("qrSection").classList.remove("hidden");
        document.getElementById("encodedSection").classList.remove("hidden");
      }
    })
    .catch(err => console.error(err));
  } else {
    const file = document.getElementById("imageInput").files[0];
    if (!file) {
      alert("Please upload an image file.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    // Append the K parameter.
    formData.append("k", kValue);
  
    document.getElementById("encodedMessage").value = "Encoding image...";
    document.getElementById("qrcode").innerHTML = "Generating QR codes...";
  
    fetch("/encode_image", {
      method: "POST",
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error("Image encoding failed.");
      return response.json();
    })
    .then(data => {
      if (data.error) {
        // Show error message if the K value is less than 7.
        alert(data.error);
        document.getElementById("encodedMessage").value = "";
        document.getElementById("qrcode").innerHTML = "";
      } else if (!data.encoded || !data.images) {
        throw new Error("Incomplete response from server.");
      } else {
        showEncoded(data.encoded);
        showQRCodes(data.images);
        document.getElementById("qrSection").classList.remove("hidden");
        document.getElementById("encodedSection").classList.remove("hidden");
      }
    })
    .catch(err => {
      console.error("Error:", err);
      alert("Error encoding the image: " + err.message +" \nPlease Check the K value (K >= 7) or the image format.");
      document.getElementById("encodedMessage").value = "Please Check the K value (K >= 7) or the image format.";
      document.getElementById("encodedSection").classList.remove("hidden");
      document.getElementById("qrcode").innerHTML = "";
    });
  }
});


// Function to display the encoded message in the encoded message textarea
function showEncoded(encoded) {
  let outputText = "";
  // Read the K value from the input field and compute rowWidth = 2^(k-1)
  const k = Number(document.getElementById("kInput").value) || 8; // default to 8 if not provided
  const rowWidth = Math.pow(2, k - 1);

  if (Array.isArray(encoded)) {
    if (encoded.length > 0 && Array.isArray(encoded[0])) {
      // Process nested arrays with a delimiter between numbers.
      for (let i = 0; i < encoded.length; i++) {
        let rowStr = "";
        for (let j = 0; j < encoded[i].length; j++) {
          rowStr += String(encoded[i][j]) + " ";  
        }
        outputText += rowStr.trim() + "\n";  // Trim trailing space.
      }
    } else {
      // For one-dimensional arrays, add delimiters and format into rows.
      for (let i = 0; i < encoded.length; i += rowWidth) {
        let slice = encoded.slice(i, i + rowWidth);
        let rowStr = slice.join(" ");  // Join with a space.
        outputText += rowStr + "\n";
      }
    }
  } else {
    outputText = String(encoded);
  }
  document.getElementById("encodedMessage").value = outputText;
  document.getElementById("encodedSection").classList.remove("hidden");
}


// Function to display QR codes from a list of image URLs
function showQRCodes(imageUrls) {
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = ""; // Clear previous QR codes.
  if (imageUrls && imageUrls.length > 0) {
    imageUrls.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `QR Code ${i + 1}`;
      img.style.width = "200px";
      img.style.margin = "10px";
      qrContainer.appendChild(img);
    });
  } else {
    qrContainer.innerHTML = `<p style="color:red;">No QR codes generated.</p>`;
  }
}

// Function to generate QR codes using the QRCode.js library
// For text input, we assume the encoded data is a binary array.
async function generateQRCode(binaryArray) {
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "Generating QR code...";

  // If binaryArray is an array, convert it to string; if not, use as-is.
  const binaryString = Array.isArray(binaryArray) ? binaryArray.join("") : binaryArray;

  try {
    const response = await fetch("/generate_qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: binaryString })
    });
    const json = await response.json();
    qrContainer.innerHTML = ""; // Clear loading message

    if (json.images && json.images.length > 0) {
      json.images.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `QR Code ${i + 1}`;
        img.style.width = "200px";
        img.style.margin = "10px";
        qrContainer.appendChild(img);
      });
    } else {
      qrContainer.innerHTML = `<p style="color:red;">${json.error || 'Failed to generate QR'}</p>`;
    }
  } catch (err) {
    qrContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}
