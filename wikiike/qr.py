import sys
import base64
import qrcode
from PIL import Image, ImageEnhance, ImageChops
from cryptography.fernet import Fernet

def generate_encryption_key(key_string):
    key = key_string.encode('utf-8')
    key = key.ljust(32, b'0')[:32]  # Pad or truncate to 32 bytes
    return base64.urlsafe_b64encode(key)

def encrypt_message(message, key_string):
    key = generate_encryption_key(key_string)
    fernet = Fernet(key)
    encrypted_message = fernet.encrypt(message.encode('utf-8'))
    return encrypted_message.decode('utf-8')

def create_qr_code(data, version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4, fill_color="black", back_color="white"):
    qr = qrcode.QRCode(
        version=version,
        error_correction=error_correction,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    return img.convert('RGBA')

def combine_qr_codes(primary_img, secondary_img, tertiary_img):
    # Resize secondary QR code
    sec_size = (primary_img.size[0] // 5, primary_img.size[1] // 5)  # Make it smaller
    secondary_img = secondary_img.resize(sec_size, Image.LANCZOS)
    
    # Blend secondary QR code into primary by adjusting opacity
    secondary_img = secondary_img.convert("RGBA")
    secondary_img = ImageEnhance.Brightness(secondary_img).enhance(0.4)  # Reduce visibility
    sec_position = (
        (primary_img.size[0] // 4),  # Position it off-center
        (primary_img.size[1] // 4)
    )
    primary_img.paste(secondary_img, sec_position, secondary_img)

    # Resize and colorize tertiary QR code for better blending
    ter_size = (primary_img.size[0] // 6, primary_img.size[1] // 6)
    tertiary_img = tertiary_img.resize(ter_size, Image.LANCZOS)
    r, g, b, a = tertiary_img.split()
    red_tertiary_img = Image.merge("RGBA", (r, Image.new('L', r.size, 50), Image.new('L', r.size, 50), a))  # Darken further
    red_tertiary_img = ImageEnhance.Brightness(red_tertiary_img).enhance(0.6)  # Reduce brightness

    # Position tertiary QR code at the bottom-right corner, away from focus points
    ter_position = (
        primary_img.size[0] - tertiary_img.size[0] - 20,  # Adjust to avoid being too close to edges
        primary_img.size[1] - tertiary_img.size[1] - 20
    )
    primary_img.paste(red_tertiary_img, ter_position, red_tertiary_img)

    return primary_img

def main():
    if len(sys.argv) != 4:
        print("Usage: python complex_qr_generator.py <URL> <Key> <Message>")
        sys.exit(1)

    url = sys.argv[1]
    key_string = sys.argv[2]
    message = sys.argv[3]

    # Encrypt the message
    encrypted_message = encrypt_message(message, key_string)

    # Generate primary QR code
    primary_qr = create_qr_code(
        url,
        version=10,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4
    )

    # Generate secondary QR code (encrypted message)
    secondary_qr = create_qr_code(
        encrypted_message,
        version=5,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=6,
        border=4
    )

    # Generate tertiary QR code (key)
    tertiary_qr = create_qr_code(
        key_string,
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=4,
        border=4
    )

    # Combine QR codes with better blending techniques
    final_qr = combine_qr_codes(primary_qr, secondary_qr, tertiary_qr)

    # Save the final image
    final_qr.save("complex_qr_code.png")
    print("Complex QR code generated and saved as 'complex_qr_code.png'.")

if __name__ == "__main__":
    main()
