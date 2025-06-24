import React, { useState } from "react";
import Split from "react-split";

function App() {
  const [notebookContent, setNotebookContent] = useState([]);
  const [selectedCode, setSelectedCode] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadStatus("アップロード中...");
      const res = await fetch("http://localhost:8000/upload_ipynb/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setNotebookContent(data.cells);
      setUploadStatus("アップロード完了！");
    } catch (error) {
      console.error("アップロードエラー:", error);
      setUploadStatus("アップロード失敗！");
    }
  };

  const handleExplain = async () => {
    if (!selectedCode?.text) return;

    const res = await fetch("http://localhost:8000/explain_code/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code_snippet: selectedCode.text,
        notebook_code: selectedCode.full,
        cell_index: selectedCode.cellIndex,
        all_cells: selectedCode.allCells,
      }),
    });

    const data = await res.json();
    setExplanation(data.explanation || data.error || "説明を取得できませんでした。");
  };

  const handleChatSubmit = async (message) => {
    const newMessages = [...chatMessages, { user: message }];
    setChatMessages(newMessages);

    const res = await fetch("http://localhost:8000/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    setChatMessages([...newMessages, { bot: data.response || data.error }]);
  };

  return (
    <Split className="flex h-screen" sizes={[60, 40]} minSize={200} expandToMin={false} gutterSize={10}>
      {/* 左：コードエリア */}
      <div className="p-4 overflow-y-scroll border-r border-gray-300">
        <h2 className="text-xl font-bold mb-2">ノートブックをアップロード</h2>
        <input type="file" accept=".ipynb" onChange={handleFileUpload} className="mb-2" />
        <p className="text-sm text-gray-500">{uploadStatus}</p>

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
                const selectedText = e.target.value.substring(
                  e.target.selectionStart,
                  e.target.selectionEnd
                );
                if (selectedText.trim()) {
                  setSelectedCode({
                    text: selectedText,
                    full: notebookContent.join("\n\n"),
                    cellIndex: idx,
                    allCells: notebookContent,
                  });
                }
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
          onClick={handleExplain}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          選択部分の意味を解釈
        </button>
      </div>

      {/* 右：Split（縦） */}
      <Split direction="vertical" sizes={[50, 50]} minSize={100} className="flex flex-col p-2">
        {/* 右上：コードの解説 */}
        <div className="overflow-y-auto border-b border-gray-300 p-2">
          <h2 className="text-lg font-bold mb-2">コードの解説</h2>
          <pre className="whitespace-pre-wrap text-sm">{explanation}</pre>
        </div>

        {/* 右下：チャット */}
        <div className="overflow-y-auto p-2">
          <h2 className="text-lg font-bold mb-2">チャットボットと会話</h2>
          {chatMessages.map((msg, i) => (
            <div key={i} className="mb-2 text-sm">
              {msg.user && <div><strong>あなた:</strong> {msg.user}</div>}
              {msg.bot && <div><strong>Copilot:</strong> {msg.bot}</div>}
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const message = e.target.message.value;
              e.target.message.value = "";
              handleChatSubmit(message);
            }}
            className="mt-2"
          >
            <input
              name="message"
              type="text"
              placeholder="質問を入力..."
              className="w-full p-2 border border-gray-300 rounded"
            />
          </form>
        </div>
      </Split>
    </Split>
  );
}

export default App;
