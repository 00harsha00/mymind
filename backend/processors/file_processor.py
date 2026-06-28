import os
import tempfile
from fastapi import UploadFile

TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".cpp", ".c", ".h", ".go", ".rs", ".rb", ".php",
    ".html", ".css", ".json", ".yaml", ".yml", ".xml", ".sh",
    ".sql", ".r", ".swift", ".kt",
}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".pptx", ".doc", ".ppt"}
SPREADSHEET_EXTENSIONS = {".xlsx", ".csv", ".xls"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


async def process_file(file: UploadFile) -> dict:
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    content_bytes = await file.read()

    if len(content_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size is 20MB.")

    if ext in TEXT_EXTENSIONS:
        content = content_bytes.decode("utf-8", errors="replace")
        file_type = "code" if ext not in {".txt", ".md"} else ext.lstrip(".")
    elif ext in DOCUMENT_EXTENSIONS:
        content = _process_with_markitdown(content_bytes, ext, filename)
        file_type = ext.lstrip(".")
    elif ext in SPREADSHEET_EXTENSIONS:
        content = _process_spreadsheet(content_bytes, ext, filename)
        file_type = ext.lstrip(".")
    elif ext in IMAGE_EXTENSIONS:
        content = _process_image(content_bytes, ext)
        file_type = "image"
    else:
        raise ValueError(f"Unsupported file type: {ext}")

    return {
        "success": True,
        "filename": filename,
        "type": file_type,
        "content": content,
        "char_count": len(content),
        "estimated_tokens": len(content) // 4,
    }


def _process_with_markitdown(content_bytes: bytes, ext: str, filename: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content_bytes)
        tmp_path = tmp.name
    try:
        from markitdown import MarkItDown
        md = MarkItDown()
        result = md.convert(tmp_path)
        text = result.text_content or ""
        if not text.strip():
            return f"[Could not extract text from {filename}. The file may be scanned or image-based.]"
        return text
    except Exception as e:
        return f"[Error processing {filename}: {str(e)}]"
    finally:
        os.unlink(tmp_path)


def _process_spreadsheet(content_bytes: bytes, ext: str, filename: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content_bytes)
        tmp_path = tmp.name
    try:
        import pandas as pd
        if ext == ".csv":
            df = pd.read_csv(tmp_path)
        else:
            # Excel — read all sheets
            xl = pd.ExcelFile(tmp_path)
            if len(xl.sheet_names) == 1:
                df = xl.parse(0)
            else:
                parts = []
                for sheet in xl.sheet_names:
                    s_df = xl.parse(sheet)
                    parts.append(f"## Sheet: {sheet}\n\n{s_df.to_markdown(index=False)}")
                return "\n\n".join(parts)
        return df.to_markdown(index=False)
    except Exception as e:
        return f"[Error processing {filename}: {str(e)}]"
    finally:
        os.unlink(tmp_path)


def _process_image(content_bytes: bytes, ext: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content_bytes)
        tmp_path = tmp.name
    try:
        from PIL import Image
        import pytesseract
        img = Image.open(tmp_path)
        # Convert to RGB if needed
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        text = pytesseract.image_to_string(img).strip()
        if not text:
            return "[No text found in image. The image may not contain readable text.]"
        return text
    except Exception as e:
        return f"[OCR error: {str(e)}. Make sure Tesseract is installed: brew install tesseract]"
    finally:
        os.unlink(tmp_path)
