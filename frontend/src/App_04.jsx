//WRITEME改善でreact-splitが消されそうだったので複製。

import React, { useState } from "react";
import Split from "react-split";

function App() {
  const [file, setFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notebookContent, setNotebookContent] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);

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
    reader.readAsText(uploadedFile);
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
  };

  const downloadNotebook = () => {
    const notebook = {
      cells: notebookContent.map(cell => ({
        cell_type: "code",
        metadata: {},
        execution_count: null,
        outputs: [],
        source: cell.split("\n").map(line => line + "\n")
      })),
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5
    };

    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edited_notebook.ipynb";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen">
      <Split className="flex h-full" sizes={[60, 40]} minSize={200} gutterSize={6}>
        {/* 左：コードエリア */}
        <div className="p-4 overflow-auto bg-gray-50">
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

          {/* ノートブック編集 */}
          {notebookContent.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">ノートブック編集</h2>
              {notebookContent.map((cell, idx) => (
                <div key={idx} className="mb-4">
                  <label className="block text-sm font-semibold mb-1">コードセル {idx + 1}</label>
                  <textarea
                    rows="6"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={cell}
                    onChange={(e) => {
                      const newContent = [...notebookContent];
                      newContent[idx] = e.target.value;
                      setNotebookContent(newContent);
                    }}
                    onMouseUp={(e) => {
                      const selectedText = e.target.value.substring(e.target.selectionStart, e.target.selectionEnd);
                      const fullNotebook = notebookContent.join("\n\n");
                      setSelectedCode({
                        text: selectedText,
                        full: fullNotebook
                      });
                    }}
                  />
                  <button
                    onClick={async () => {
                      const res = await fetch("http://localhost:8000/run_code/", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code: cell }),
                      });
                      const data = await res.json();
                      const output = data.stdout || "";
                      const error = data.stderr || "";
                      alert("出力:\n" + output + (error ? "\nエラー:\n" + error : ""));
                    }}
                    className="mt-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    ▶ 実行
                  </button>
                </div>
              ))}
              <button
                onClick={downloadNotebook}
                className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                編集内容を.ipynb形式でダウンロード
              </button>
            </div>
          )}
        </div>

        {/* 右：上下分割 */}
        <Split direction="vertical" className="flex flex-col h-full" sizes={[50, 50]} minSize={100} gutterSize={6}>
          {/* 上：選択コードの解説 */}
          <div className="p-4 overflow-auto bg-white leading-tight">
            {selectedCode && (
              <div>
                <h3 className="text-md font-semibold mb-2">選択したコード：</h3>
                <pre className="p-2 bg-gray-100 border rounded whitespace-pre-wrap break-words">
                  {selectedCode.text}
                </pre>
                <button
                  onClick={async () => {
                    const res = await fetch("http://localhost:8000/explain_code/", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code_snippet: selectedCode.text }),
                    });
                    const data = await res.json();
                    setExplanation(data.explanation || data.error);
                  }}
                  className="mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  選択部分の意味を解釈
                </button>
                {explanation && (
                  <div className="bg-white mt-4 p-4 border border-gray-300 rounded shadow leading-tight break-words">
                    <h2 className="font-semibold mb-2">解説：</h2>
                    <pre className="whitespace-pre-wrap break-words">{explanation}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 下：チャット */}
          <div className="p-4 overflow-auto bg-gray-100 flex flex-col justify-between">
            <h2 className="text-xl font-bold mb-2">Copilotチャット</h2>
            <div className="mb-4 max-h-64 overflow-y-auto bg-white p-3 rounded border">
              {chatHistory.map((item, index) => (
                <div key={index} className="mb-2">
                  <p><strong>あなた：</strong>{item.user}</p>
                  <p><strong>Copilot：</strong>{item.bot}</p>
                </div>
              ))}
            </div>
            <div className="flex mt-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="質問を入力してください"
                className="flex-grow p-2 border rounded mr-2"
              />
              <button
                onClick={async () => {
                  const res = await fetch("http://localhost:8000/chat/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: chatInput }),
                  });
                  const data = await res.json();
                  const newEntry = { user: chatInput, bot: data.response || data.error };
                  setChatHistory([...chatHistory, newEntry]);
                  setChatInput("");
                }}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              >
                送信
              </button>
            </div>
          </div>
        </Split>
      </Split>
    </div>
  );
}

export default App;
