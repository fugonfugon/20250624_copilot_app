# main.py
#あとでgeminiapiに変える

from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from dotenv import load_dotenv
import nbformat
import google.generativeai as genai  
import subprocess

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
        selected = data.get("code_snippet", "")
        full_code = data.get("notebook_code", "")
        cell_index = data.get("cell_index", 0)
        all_cells = data.get("all_cells", [])

        if not selected:
            return {"explanation": "コードが空です。"}

        if "# WRITE ME" in selected:
            # 前後3セル分のコンテキストを抽出（安全にインデックスをチェック）
            context_cells = all_cells[max(0, cell_index-3): cell_index+4]
            context_text = "\n\n".join(context_cells)

            prompt = (
                "以下はあるPythonノートブックの一部です。\n"
                "「# WRITE ME」という部分に何を書けばよいかを、前後のコード文脈から想定できる解答につながるような"
                "ヒントを初学者にもわかるように提示してください。しかし解答のコードはここでは言ってはいけません。\n\n"
                f"【前後のコード文脈】\n{context_text}\n\n"
                f"【選択された部分】\n{selected}"
            )
        else:
            prompt = (
                "以下のPythonコードが何をしようとしているか、初心者にもわかるように日本語でやさしく説明してください。\n\n"
                f"{selected}"
            )

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


# コードの実行エンドポイント
# main.py内 run_code を修正
import ast

@app.post("/run_code/")
async def run_code(data: dict):
    try:
        code = data.get("code", "").strip()
        if not code:
            return {"output": "コードが空です。"}

        # ワンライナー式ならprintで囲む
        try:
            tree = ast.parse(code)
            if len(tree.body) == 1 and isinstance(tree.body[0], ast.Expr):
                code = f"print({code})"
        except:
            pass

        result = subprocess.run(
            ["python3", "-c", code],
            capture_output=True,
            text=True,
            timeout=5
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except Exception as e:
        return {"stderr": str(e)}


@app.get("/get_cells/{filename}")
async def get_cells(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            notebook = nbformat.read(f, as_version=4)
        code_cells = [
            cell['source']
            for cell in notebook.cells
            if cell['cell_type'] == 'code'
        ]
        return {"cells": code_cells}
    except Exception as e:
        return {"error": str(e)}







