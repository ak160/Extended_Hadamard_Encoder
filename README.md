# Extended_Hadamard_Encoder
This project is a web application that encodes text and black & white images using Hadamard encoding. The encoded output is displayed in both numerical format and as a series of QR codes. Users can control the encoding granularity using a user-defined parameter ``K``.

# ✨ Features
-  Text Encoding: Encode plain text using Hadamard matrix encoding.

- 🖼 Image Encoding: Each pixel of the uploaded image is encoded, and the resulting data is segmented row-wise to generate corresponding QR codes.

-  Adjustable K Value: Control the encoding complexity with K.

-  QR Code Generation: Encoded data is visualized as QR codes.

- Note ``K`` ≥ 7 for image encoding.
  
# 🛠️ Tech Stack
- Frontend: HTML, CSS, JavaScript .
- Backend: Python (Flask) .
- Libraries:
  - NumPy

  - OpenCV (for image processing)

  - qrcode (QR code generation)

  - PIL (Image handling)
# Installation 
```bash
git clone https://github.com/ak160/Extended_Hadamard_Encoder.git
cd hadamard
pip install -r requirement.txt
python app.py
```
# How It Works
Hadamard matrices are used for encoding data into binary-like forms.

For text, the message is split into blocks, encoded using a Hadamard matrix.

For images, pixel data is transformed similarly.

The resulting matrix or list is used to generate scannable QR codes.
