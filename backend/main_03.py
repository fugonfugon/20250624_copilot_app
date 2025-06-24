# main.py
#あとでgeminiapiに変える

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from dotenv import load_dotenv
import nbformat
import google.generativeai as genai  

# .envの読み込み
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# フロントエンドと通信できるようにCORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ファイルアップロード & コピー保存
@app.post("/upload_ipynb/")
async def upload_ipynb(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 編集用のコピーを作成
    edit_path = file_path.replace(".ipynb", "_edit.ipynb")
    shutil.copy(file_path, edit_path)

    return {"filename": file.filename, "copy_path": edit_path}

# コードの説明を生成（仮：Gemini API）
@app.post("/explain_code/")
async def explain_code(data: dict):
    try:
        code = data.get("code_snippet", "")
        if not code:
            return {"explanation": "コードが空です。"}

        prompt = f"以下のPythonコードが何をしようとしているか、初心者にもわかるように日本語でやさしく説明してください。\n\n{code}"

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)

        return {"explanation": response.text}
    
    except Exception as e:
        return {"error": str(e)}
    
@app.post("/chat/")
async def chat(data: dict):
    try:
        message = data.get("message", "")
        if not message:
            return {"response": "質問が空です。"}

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(message)

        return {"response": response.text}
    except Exception as e:
        return {"error": str(e)}




