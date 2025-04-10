// Function to download encoded message file in different formats
function downloadFile(format) {
    // Get the encoded message text from the textarea.
    const encoded = document.getElementById("encodedMessage").value;
    
    // Map format to the corresponding endpoint and filename.
    let endpoint = "";
    let filename = "";
    switch (format) {
      case "csv":
        endpoint = "/download/csv";
        filename = "encoded.csv";
        break;
      case "pdf":
        endpoint = "/download/pdf";
        filename = "encoded.pdf";
        break;
      case "excel":
        endpoint = "/download/excel";
        filename = "encoded_message.xlsx";
        break;
      default:
        console.error("Invalid download format");
        return;
    }
    
    // Send the POST request to the Flask endpoint.
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encoded: encoded })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.blob();
    })
    .then(blob => {
      // Create a temporary URL for the blob.
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => console.error("Download error:", err));
  }
  
  // Function to download QR code (if needed); similar pattern applies.
  function downloadQRCode(format) {
    // For QR codes, you might want to use the QR code image source directly.
    // Here we'll assume your backend endpoint for QR code download is '/download/qrcode'
    // and takes a POST with the encoded data (or you may adapt it to download the generated image).
    const encoded = document.getElementById("encodedMessage").value;
    
    // Map format to the MIME type and filename.
    let mimeType = "", filename = "";
    if (format === "png") {
      mimeType = "image/png";
      filename = "qrcode.png";
    } else if (format === "jpeg") {
      mimeType = "image/jpeg";
      filename = "qrcode.jpeg";
    } else if (format === "pdf") {
      mimeType = "application/pdf";
      filename = "qrcode.pdf";
    } else {
      console.error("Invalid QR code format");
      return;
    }
    
    fetch("/download/qrcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encoded: encoded, format: format })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok for QR download");
      }
      return response.blob();
    })
    .then(blob => {
      // Create a temporary URL and download.
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => console.error("QR Code download error:", err));
  }
  