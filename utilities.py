import cv2
import numpy as np
import qrcode
from PIL import Image
from qrcode.exceptions import DataOverflowError
import os
import uuid
# from code taken is hadamard_encoder.py 
# hadamard_encoder part of the code
class HadamardEncoder:
    def __init__(self, K):
        """
        Initialize the Hadamard encoder with parameter K.
        The augmented Hadamard matrix will have size 2^K and each encoded message
        (codeword) will have length 2^(K-1).
        """
        self.K = K
        self.W = 1 << K          # 2^K rows in the full matrix
        self.N = 1 << (K - 1)    # Codeword length is 2^(K-1)
        # Build the mod array: each element is 1 or -1 depending on the parity of the index.
        self.mod = [1 - 2 * self.parity(i) for i in range(self.W)]
    
    @staticmethod
    def parity(x):
        """
        Compute the parity (0 for even, 1 for odd) of an integer x.
        Uses a series of XORs to collapse the bit count.
        """
        x ^= x >> 16
        x ^= x >> 8
        x ^= x >> 4
        x ^= x >> 2
        x ^= x >> 1
        return x & 1

    def __call__(self, msg):
        """
        Encode an integer message into an extended Hadamard codeword.
        
        Args:
            msg (int): The message to encode. Should be in the range 0 <= msg < 2^K.
        
        Returns:
            List[int]: A list of length 2^(K-1) with values +1 or -1 representing the codeword.
        """
        if msg < 0 or msg >= (1 << self.K):
            raise ValueError(f"Message value {msg} is out of range. Must be between 0 and { (1 << self.K) - 1 }.")
        codeword = [self.mod[msg & (i | self.N)] for i in range(self.N)]
        # Map -1 to 0 and +1 to 1.
        binary_codeword = [0 if value == -1 else 1 for value in codeword]
        return binary_codeword
    
# Auxiliary function to encode binary strings using Hadamard encoding parts

def is_binary_string(input_str):
    """Return True if input_str contains only '0' and '1' characters."""
    return all(c in "01" for c in input_str)

def encode_text_string(input_str, encoder):
    """
    Encode a text string: each character is converted to its ASCII value,
    then encoded using the Hadamard encoder.
    """
    encoded_data = []
    for c in input_str:
        ascii_value = ord(c)
        # Ensure that ascii_value fits in the allowed range (for K=8, 0..255)
        code = encoder(ascii_value)
        encoded_data.extend(code)
    return encoded_data

def encode_binary_string(input_str, encoder):
    """
    Encode a binary string (composed of '0's and '1's).
    Each bit (as 0 or 1) is encoded into a Hadamard codeword.
    """
    encoded_data = []
    for c in input_str:
        bit_value = int(c)
        code = encoder(bit_value)
        encoded_data.extend(code)
    return encoded_data

def encode_image(image_path, encoder):
    """
    Encode a grayscale image using the Hadamard encoder.
    Each pixel value (0-255 for K=8) is treated as a message and encoded.
    
    Returns:
        A NumPy array of shape (rows, cols, codeword_length) containing the encoded codewords.
    """
    # Load image in grayscale mode
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError("Image not found or unable to open.")
    
    rows, cols = img.shape
    codeword_length = encoder.N
    encoded_img = np.zeros((rows, cols, codeword_length), dtype=np.int8)
    
    for i in range(rows):
        for j in range(cols):
            pixel_val = int(img[i, j])
            # Clip pixel value if necessary (for example, if K is set to encode a larger range)
            if pixel_val >= (1 << encoder.K):
                pixel_val = (1 << encoder.K) - 1
            codeword = encoder(pixel_val)
            encoded_img[i, j, :] = codeword
    return encoded_img

# Auxiliary function to generate QR codes from data
def find_max_chunk_size(data, error_correction=qrcode.constants.ERROR_CORRECT_M):
    """
    Determines the maximum number of characters that can fit in one QR code of max version (40).
    Uses binary search.
    """
    lo = 1
    hi = len(data)
    max_size = 0
    while lo <= hi:
        mid = (lo + hi) // 2
        try:
            qr = qrcode.QRCode(
                version=40,
                error_correction=error_correction,
                box_size=10,
                border=4
            )
            qr.add_data(data[:mid])
            qr.make(fit=False)
            max_size = mid
            lo = mid + 1
        except DataOverflowError:
            hi = mid - 1
    return max_size


def generate_qr(qr_data, filename):
    """
    Generates a QR code and saves it to the given filename.
    Automatically picks the appropriate version.
    """
    try:
        qr = qrcode.QRCode(
            version=None,  # Auto
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(filename)
        print(f"Generated QR saved as {filename}")
    except ValueError as e:
        if "Invalid version" in str(e):
            raise DataOverflowError("Data too large for maximum QR version (40).")
        else:
            raise


def process_data_into_qrcodes(data, output_folder="static/qrcodes"):
    """
    Splits the data into chunks that can each fit in one QR code,
    then generates and saves QR images to the output folder.
    """
    os.makedirs(output_folder, exist_ok=True)
    
    max_chunk_size = find_max_chunk_size(data)
    if max_chunk_size == 0:
        raise ValueError("Unable to fit any data into a QR code.")

    chunks = [data[i:i + max_chunk_size] for i in range(0, len(data), max_chunk_size)]
    filenames = []

    for chunk in chunks:
        filename = os.path.join(output_folder, f"qr_{uuid.uuid4().hex}.png")
        generate_qr(chunk, filename)
        filenames.append(filename)

    return filenames
