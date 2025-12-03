#!/usr/bin/env python3
"""
PDF to Markdown Converter
Extracts text and images from PDFs and saves them as PNG files with transparency support.
Properly handles soft masks (SMask) for transparent backgrounds.
"""

import io
import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF not installed. Installing...")
    os.system("pip install PyMuPDF")
    import fitz

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Installing...")
    os.system("pip install Pillow")
    from PIL import Image


def extract_image_with_mask(doc, xref: int) -> bytes:
    """
    Extract an image from PDF, properly handling soft masks for transparency.

    Args:
        doc: PyMuPDF document
        xref: Image reference number

    Returns:
        PNG image bytes with transparency
    """
    # Get the image
    base_image = doc.extract_image(xref)
    image_bytes = base_image["image"]

    # Open the base image
    img = Image.open(io.BytesIO(image_bytes))

    # Check if there's an SMask (soft mask for transparency)
    img_dict = doc.xref_object(xref)

    # Look for SMask reference
    smask_xref = None
    if "/SMask" in img_dict:
        # Extract SMask xref number
        import re
        smask_match = re.search(r'/SMask\s+(\d+)\s+\d+\s+R', img_dict)
        if smask_match:
            smask_xref = int(smask_match.group(1))

    if smask_xref:
        try:
            # Extract the mask image
            mask_image = doc.extract_image(smask_xref)
            mask_bytes = mask_image["image"]
            mask = Image.open(io.BytesIO(mask_bytes))

            # Convert mask to grayscale if needed
            if mask.mode != 'L':
                mask = mask.convert('L')

            # Resize mask if dimensions don't match
            if mask.size != img.size:
                mask = mask.resize(img.size, Image.Resampling.LANCZOS)

            # Convert base image to RGBA
            if img.mode == 'CMYK':
                img = img.convert('RGB')
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # Apply the mask as alpha channel
            img.putalpha(mask)

        except Exception as e:
            print(f"      Warning: Could not apply mask: {e}")
            # Fall back to simple conversion
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
    else:
        # No mask found - check if it's already RGBA or has transparency
        if img.mode == 'CMYK':
            img = img.convert('RGB')

        # For images without mask, keep original format but convert to RGBA
        if img.mode == 'RGBA':
            pass  # Already has alpha
        elif img.mode == 'LA':
            img = img.convert('RGBA')
        elif img.mode == 'P' and 'transparency' in img.info:
            img = img.convert('RGBA')
        else:
            # No transparency info - convert to RGBA anyway
            img = img.convert('RGBA')

    # Save as PNG
    output = io.BytesIO()
    img.save(output, format='PNG')
    return output.getvalue()


def extract_pdf_to_markdown(pdf_path: str, output_dir: str) -> None:
    """
    Extract text and images from a PDF and save as markdown.
    Images are converted to PNG format with proper transparency handling.

    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save markdown and images
    """
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)

    # Create output directories
    pdf_name = pdf_path.stem
    md_output_dir = output_dir / pdf_name
    images_dir = md_output_dir / "images"
    md_output_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    print(f"Processing: {pdf_path.name}")

    # Open PDF
    doc = fitz.open(pdf_path)

    all_content = []
    all_content.append(f"# {pdf_name}\n\n")

    # Track processed images to avoid duplicates
    processed_xrefs = set()

    for page_num in range(len(doc)):
        page = doc[page_num]
        print(f"  Processing page {page_num + 1}/{len(doc)}")

        # Add page header
        all_content.append(f"\n---\n\n## Page {page_num + 1}\n\n")

        # Extract text
        text = page.get_text("text")
        if text.strip():
            all_content.append(text)
            all_content.append("\n")

        # Extract images
        image_list = page.get_images(full=True)

        img_counter = 0
        for img in image_list:
            xref = img[0]

            # Skip if this is likely a mask (will be processed with its parent image)
            # or if we've already processed this xref
            if xref in processed_xrefs:
                continue

            try:
                # Extract image with proper mask handling
                png_bytes = extract_image_with_mask(doc, xref)
                processed_xrefs.add(xref)

                # Save as PNG
                img_counter += 1
                image_filename = f"page{page_num + 1}_img{img_counter}.png"
                image_path = images_dir / image_filename

                with open(image_path, "wb") as img_file:
                    img_file.write(png_bytes)

                # Add image reference to markdown
                relative_path = f"images/{image_filename}"
                all_content.append(f"\n![Image {img_counter}]({relative_path})\n")

            except Exception as e:
                print(f"    Warning: Could not extract image on page {page_num + 1}: {e}")

    doc.close()

    # Write markdown file
    md_file = md_output_dir / f"{pdf_name}.md"
    with open(md_file, "w", encoding="utf-8") as f:
        f.write("".join(all_content))

    print(f"  Saved: {md_file}")
    print(f"  Images saved to: {images_dir}")


def main():
    # Define paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    resources_dir = project_dir / "resources"
    output_dir = project_dir / "resources" / "extracted"

    # Find all PDFs
    pdf_files = list(resources_dir.glob("*.pdf"))

    if not pdf_files:
        print("No PDF files found in resources directory.")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF file(s)")
    print("Images will be converted to PNG with transparency support")
    print("-" * 50)

    for pdf_file in pdf_files:
        extract_pdf_to_markdown(pdf_file, output_dir)
        print("-" * 50)

    print("\nDone! Check the 'resources/extracted' directory.")


if __name__ == "__main__":
    main()
