/*
notebook編集可能作業前
*/

import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notebookContent, setNotebookContent] = useState([]);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload_ipynb/", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploadMessage(`アップロード完了: ${data.copy_path}`);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const notebook = JSON.parse(e.target.result);
            const codeCells = notebook.cells.filter(cell => cell.cell_type === "code");
            setNotebookContent(codeCells.map(cell => cell.source.join("")));
    } catch (err) {
        console.error("ipynbファイルの読み込みに失敗:", err);
    }
    };
    reader.readAsText(file);

  };


  const explainCode = async () => {
    if (!code || code.trim() === "") {
        alert("コードを入力してください！");
        return;
    }

    console.log("送信するコード：", code);

    try {
        const res = await fetch("http://localhost:8000/explain_code/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_snippet: code }),
        });

        const data = await res.json();
        setExplanation(data.explanation || data.error);
    } catch (err) {
        console.error("通信エラー:", err);
    }
    };



  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">演習支援Copilot</h1>

      {/* ファイルアップロード */}
      <div className="mb-4">
        <input type="file" accept=".ipynb" onChange={handleFileChange} />
        <button
          onClick={uploadFile}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          アップロード
        </button>
        <p className="mt-2 text-sm text-green-600">{uploadMessage}</p>
      </div>

      {/* コード入力と説明 */}
      <div className="mb-4">
        <textarea
          rows="10"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="ここにコードを貼り付けてください"
        />
        <button
          onClick={explainCode}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          コードの意味を解釈
        </button>
      </div>

      {/* 説明表示 */}
      {explanation && (
        <div className="bg-white p-4 border border-gray-300 rounded shadow">
          <h2 className="font-semibold mb-2">解説：</h2>
          <pre>{explanation}</pre>
        </div>
      )}
    </div>
  );
}

export default App;

