from fastapi import APIRouter, UploadFile, File, HTTPException
from processors.file_processor import process_file

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        result = await process_file(file)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "filename": file.filename,
            "code": "PROCESSING_ERROR",
        }
