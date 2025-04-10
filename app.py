from flask import Flask, request, send_file, jsonify, render_template
import io
import os
import json
import cv2
import numpy as np
import qrcode
import uuid
import shutil
import pandas as pd
# ReportLab for PDF downloads (if needed)
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Import all functions and classes from utilities.py
from utilities import (
    HadamardEncoder,
    is_binary_string,
    encode_text_string,
    encode_binary_string,
    encode_image as encode_image_util,
    find_max_chunk_size,
    generate_qr,
    process_data_into_qrcodes
)

app = Flask(__name__)

# Folder for storing generated QR code images (Flask will serve this from /static)
QR_FOLDER = os.path.join("static", "qrcodes")
os.makedirs(QR_FOLDER, exist_ok=True)

# ----------------------------------------------------------------------------
# Home page endpoint (renders index.html)
@app.route('/')
def home():
    return render_template("index.html")
# Report page endpoint (renders report.html)
@app.route('/report')
def report():
    return render_template('report.html')

# ----------------------------------------------------------------------------
# Endpoint to encode text using the Hadamard encoder.
@app.route('/encode', methods=['POST'])
def encode():
    data = request.json
    k_param = request.form.get("k", "8")
    try:
        K = int(k_param)
    except ValueError:
        K = 8

    encoder = HadamardEncoder(K)
    text = data.get('text', '')
    if is_binary_string(text):
        print("Encoding binary string...")
        encoded = encode_binary_string(text, encoder)
    else:
        print("Encoding text string...")
        encoded = encode_text_string(text, encoder)
    ex_encoded = [1 if c == 1 else 0 for c in encoded]
    return jsonify({'encoded': ex_encoded})

# ----------------------------------------------------------------------------
# NEW: Endpoint to encode an uploaded image.
# This endpoint accepts an image file (via multipart/form-data),
# encodes it using the provided `encode_image` function, and then
# splits the resulting encoded data into QR codes.
@app.route('/encode_image', methods=['POST'])
def image_encode():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    image_file = request.files['image']

    # Read the K parameter from the form data (default to 8 if not provided)
    k_param = request.form.get("k", "8")
    try:
        K = int(k_param)
    except ValueError:
        K = 8
    if K < 7:
        return jsonify({"error": "K value must be 7 or greater for image encoding."}), 500

    # Clear previously generated QR codes.
    if os.path.exists(QR_FOLDER):
        shutil.rmtree(QR_FOLDER)
    os.makedirs(QR_FOLDER, exist_ok=True)

    # Save the uploaded image temporarily.
    temp_folder = "temp"
    os.makedirs(temp_folder, exist_ok=True)
    temp_path = os.path.join(temp_folder, image_file.filename)
    image_file.save(temp_path)

    try:
        encoder = HadamardEncoder(K)
        # Call the image encoding function from utilities.py.
        encoded_img = encode_image_util(temp_path, encoder)
        encoded_list = encoded_img.tolist()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    encoded_str = json.dumps(encoded_list)

    try:
        filenames = process_data_into_qrcodes(encoded_str, output_folder=QR_FOLDER)
    except Exception as e:
        return jsonify({"error": f"Error generating QR codes: {str(e)}"}), 500

    urls = [f"/static/qrcodes/{os.path.basename(f)}" for f in filenames]
    return jsonify({"encoded": encoded_list, "images": urls})
#----------------------------------------------------------------------------
# Endpoint to generate QR codes from provided data.
@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    if os.path.exists(QR_FOLDER):
        shutil.rmtree(QR_FOLDER)  # delete the folder and all its contents
    os.makedirs(QR_FOLDER, exist_ok=True) 
    # recreate clean folder
    data = request.json.get("data", "")
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        filenames = process_data_into_qrcodes(data, output_folder=QR_FOLDER)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Create URLs relative to the static folder.
    urls = [f"/static/qrcodes/{os.path.basename(f)}" for f in filenames]
    return jsonify({"images": urls})

# ----------------------------------------------------------------------------
# Endpoint to download encoded data as CSV.
@app.route('/download/csv', methods=['POST'])
def download_csv():
    data = request.json
    encoded = data.get('encoded', '')
    import pandas as pd
    df = pd.DataFrame({'encoded': [encoded]})
    csv_file = io.StringIO()
    df.to_csv(csv_file, index=False)
    csv_file.seek(0)
    return send_file(io.BytesIO(csv_file.getvalue().encode()),
                     mimetype='text/csv',
                     download_name='encoded.csv',
                     as_attachment=True)

# ----------------------------------------------------------------------------
# Endpoint to download encoded data as PDF.
@app.route('/download/pdf', methods=['POST'])
def download_pdf():
    data = request.json
    encoded = data.get('encoded', '')
    pdf_output = io.BytesIO()
    c = canvas.Canvas(pdf_output, pagesize=letter)
    text_object = c.beginText(40, 750)
    text_object.textLines(str(encoded))
    c.drawText(text_object)
    c.showPage()
    c.save()
    pdf_output.seek(0)
    return send_file(pdf_output,
                     mimetype='application/pdf',
                     download_name='encoded.pdf',
                     as_attachment=True)

# Endpoint to download encoded data as Excel.
@app.route('/download/excel', methods=['POST'])
def download_excel():
    data = request.json
    encoded = data.get('encoded', '')
    # If your encoded data is a string that comes formatted,
    # you might need to split it into rows (e.g. by newline) 
    # and then further into columns (by space).
    rows = [row.split() for row in encoded.strip().split("\n")]
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, header=False)
    output.seek(0)
    return send_file(
        output,
        as_attachment=True,
        download_name='encoded_message.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
# ----------------------------------------------------------------------------
# Endpoint to download a single QR code as PNG.
@app.route('/download/qrcode', methods=['POST'])
def download_qrcode():
    data = request.json
    encoded = data.get('encoded', '')
    qr_img = qrcode.make(encoded)
    img_io = io.BytesIO()
    qr_img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io,
                     mimetype='image/png',
                     download_name='qrcode.png',
                     as_attachment=True)

# ----------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True)
