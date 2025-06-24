//UIはいいかんじ。でも＃WRITEMEがおかしい。

import React, { useState, useEffect } from "react";
import Split from "react-split";
import "./App.css";

function App() {
  const [cells, setCells] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("http://localhost:8000/upload_ipynb/", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setFilename(file.name);

    const res = await fetch(`http://localhost:8000/get_cells/${file.name}`);
    const json = await res.json();
    setCells(json.cells);
  };

  const downloadEditedFile = async () => {
    const response = await fetch("http://localhost:8000/download_ipynb/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, new_cells: cells }),
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const updateCell = (index, newValue) => {
    const updated = [...cells];
    updated[index] = newValue;
    setCells(updated);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selected = selection.toString();
    if (!selected.trim()) return;

    const matchingIndexes = cells.map((cell, idx) => cell.includes(selected) ? idx : -1).filter(i => i !== -1);
    if (matchingIndexes.length === 0) return;

    const accurateIndex = matchingIndexes.find(idx => cells[idx].includes("# WRITE ME") && cells[idx].includes(selected));
    const targetIndex = accurateIndex !== undefined ? accurateIndex : matchingIndexes[0];

    fetch("http://localhost:8000/explain_code/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code_snippet: selected,
        notebook_code: cells.join("\n\n"),
        cell_index: targetIndex,
        all_cells: cells,
      }),
    })
      .then((res) => res.json())
      .then((data) => setExplanation(data.explanation));
  };

  const sendChat = async () => {
    const response = await fetch("http://localhost:8000/chat/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatInput }),
    });
    const data = await response.json();
    setChatLog([...chatLog, { role: "user", content: chatInput }, { role: "bot", content: data.response }]);
    setChatInput("");
  };

  return (
    <div className="h-screen w-screen">
      <Split className="flex h-full" direction="horizontal" sizes={[60, 40]} minSize={200} gutterSize={8}>
        <div className="p-6 overflow-auto bg-gray-50" onMouseUp={handleMouseUp}>
          <h1 className="text-3xl font-extrabold mb-6 text-gray-800">演習支援Copilot</h1>
          <div className="mb-4 flex items-center">
            <input type="file" accept=".ipynb" onChange={handleFileChange} className="file:px-4 file:py-2 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer" />
            <button onClick={uploadFile} className="ml-3 px-5 py-2 rounded bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow hover:opacity-90">アップロード</button>
            <button onClick={downloadEditedFile} className="ml-3 px-5 py-2 rounded bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow hover:opacity-90">ダウンロード</button>
          </div>
          {cells.map((cell, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-4 mb-6">
              <label className="block text-gray-700 font-semibold mb-1">コードセル {idx + 1}</label>
              <textarea
                className="w-full p-3 border rounded-lg bg-gray-50"
                rows="6"
                value={cell}
                onChange={(e) => updateCell(idx, e.target.value)}
              />
            </div>
          ))}
        </div>

        <Split className="flex flex-col h-full" direction="vertical" sizes={[50, 50]} minSize={100} gutterSize={8}>
          <div className="p-4 overflow-auto bg-white border-l border-b rounded-t-lg shadow-inner">
            <h2 className="text-lg font-bold mb-2">選択コードの解説</h2>
            <pre className="whitespace-pre-wrap break-words text-sm leading-tight text-gray-800">{explanation}</pre>
          </div>
          <div className="p-4 overflow-auto bg-white border-l rounded-b-lg shadow-inner">
            <h2 className="text-lg font-bold mb-2">チャットボット</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
              {chatLog.map((entry, idx) => (
                <div key={idx} className={`p-2 rounded ${entry.role === "user" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"}`}>
                  {entry.content}
                </div>
              ))}
            </div>
            <div className="flex items-center">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="質問を入力..."
                className="flex-grow border rounded-lg px-3 py-2 mr-2"
              />
              <button
                onClick={sendChat}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
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
